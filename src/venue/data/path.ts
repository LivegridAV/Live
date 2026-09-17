import * as THREE from "three";

/**
 * The camera path through the venue.
 *
 * The visitor's scroll is a single number 0 → 1; this file turns it into a
 * position, a look-at target and a field of view. Keyframes carry their own
 * `p` (progress) so the *timing* of the walkthrough is authored explicitly —
 * dense keyframes slow the camera down for the moments worth lingering on —
 * while a Catmull-Rom style Hermite interpolation keeps the actual motion
 * curved and continuous, never a sequence of straight lines.
 *
 * World units are metres. The venue runs along -Z, floor at y = 0.
 */

export interface Keyframe {
  /** progress 0 → 1 */
  p: number;
  pos: [number, number, number];
  look: [number, number, number];
  fov: number;
}

export const KEYFRAMES: Keyframe[] = [
  /* ── Arrival: outside the venue ─────────────────────── */
  { p: 0.0, pos: [0, 2.35, 21], look: [0, 4.1, -1], fov: 50 },
  { p: 0.045, pos: [0, 2.05, 13], look: [0, 3.5, -5], fov: 49 },
  { p: 0.085, pos: [0, 1.8, 6.2], look: [0, 2.8, -11], fov: 48 },

  /* ── Entry portal ───────────────────────────────────── */
  { p: 0.118, pos: [0, 1.7, 0.5], look: [0, 2.3, -14], fov: 47 },

  /* ── Four-sided LED tunnel (-4 → -24) ───────────────── */
  { p: 0.15, pos: [0, 1.74, -4.5], look: [0, 1.95, -20], fov: 62 },
  { p: 0.19, pos: [-0.35, 1.8, -10], look: [0.2, 1.9, -26], fov: 66 },
  { p: 0.228, pos: [0.4, 1.86, -16], look: [-0.25, 1.95, -31], fov: 67 },
  { p: 0.265, pos: [0, 1.8, -22], look: [0, 2.2, -34], fov: 62 },

  /* ── Exhibition hall reveal ─────────────────────────── */
  { p: 0.3, pos: [0, 2.2, -29], look: [0, 5.4, -46], fov: 55 },
  { p: 0.33, pos: [0, 2.6, -36], look: [-6, 4.0, -50], fov: 52 },

  /* ── Creative LED gallery ───────────────────────────── */
  { p: 0.362, pos: [-3.5, 2.2, -44], look: [-9.5, 3.2, -54], fov: 50 }, // pillars
  { p: 0.392, pos: [1.5, 2.0, -53], look: [7.5, 2.8, -61], fov: 50 }, // blades
  { p: 0.422, pos: [5.0, 2.1, -61], look: [8.6, 3.0, -70], fov: 50 }, // cylinder
  { p: 0.452, pos: [0.5, 2.5, -69], look: [-3.2, 4.6, -77], fov: 53 }, // ring
  { p: 0.482, pos: [-4.5, 1.9, -77], look: [-9.6, 2.0, -83], fov: 48 }, // bar
  { p: 0.512, pos: [1.0, 2.0, -85], look: [6.6, 2.8, -91], fov: 48 }, // curved
  { p: 0.54, pos: [-1.0, 2.05, -93.4], look: [-6.6, 2.5, -98.8], fov: 47 }, // anamorphic corner
  { p: 0.566, pos: [0, 2.0, -101], look: [0, 2.9, -114], fov: 52 },

  /* ── Service boulevard: eight pavilions ─────────────── */
  { p: 0.592, pos: [-3.4, 2.15, -108.5], look: [-9.6, 3.0, -113.0], fov: 52 },
  { p: 0.617, pos: [3.4, 2.15, -123.5], look: [9.6, 3.0, -128.0], fov: 52 },
  { p: 0.642, pos: [-3.4, 2.15, -138.5], look: [-9.6, 3.0, -143.0], fov: 52 },
  { p: 0.667, pos: [3.4, 2.15, -153.5], look: [9.6, 3.0, -158.0], fov: 52 },
  { p: 0.692, pos: [-3.4, 2.15, -168.5], look: [-9.6, 2.9, -173.0], fov: 52 },
  { p: 0.717, pos: [3.4, 2.15, -183.5], look: [9.6, 2.9, -188.0], fov: 52 },
  { p: 0.742, pos: [-3.4, 2.15, -198.5], look: [-9.6, 2.9, -203.0], fov: 52 },
  { p: 0.767, pos: [3.4, 2.15, -213.5], look: [9.6, 2.9, -218.0], fov: 52 },

  /* ── Sound & lighting partner bay ───────────────────── */
  { p: 0.789, pos: [0.9, 2.0, -227], look: [7.5, 2.8, -232], fov: 50 },

  /* ── Arena approach + portal ────────────────────────── */
  { p: 0.812, pos: [0, 2.0, -239], look: [0, 4.4, -254], fov: 54 },
  { p: 0.836, pos: [0, 2.5, -253], look: [0, 7.5, -272], fov: 59 },

  /* ── Main arena ─────────────────────────────────────── */
  { p: 0.864, pos: [0, 3.2, -268], look: [0, 10.5, -296], fov: 57 },
  { p: 0.892, pos: [0, 2.7, -284], look: [0, 8.0, -310], fov: 53 },

  /* ── Main stage ─────────────────────────────────────── */
  { p: 0.918, pos: [0, 2.5, -297], look: [0, 8.6, -322], fov: 50 },
  { p: 0.942, pos: [0, 3.3, -305], look: [0, 9.6, -325], fov: 48 },

  /* ── Finale ─────────────────────────────────────────── */
  { p: 0.966, pos: [0, 6.4, -299], look: [0, 10.2, -326], fov: 46 },
  { p: 0.986, pos: [0, 9.6, -290], look: [0, 11.2, -327], fov: 44 },

  /* ── Contact settle ─────────────────────────────────── */
  { p: 1.0, pos: [0, 5.4, -298], look: [0, 8.4, -326], fov: 43 },
];

/* ── Hermite interpolation with Catmull-Rom tangents ───── */

const _v = new THREE.Vector3();

function hermite(
  out: THREE.Vector3,
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  m0: THREE.Vector3,
  m1: THREE.Vector3,
  t: number,
) {
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  out.set(
    h00 * p0.x + h10 * m0.x + h01 * p1.x + h11 * m1.x,
    h00 * p0.y + h10 * m0.y + h01 * p1.y + h11 * m1.y,
    h00 * p0.z + h10 * m0.z + h01 * p1.z + h11 * m1.z,
  );
  return out;
}

/** Pre-baked vectors so sampling allocates nothing per frame. */
const POS = KEYFRAMES.map((k) => new THREE.Vector3(...k.pos));
const LOOK = KEYFRAMES.map((k) => new THREE.Vector3(...k.look));

/** Catmull-Rom tangents, scaled to the (uneven) progress spacing. */
function tangents(points: THREE.Vector3[]) {
  return points.map((_, i) => {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    return new THREE.Vector3().subVectors(next, prev).multiplyScalar(0.5);
  });
}
const POS_T = tangents(POS);
const LOOK_T = tangents(LOOK);

const _m0 = new THREE.Vector3();
const _m1 = new THREE.Vector3();

export interface PathSample {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
  /** index of the keyframe segment, useful for debugging */
  segment: number;
}

const _outPos = new THREE.Vector3();
const _outLook = new THREE.Vector3();

/**
 * Sample the path. Mutates and returns shared vectors — copy them if you need
 * to keep the values past the current frame.
 */
export function samplePath(progress: number, out: PathSample): PathSample {
  const p = THREE.MathUtils.clamp(progress, 0, 1);

  // Locate the segment. Linear scan is fine: ~35 keyframes, and the camera
  // moves monotonically so the branch predictor loves it.
  let i = 0;
  while (i < KEYFRAMES.length - 2 && KEYFRAMES[i + 1].p < p) i++;

  const a = KEYFRAMES[i];
  const b = KEYFRAMES[i + 1];
  const span = Math.max(1e-6, b.p - a.p);
  const t = THREE.MathUtils.clamp((p - a.p) / span, 0, 1);

  // Tangents are in "per keyframe index" space; rescale to this segment's
  // progress width so uneven keyframe spacing still produces smooth speed.
  const scale = span * (KEYFRAMES.length - 1);

  _m0.copy(POS_T[i]).multiplyScalar(scale);
  _m1.copy(POS_T[i + 1]).multiplyScalar(scale);
  hermite(_outPos, POS[i], POS[i + 1], _m0, _m1, t);

  _m0.copy(LOOK_T[i]).multiplyScalar(scale);
  _m1.copy(LOOK_T[i + 1]).multiplyScalar(scale);
  hermite(_outLook, LOOK[i], LOOK[i + 1], _m0, _m1, t);

  out.pos.copy(_outPos);
  out.look.copy(_outLook);
  out.fov = THREE.MathUtils.lerp(a.fov, b.fov, smooth(t));
  out.segment = i;
  return out;
}

function smooth(t: number) {
  return t * t * (3 - 2 * t);
}

export function createSample(): PathSample {
  return { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 50, segment: 0 };
}

/** Total path length in metres — used for the "distance travelled" HUD. */
export const PATH_LENGTH = (() => {
  let total = 0;
  for (let i = 0; i < POS.length - 1; i++) total += _v.subVectors(POS[i + 1], POS[i]).length();
  return total;
})();
