import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { isCompressed, loadVenueTexture, placeholderTexture } from "./textureLoading";

/** One public floor in world metres. Selection never changes its finish. */
export const VENUE_FLOOR = Object.freeze({
  origin: [0, 0] as const, tileMetres: 2, jointMetres: .004,
  textureMetres: 4, colour: "#858b90",
});

export type VenueFloorMaps = { map: THREE.Texture; roughnessMap: THREE.Texture; normalMap: THREE.Texture };

/** Shown until the stone files have loaded: plain stone, ORM roughness, a flat normal. */
const PLACEHOLDERS: VenueFloorMaps = {
  map: placeholderTexture("#858b90"), roughnessMap: placeholderTexture("#ffb400"), normalMap: placeholderTexture("#8080ff"),
};

function stoneTexture(gl: THREE.WebGLRenderer, file: string, colour: boolean) {
  // The KTX2 sibling when the build made one, else the WebP (textureLoading).
  return loadVenueTexture(`/media/technical-showcase/materials/${file}`, gl).then(result => {
    result.name = `Continuous venue stone / ${file}`;
    result.colorSpace = colour ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    result.repeat.set(1, 1); result.offset.set(0, 0); result.rotation = 0;
    result.wrapS = result.wrapT = THREE.RepeatWrapping;
    result.magFilter = THREE.LinearFilter; result.minFilter = THREE.LinearMipmapLinearFilter;
    // A KTX2 file carries its own mip chain; three cannot generate one for it.
    result.generateMipmaps = !isCompressed(result);
    // A fresh clone (cloneShared), configured before its first draw: setting
    // needsUpdate would re-upload the shared image.
    result.anisotropy = 8;
    return result;
  });
}

let loaded: VenueFloorMaps | null = null;
let loading: Promise<VenueFloorMaps> | null = null;
function loadMaps(gl: THREE.WebGLRenderer) {
  return loading ??= Promise.all([
    stoneTexture(gl, "floor-color.webp", true),
    stoneTexture(gl, "floor-orm.webp", false),
    stoneTexture(gl, "floor-normal.webp", false),
  ]).then(([map, roughnessMap, normalMap]) => loaded = { map, roughnessMap, normalMap });
}

/**
 * The venue stone's maps: placeholders on the first frames, then the loaded
 * files (one set shared by every floor mesh). Changing a map that was already
 * set keeps the material's shader program.
 */
export function useVenueFloorMaps(): VenueFloorMaps {
  const gl = useThree(state => state.gl);
  const [maps, setMaps] = useState(() => loaded ?? PLACEHOLDERS);
  useEffect(() => {
    let live = true;
    loadMaps(gl).then(result => { if (live) setMaps(result); }, error => console.warn("[venue] floor stone failed to load", error));
    return () => { live = false; };
  }, [gl]);
  return maps;
}
