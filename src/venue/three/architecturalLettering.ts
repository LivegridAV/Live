import * as THREE from "three";

const prepared = new WeakSet<THREE.Material>();

/** Printed and illuminated signs need steady contrast under every show cue.
 * Keep their vector edges free of architectural grain, metal glare and baked
 * contact shading; the actual glyph geometry still supplies depth and scale. */
export function prepareArchitecturalLettering(model: THREE.Object3D) {
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!(material instanceof THREE.MeshStandardMaterial) || prepared.has(material)) continue;
      if (!/lettering|caption|^Brand porcelain$/i.test(material.name)) continue;
      prepared.add(material);
      material.color.set("#f3f6f4");
      material.emissive.set("#f3f6f4");
      material.emissiveIntensity = .65;
      material.metalness = 0;
      material.roughness = .9;
      material.envMapIntensity = .08;
      material.vertexColors = false;
      material.toneMapped = false;
      material.onBeforeCompile = () => {};
      material.customProgramCacheKey = () => "architectural-lettering-clear-ivory-v1";
      material.needsUpdate = true;
    }
  });
}
