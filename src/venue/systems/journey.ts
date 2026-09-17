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

export function resetJourney() {
  journey.progress = 0;
  journey.target = 0;
  journey.velocity = 0;
  journey.idle = 0;
}
