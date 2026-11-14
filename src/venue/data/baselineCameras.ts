/** QA-only historical cameras, extracted from the pre-implementation manifest.
 * This copies camera numbers and capture metadata, never reference pixels.
 * Replaying a camera does not restore old lighting, media, geometry or viewport.
 */
export type BaselineShot = "pillars" | "reception" | "anamorphic" | "technical" | "led-rental" | "projection" | "arena";
export type BaselineCamera = {
  id: string; capturedAt: string;
  viewport: {width: number; height: number; devicePixelRatio: number};
  progress: number; position: [number, number, number];
  quaternion: [number, number, number, number];
  fov: number; aspect: number; near: number; far: number;
};
export const BASELINE_CAMERA_MANIFEST = "reports/grand-stalls/20261018-implementation/BEFORE_MANIFEST.json";
export const BASELINE_CAMERA_MANIFEST_SHA256 = "6622db0221abad34096bb7c7903c1f7125d48a4c2ea843893c78fe4f6e56afab";
export const BASELINE_CAMERAS: Record<BaselineShot, BaselineCamera> = {
  "pillars": {
    "id": "desktop-CP-033",
    "capturedAt": "2026-10-17T22:24:42.345Z",
    "viewport": {
      "width": 1920,
      "height": 1080,
      "devicePixelRatio": 1
    },
    "progress": 0.34,
    "position": [
      4.796689,
      2.400174,
      -40.695921
    ],
    "quaternion": [
      0.089547,
      0.413797,
      -0.040944,
      0.905029
    ],
    "fov": 51.992956,
    "aspect": 1.763889,
    "near": 0.1,
    "far": 340
  },
  "reception": {
    "id": "desktop-CP-056",
    "capturedAt": "2026-10-17T22:26:12.338Z",
    "viewport": {
      "width": 1920,
      "height": 1080,
      "devicePixelRatio": 1
    },
    "progress": 0.456,
    "position": [
      -1.445,
      2.448,
      -64
    ],
    "quaternion": [
      0.052801,
      -0.050193,
      0.002656,
      0.997339
    ],
    "fov": 65.294331,
    "aspect": 1.763889,
    "near": 0.1,
    "far": 340
  },
  "anamorphic": {
    "id": "desktop-CP-088",
    "capturedAt": "2026-10-17T22:29:13.564Z",
    "viewport": {
      "width": 1920,
      "height": 1080,
      "devicePixelRatio": 1
    },
    "progress": 0.566,
    "position": [
      11.70331,
      2.31546,
      -91.61365
    ],
    "quaternion": [
      0.049912,
      0.3803,
      -0.020559,
      0.923287
    ],
    "fov": 35.263518,
    "aspect": 1.763889,
    "near": 0.1,
    "far": 340
  },
  "technical": {
    "id": "desktop-CP-115",
    "capturedAt": "2026-10-17T22:30:11.680Z",
    "viewport": {
      "width": 1920,
      "height": 1080,
      "devicePixelRatio": 1
    },
    "progress": 0.596,
    "position": [
      7.799935,
      2.199998,
      -145.224573
    ],
    "quaternion": [
      -0.004341,
      0.74653,
      0.004625,
      0.665322
    ],
    "fov": 42.838446,
    "aspect": 1.763889,
    "near": 0.1,
    "far": 340
  },
  "led-rental": {
    "id": "desktop-CP-157",
    "capturedAt": "2026-10-17T22:31:36.138Z",
    "viewport": {
      "width": 1920,
      "height": 1080,
      "devicePixelRatio": 1
    },
    "progress": 0.692,
    "position": [
      11.1,
      1.95,
      -161.7
    ],
    "quaternion": [
      0.033923,
      0.581941,
      -0.024304,
      0.81216
    ],
    "fov": 38.267744,
    "aspect": 1.763889,
    "near": 0.1,
    "far": 340
  },
  "projection": {
    "id": "desktop-CP-183",
    "capturedAt": "2026-10-17T22:32:50.840Z",
    "viewport": {
      "width": 1920,
      "height": 1080,
      "devicePixelRatio": 1
    },
    "progress": 0.718,
    "position": [
      -49.799999,
      5.7,
      -195.6
    ],
    "quaternion": [
      0.028112,
      -0.744101,
      0.031383,
      0.666738
    ],
    "fov": 31.00785,
    "aspect": 1.763889,
    "near": 0.1,
    "far": 340
  },
  // Exact recorded arena camera; explicit ?shot=arena&camera=baseline QA only.
  // Source: reports/placement-implementation/20261019-rearrangement/baseline/arena-camera.json
  // SHA256 722c35a560196e5ce0378f1de66dec5d5f71b8c6c407792fa6fdbad213a4cb08
  "arena": {
  "id": "rearrangement-arena-before-p0932",
  "capturedAt": "before-rearrangement-baseline",
  "viewport": {
    "width": 1280,
    "height": 720,
    "devicePixelRatio": 1
  },
  "progress": 0.932,
  "position": [
    -0.06399769938172824,
    3.464594840729604,
    -296.96838332770216
  ],
  "quaternion": [
    0.033277778819834486,
    -0.0005707691892733044,
    1.9004459723196214e-05,
    0.9994459781790017
  ],
  "fov": 51.99023363081622,
  "aspect": 1.7569444444444444,
  "near": 0.1,
  "far": 340
}
};

const aliases: Record<string, BaselineShot> = {counter: "reception", rentals: "led-rental", "projection-mapping": "projection", spatial: "projection", engineering: "technical", "show-control": "technical", production: "technical"};
type BaselineSelection = {shot: BaselineShot; camera: BaselineCamera} | null;
let cachedSearch: string | undefined;
let cachedSelection: BaselineSelection = null;

/** Explicit URL opt-in only. Unknown shots preserve the normal camera. */
export function baselineCameraForSearch(search: string): BaselineSelection {
  if (search === cachedSearch) return cachedSelection;
  cachedSearch = search;
  cachedSelection = null;
  const query = new URLSearchParams(search);
  if (query.get("camera") !== "baseline") return null;
  const raw = query.get("shot") ?? "";
  const shot = (aliases[raw] ?? raw) as BaselineShot;
  if (!Object.prototype.hasOwnProperty.call(BASELINE_CAMERAS, shot)) return null;
  cachedSelection = {shot, camera: BASELINE_CAMERAS[shot]};
  return cachedSelection;
}
