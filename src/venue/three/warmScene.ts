import { useSyncExternalStore } from "react";
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
const gate = { open: false, queue: new Set<() => void>(), listeners: new Set<() => void>() };
const notify = () => gate.listeners.forEach(listener => listener());

/** Close the gate for a new warm-up (the venue remounted). */
export function closeWarmupGate() {
  if (!gate.open) return;
  gate.open = false;
  notify();
}

/** Open the gate: run queued bakes and let reflections mount. */
export function openWarmupGate() {
  if (gate.open) return;
  gate.open = true;
  const queued = [...gate.queue];
  gate.queue.clear();
  for (const run of queued) run();
  notify();
}

/**
 * Run `work` once the warm-up has submitted every shader. Without a warm-up in
 * progress (review pages with their own canvas) it runs at once. Returns a
 * cancel function for effect cleanup.
 */
export function afterWarmup(work: () => void) {
  if (gate.open || !warmupHold.active) { work(); return () => {}; }
  gate.queue.add(work);
  return () => { gate.queue.delete(work); };
}

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
async function programsReady(gl: THREE.WebGLRenderer, cancelled: () => boolean,
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
