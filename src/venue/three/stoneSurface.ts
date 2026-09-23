import * as THREE from "three";

let surface: { colour: THREE.DataTexture; roughness: THREE.DataTexture } | undefined;
/** Tileable, code-authored honed stone. Fine grain, broad mineral variation,
 * and narrow expansion joints break up the formerly uniform mirror plane. */
export function stoneSurface() {
  if (surface) return surface;
  const size = 512, colour = new Uint8Array(size * size * 4), rough = new Uint8Array(size * size * 4);
  for (let y=0;y<size;y++) for(let x=0;x<size;x++) {
    const u=x/size*Math.PI*2, v=y/size*Math.PI*2;
    const cloud=Math.sin(u*3+Math.cos(v*2))*Math.cos(v*3+Math.sin(u))*.5+.5;
    const vein=Math.pow(Math.abs(Math.sin(u*2+v*3+Math.sin(u+v)*1.1)),18);
    const noise=(Math.sin(x*127.1+y*311.7)*43758.5453)%1;
    const joint=x<1||y<1;
    const value=joint?75:151+cloud*16+vein*7+noise*3;
    const at=(y*size+x)*4;
    colour.set([value,value*.986,value*.968,255],at);
    const r=joint?250:180+cloud*45+vein*18;
    rough.set([r,r,r,255],at);
  }
  function texture(data: Uint8Array, srgb=false) {
    const t=new THREE.DataTexture(data,size,size);
    t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(22,90);
    t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;
    t.generateMipmaps=true;t.anisotropy=8;t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.needsUpdate=true;
    return t;
  }
  surface={colour:texture(colour,true),roughness:texture(rough)};
  return surface;
}
