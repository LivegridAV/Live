import * as THREE from "three";

/** The exhibition's practical strip and downlight reflections. Narrow emitters
 * retain dark metal between the highlights instead of a white ceiling wash. */
export function createProjectionEnvironment(renderer: THREE.WebGLRenderer) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#0a0e12");
  const geometry = new THREE.BoxGeometry(1, 1, 1), materials: THREE.Material[] = [];
  const stage = new THREE.Group(); stage.rotation.y = -Math.PI / 2; scene.add(stage);
  function panel(p: [number,number,number], s: [number,number,number], rgb: [number,number,number]) {
    const material = new THREE.MeshBasicMaterial({color: new THREE.Color(...rgb), toneMapped: false});
    materials.push(material);
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...p); mesh.scale.set(...s); stage.add(mesh);
  }
  // These emitters use the current native 24 x 16 m installation, including
  // its 12.821 m crown. The retired small-booth reflection rig sat mid-wall.
  panel([0,7.2,15],[22,8,.1],[.26,.30,.35]);
  panel([0,1.5,8.5],[21,2,.1],[.09,.10,.12]);
  panel([0,6.4,-7.65],[18.4,7.9,.1],[.025,.14,.25]);
  for (const x of [-10.9,-6.5,6.5,10.9]) {
    panel([x,5.6,1.1],[.045,10.2,.12],[1.8,1.45,1.02]);
  }
  panel([0,11.26,7.3],[20,.035,.06],[2.0,1.58,1.1]);
  for(const [rx,rz,y] of [[6.8,4.6,10.3],[4.45,3.25,10.48]]){
    for(let i=0;i<60;i++){
      const a=i/60*Math.PI*2;
      panel([Math.cos(a)*rx,y,Math.sin(a)*rz-.7],[.12,.035,.12],[2.4,1.95,1.35]);
    }
  }
  for (const x of [-10,-7.5,-5,-2.5,0,2.5,5,7.5,10]) {
    for (const z of [-5.8,-2.3,1.2,4.7]) panel([x,10.91,z],[.11,.06,.11],[5.4,4.8,4.0]);
  }
  const pmrem = new THREE.PMREMGenerator(renderer), target = pmrem.fromScene(scene,.025,.1,80);
  target.texture.name = "Projection native pavilion practical reflections V2";
  pmrem.dispose(); geometry.dispose(); materials.forEach(material => material.dispose());
  return target;
}
