import * as THREE from "three";
import { VENUE_FLOOR } from "./venueFloor";
import { transformOldWorldToNew, type InstallationId } from "../data/placements";

const prepared = new WeakSet<THREE.Material>();

/** Rebase the existing finish patch with its installation, without changing
 * the shared stone tile coordinates, phase or the protected arena floor. */
function finishBounds(id:InstallationId,min:readonly number[],max:readonly number[]) {
  const corners=[min[0],max[0]].flatMap(x=>[min[1],max[1]].map(z=>transformOldWorldToNew(id,[x,0,z])));
  return {worldMinXZ:[Math.min(...corners.map(p=>p[0])),Math.min(...corners.map(p=>p[2]))],
    worldMaxXZ:[Math.max(...corners.map(p=>p[0])),Math.max(...corners.map(p=>p[2]))]};
}

/** Permanent native-metre finish within the Rental footprint. This never
 * depends on the selected stall, camera or journey progress. */
export const RENTAL_FLOOR_FINISH = Object.freeze({
  ...finishBounds("S2",[-26,-187],[-10,-163]),
  edgeMetres: .06,
  baseFactor: .8,
  roughness: .26,
  reflectionBase: .30,
  blurFloor: .30,
});

export const PROJECTION_FLOOR_FINISH = Object.freeze({
  ...finishBounds("S4",[10,-217],[26,-193]),
  edgeMetres: .06,
  baseFactor: .54,
  roughness: .28,
  reflectionBase: .32,
  blurFloor: .55,
});

/** Installed drei reflector source is the basis of these patches. Reflector
 * samples share PBR UVs; radiance is composited once after physical lighting.
 * Softness belongs to the floor buffer, never the camera image.
 *
 * `staticReflection` (a phone, which draws no live reflection): the same
 * finish on a plain MeshStandardMaterial, with this linear colour standing
 * in for the reflected hall, so the stone keeps its tone, joints and zone
 * finishes. */
export function preparePolishedFloor(material: THREE.MeshStandardMaterial, staticReflection?: THREE.Color) {
  if (prepared.has(material)) return;
  prepared.add(material);
  const original = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    original.call(material, shader, renderer);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vVenueFloorWorld;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvVenueFloorWorld=(modelMatrix*vec4(transformed,1.0)).xyz;");
    const rental = RENTAL_FLOOR_FINISH;
    const lowerInset = rental.worldMinXZ.map(value => value + rental.edgeMetres);
    const upperInset = rental.worldMaxXZ.map(value => value - rental.edgeMetres);
    const projection=PROJECTION_FLOOR_FINISH;
    const projectionLower=projection.worldMinXZ.map(value=>value+projection.edgeMetres);
    const projectionUpper=projection.worldMaxXZ.map(value=>value-projection.edgeMetres);
    shader.fragmentShader = `varying vec3 vVenueFloorWorld;
      float rentalFloorFinishMask(){
        vec2 lower=smoothstep(vec2(${rental.worldMinXZ.join(",")}),vec2(${lowerInset.join(",")}),vVenueFloorWorld.xz);
        vec2 upper=1.0-smoothstep(vec2(${upperInset.join(",")}),vec2(${rental.worldMaxXZ.join(",")}),vVenueFloorWorld.xz);
        return lower.x*lower.y*upper.x*upper.y;
      }
      float projectionFloorFinishMask(){
        vec2 lower=smoothstep(vec2(${projection.worldMinXZ.join(",")}),vec2(${projectionLower.join(",")}),vVenueFloorWorld.xz);
        vec2 upper=1.0-smoothstep(vec2(${projectionUpper.join(",")}),vec2(${projection.worldMaxXZ.join(",")}),vVenueFloorWorld.xz);
        return lower.x*lower.y*upper.x*upper.y;
      }
      ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader
      .replace("texture2D(normalMap, vUv * normalScale)", "texture2D(normalMap, vNormalMapUv)")
      .replace("my_normal.xz * 0.05", "my_normal.xz * .0015")
      .replace("texture2D( roughnessMap, vUv )", "texture2D( roughnessMap, vRoughnessMapUv )")
      .replace("blurFactor = min(1.0, mixBlur * reflectorRoughnessFactor);", `
        reflectorRoughnessFactor=mix(reflectorRoughnessFactor,roughnessFactor,rentalFloorFinish);
        reflectorRoughnessFactor=mix(reflectorRoughnessFactor,roughnessFactor,projectionFloorFinish);
        float nativeFloorBlur=mix(mix(.55,${rental.blurFloor.toFixed(4)},rentalFloorFinish),${projection.blurFloor.toFixed(4)},projectionFloorFinish);
        blurFactor=min(1.0,max(nativeFloorBlur,mixBlur*reflectorRoughnessFactor));`)
      .replace("diffuseColor.rgb = diffuseColor.rgb * ((1.0 - min(1.0, mirror)) + newMerge.rgb * mixStrength);", "// Floor reflection is composited after lighting below.")
      .replace("#include <color_fragment>", `#include <color_fragment>
        float rentalFloorFinish=rentalFloorFinishMask();
        float projectionFloorFinish=projectionFloorFinishMask();
        vec2 venueTile=(vVenueFloorWorld.xz-vec2(${VENUE_FLOOR.origin.join(",")}))/${VENUE_FLOOR.tileMetres.toFixed(4)};
        vec2 venueEdge=min(fract(venueTile),1.0-fract(venueTile));
        vec2 venueAA=max(fwidth(venueTile),vec2(.00015));
        vec2 venueJoint=1.0-smoothstep(vec2(${(VENUE_FLOOR.jointMetres/VENUE_FLOOR.tileMetres*.5).toFixed(6)}),vec2(${(VENUE_FLOOR.jointMetres/VENUE_FLOOR.tileMetres).toFixed(6)})+venueAA,venueEdge);
        float venueGrout=max(venueJoint.x,venueJoint.y);
        float venueSlab=fract(sin(dot(floor(venueTile),vec2(127.1,311.7)))*43758.5453);
        diffuseColor.rgb*=(.97+.06*venueSlab)*(1.0-.27*venueGrout);
        diffuseColor.rgb*=mix(1.0,${rental.baseFactor.toFixed(4)},rentalFloorFinish)*mix(1.0,${projection.baseFactor.toFixed(4)},projectionFloorFinish);`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
        // Target the final PBR roughness after the photographic ORM has been
        // multiplied in, retaining its small mineral-to-mineral variation.
        float rentalMineralRoughness=${rental.roughness.toFixed(4)}*(.92+.16*clamp(roughnessFactor/max(roughness,.0001),0.0,1.0));
        roughnessFactor=mix(roughnessFactor,rentalMineralRoughness,rentalFloorFinish);
        float projectionMineralRoughness=${projection.roughness.toFixed(4)}*(.92+.16*clamp(roughnessFactor/max(roughness,.0001),0.0,1.0));
        roughnessFactor=mix(roughnessFactor,projectionMineralRoughness,projectionFloorFinish);`)
      .replace("#include <lights_fragment_end>", `#include <lights_fragment_end>
        reflectedLight.directSpecular*=.34;
        reflectedLight.indirectSpecular*=.58;`)
      .replace("#include <opaque_fragment>", `${staticReflection ? `vec4 newMerge=vec4(${staticReflection.toArray().map(v => v.toFixed(5)).join(",")},1.0);` : ""}
        float venueFresnel=mix(mix(.22,${rental.reflectionBase.toFixed(4)},rentalFloorFinish),${projection.reflectionBase.toFixed(4)},projectionFloorFinish)+.26*pow(1.0-saturate(dot(normal,geometryViewDir)),3.0);
        outgoingLight=mix(outgoingLight,newMerge.rgb*vec3(.94,.96,.98),venueFresnel*(1.0-.16*venueGrout));
        #include <opaque_fragment>`);
  };
  const key = "venue-continuous-world-stone-grand-v3-permanent-native-finishes" + (staticReflection ? `-static-${staticReflection.getHexString()}` : "");
  material.customProgramCacheKey = () => key;
  material.needsUpdate = true;
}
