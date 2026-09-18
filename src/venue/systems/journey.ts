/**
 * Frame-rate state that must not go through React.
 *
 * The camera's position changes every frame; pushing that through a store
 * would re-render the overlay sixty times a second for no reason. So the hot
 * value lives here as plain mutable state that `useFrame` reads directly, and
 * only *meaningful* changes (a new zone, a HUD-sized step in progress) are
 * published to the zustand store for the DOM to react to.
 */

export const journey = {
  /** damped progress the camera actually uses, 0 → 1 */
  progress: 0,
  /** raw scroll-derived progress, before damping */
  target: 0,
  /** signed, roughly -1 → 1 */
  velocity: 0,
  /** seconds since the visitor last moved — drives the ambient idle drift */
  idle: 0,
  /** pointer position, -1 → 1, for parallax */
  pointerX: 0,
  pointerY: 0,
  /** set while a detail panel owns the screen */
  locked: false,
};

/**
 * The show state of the main stage.
 *
 * Switching creative direction is not a texture swap, it is a cue: the rig
 * dips, the content changes while nobody can see it change, the movers find
 * new positions and the room comes back up in a different colour. Everything
 * that has to move together during those two seconds reads `show` — the
 * screens, the fixtures, the room wash and the lighting rig — so they stay on
 * the same beat without any of them re-rendering React.
 */
export const show = {
  /** animated 0 → 1, corporate → festival */
  mode: 0,
  /** where the cue is heading */
  target: 0,
  /** 0 settled, 1 at the bottom of the dip — the moment content is swapped */
  cue: 0,
  /** cue progress, 1 = finished */
  t: 1,
};

export function resetJourney() {
  journey.progress = 0;
  journey.target = 0;
  journey.velocity = 0;
  journey.idle = 0;
}
