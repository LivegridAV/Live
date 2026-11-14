import * as THREE from "three";

/** One public floor in world metres. Selection never changes its finish. */
export const VENUE_FLOOR = Object.freeze({
  origin: [0, 0] as const, tileMetres: 2, jointMetres: .004,
  textureMetres: 4, colour: "#858b90",
});

let maps: ReturnType<typeof createMaps> | undefined;
function createMaps() {
  const texture = (file:string, placeholderColour:string, colour=false) => {
    // Texture.copy marks an image-less pending loader result for upload. Own
    // the load instead: a valid temporary image is present on the first draw,
    // then TextureLoader replaces it and updates this same texture identity.
    const placeholder=document.createElement("canvas");placeholder.width=placeholder.height=1;
    const context=placeholder.getContext("2d");
    if(context){context.fillStyle=placeholderColour;context.fillRect(0,0,1,1);}
    const result:THREE.Texture=new THREE.TextureLoader().load(`/media/technical-showcase/materials/${file}`,loaded=>{
      // r185 allocates immutable texture storage. Release any uploaded 1px
      // allocation before the decoded image is uploaded at its real size.
      loaded.dispose();loaded.needsUpdate=true;
    });
    result.image=placeholder;
    result.name=`Continuous venue stone / ${file}`;
    result.colorSpace=colour?THREE.SRGBColorSpace:THREE.NoColorSpace;
    result.repeat.set(1, 1); result.offset.set(0, 0); result.rotation = 0;
    result.wrapS = result.wrapT = THREE.RepeatWrapping;
    result.magFilter=THREE.LinearFilter;result.minFilter=THREE.LinearMipmapLinearFilter;
    result.generateMipmaps=true;
    result.anisotropy = 8; result.needsUpdate = true;
    return result;
  };
  return {
    map:texture("floor-color.webp","#858b90",true),
    roughnessMap:texture("floor-orm.webp","#ffb400"),
    normalMap:texture("floor-normal.webp","#8080ff"),
  };
}
export function venueFloorMaps() { return maps ??= createMaps(); }
