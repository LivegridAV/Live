import { useSyncExternalStore } from "react";

/**
 * Whether this device is a phone: touch with a small screen (either way
 * round). Phones load the phone copies of the venue's models and screen
 * images, and stream only the zones near the visitor, to spare mobile data.
 * Tablets and laptops keep the full files. `?phone=1|0` forces it either way,
 * for review on any device.
 *
 * Read once, when the store is created, so the very first file a component
 * requests is already the phone one (an effect would run after the scene's
 * own effects had started loading).
 */
export function detectPhone(): boolean {
  if (typeof window === "undefined") return false;
  const forced = new URLSearchParams(window.location.search).get("phone");
  if (forced === "1" || forced === "0") return forced === "1";
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  return coarse && Math.min(window.screen.width, window.screen.height) < 600;
}


/**
 * Touch screens (phones and tablets) held upright. The venue is a walk built
 * for a wide frame, so upright touch devices see the rotate screen
 * (RotateGate) and the walk starts only once the device is turned sideways.
 * `?rotate=0` turns the rule off, for review tooling.
 */
const UPRIGHT_TOUCH = "(pointer: coarse) and (orientation: portrait)";

function subscribeUpright(onChange: () => void) {
  const query = window.matchMedia(UPRIGHT_TOUCH);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function uprightNow(): boolean {
  if (new URLSearchParams(window.location.search).get("rotate") === "0") return false;
  return window.matchMedia(UPRIGHT_TOUCH).matches;
}

export function useUprightTouch(): boolean {
  return useSyncExternalStore(subscribeUpright, uprightNow, () => false);
}
