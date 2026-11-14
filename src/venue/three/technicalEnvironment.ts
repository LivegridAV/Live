import * as THREE from "three";

/** A dark exhibition hall with discrete warm practicals and cool display spill.
 * Its high-dynamic-range emitters provide the real broad reflections that a
 * uniform ambient light cannot give stainless steel and acrylic. */
export function createTechnicalEnvironment(renderer: THREE.WebGLRenderer) {
  const room = new THREE.Scene();
  room.background = new THREE.Color("#090b0f");
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const materials: THREE.Material[] = [];
  function panel(position: [number, number, number], size: [number, number, number], rgb: [number, number, number]) {
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(...rgb), toneMapped: false });
    materials.push(material);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position); mesh.scale.set(...size); room.add(mesh);
  }
  // Small, separated ceiling fixtures make elongated specular highlights,
  // while the space between them stays black, as in the reference hall.
  for (const x of [-12, -5, 2, 9]) for (const z of [-9, -1, 8]) {
    panel([x, 8.2, z], [2.7, .055, .22], [18, 13.6, 8.8]);
  }
  panel([-7, 4.2, 10], [6, 3.2, .06], [2.8, 2.65, 2.4]);
  panel([9, 3.8, 8], [3.4, 2.4, .06], [1.4, 1.65, 2.0]);
  // Three blue program displays and the long warm architectural reveal.
  for (const x of [-7.5, 0, 7.5]) panel([x, 1.1, -8], [5.8, 3.2, .08], [.24, .48, 1.0]);
  panel([0, 4.1, -7.7], [24, .1, .06], [9.5, 6.8, 4.1]);
  panel([3, -2.15, 6], [5, .08, .06], [4.8, 3.5, 2.2]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(room, .025, .1, 70);
  target.texture.name = "Technical hall warm practical and LED reflection environment";
  pmrem.dispose(); geometry.dispose(); materials.forEach(m => m.dispose());
  return target;
}
