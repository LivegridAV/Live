/**
 * Where the venue's local review, capture and inspection URL modes run
 * (?record=1, ?inspect=placement, ?camera=qa|baseline, ?capture=1,
 * ?opening=). Every script that uses them opens the export preview on
 * 127.0.0.1 or the dev server, so they run on loopback hosts, under
 * `next dev`, and in a build made with NEXT_PUBLIC_VENUE_REVIEW=true (for
 * example a preview deployment). On any other host the flags are ignored and
 * the visitor gets the ordinary venue. ?diag, ?perf and ?phone are not gated.
 * Callers: Venue (capture), stream.fullLoadRequested, baselineCameraForSearch,
 * useOpeningPlan (opening), ReviewRecorder (record) and
 * PlacementInspection.placementInspectionEnabled (inspect; read by Scene and
 * ZoneGroup).
 */
export function reviewToolsAllowed(): boolean {
  if (process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_VENUE_REVIEW === "true") return true;
  // Outside a browser the callers keep their own location checks.
  if (typeof location === "undefined") return true;
  const host = location.hostname || "";
  return host === "" || host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host.endsWith(".localhost");
}
