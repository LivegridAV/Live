import * as THREE from "three";
import { MEDIA, type MediaDesc, type ShaderMedia, type CanvasMedia, type VideoMedia } from "../data/media";
import { SHADER_PROGRAMS, VERT, HEAVY_PROGRAMS, type ShaderProgramId } from "./programs";
import { PAINTERS, type PaintCtx } from "./painters";
import type { QualityTier, StageMode } from "../systems/store";

/**
 * One engine owns every moving pixel in the venue.
 *
 * Screens don't create textures — they `acquire()` a media id and get back a
 * shared texture. Two LED blades playing the same content cost one render
 * target, not two. Each frame the engine spends a fixed budget on whichever
 * media the camera can actually see (screens report their importance via
 * `touch`), so an arena full of LED still refreshes at the frame rate where it
 * matters and idles everywhere else. Nothing ever freezes: off-screen media
 * still ticks over slowly so there is no pop when it comes back into view.
 */

interface BaseEntry {
  id: string;
  desc: MediaDesc;
  refs: number;
  /** highest importance any consumer reported this frame, 0 → 1 */
  importance: number;
  /** seconds since this entry last refreshed */
  since: number;
  interval: number;
  texture: THREE.Texture;
}

interface ShaderEntry extends BaseEntry {
  kind: "shader";
  desc: ShaderMedia;
  rt: THREE.WebGLRenderTarget;
  material: THREE.ShaderMaterial;
  program: ShaderProgramId;
}

interface CanvasEntry extends BaseEntry {
  kind: "canvas";
  desc: CanvasMedia;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

interface VideoEntry extends BaseEntry {
  kind: "video";
  desc: VideoMedia;
  video: HTMLVideoElement;
}

type Entry = ShaderEntry | CanvasEntry | VideoEntry;

const QUALITY_SCALE: Record<QualityTier, number> = { low: 0.6, medium: 0.85, high: 1.25 };

/**
 * How every media texture is sampled.
 *
 * All three kinds used to be created with `generateMipmaps: false` and a plain
 * linear filter, which is fine while a screen is magnified and wrong the
 * moment it is not. Most screens in a 375 m venue are minified most of the
 * time — distant, oblique, or simply small in frame — and a minified texture
 * without mipmaps takes one texel per output pixel out of a high-frequency
 * animated image. As the camera moves, the texel it lands on changes, and the
 * surface sparkles. That is the flicker, and it is also most of the reason
 * the content read as soft rather than sharp.
 *
 * Trilinear filtering fixes the sparkle; anisotropy is what keeps a panel seen
 * at an angle — which, on a stage array with canted clusters, is most of them
 * — from going to mush in the process.
 */
function tuneSampling(t: THREE.Texture, maxAnisotropy: number, mip = true) {
  t.magFilter = THREE.LinearFilter;
  t.minFilter = mip ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  t.generateMipmaps = mip;
  t.anisotropy = Math.min(8, maxAnisotropy);
}
const FRAME_BUDGET: Record<QualityTier, number> = { low: 3, medium: 6, high: 10 };
/** Idle media still refreshes this often so it never looks frozen on return. */
const IDLE_INTERVAL = 0.5;

export class MediaEngine {
  private renderer: THREE.WebGLRenderer;
  private entries = new Map<string, Entry>();
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private quad: THREE.Mesh;
  private quality: QualityTier = "high";
  private mode: StageMode = "corporate";
  private isMobile = false;
  private elapsed = 0;
  private fallback: THREE.Texture;
  /**
   * One clock per synchronised group.
   *
   * Media that carries a single composition across several panels — a blade
   * array, a stage package, the finale taking every major surface — names a
   * `syncGroup`. Every member is seeded from this map rather than from
   * `Math.random()`, so the members of a group are at the same point in the
   * same animation on the same frame. Without it, ten blades showing "one
   * image cut across ten panels" would each be showing a different moment of
   * it, which is the one failure that makes an array read as ten screens.
   */
  private groupSeed = new Map<string, number>();

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    const geo = new THREE.PlaneGeometry(2, 2);
    this.quad = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
    this.scene.add(this.quad);

    // 1×1 dark texture so a screen always has something bound.
    const c = document.createElement("canvas");
    c.width = c.height = 2;
    const cx = c.getContext("2d")!;
    cx.fillStyle = "#05090a";
    cx.fillRect(0, 0, 2, 2);
    this.fallback = new THREE.CanvasTexture(c);
    this.fallback.colorSpace = THREE.SRGBColorSpace;
  }

  setQuality(q: QualityTier) {
    if (q === this.quality) return;
    this.quality = q;
    for (const e of this.entries.values()) {
      if (e.kind === "shader") {
        const [w, h] = this.size(e.desc);
        e.rt.setSize(w, h);
        e.material.uniforms.uAspect.value.set(w / Math.min(w, h), h / Math.min(w, h));
      }
    }
  }

  setMobile(v: boolean) {
    this.isMobile = v;
  }

  setMode(mode: StageMode) {
    if (mode === this.mode) return;
    this.mode = mode;
    for (const e of this.entries.values()) {
      if (e.kind !== "shader") continue;
      const want = this.programFor(e.desc);
      if (want !== e.program) {
        e.material.fragmentShader = SHADER_PROGRAMS[want];
        e.material.needsUpdate = true;
        e.program = want;
      }
      e.material.uniforms.uMode.value = mode === "festival" ? 1 : 0;
      e.material.uniforms.uAccent.value.set(this.accentFor(e.desc));
      e.since = 10; // force an immediate repaint so the switch is instant
    }
  }

  private programFor(d: ShaderMedia): ShaderProgramId {
    return this.mode === "festival" && d.festival ? d.festival : d.program;
  }

  /**
   * A start offset for one media entry. Ungrouped media gets its own random
   * phase so twin screens never look cloned; grouped media shares one.
   */
  private seedFor(group?: string) {
    if (!group) return Math.random() * 100;
    let seed = this.groupSeed.get(group);
    if (seed === undefined) {
      seed = Math.random() * 100;
      this.groupSeed.set(group, seed);
    }
    return seed;
  }

  /** The manifest's per-surface output trim, for whoever builds the material. */
  trim(id: string) {
    return MEDIA[id]?.brightness ?? 1;
  }

  private accentFor(d: ShaderMedia) {
    const hex = this.mode === "festival" && d.festivalAccent ? d.festivalAccent : d.accent ?? "#3fd6c8";
    return new THREE.Color(hex).convertSRGBToLinear();
  }

  private size(d: ShaderMedia | CanvasMedia): [number, number] {
    const [w, h] = d.res ?? [320, 320];
    let s = QUALITY_SCALE[this.quality];
    if (d.kind === "shader" && HEAVY_PROGRAMS.includes(this.programFor(d))) s *= 0.75;
    if (this.isMobile) s *= 0.8;
    const round = (n: number) => Math.max(64, Math.round((n * s) / 8) * 8);
    return [round(w), round(h)];
  }

  /** Get (creating if needed) the texture for a media id. */
  acquire(id: string): THREE.Texture {
    let e = this.entries.get(id);
    if (!e) {
      const desc = MEDIA[id];
      if (!desc) {
        if (process.env.NODE_ENV !== "production") console.warn(`[venue] unknown media id "${id}"`);
        return this.fallback;
      }
      e = this.create(id, desc);
      this.entries.set(id, e);
    }
    e.refs++;
    return e.texture;
  }

  release(id: string) {
    const e = this.entries.get(id);
    if (!e) return;
    e.refs--;
    // Entries are kept alive even at zero refs: the venue is one continuous
    // journey and the visitor can scroll back. Disposal happens in dispose().
  }

  private create(id: string, desc: MediaDesc): Entry {
    if (desc.kind === "shader") return this.createShader(id, desc);
    if (desc.kind === "canvas") return this.createCanvas(id, desc);
    return this.createVideo(id, desc);
  }

  private createShader(id: string, desc: ShaderMedia): ShaderEntry {
    const [w, h] = this.size(desc);
    // Half-float mipmaps need a filterable float texture. WebGL2 gives us
    // that on every desktop GPU we care about; where it is missing we fall
    // back to linear rather than shipping a black screen.
    const caps = this.renderer.capabilities;
    const canMipFloat =
      caps.isWebGL2 && this.renderer.extensions.has("OES_texture_float_linear");

    const rt = new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType, // LED content is emissive — keep HDR headroom
      minFilter: canMipFloat ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: canMipFloat,
    });
    rt.texture.colorSpace = THREE.LinearSRGBColorSpace;
    rt.texture.wrapS = rt.texture.wrapT = THREE.ClampToEdgeWrapping;
    tuneSampling(rt.texture, caps.getMaxAnisotropy(), canMipFloat);

    const program = this.programFor(desc);
    const m = Math.min(w, h);
    const seed = this.seedFor(desc.syncGroup);

    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: SHADER_PROGRAMS[program],
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTime: { value: seed },
        uSeed: { value: seed },
        uMode: { value: this.mode === "festival" ? 1 : 0 },
        uVariant: { value: desc.variant ?? 0 },
        uAccent: { value: this.accentFor(desc) },
        uAspect: { value: new THREE.Vector2(w / m, h / m) },
      },
    });

    return {
      kind: "shader",
      id,
      desc,
      rt,
      material,
      program,
      refs: 0,
      importance: 1,
      since: 99,
      interval: 1 / (desc.fps ?? 30),
      texture: rt.texture,
    };
  }

  private createCanvas(id: string, desc: CanvasMedia): CanvasEntry {
    const [w, h] = this.size(desc);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    tuneSampling(texture, this.renderer.capabilities.getMaxAnisotropy());
    return {
      kind: "canvas",
      id,
      desc,
      canvas,
      ctx,
      refs: 0,
      importance: 1,
      since: 99,
      interval: 1 / (desc.fps ?? 12),
      texture,
    };
  }

  private createVideo(id: string, desc: VideoMedia): VideoEntry {
    const video = document.createElement("video");
    video.src = this.isMobile && desc.mobile ? desc.mobile : desc.desktop;
    video.loop = true;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.crossOrigin = "anonymous";
    video.preload = "auto";
    if (desc.poster) video.poster = desc.poster;
    // Autoplay can be refused until a gesture; retry on the first interaction.
    const tryPlay = () => void video.play().catch(() => {});
    tryPlay();
    window.addEventListener("pointerdown", tryPlay, { once: true });
    window.addEventListener("keydown", tryPlay, { once: true });

    const texture = new THREE.VideoTexture(video);
    texture.colorSpace = THREE.SRGBColorSpace;
    // A video texture uploads a new frame every tick, so regenerating its
    // mip chain each time is real cost for no benefit — anisotropy only.
    tuneSampling(texture, this.renderer.capabilities.getMaxAnisotropy(), false);
    return {
      kind: "video",
      id,
      desc,
      video,
      refs: 0,
      importance: 1,
      since: 0,
      interval: 0,
      texture,
    };
  }

  /** Screens call this every frame with how much the camera cares about them. */
  touch(id: string, importance: number) {
    const e = this.entries.get(id);
    if (e && importance > e.importance) e.importance = importance;
  }

  /**
   * Refresh the media that matters. Called once per frame, before the main
   * render pass, from a single component.
   */
  update(dt: number) {
    this.elapsed += dt;
    const budget = FRAME_BUDGET[this.quality];

    /* Groups refresh together. If one panel of a blade array is on camera and
       its neighbour is at a grazing angle, they must still be repainted on the
       same frame — otherwise the array shears, which is exactly the artefact
       the group exists to prevent. So importance is pooled first, and every
       member then competes for the frame budget at the group's importance
       rather than at its own. */
    const groupImportance = new Map<string, number>();
    for (const e of this.entries.values()) {
      const g = e.desc.syncGroup;
      if (!g) continue;
      groupImportance.set(g, Math.max(groupImportance.get(g) ?? 0, e.importance));
    }
    if (groupImportance.size) {
      for (const e of this.entries.values()) {
        const g = e.desc.syncGroup;
        if (g) e.importance = groupImportance.get(g)!;
      }
    }

    // Collect shader/canvas entries that are due, most important first.
    const due: Entry[] = [];
    for (const e of this.entries.values()) {
      if (e.kind === "video") {
        e.importance = 0;
        continue; // the browser drives video decoding for us
      }
      e.since += dt;
      const interval = e.importance > 0.02 ? e.interval / Math.max(0.35, e.importance) : IDLE_INTERVAL;
      if (e.since >= interval) due.push(e);
    }
    due.sort((a, b) => b.importance - a.importance);

    const prevTarget = this.renderer.getRenderTarget();
    let spent = 0;
    for (const e of due) {
      if (spent >= budget && e.importance < 0.99) break;
      if (e.kind === "shader") this.renderShader(e);
      else if (e.kind === "canvas") this.paintCanvas(e);
      e.since = 0;
      spent++;
    }
    if (this.renderer.getRenderTarget() !== prevTarget) this.renderer.setRenderTarget(prevTarget);

    // Importance decays each frame; consumers re-assert it.
    for (const e of this.entries.values()) e.importance = 0;
  }

  private renderShader(e: ShaderEntry) {
    // Both terms are shared inside a group, so grouped surfaces are always on
    // the same frame of the same animation.
    e.material.uniforms.uTime.value = this.elapsed + e.material.uniforms.uSeed.value;
    this.quad.material = e.material;
    this.renderer.setRenderTarget(e.rt);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
  }

  private paintCanvas(e: CanvasEntry) {
    const p: PaintCtx = {
      ctx: e.ctx,
      w: e.canvas.width,
      h: e.canvas.height,
      t: this.elapsed,
      accent: e.desc.accent ?? "#3fd6c8",
      variant: 0,
      text: e.desc.text,
    };
    e.ctx.save();
    PAINTERS[e.desc.painter](p);
    e.ctx.restore();
    e.texture.needsUpdate = true;
  }

  /** Warm a list of media ids so the first frame a visitor sees is already live. */
  prime(ids: string[]) {
    for (const id of ids) {
      const t = this.acquire(id);
      if (t === this.fallback) continue;
      const e = this.entries.get(id)!;
      if (e.kind === "shader") this.renderShader(e);
      else if (e.kind === "canvas") this.paintCanvas(e);
      e.refs--; // priming does not hold a reference
    }
    this.renderer.setRenderTarget(null);
  }

  get count() {
    return this.entries.size;
  }

  dispose() {
    for (const e of this.entries.values()) {
      if (e.kind === "shader") {
        e.rt.dispose();
        e.material.dispose();
      } else if (e.kind === "video") {
        e.video.pause();
        e.video.removeAttribute("src");
        e.video.load();
        e.texture.dispose();
      } else {
        e.texture.dispose();
      }
    }
    this.entries.clear();
    this.quad.geometry.dispose();
    this.fallback.dispose();
  }
}
