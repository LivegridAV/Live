"use client";
import { use } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { LOAD_GROUPS, START_GROUP, assetsFor } from "./groups";
import { chooseModelVariant, variantNeedsManifest, variantUrl, type ModelVariant } from "./modelVariants";
import { venueManifest, settledManifest } from "./manifest";
import { useLiteMode } from "./liteMode";
import { useVenue } from "../systems/store";

const pathOf = (url: string) => url.replace(/[?#].*$/, "");

let startFiles: Set<string> | null = null;
/** Every file of the start group, under any condition. */
export function startGroupFiles(): ReadonlySet<string> {
  if (!startFiles) {
    const start = LOAD_GROUPS.find(group => group.id === START_GROUP);
    startFiles = new Set(start ? [...assetsFor(start, new Set()), ...Object.values(start.variants ?? {}).flat()] : []);
  }
  return startFiles;
}

/** The variant the streamer and the components agree on for a GLB, outside lite mode. */
export function streamedVariant(path: string): ModelVariant {
  const { quality, isPhone: phone } = useVenue.getState();
  return chooseModelVariant(path, { lite: false, quality, phone, manifest: settledManifest() ?? null, startFiles: startGroupFiles() });
}

/**
 * The URL to load for a venue GLB requested as `url` (with its `?v=`
 * revision): the lite model in lite mode, the phone copy on phones and the
 * lod1 below high quality when the build made one, else `url` itself. Null in lite mode when the model has
 * no lite file and is not already loaded with the start group: lite mode never
 * fetches a later group's full file. Suspends until the manifest is known
 * when the choice depends on it.
 */
export function useModelUrl(url: string): string | null {
  const lite = useLiteMode();
  const quality = useVenue(s => s.quality);
  const phone = useVenue(s => s.isPhone);
  const manifest = variantNeedsManifest(lite, quality, phone) ? use(venueManifest()) : null;
  const variant = chooseModelVariant(pathOf(url), { lite, quality, phone, manifest, startFiles: startGroupFiles() });
  return variant === "none" ? null : variantUrl(url, variant);
}

/**
 * A light-pack model is never shown again once its group is warm: free its
 * GPU buffers and drop it from the loader cache. Only the lite file's own
 * geometry is released (materials and textures may be shared finishes).
 */
export function releaseLiteModel(url: string, scene: THREE.Object3D) {
  scene.traverse(object => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
  useGLTF.clear(url);
}
