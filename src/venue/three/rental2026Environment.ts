import * as THREE from "three";
import { RENTAL2026_ROTATION } from "../data/ledRental2026";

/** Native Rental V2 practicals reflected in brushed metal and dark finishes. */
export function createRental2026Environment(renderer:THREE.WebGLRenderer){
  const room=new THREE.Scene();room.background=new THREE.Color("#0b1119");
  const group=new THREE.Group();group.rotation.y=RENTAL2026_ROTATION[1];room.add(group);
  const geometry=new THREE.BoxGeometry(1,1,1),materials:THREE.Material[]=[];
  function panel(p:[number,number,number],size:[number,number,number],colour:[number,number,number],yaw=0){
    const material=new THREE.MeshBasicMaterial({color:new THREE.Color(...colour),toneMapped:false});materials.push(material);
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...p);mesh.scale.set(...size);mesh.rotation.y=yaw;group.add(mesh);
  }
  function strip(a:[number,number],b:[number,number],y:number,colour:[number,number,number]){
    const dx=b[0]-a[0],dz=b[1]-a[1];
    panel([(a[0]+b[0])/2,y,(a[1]+b[1])/2],[Math.hypot(dx,dz),.024,.035],colour,-Math.atan2(dz,dx));
  }
  // A neutral hall opening lets black panels retain soft, broad reflections.
  // Small separated warm sources, rather than a white ceiling, give the pots
  // and champagne fins the reference's discrete high-luminance highlights.
  panel([0,4.2,14],[18,4.8,.08],[.27,.29,.32]);
  panel([2.1,5.15,-6.95],[10.6,7.5,.08],[.045,.18,.41]);
  for(const y of [7.75,5.75,3.75,1.75])panel([9,y,-6.90],[2.5,1.40625,.05],[.035,.10,.25]);
  const fascia:[number,number][]=[[-11.8,6.4],[-10.8,7.3],[5.6,3.8],[11.6,6.5]];
  for(let i=0;i<fascia.length-1;i++){
    strip(fascia[i],fascia[i+1],8.938,[.07,1.18,.94]);
    strip(fascia[i],fascia[i+1],10.482,[1.8,1.42,.98]);
  }
  // These positions follow the 39 physical black gimbals in the Blender shell.
  for(const x of [-10.35,-7.75,-5.15,-2.55,.05,2.65,5.25,7.85,10.45]){
    for(const z of [-6.45,-3.05,.40,3.25,5.50]){
      if(z>3.8&&x>4.3)continue;
      if(z>4.2&&x> -2.8&&x<4.3)continue;
      panel([x,8.425,z+.012],[.135,.016,.152],[10.2,8.1,5.8]);
    }
  }
  const boardYaw=Math.atan2(1.7,7.95);
  panel([-10.254,7.05,4.791],[1.75,1.6,.05],[.045,.16,.40],boardYaw);
  panel([-7.454,7.05,4.192],[2.22,1.6,.05],[.035,.20,.48],boardYaw);
  panel([-4.754,7.05,3.615],[1.34,1.8,.05],[.055,.16,.43],boardYaw);
  strip([-11.3,6.96],[-3.7,6.96],.148,[.07,1.22,1.02]);
  // Reception edge remains warm white; teal is confined to the product and
  // canopy edge channels instead of tinting the entire floor and upholstery.
  panel([7.8,.16,6.46],[5.9,.035,.045],[2.3,1.8,1.25]);
  const generator=new THREE.PMREMGenerator(renderer),target=generator.fromScene(room,.025,.1,70);
  target.texture.name="LED Rental V2 warm practical and folded rope reflections";
  generator.dispose();geometry.dispose();materials.forEach(material=>material.dispose());return target;
}
