import { createContext, useContext, useSyncExternalStore } from "react";
import * as THREE from "three";

/**
 * Set while the venue warms up behind the loader. Anything that would draw the
 * whole scene on its own (the entrance reflection) waits for it to clear, so
 * no shader is compiled synchronously inside a frame before the warm-up has
 * submitted it.
 */
export const warmupHold = { active: false };

/**
 * Work that would draw parts of the scene with new shaders before the warm-up
 * has submitted them (contact-shadow bakes, the floor's live reflection) waits
 * at this gate. Drawing them earlier makes the driver finish those shaders
 * one by one inside a frame, with the page frozen; that cost about 23 s.
 */
/** Gated work. It may return a promise (an async bake); the gate's opener can wait for it. */
export type WarmWork = () => void | Promise<unknown>;
const gate = { open: false, queue: new Set<WarmWork>(), listeners: new Set<() => void>() };
const notify = () => gate.listeners.forEach(listener => listener());

/** Close the gate for a new warm-up (the venue remounted). */
export function closeWarmupGate() {
  if (!gate.open) return;
  gate.open = false;
  notify();
}

const settle = (result: void | Promise<unknown>) =>
  Promise.resolve(result).then(() => undefined, error => { console.warn("Venue warm-up work failed", error); });

/**
 * Open the gate: run queued bakes and let reflections mount. Resolves once the
 * queued work has finished, including async bakes.
 */
export function openWarmupGate(): Promise<void> {
  if (gate.open) return Promise.resolve();
  gate.open = true;
  const queued = [...gate.queue];
  gate.queue.clear();
  const running = queued.map(run => settle(run()));
  notify();
  return Promise.all(running).then(() => undefined);
}

/**
 * Run `work` once the warm-up has submitted every shader. Without a warm-up in
 * progress (review pages with their own canvas) it runs at once. Returns a
 * cancel function for effect cleanup.
 */
export function afterWarmup(work: WarmWork) {
  if (gate.open || !warmupHold.active) { void settle(work()); return () => {}; }
  gate.queue.add(work);
  return () => { gate.queue.delete(work); };
}

/**
 * A load group that streams in after the venue opened has its own warm-up
 * (see loading/LoadGroupGate.tsx). Work inside it, such as a contact-shadow
 * bake, waits for that group's warm-up instead of the venue's, which has long
 * finished. Outside a gate this falls back to `afterWarmup`.
 */
export const WarmScope = createContext<((work: WarmWork) => () => void) | null>(null);
export function useAfterWarmup() {
  return useContext(WarmScope) ?? afterWarmup;
}

/** Gated work would run at once: the gate is open, or no venue warm-up is holding it. */
export const warmupGateOpen = () => gate.open || !warmupHold.active;

/** True once the venue warm-up has opened the gate. */
export function useWarmupOpen() {
  return useSyncExternalStore(listener => {
    gate.listeners.add(listener);
    return () => { gate.listeners.delete(listener); };
  }, () => gate.open, () => false);
}

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * Resolve once the driver has finished every submitted program. Polling
 * COMPLETION_STATUS (KHR_parallel_shader_compile) never blocks, so the page
 * stays live and the driver can compile on all of its worker threads. The old
 * path drew straight after submitting, which made the main thread wait for
 * each program in turn inside one frame: about 38 s frozen on a desktop GPU.
 * Reads the renderer's live list on every poll, so a program released while we
 * wait simply drops out. That avoids the r185 compileAsync lifetime race,
 * which polled materials that a startup swap had already disposed.
 */
export async function programsReady(gl: THREE.WebGLRenderer, cancelled: () => boolean,
  onProgress?: (fraction: number) => void, limitMs = 120_000) {
  const start = performance.now();
  for (;;) {
    if (cancelled()) return;
    const programs = gl.info?.programs ?? [];
    let ready = 0;
    // isReady() exists at runtime (r185) but is missing from the type declarations.
    for (const program of programs) if ((program as unknown as { isReady(): boolean }).isReady()) ready++;
    onProgress?.(programs.length ? ready / programs.length : 1);
    if (ready === programs.length || performance.now() - start > limitMs) return;
    await wait(40);
  }
}

/**
 * Submit programs for whatever part of the scene has arrived, without waiting
 * for any of them. Called while the rest of the venue is still downloading:
 * the driver compiles on its own threads while the network is the bottleneck,
 * so the warm-up after the last download finds most programs already built.
 * Both colour-space variants are submitted, as in warmScene. Returns the
 * number of programs the renderer holds.
 */
export function submitPrograms(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera,
  target: THREE.WebGLRenderTarget) {
  const previousTarget = gl.getRenderTarget();
  try {
    gl.setRenderTarget(target);
    gl.compile(scene, camera);
    gl.setRenderTarget(previousTarget);
    gl.compile(scene, camera);
  } finally {
    gl.setRenderTarget(previousTarget);
  }
  return gl.info?.programs?.length ?? 0;
}

/**
 * Prepare every shader variant and upload buffers/textures behind the loader.
 *
 * 1. Submit both colour-space variants of every material without waiting:
 *    the offscreen reflections render in linear output without tone mapping,
 *    the screen in sRGB with it. compile() covers hidden objects too.
 * 2. Wait for the driver to finish them, without blocking.
 * 3. Draw everything once into a tiny target so geometry and textures upload,
 *    and shadow and other render-time variants appear. With the programs
 *    ready this is quick.
 */
export async function warmScene(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera,
  cancelled = () => false, onProgress?: (fraction: number) => void) {
  // Warm the merged meshes, not the parts they replace.
  await preparedWithin(scene);
  if (cancelled()) return;
  const target = new THREE.WebGLRenderTarget(32, 32);
  const previousTarget = gl.getRenderTarget();
  try {
    gl.setRenderTarget(target);
    gl.compile(scene, camera);
    gl.setRenderTarget(previousTarget);
    gl.compile(scene, camera);
  } finally {
    gl.setRenderTarget(previousTarget);
  }
  await programsReady(gl, cancelled, fraction => onProgress?.(fraction * 0.9));
  if (cancelled()) { target.dispose(); return; }

  const objects: { object: THREE.Object3D; visible: boolean; culled: boolean }[] = [];
  const shadows: { shadow: THREE.LightShadow; auto: boolean }[] = [];
  const lights: { light: THREE.Light; visible: boolean }[] = [];
  try {
    // Pin every light to its effective state before un-hiding the zones
    // around it. A light inside a gated-off zone would otherwise switch on,
    // change the light count every lit shader is keyed on, and compile a whole
    // second set synchronously in this draw — the 7–17 s stall this replaced.
    scene.traverse(object => {
      if (!(object instanceof THREE.Light)) return;
      let effective = true;
      for (let node: THREE.Object3D | null = object; node; node = node.parent) if (!node.visible) { effective = false; break; }
      lights.push({ light: object, visible: object.visible });
      object.visible = effective;
    });
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
    for (const state of lights) state.light.visible = state.visible;
    gl.setRenderTarget(previousTarget);
    target.dispose();
  }
  // Anything the draw added (depth variants, late material swaps) — normally
  // nothing is left by now.
  if (cancelled()) return;
  gl.compile(scene, camera);
  await programsReady(gl, cancelled, fraction => onProgress?.(0.9 + fraction * 0.1), 30_000);
}

/**
 * Preparation a mounted root needs before it is warmed, such as merging its
 * static meshes (mergeStatic.ts, 5-30 ms for a large model). Run inside the
 * render that mounts the model it lengthens a task that is already long during
 * the walk (Task 7 measurement), so each root's work runs in a task of its own
 * soon after mount, one root per task. warmScene and warmSubtree first wait
 * for the roots inside what they warm, so what they warm is what is drawn.
 */
const preparing = new Map<THREE.Object3D, () => void>();
const preparedListeners = new Set<() => void>();
let prepareScheduled = false;
const notifyPrepared = () => preparedListeners.forEach(listener => listener());
function prepareOne() {
  prepareScheduled = false;
  const next = preparing.entries().next();
  if (!next.done) { const [root, work] = next.value; preparing.delete(root); work(); }
  notifyPrepared();
  if (preparing.size) schedulePrepare();
}
function schedulePrepare() { if (!prepareScheduled) { prepareScheduled = true; setTimeout(prepareOne, 0); } }

/** Run `work` for `root` in a later task, before any warm-up of it. Returns a cancel function for effect cleanup. */
export function prepareBeforeWarm(root: THREE.Object3D, work: () => void) {
  preparing.set(root, work);
  schedulePrepare();
  // A cancelled root no longer holds back a warm-up waiting on it.
  return () => { if (preparing.delete(root)) notifyPrepared(); };
}

const inside = (object: THREE.Object3D, subtree: THREE.Object3D) => {
  for (let node: THREE.Object3D | null = object; node; node = node.parent) if (node === subtree) return true;
  return false;
};
/** Resolves once no root inside `subtree` is waiting for its preparation. */
export function preparedWithin(subtree: THREE.Object3D): Promise<void> {
  const waiting = () => [...preparing.keys()].some(root => inside(root, subtree));
  if (!waiting()) return Promise.resolve();
  return new Promise(resolve => {
    const check = () => { if (!waiting()) { preparedListeners.delete(check); resolve(); } };
    preparedListeners.add(check);
  });
}

/** Layer used to draw one subtree on its own while the scene's lights stay in effect. */
const WARM_LAYER = 31;
let warmChain: Promise<unknown> = Promise.resolve();

/**
 * Warm one subtree that mounts after the venue has opened (a streamed load
 * group), without touching the rest of the scene:
 *
 * 1. Submit its materials in both colour-space variants, against the full
 *    scene's lights, fog and environment (`compile(root, camera, scene)`), and
 *    wait for the driver without blocking.
 * 2. Once the venue is open, upload its textures one per task (`uploadTextures`).
 * 3. Draw only that subtree once into a tiny target, so its geometry
 *    uploads and render-time variants appear. The camera sees a
 *    reserved layer that only the subtree and the lights in effect are put on,
 *    so the draw uses the real light set and costs a fraction of a frame.
 * 4. Submit again for anything the draw added.
 *
 * `root` stays hidden (visible = false) throughout; the caller shows it after.
 * Calls are serialized, so two groups never warm at the same time.
 */
export function warmSubtree(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera,
  root: THREE.Object3D, cancelled = () => false): Promise<void> {
  const run = warmChain.then(() => warmSubtreeNow(gl, scene, camera, root, cancelled));
  warmChain = run.catch(() => undefined);
  return run;
}

async function warmSubtreeNow(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera,
  root: THREE.Object3D, cancelled: () => boolean) {
  await preparedWithin(root);
  if (cancelled()) return;
  const target = new THREE.WebGLRenderTarget(32, 32);
  try {
    submitSubtree(gl, scene, camera, root, target);
    await programsReady(gl, cancelled);
    if (cancelled()) return;
    // Only once the venue is open: behind the loader a long upload is unseen,
    // and the review captures' frame count must not depend on decode time.
    if (gate.open) await uploadTextures(gl, root, cancelled);
    if (cancelled()) return;
    drawSubtree(gl, scene, camera, root, target);
    if (cancelled()) return;
    submitSubtree(gl, scene, camera, root, target);
    await programsReady(gl, cancelled, undefined, 30_000);
  } finally {
    target.dispose();
  }
}

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

/**
 * Upload the subtree's textures that are not on the GPU yet, one per task,
 * ahead of its warm-up draw. Drawn together, a zone's large media images
 * uploaded 5 at a time in one task (~200 ms during the walk, Task 6b trace),
 * each re-decoding its image on the main thread. Here an image element is
 * decoded off the main thread first (`decode()`), so its upload is a copy.
 */
async function uploadTextures(gl: THREE.WebGLRenderer, root: THREE.Object3D, cancelled: () => boolean) {
  const textures = new Set<THREE.Texture>();
  const collect = (value: unknown) => { if (value instanceof THREE.Texture) textures.add(value); };
  root.traverse(object => {
    const material = (object as THREE.Mesh).material;
    if (!material) return;
    for (const m of Array.isArray(material) ? material : [material]) {
      for (const value of Object.values(m)) collect(value);
      const uniforms = (m as THREE.ShaderMaterial).uniforms;
      if (uniforms) for (const uniform of Object.values(uniforms)) collect(uniform?.value);
    }
  });
  for (const texture of textures) {
    if (cancelled()) return;
    const uploaded = (gl.properties.get(texture) as { __version?: number }).__version === texture.version;
    if (texture.isRenderTargetTexture || texture.version === 0 || uploaded || texture instanceof THREE.VideoTexture) continue;
    const image = texture.image as unknown;
    if (typeof HTMLImageElement !== "undefined" && image instanceof HTMLImageElement) await image.decode().catch(() => undefined);
    if (cancelled()) return;
    gl.initTexture(texture);
    await nextFrame();
  }
}

function submitSubtree(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera,
  root: THREE.Object3D, target: THREE.WebGLRenderTarget) {
  const previousTarget = gl.getRenderTarget();
  try {
    gl.setRenderTarget(target);
    gl.compile(root, camera, scene);
    gl.setRenderTarget(previousTarget);
    gl.compile(root, camera, scene);
  } finally {
    gl.setRenderTarget(previousTarget);
  }
}

function drawSubtree(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera,
  root: THREE.Object3D, target: THREE.WebGLRenderTarget) {
  const objects: { object: THREE.Object3D; visible: boolean; culled: boolean; mask: number }[] = [];
  const ancestors: { object: THREE.Object3D; visible: boolean }[] = [];
  const lights: THREE.Object3D[] = [];
  const shadows: THREE.LightShadow[] = [];
  const counters = { ...gl.info.render };
  const mask = camera.layers.mask;
  const previousTarget = gl.getRenderTarget();
  try {
    // Pin the light set to what is in effect now (as warmScene does), before
    // any ancestor is un-hidden: a light inside a hidden zone must not join.
    scene.traverseVisible(object => {
      if (!(object instanceof THREE.Light) || !object.layers.test(camera.layers)) return;
      if (!object.layers.isEnabled(WARM_LAYER)) { object.layers.enable(WARM_LAYER); lights.push(object); }
      const shadow = (object as THREE.SpotLight).shadow;
      // Draw the subtree's casters into the shadow map too, so their depth
      // variants appear now rather than in a frame near the stall.
      if (object.castShadow && shadow) { shadows.push(shadow); shadow.needsUpdate = true; }
    });
    for (let node = root.parent; node; node = node.parent) {
      ancestors.push({ object: node, visible: node.visible });
      node.visible = true;
    }
    root.traverse(object => {
      // Emitter sources stay hidden: the light pool owns the light count.
      if (object instanceof THREE.Light) return;
      objects.push({ object, visible: object.visible, culled: object.frustumCulled, mask: object.layers.mask });
      object.visible = true;
      object.frustumCulled = false;
      object.layers.enable(WARM_LAYER);
    });
    camera.layers.set(WARM_LAYER);
    gl.setRenderTarget(target);
    gl.render(scene, camera);
  } finally {
    camera.layers.mask = mask;
    for (const state of objects) {
      state.object.visible = state.visible;
      state.object.frustumCulled = state.culled;
      state.object.layers.mask = state.mask;
    }
    for (const state of ancestors) state.object.visible = state.visible;
    for (const light of lights) light.layers.disable(WARM_LAYER);
    // The shadow map now holds only this subtree; the next frame redraws it whole.
    for (const shadow of shadows) shadow.needsUpdate = true;
    gl.setRenderTarget(previousTarget);
    // Keep ?perf's per-frame draw statistics about real frames.
    gl.info.render.calls = counters.calls;
    gl.info.render.triangles = counters.triangles;
    gl.info.render.points = counters.points;
    gl.info.render.lines = counters.lines;
  }
}
