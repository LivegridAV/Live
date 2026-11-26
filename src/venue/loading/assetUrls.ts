import { expoAssetUrl } from "../three/ExpoAsset";
import { variantUrl, type ModelVariant } from "./modelVariants";
import { MEDIA } from "../data/media";
import { LED_RENTAL_2026_ART } from "../media/ledRental2026Painters";
import { PROJECTION_ART } from "../media/projectionPainters";
import { TECHNICAL_STAGE_SOURCE } from "../media/technicalPainters";
import anamorphicLayout from "../../../public/models/expo/grand-anamorphic-shape-v3-layout.json";
import rentalLayout from "../../../public/models/expo/grand-rental-finish-v2-layout.json";
import pillarLayout from "../../../public/models/expo/grand-pillar-layout.json";
import projectionLayout from "../../../public/models/expo/projection-finish-v2-blender-layout.json";
import crystalsLayout from "../../../public/models/expo/projection-finish-v2-crystals-layout.json";
import receptionLayout from "../../../public/models/expo/grand-reception-layout.json";
import brandingLayout from "../../../public/models/expo/grand-reception-brand-wall-v2-layout.json";
import technicalLayout from "../../../public/models/expo/grand-technical-shape-v3-layout.json";
import technicalHall from "../../../public/models/expo/technical-reference-hall-rig-v3.json";

/**
 * The exact URLs the venue requests for each groups.json path.
 *
 * groups.json lists plain public paths. The components add revision queries
 * (`?v=…`), and drei caches a GLB by its full URL, so the streamer must ask for
 * the same URL a component will, or the file downloads twice. The revisions
 * below are read from the same layout files, with the same expressions, as
 * the components that mount these models (see each zone's `ExpoAsset` props).
 * With `?perf`, LoadGroupGate reports any file the page requested twice.
 */
const GLB_REVISIONS: Record<string, string | undefined> = {
  "grand-anamorphic-shape-v3-shell": anamorphicLayout.assets["grand-anamorphic-shape-v3-shell"].sha256,
  "grand-anamorphic-shape-v3-interior": anamorphicLayout.assets["grand-anamorphic-shape-v3-interior"].sha256,
  "grand-anamorphic-shape-v3-visitors": anamorphicLayout.assets["grand-anamorphic-shape-v3-visitors"].sha256,
  "grand-rental-finish-v2-shell": rentalLayout.stats.shell.sha256,
  "grand-rental-finish-v2-interior": rentalLayout.stats.interior.sha256,
  "grand-rental-finish-v2-visitors": rentalLayout.stats.visitors.sha256,
  "grand-rental-finish-v2-hall": rentalLayout.stats.hall.sha256,
  "grand-pillar-gallery": pillarLayout.geometry.sha256,
  "grand-pillar-visitors": pillarLayout.people.sha256,
  "grand-reception-brand-wall-v2": brandingLayout.geometry.sha256,
  "grand-reception-visitors": receptionLayout.people.sha256,
  "technical-reference-hall-rig-v3": technicalHall.asset.sha256,
  "grand-technical-shape-v3-shell": technicalLayout.assets["grand-technical-shape-v3-shell"].sha256,
  "grand-technical-shape-v3-interior": technicalLayout.assets["grand-technical-shape-v3-interior"].sha256,
  "grand-technical-shape-v3-visitors": technicalLayout.assets["grand-technical-shape-v3-visitors"].sha256,
  "projection-finish-v2-blender-shell": projectionLayout.stats.shell.sha256,
  "projection-finish-v2-blender-interior": projectionLayout.stats.interior.sha256,
  "projection-finish-v2-visitors": projectionLayout.stats.visitors.sha256,
  "projection-finish-v2-hall": projectionLayout.stats.hall.sha256,
  "projection-finish-v2-crystals": crystalsLayout.sha256,
  "hall-bay": undefined,
  "flagship-stage": undefined,
};

export type ModelRequest = { url: string; useDraco: boolean };

/**
 * How the venue requests a GLB: its URL and the `useGLTF` draco flag the
 * component passes. A derived variant (lite, lod1) keeps its source's `?v=`.
 */
export function modelRequest(path: string, variant: ModelVariant = "full"): ModelRequest {
  const expo = /^\/models\/expo\/([^/]+)\.glb$/.exec(path);
  if (expo) return { url: variantUrl(expoAssetUrl(expo[1], GLB_REVISIONS[expo[1]]), variant), useDraco: false };
  // EntranceP01 calls useGLTF(useModelUrl(path)) with drei's default flags.
  return { url: variantUrl(path, variant), useDraco: true };
}

let mediaUrls: Map<string, string[]> | null = null;
const pathOf = (url: string) => url.replace(/[?#].*$/, "");

/** Every URL the media engine and the painters may request for `path`. */
export function mediaRequests(path: string): string[] {
  if (!mediaUrls) {
    mediaUrls = new Map();
    const sources = [
      ...Object.values(MEDIA).flatMap(desc => {
        const files = desc as { desktop?: string; mobile?: string; festival?: string; festivalMobile?: string; poster?: string };
        return [files.desktop, files.mobile, files.festival, files.festivalMobile, files.poster];
      }),
      ...Object.values(LED_RENTAL_2026_ART), ...Object.values(PROJECTION_ART), TECHNICAL_STAGE_SOURCE,
    ];
    for (const url of sources) {
      if (typeof url !== "string" || !url.startsWith("/media/")) continue;
      const list = mediaUrls.get(pathOf(url)) ?? [];
      if (!list.includes(url)) list.push(url);
      mediaUrls.set(pathOf(url), list);
    }
  }
  // Files no descriptor names (technical PBR sets, the floor) are requested by their plain path.
  return mediaUrls.get(path) ?? [path];
}

export { pathOf };
