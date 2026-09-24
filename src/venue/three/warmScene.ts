import * as THREE from "three";

/** Upload buffers/textures and prepare reflection + shadow variants behind the
 * loader. compileAsync alone does not upload geometry or render depth materials.
 * A tiny offscreen target avoids drawing the whole venue at display resolution. */
export async function warmScene(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, cancelled = () => false) {
  await gl.compileAsync(scene, camera);
  if (cancelled()) return;
  const target = new THREE.WebGLRenderTarget(32, 32);
  const previousTarget = gl.getRenderTarget();
  const objects: { object: THREE.Object3D; visible: boolean; culled: boolean }[] = [];
  const shadows: { shadow: THREE.LightShadow; auto: boolean }[] = [];
  try {
    scene.traverse(object => {
      // Hidden emitter sources must stay hidden: the pool owns the light count.
      if (object instanceof THREE.Light) {
        const shadow = (object as THREE.SpotLight).shadow;
        if (object.castShadow && shadow) {
          shadows.push({shadow, auto:shadow.autoUpdate});
          shadow.autoUpdate = true;
          shadow.needsUpdate = true;
        }
        return;
      }
      objects.push({object, visible:object.visible, culled:object.frustumCulled});
      object.visible = true;
      object.frustumCulled = false;
    });
    gl.setRenderTarget(target);
    gl.render(scene, camera);
  } finally {
    for (const state of objects) {
      state.object.visible = state.visible;
      state.object.frustumCulled = state.culled;
    }
    for (const state of shadows) state.shadow.autoUpdate = state.auto;
    gl.setRenderTarget(previousTarget);
    target.dispose();
  }
  // The offscreen reflection path uses linear output; wait for the on-screen
  // colour-space variants as well before enabling Enter.
  await gl.compileAsync(scene, camera);
}
