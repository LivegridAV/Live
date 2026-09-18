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
  /* ── Arrival ─────────────────────────────────────────────
     Establish the building wide, then break the centre line: the camera
     drifts left, swings right past the entrance blades and only lines up on
     the portal at the last moment. Travelling straight down the middle from
     the first frame is what made the old opening read as a fly-through. */
  { p: 0.0, pos: [0, 2.45, 24], look: [0, 5.0, 0], fov: 48 },
  { p: 0.03, pos: [-3.4, 2.25, 17.5], look: [1.6, 4.4, -2], fov: 50 },
  { p: 0.062, pos: [2.8, 1.95, 10.6], look: [-1.2, 3.4, -6], fov: 52 },
  { p: 0.095, pos: [0.2, 1.82, 4.6], look: [0, 2.7, -10], fov: 50 },

  /* Entry portal — the frame passes around the viewer. */
  { p: 0.122, pos: [0, 1.74, -0.8], look: [0, 2.25, -14], fov: 52 },

  /* ── Four-sided LED tunnel (-3.4 → -28.4) ────────────────
     Small lateral offsets only. Inside a projected environment the parallax
     does the work; swinging the camera about would fight the illusion. */
  { p: 0.15, pos: [0, 1.74, -4.6], look: [0, 2.0, -22], fov: 64 },
  { p: 0.186, pos: [-0.52, 1.82, -10.5], look: [0.35, 1.95, -30], fov: 68 },
  { p: 0.222, pos: [0.56, 1.88, -16.5], look: [-0.3, 2.0, -34], fov: 68 },
  { p: 0.256, pos: [-0.26, 1.8, -22.5], look: [0.16, 2.1, -38], fov: 65 },
  { p: 0.282, pos: [0, 1.82, -27.6], look: [0, 2.45, -40], fov: 60 },

  /* ── Vestibule, then the hall reveal ────────────────────
     The tilt up at -37 is the reveal: the ceiling leaves the frame and a
     fifteen-metre hall arrives. */
  { p: 0.3, pos: [0, 2.0, -31.5], look: [0, 3.3, -44], fov: 56 },
  { p: 0.318, pos: [0, 2.4, -37], look: [-1.6, 6.8, -52], fov: 58 },
  { p: 0.34, pos: [1.7, 2.5, -42.5], look: [-6.6, 4.6, -50], fov: 54 },

  /* ── Creative LED gallery ────────────────────────────────
     Each installation gets a shape: come at it, go through or beside it, then
     turn out of it toward the next. The camera is inside the pillar cluster
     at 0.376 and directly under the ring at 0.496 — those two moments are
     what make the gallery feel walked rather than watched. */
  { p: 0.36, pos: [-2.3, 2.2, -45.5], look: [-9.8, 3.4, -50.5], fov: 52 },
  { p: 0.376, pos: [-6.6, 1.95, -49.5], look: [-11.6, 3.2, -55.5], fov: 55 },
  { p: 0.392, pos: [-4.0, 2.15, -54.5], look: [3.2, 3.2, -59], fov: 52 },
  { p: 0.41, pos: [1.2, 2.05, -57.5], look: [8.6, 3.0, -60.5], fov: 50 },
  { p: 0.428, pos: [5.2, 2.0, -61.5], look: [9.8, 2.6, -66], fov: 52 },
  /* The close pass on the cylinder.
     These two sit about two metres off its surface, which is the point — but at
     that distance a 13.8 m circumference rendered at 1280 px is ~90 texels per
     metre and the content goes soft, so the media manifest sizes this surface
     from its *closest approach* rather than from how big it is on screen from
     the aisle. Widening the lens at 0.446 keeps some room in the frame; pulling
     the camera back instead put it a metre from the blades stand's backdrop. */
  { p: 0.446, pos: [2.0, 2.3, -66.9], look: [8.6, 3.0, -70.2], fov: 54 },
  { p: 0.462, pos: [3.4, 2.3, -74.4], look: [8.8, 3.1, -70.2], fov: 54 },
  { p: 0.48, pos: [1.4, 2.4, -75], look: [-3.2, 6.0, -78], fov: 56 },
  { p: 0.496, pos: [-3.2, 2.5, -78.6], look: [-3.2, 7.6, -80.2], fov: 62 },
  { p: 0.512, pos: [-4.2, 2.1, -82], look: [-9.6, 2.3, -85], fov: 50 },
  { p: 0.528, pos: [-6.2, 1.88, -81.6], look: [-10.2, 1.7, -84.4], fov: 50 },
  { p: 0.544, pos: [-2.6, 2.1, -88.5], look: [6.9, 2.9, -91], fov: 52 },
  { p: 0.556, pos: [2.6, 2.05, -92], look: [-8.6, 2.7, -94], fov: 52 },
  /* The anamorphic viewing point. The corner is rendered for exactly this
     position, so the keyframe is not a composition choice — it is the mark. */
  { p: 0.566, pos: [-1.7, 1.78, -94.1], look: [-6.6, 2.4, -99], fov: 50 },

  /* ── Service boulevard: eight pavilions ─────────────────
     Alternating sides with a transition keyframe between each, so the camera
     crosses the aisle instead of sliding along it. The `p` of each pavilion
     keyframe matches its entry in data/pavilions.ts — that is what puts the
     stall light, the prompt and the camera on the same beat. */
  { p: 0.578, pos: [-1.1, 2.0, -100.5], look: [0, 3.1, -112], fov: 54 },
  { p: 0.592, pos: [-2.8, 2.12, -109.5], look: [-9.5, 3.0, -113.5], fov: 52 },
  { p: 0.605, pos: [-0.6, 2.16, -117], look: [2.4, 3.0, -124], fov: 54 },
  { p: 0.617, pos: [2.8, 2.12, -124.5], look: [9.5, 3.0, -128.5], fov: 52 },
  { p: 0.63, pos: [0.6, 2.16, -132], look: [-2.4, 3.0, -139], fov: 54 },
  { p: 0.642, pos: [-2.8, 2.12, -139.5], look: [-9.5, 3.0, -143.5], fov: 52 },
  { p: 0.655, pos: [-0.6, 2.16, -147], look: [2.4, 3.0, -154], fov: 54 },
  { p: 0.667, pos: [2.6, 2.12, -154.0], look: [10.4, 2.9, -156.2], fov: 52 },
  { p: 0.68, pos: [0.6, 2.16, -162], look: [-2.4, 3.0, -169], fov: 54 },
  { p: 0.692, pos: [-2.8, 2.12, -169.5], look: [-9.5, 2.9, -173.5], fov: 52 },
  { p: 0.705, pos: [-0.6, 2.16, -177], look: [2.4, 3.0, -184], fov: 54 },
  { p: 0.717, pos: [2.8, 2.12, -184.5], look: [9.5, 2.9, -188.5], fov: 52 },
  { p: 0.73, pos: [0.6, 2.16, -192], look: [-2.4, 3.0, -199], fov: 54 },
  { p: 0.742, pos: [-2.8, 2.12, -199.5], look: [-9.5, 2.9, -203.5], fov: 52 },
  { p: 0.755, pos: [-0.6, 2.16, -207], look: [2.4, 3.0, -214], fov: 54 },
  { p: 0.767, pos: [2.8, 2.12, -214.5], look: [9.5, 2.9, -218.5], fov: 52 },

  /* ── Sound & lighting partner bay ───────────────────────── */
  { p: 0.789, pos: [1.2, 2.05, -228], look: [8.2, 2.9, -232], fov: 50 },

  /* ── Arena approach and portal ──────────────────────────
     The portal is established from a distance, then the camera flies through
     it; the reveal on the far side is a tilt up into a room three times the
     height of the one just left. */
  { p: 0.812, pos: [0, 2.05, -237], look: [0, 4.8, -252], fov: 54 },
  { p: 0.83, pos: [0, 2.6, -248], look: [0, 8.5, -266], fov: 60 },
  { p: 0.846, pos: [0, 3.2, -256], look: [0, 12.0, -284], fov: 64 },

  /* ── Main arena: the stage grows until it owns the frame ──
     The set is sixty-plus metres wide, so the approach is about the array
     *filling* the frame rather than about closing distance: the camera comes
     down the centre aisle and the elevation keeps opening sideways past the
     edges of the picture. An earlier cut held the stage small until 0.91,
     which is the one mistake an arena sequence cannot survive.

     The camera also climbs, from eye height on the floor to five metres up by
     the hero mark. That is not a flourish: the house ceiling is the top third
     of this composition, and from floor level it sits above the top of the
     frame no matter how wide the lens goes. */
  { p: 0.862, pos: [0, 4.2, -276], look: [0, 11.0, -338], fov: 56 },
  { p: 0.884, pos: [-2.6, 4.6, -288], look: [0, 10.0, -346], fov: 52 },
  { p: 0.906, pos: [2.2, 5.0, -297], look: [0, 9.4, -350], fov: 48 },

  /* ── Main stage ─────────────────────────────────────────
     Hero position: fifty metres out on the centre line, five metres up. From
     here the array runs edge to edge, the centre canvas alone is a third of
     the picture width, the lit ceiling recedes across the top and the seating
     falls away underneath — the whole room in one frame, which is the shot
     the reference is built around. */
  { p: 0.932, pos: [0, 5.4, -304], look: [0, 8.8, -353], fov: 45 },
  { p: 0.95, pos: [0, 5.0, -313], look: [0, 8.2, -353], fov: 43 },

  /* ── Finale ─────────────────────────────────────────────
     The camera keeps rising and moves in. Nothing else in the venue leaves
     the ground, so the lift reads as the show ending. */
  { p: 0.968, pos: [0, 6.6, -311], look: [0, 9.2, -353], fov: 42 },
  { p: 0.986, pos: [0, 8.2, -307], look: [0, 9.8, -353], fov: 40 },

  /* ── Contact settle ─────────────────────────────────────── */
  { p: 1.0, pos: [0, 7.0, -309], look: [0, 8.8, -353], fov: 39 },
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
