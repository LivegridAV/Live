import * as THREE from "three";
import { installationFinishFrame } from "./architecturalFinish";
import { isCompressed, loadVenueTexture, placeholderTexture } from "./textureLoading";

/** CC0 surface data only. Source/licence records live beside the texture files. */
const BASE = "/media/technical-showcase/materials/";
type PackId = "floor" | "steel" | "cast" | "wool";
/**
 * A pack's maps as shader uniforms, shared by every material that uses the
 * pack: each holds a neutral placeholder until its file (KTX2 or WebP, see
 * textureLoading) has loaded, then the loaded texture. `ready` resolves with
 * the loaded textures.
 */
type Slot = { value: THREE.Texture };
type Pack = { map: Slot; orm: Slot; normal: Slot; ready: Promise<{ map: THREE.Texture; orm: THREE.Texture; normal: THREE.Texture }> };
const packs = new Map<PackId, Pack>();
const prepared = new WeakSet<THREE.Material>();
const acrylicMaterials = new WeakMap<THREE.Material,THREE.MeshPhysicalMaterial>();
const isAcrylic=(material:THREE.Material)=>/^Technical.*(?:clear|frosted).*acrylic/i.test(material.name);

function acrylicMaterial(source: THREE.Material) {
  const existing=acrylicMaterials.get(source);
  if(existing) return existing;
  const material=new THREE.MeshPhysicalMaterial({
    name:source.name,color:"#f4f7f9",metalness:0,roughness:.04,
    transparent:false,opacity:1,depthWrite:false,side:THREE.FrontSide,
    ior:1.49,clearcoat:.65,clearcoatRoughness:.04,
    specularIntensity:1,envMapIntensity:.8,
    // Three r185 supports actual transmission and volume attenuation. These
    // meshes are real 30–45mm sheets around a 1.44m deep layered fascia.
    transmission:.98,thickness:.035,attenuationDistance:10,
    attenuationColor:new THREE.Color("#f2f6f8"),
  });
  material.customProgramCacheKey=()=>"technical-transmitted-volume-acrylic-v3";
  prepared.add(material);acrylicMaterials.set(source,material);
  return material;
}

async function texture(gl: THREE.WebGLRenderer, file: string, colour = false, repeat: [number, number] = [1,1]) {
  const t = await loadVenueTexture(BASE + file, gl);
  t.colorSpace = colour ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  // A KTX2 file carries its own mip chain; three cannot generate one for it.
  t.generateMipmaps = !isCompressed(t);
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}
function pack(id: PackId, gl: THREE.WebGLRenderer) {
  let p = packs.get(id);
  if (!p) {
    const repeat: [number,number] = id === "floor" ? [22,90] : [1,1];
    const slot = (colour: string): Slot => ({ value: placeholderTexture(colour) });
    const map = slot("#808080"), orm = slot("#ff8000"), normal = slot("#8080ff");
    const ready = Promise.all([texture(gl,`${id}-color.webp`,true,repeat), texture(gl,`${id}-orm.webp`,false,repeat), texture(gl,`${id}-normal.webp`,false,repeat)])
      .then(([colour, data, bump]) => { map.value = colour; orm.value = data; normal.value = bump; return { map: colour, orm: data, normal: bump }; });
    ready.catch(error => console.warn(`[venue] technical ${id} surface failed to load`, error));
    p = { map, orm, normal, ready };
    packs.set(id,p);
  }
  return p;
}

/**
 * The technical stone floor's maps (loaded once, shared). `ready` resolves
 * with the colour, roughness (ORM) and normal maps for 4 m clouded slabs
 * across the existing 88 x 360 m reflector.
 */
export function technicalFloorSurface(gl: THREE.WebGLRenderer) {
  const p = pack("floor", gl);
  return { ready: p.ready.then(({ map, orm, normal }) => ({ map, roughnessMap: orm, normalMap: normal })),
    repeat:[22,90] as const, recommendedTint:"#5d6470", normalScale:new THREE.Vector2(.08,.08) };
}

type Finish = { id:PackId; scale:number; normal:number; rough:number; colour:number; ao:number };
const FINISHES: Record<string,Finish> = {
  steel:{id:"steel",scale:1.8,normal:.075,rough:.14,colour:.22,ao:.18},
  counter:{id:"cast",scale:2.5,normal:.18,rough:.24,colour:.38,ao:.36},
  powder:{id:"cast",scale:7.5,normal:.035,rough:.075,colour:.12,ao:.12},
  upholstery:{id:"wool",scale:3.333333,normal:.24,rough:.10,colour:.65,ao:.42},
  floor:{id:"floor",scale:.25,normal:.055,rough:.10,colour:.60,ao:.12},
};

const common = /* glsl */ `
  varying vec3 vTechWorldPosition;
  varying vec3 vTechWorldNormal;
  uniform sampler2D uTechColour;
  uniform sampler2D uTechOrm;
  uniform sampler2D uTechNormal;
  uniform float uTechScale;
  uniform float uTechNormalStrength;
  uniform float uTechRoughStrength;
  uniform float uTechColourStrength;
  uniform float uTechAoStrength;
  uniform mat3 uTechBaselineToWorldRotation;
  vec3 techTriplanar(sampler2D tex,vec3 p,vec3 weight){
    return texture2D(tex,p.zy).rgb*weight.x
      +texture2D(tex,p.xz).rgb*weight.y
      +texture2D(tex,p.xy).rgb*weight.z;
  }
`;

/** World-space PBR for the merged booth meshes that have no TEXCOORD_0.
 * Call after prepareArchitecture: this deliberately replaces its old noise and
 * glitter shader for these finishes. Shared lights, shadows and IBL stay physical.
 */
export function applyTechnicalMaterials(model: THREE.Object3D, gl: THREE.WebGLRenderer) {
  const frame=installationFinishFrame("S3");
  let count=0;
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const originals=Array.isArray(object.material)?object.material:[object.material];
    const materials=originals.map(material=>{
      if(!isAcrylic(material)||prepared.has(material))return material;
      count++;
      return acrylicMaterial(material);
    });
    if(materials.some((material,i)=>material!==originals[i])) {
      object.material=Array.isArray(object.material)?materials:materials[0];
    }
    // Transparent architectural sheets must not cast opaque slab shadows.
    if(materials.every(isAcrylic))object.castShadow=false;
    for(const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial) || prepared.has(material)) continue;
      const name=material.name;
      if (!name.startsWith("Technical |")) continue;
      if(/V3 cyan AV letters/i.test(name)){
        material.color.set("#35b7df");material.emissive.set("#2499c7");material.emissiveIntensity=.30;
        material.metalness=.10;material.roughness=.32;material.envMapIntensity=.45;
        material.onBeforeCompile=()=>{};material.customProgramCacheKey=()=>"technical-v3-cyan-av-letters";
        prepared.add(material);material.needsUpdate=true;count++;continue;
      }
      if(/exposed fascia porcelain lettering/i.test(name)){
        // r185 builds the glass background from opaque objects first. These
        // raised, fully opaque glyphs must draw after that transmission pass
        // so the clear sheets cannot sample a blurred duplicate of the words.
        material.transparent=true;material.opacity=1;
        material.depthWrite=true;material.depthTest=true;
        material.onBeforeCompile=()=>{};
        material.customProgramCacheKey=()=>"technical-exposed-fascia-lettering-v1";
        prepared.add(material);material.needsUpdate=true;count++;continue;
      }
      if(/faceted ice blue metallic emblem|emblem pale blue facet|emblem dark blue facet/i.test(name)){
        const dark=/dark blue/.test(name), pale=/pale blue/.test(name);
        material.color.set(dark?"#4789ab":pale?"#c4e8f7":"#8ecfe9");
        material.emissive.copy(material.color);material.emissiveIntensity=dark?.22:.48;
        material.metalness=.20;material.roughness=.32;material.envMapIntensity=.65;
        material.onBeforeCompile=()=>{};
        material.customProgramCacheKey=()=>"technical-readable-ice-emblem-v1";
        prepared.add(material);material.needsUpdate=true;count++;continue;
      }
      if(/overhead truss steel/i.test(name)){
        material.emissive.set("#746450");material.emissiveIntensity=.16;
        prepared.add(material);material.needsUpdate=true;count++;continue;
      }
      if(/warm pearl canopy diffuser/i.test(name)){
        material.color.set("#d9bda7");material.metalness=.15;material.roughness=.44;
        material.emissive.set("#ffd0ad");material.emissiveIntensity=.09;
        material.onBeforeCompile=()=>{};
        material.customProgramCacheKey=()=>"technical-warm-pearl-canopy-v1";
        prepared.add(material);material.needsUpdate=true;count++;continue;
      }
      let finish: Finish | undefined;
      if (/soft warm grey.*upholstery|soft ivory woven upholstery|woven.*lounge rug/i.test(name)) {
        finish=FINISHES.upholstery;
        material.color.set(/rug/i.test(name)?"#292928":/ivory/i.test(name)?"#aaa79d":"#77726b"); material.metalness=0;material.roughness=.89;
      } else if (/brushed.*stainless|polished brushed silver/i.test(name)) {
        finish=FINISHES.steel;material.color.set("#c7c9ca");material.metalness=.93;material.roughness=.32;material.envMapIntensity=.55;
      } else if (/rough cast black metal counter/i.test(name)) {
        finish=FINISHES.counter;material.color.set("#2c2e2d");material.metalness=.40;material.roughness=.34;
      } else if (/powdercoat|charcoal architectural panel|graphite equipment housing/i.test(name)) {
        finish=FINISHES.powder;material.color.set(/panel/i.test(name)?"#040507":/powdercoat/i.test(name)?"#030405":"#0b0e12");
        material.metalness=.04;material.roughness=.82;material.envMapIntensity=.13;
        material.emissive.set("#000000");material.emissiveIntensity=0;
      } else if (/honed pathway stone/i.test(name)) {
        finish=FINISHES.floor;material.color.set("#505a64");material.metalness=.04;material.roughness=.37;
      }
      if(!finish) continue;
      prepared.add(material);count++;
      const spec=finish, maps=pack(spec.id, gl);
      // Never attach ordinary map slots to UV-less merged geometry. The same
      // texture samples are projected in metres inside the material shader.
      material.onBeforeCompile=shader=>{
        Object.assign(shader.uniforms,{
          // The pack's shared slots: they switch to the loaded maps in place.
          uTechColour:maps.map,uTechOrm:maps.orm,uTechNormal:maps.normal,
          uTechScale:{value:spec.scale},uTechNormalStrength:{value:spec.normal},uTechRoughStrength:{value:spec.rough},
          uTechColourStrength:{value:spec.colour},uTechAoStrength:{value:spec.ao},
          uTechWorldToBaseline:{value:frame.worldToBaseline},
          uTechBaselineToWorldRotation:{value:frame.baselineToWorldRotation},
        });
        shader.vertexShader=shader.vertexShader
          .replace("#include <common>","#include <common>\nvarying vec3 vTechWorldPosition;\nvarying vec3 vTechWorldNormal;\nuniform mat4 uTechWorldToBaseline;")
          .replace("#include <begin_vertex>","#include <begin_vertex>\nvTechWorldPosition=(uTechWorldToBaseline*modelMatrix*vec4(transformed,1.0)).xyz;\nvTechWorldNormal=normalize(mat3(uTechWorldToBaseline)*mat3(modelMatrix)*normal);");
        shader.fragmentShader=shader.fragmentShader
          .replace("#include <common>",`#include <common>\n${common}`)
          .replace("#include <color_fragment>",`#include <color_fragment>
            vec3 techPosition=vTechWorldPosition*uTechScale;
            vec3 techWeights=pow(abs(normalize(vTechWorldNormal)),vec3(6.0));
            techWeights/=max(dot(techWeights,vec3(1.0)),.0001);
            vec3 techColour=techTriplanar(uTechColour,techPosition,techWeights);
            vec3 techOrm=techTriplanar(uTechOrm,techPosition,techWeights);
            float techLuminance=dot(techColour,vec3(.2126,.7152,.0722));
            diffuseColor.rgb*=mix(1.0,clamp(.80+techLuminance*.60,.80,1.35),uTechColourStrength);`)
          .replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
            roughnessFactor=clamp(roughnessFactor+(techOrm.g-.5)*uTechRoughStrength,.13,.98);`)
          .replace("#include <normal_fragment_maps>",`#include <normal_fragment_maps>
            vec3 techNX=texture2D(uTechNormal,techPosition.zy).xyz*2.0-1.0;
            vec3 techNY=texture2D(uTechNormal,techPosition.xz).xyz*2.0-1.0;
            vec3 techNZ=texture2D(uTechNormal,techPosition.xy).xyz*2.0-1.0;
            vec3 techDetail=vec3(0.0,techNX.y,techNX.x)*techWeights.x
              +vec3(techNY.x,0.0,techNY.y)*techWeights.y
              +vec3(techNZ.x,techNZ.y,0.0)*techWeights.z;
            normal=normalize(normal+mat3(viewMatrix)*uTechBaselineToWorldRotation*techDetail*uTechNormalStrength);`)
          .replace("#include <aomap_fragment>",`#include <aomap_fragment>
            reflectedLight.indirectDiffuse*=mix(1.0,techOrm.r,uTechAoStrength);
            reflectedLight.indirectSpecular*=mix(1.0,techOrm.r,uTechAoStrength*.25);`);
        if(spec===FINISHES.powder)shader.fragmentShader=shader.fragmentShader.replace("#include <lights_fragment_end>",`#include <lights_fragment_end>
          reflectedLight.directSpecular*=.18;
          reflectedLight.indirectSpecular*=.22;`);
      };
      material.customProgramCacheKey=()=>"technical-pbr-world-triplanar-v2-rigid-baseline";
      material.needsUpdate=true;
    }
  });
  return count;
}
