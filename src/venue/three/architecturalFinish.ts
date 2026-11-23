import * as THREE from "three";
import { applyFinishGrain, type FinishFrame } from "./finishGrain";
import { isPremiumSignMaterial, stylePremiumSign } from "./premiumSignMaterials";
import { placementWorldMatrix, type InstallationId } from "../data/placements";

const finishFrames=new Map<InstallationId,FinishFrame>();
/** Preserve the accepted world-projected grain in each installation's old frame. */
export function installationFinishFrame(id:InstallationId):FinishFrame {
  let frame=finishFrames.get(id);
  if(!frame){
    const current=new THREE.Matrix4().fromArray(placementWorldMatrix(id));
    const baseline=new THREE.Matrix4().fromArray(placementWorldMatrix(id,true));
    const worldToBaseline=baseline.multiply(current.invert());
    frame={worldToBaseline,baselineToWorldRotation:new THREE.Matrix3().setFromMatrix4(worldToBaseline.clone().invert())};
    finishFrames.set(id,frame);
  }
  return frame;
}

// A fine, world-space finish shared by the authored buildings. This adds
// subtle honed-stone / powder-coat roughness without stretching an image map
// over differently sized pieces. Baked GLB vertex colours supply contact AO.
const prepared = new WeakSet<THREE.Material>();
const PREMIUM_HALO_MATERIAL = "Premium Sign | aqua halo";
export function prepareArchitecture(model: THREE.Object3D,installation?:InstallationId) {
  const frame=installation?installationFinishFrame(installation):null;
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    // The halo plane's soft alpha is ignored by the shadow map, so it would cast an opaque rectangle.
    object.castShadow = !materials.some(material => material?.name === PREMIUM_HALO_MATERIAL);
    object.receiveShadow = true;
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial) || prepared.has(material)) continue;
      prepared.add(material);
      if (isPremiumSignMaterial(material.name)) { stylePremiumSign(material); continue; }
      // The photographed skin, hair and clothing maps already carry their
      // surface detail; architectural world-space grain would damage it.
      if (/^Rocketbox\s*\|/i.test(material.name)) continue;
      if (/Technical.*concealed warm white LED/i.test(material.name)) {
        material.emissive.set("#ffd19a"); material.emissiveIntensity = 1.45;
      }
      if (/glass|(?:clear|frosted).*acrylic/i.test(material.name)) { material.depthWrite = false; material.side = THREE.DoubleSide; continue; }
      if (/light|porcelain|substrate|leaf|water/i.test(material.name)) continue;
      const stone = /stone|travertine/i.test(material.name);
      const pathway = /honed pathway/i.test(material.name);
      const granite = /granite/i.test(material.name);
      const castCounter = /Technical.*rough cast black metal counter/i.test(material.name);
      const fabric = /upholstery/i.test(material.name);
      if (castCounter) { material.roughness = .43; material.metalness = .56; }
      if (stone) material.roughness = Math.max(.48, material.roughness);
      applyFinishGrain(material, {stone,pathway,granite,castCounter,fabric}, frame, installation);
    }
  });
}
