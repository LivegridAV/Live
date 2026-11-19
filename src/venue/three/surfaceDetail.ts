import * as THREE from "three";

/**
 * Fine, world-space surface detail for the hall furniture kit, and skin
 * refinement for the licensed visitors.
 *
 * The kit is instanced boxes and cylinders of every size, so an image map
 * would stretch differently on each piece. Instead each surface family gets
 * procedural grain in world metres (the same approach as the stall
 * architecture's finish): a few noise lookups that vary colour, roughness and
 * the shading normal at millimetre-to-centimetre scale. Close up, fabric reads
 * as weave, wood as grain, metal as brushed, glaze and wet soil as glossy.
 */
export type SurfaceKind = "fabric" | "wood" | "metal" | "stone" | "ceramic" | "wet" | "leaf";

const NOISE = `
  varying vec3 vSurfacePosition;
  float surfaceHash(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
  float surfaceNoise(vec3 p){vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(mix(surfaceHash(i),surfaceHash(i+vec3(1,0,0)),f.x),mix(surfaceHash(i+vec3(0,1,0)),surfaceHash(i+vec3(1,1,0)),f.x),f.y),
      mix(mix(surfaceHash(i+vec3(0,0,1)),surfaceHash(i+vec3(1,0,1)),f.x),mix(surfaceHash(i+vec3(0,1,1)),surfaceHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
  vec3 surfaceGrad(vec3 p){ float e=.37; float n=surfaceNoise(p);
    return vec3(surfaceNoise(p+vec3(e,0,0))-n, surfaceNoise(p+vec3(0,e,0))-n, surfaceNoise(p+vec3(0,0,e))-n); }`;

/** colour multiplier, roughness offset, world-space normal offset — per kind. */
const DETAIL: Record<SurfaceKind, { color: string; rough: string; normal: string }> = {
  // Woven upholstery and rug pile: a fine crossed weave over a soft mottle.
  fabric: {
    color: ".93+.05*surfaceNoise(p*9.0)+.04*abs(sin(p.x*620.0)*sin(p.y*620.0+p.z*620.0))",
    rough: "(surfaceNoise(p*140.0)-.5)*.08",
    normal: "surfaceGrad(p*260.0)*.55+vec3(sin(p.x*620.0),sin(p.y*620.0),sin(p.z*620.0))*.04",
  },
  // Walnut: long grain stripes with darker figure, satin oil finish.
  wood: {
    color: ".82+.2*surfaceNoise(vec3(p.x*2.0,p.y*38.0,p.z*2.0)+surfaceNoise(p*3.0)*2.0)+.05*surfaceNoise(p*60.0)",
    rough: "(surfaceNoise(vec3(p.x*3.0,p.y*90.0,p.z*3.0))-.5)*.14",
    normal: "surfaceGrad(vec3(p.x*6.0,p.y*120.0,p.z*6.0))*.22",
  },
  // Brushed metal: fine directional scratches catching the light.
  metal: {
    color: ".96+.06*surfaceNoise(vec3(p.x*900.0,p.y*4.0,p.z*900.0))",
    rough: "(surfaceNoise(vec3(p.x*700.0,p.y*6.0,p.z*700.0))-.5)*.14",
    normal: "surfaceGrad(vec3(p.x*800.0,p.y*5.0,p.z*800.0))*.12",
  },
  // Honed stone tops: speckle and a slightly uneven polish.
  stone: {
    color: ".94+.06*surfaceNoise(p*5.0)+.07*smoothstep(.72,.98,surfaceHash(floor(p*180.0)))-.04*smoothstep(.8,.99,surfaceHash(floor(p*90.0)+3.0))",
    rough: "(surfaceNoise(p*40.0)-.5)*.12",
    normal: "surfaceGrad(p*120.0)*.08",
  },
  // Glazed ceramic: deep gloss with a faint hand-thrown ripple.
  ceramic: {
    color: ".95+.07*surfaceNoise(vec3(p.x*3.0,p.y*14.0,p.z*3.0))",
    rough: "(surfaceNoise(p*20.0)-.5)*.06",
    normal: "surfaceGrad(vec3(p.x*8.0,p.y*30.0,p.z*8.0))*.12",
  },
  // Freshly watered soil and standing water: dark, glossy, with damp patches.
  wet: {
    color: ".8+.25*surfaceNoise(p*7.0)",
    rough: "-.12*smoothstep(.35,.7,surfaceNoise(p*4.0))+(surfaceNoise(p*90.0)-.5)*.06",
    normal: "surfaceGrad(p*70.0)*.35",
  },
  // Leaves: waxy, slightly glossy, with fine veins (dew-fresh rather than plastic).
  leaf: {
    color: ".9+.14*surfaceNoise(p*30.0)",
    rough: "(surfaceNoise(p*55.0)-.5)*.16",
    // One lookup only: leaves overlap a lot on screen, so they stay cheap.
    normal: "(vec3(surfaceNoise(p*210.0))-.5)*.3",
  },
};

export function applySurface(material: THREE.MeshStandardMaterial, kind: SurfaceKind) {
  const detail = DETAIL[kind];
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vSurfacePosition;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vSurfacePosition = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
        #else
          vSurfacePosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
        #endif`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\n" + NOISE)
      .replace("#include <color_fragment>", `#include <color_fragment>
        { vec3 p = vSurfacePosition; diffuseColor.rgb *= ${detail.color}; }`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
        { vec3 p = vSurfacePosition; roughnessFactor = clamp(roughnessFactor + ${detail.rough}, .04, 1.0); }`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
        { vec3 p = vSurfacePosition; normal = normalize(normal + mat3(viewMatrix) * (${detail.normal})); }`);
  };
  material.customProgramCacheKey = () => `hall-surface-${kind}-v1`;
  material.needsUpdate = true;
  return material;
}

/**
 * Skin on the licensed visitors: a touch more sheen on the face, the
 * photographed normal detail strengthened, and a fine pore grain so faces
 * catch light like skin instead of matte plastic. Idempotent per material.
 */
const refined = new WeakSet<THREE.Material>();
export function refineAvatarSkin(root: THREE.Object3D) {
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!(material instanceof THREE.MeshStandardMaterial) || refined.has(material)) continue;
      if (!/^Rocketbox\s*\|.*\|\s*head(?:\.\d+)?$/i.test(material.name)) continue;
      refined.add(material);
      material.roughness = .5;
      material.normalScale.multiplyScalar(1.35);
      material.envMapIntensity = .55;
      material.onBeforeCompile = shader => {
        shader.vertexShader = shader.vertexShader
          .replace("#include <common>", "#include <common>\nvarying vec3 vSurfacePosition;")
          .replace("#include <begin_vertex>", "#include <begin_vertex>\nvSurfacePosition = (modelMatrix * vec4(transformed, 1.0)).xyz;");
        shader.fragmentShader = shader.fragmentShader
          .replace("#include <common>", "#include <common>\n" + NOISE)
          .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
            roughnessFactor = clamp(roughnessFactor + (surfaceNoise(vSurfacePosition*900.0)-.5)*.1, .3, 1.0);`)
          .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
            normal = normalize(normal + mat3(viewMatrix) * surfaceGrad(vSurfacePosition*1400.0) * .09);`)
          // A soft warm lift where light grazes, like light scattering under skin.
          .replace("#include <opaque_fragment>", `
            float skinGraze = pow(1.0 - saturate(dot(normal, geometryViewDir)), 2.5);
            outgoingLight += diffuseColor.rgb * vec3(.10, .045, .03) * skinGraze;
            #include <opaque_fragment>`);
      };
      material.customProgramCacheKey = () => "avatar-skin-v1";
      material.needsUpdate = true;
    }
  });
}
