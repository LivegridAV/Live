/** Read-only source/GLB measurement. Writes only placement-report artifacts. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as T from 'three';
import { MeshBVH } from 'three-mesh-bvh';

const root = process.cwd();
const out = path.join(root, 'reports/placement-implementation/20261019-coordinate-layout');
const assetDir = path.join(root, 'public/models/expo');
const r = x => +x.toFixed(8);
const arr = v => v.toArray().map(r);
const record = b => b.isEmpty() ? null : { min:arr(b.min), max:arr(b.max), size:arr(b.getSize(new T.Vector3())) };
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const files = new Map();

function load(name) {
  if (files.has(name)) return files.get(name);
  const file = path.join(assetDir, `${name}.glb`), buffer = fs.readFileSync(file);
  const jsonLength = buffer.readUInt32LE(12);
  const gltf = JSON.parse(buffer.toString('utf8',20,20+jsonLength));
  const bin = 28 + jsonLength;
  const all = new T.Box3(), visible = new T.Box3(), roles = {}, primitives = [];
  let vertices = 0, triangles = 0;
  function walk(i, parent, hidden = false) {
    const n = gltf.nodes[i], m = new T.Matrix4();
    if (n.matrix) m.fromArray(n.matrix);
    else m.compose(new T.Vector3(...(n.translation ?? [0,0,0])),new T.Quaternion(...(n.rotation ?? [0,0,0,1])),new T.Vector3(...(n.scale ?? [1,1,1])));
    m.premultiply(parent);
    const role = n.extras?.grandRole ?? 'unclassified';
    hidden = hidden || ['floor','shared-floor'].includes(role) || !!n.extras?.grandSharedFloor;
    if (n.mesh != null) for (const p of gltf.meshes[n.mesh].primitives) {
      const a = gltf.accessors[p.attributes.POSITION], bv = gltf.bufferViews[a.bufferView];
      const offset = bin + (bv.byteOffset ?? 0) + (a.byteOffset ?? 0), stride = bv.byteStride ?? 12;
      const pos = new Float32Array(a.count * 3), box = new T.Box3();
      for (let k = 0; k < a.count; k++) {
        const v = new T.Vector3(buffer.readFloatLE(offset+k*stride),buffer.readFloatLE(offset+k*stride+4),buffer.readFloatLE(offset+k*stride+8)).applyMatrix4(m);
        pos.set(v.toArray(),k*3); box.expandByPoint(v);
      }
      let indices;
      if (p.indices != null) {
        const ia = gltf.accessors[p.indices], ib = gltf.bufferViews[ia.bufferView];
        const off = bin+(ib.byteOffset??0)+(ia.byteOffset??0);
        const [read,bytes] = ({5121:['readUInt8',1],5123:['readUInt16LE',2],5125:['readUInt32LE',4]})[ia.componentType];
        indices = Uint32Array.from({length:ia.count},(_,k)=>buffer[read](off+k*bytes));
      } else indices = Uint32Array.from({length:a.count},(_,k)=>k);
      all.union(box); if (!hidden) visible.union(box);
      (roles[role] ??= new T.Box3()).union(box);
      primitives.push({name:n.name,role,hidden,pos,indices,box});
      vertices += a.count; triangles += indices.length / 3;
    }
    for (const c of n.children ?? []) walk(c,m,hidden);
  }
  for (const n of gltf.scenes[gltf.scene??0].nodes) walk(n,new T.Matrix4());
  const result = {name,file:path.relative(root,file).replaceAll('\\','/'),sha256:sha(buffer),bytes:buffer.length,vertices,triangles,all,visible,roles,primitives};
  files.set(name,result); return result;
}

function combinedGeometry(names, filter = () => true) {
  const selected = names.flatMap(name=>load(name).primitives).filter(filter);
  let count = 0; const positions = [], indices = [];
  for (const p of selected) {
    for (const v of p.pos) positions.push(v);
    for (const i of p.indices) indices.push(i+count);
    count += p.pos.length / 3;
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3)); geometry.setIndex(indices);
  return geometry;
}
function boxFrom(names, visible = false) {
  const result = new T.Box3();
  for (const n of names) result.union(load(n)[visible?'visible':'all']);
  return result;
}
function matrix(root,yaw) { return new T.Matrix4().makeRotationY(yaw).setPosition(...root); }
function cornerBox(box,m) { return box.clone().applyMatrix4(m); }
function productSweep(p) {
  const root = new T.Group(), w=p.width??(p.radius??.65)*2, h=p.height??(p.radius??.65)*2;
  const add=(g,position=[0,0,0],yaw=0,parent=root)=>{
    const mesh=new T.Mesh(g);mesh.position.set(...position);mesh.rotation.y=yaw;parent.add(mesh);return mesh;
  };
  const box=(size,position=[0,0,0],yaw=0,parent=root)=>add(new T.BoxGeometry(...size),position,yaw,parent);
  const plane=(width,height,z=0,yaw=0,parent=root)=>add(new T.PlaneGeometry(width,height),[0,0,z],yaw,parent);
  if(p.type==='sphere')add(new T.SphereGeometry(p.radius,64,40));
  else if(p.type==='curved'||p.type==='cylinder'){
    const radius=p.radius??1.2, arc=p.type==='cylinder'?Math.PI*2:p.arc??2.04;
    add(new T.CylinderGeometry(radius-.025,radius-.025,h,96,1,true,-arc/2,arc));
    add(new T.CylinderGeometry(radius,radius,h,96,1,true,p.type==='curved'?-arc/2:0,arc));
    const points=Array.from({length:97},(_,i)=>{const a=-arc/2+i/96*arc;return new T.Vector3((radius+.006)*Math.sin(a),0,(radius+.006)*Math.cos(a));});
    const rim=new T.TubeGeometry(new T.CatmullRomCurve3(points),96,.012,6,false);
    for(const s of [-1,1])add(rim.clone(),[0,s*h/2,0]);rim.dispose();
    for(const s of [-1,1])if(p.type==='cylinder')add(new T.CylinderGeometry(radius-.015,radius-.015,.025,64),[0,s*(h/2-.01),0]);
    else {
      const ring=new T.RingGeometry(radius-.040,radius+.006,96,1,-Math.PI/2-arc/2,arc).rotateX(-Math.PI/2);
      add(ring,[0,s*(h/2-.009),0]);
      const a=s*arc/2;box([.030,h,.046],[(radius-.014)*Math.sin(a),0,(radius-.014)*Math.cos(a)],a);
    }
  }else if(p.type==='corner'){
    const side=p.side??1.2,d=side/(2*Math.sqrt(2));
    for(const s of [-1,1]){
      const group=new T.Group();group.position.set(s*d,0,-d);group.rotation.y=s*Math.PI/4;root.add(group);
      box([side,h,.055],[0,0,-.033],0,group);plane(side,h,0,0,group);
      for(const edge of [-1,1])box([side+.014,.012,.07],[0,edge*(h/2+.004),.001],0,group);
    }
  }else if(p.type==='dna'){
    for(let i=0;i<7;i++){
      const group=new T.Group();group.position.set(Math.sin(i*1.03)*.16,(3-i)*(h-.305)/6,Math.cos(i*.73)*.07);group.rotation.y=(i-3)*.11;root.add(group);
      const width=[1,.85,.62,.58,.65,.84,1][i];box([width,.305,.075],[0,0,0],0,group);plane(width,.305,.041,0,group);plane(width,.305,-.041,Math.PI,group);
    }
  }else if(p.type==='transparent'){
    plane(w,h);
    for(const s of [-1,1]){box([.022,h+.036,.035],[s*(w/2+.008),0,0]);box([w,.022,.035],[0,s*(h/2+.008),0]);}
  }else {box([w+.035,h+.035,.075]);plane(w,h,.041);plane(w,h,-.041,Math.PI);}
  root.updateMatrixWorld(true);
  const native=new T.Box3(),swept=new T.Box3();let maximumRadius=0,vertices=0;
  const full=['dna','sphere','cylinder'].includes(p.type),a=(p.baseYaw??0)-.32,b=(p.baseYaw??0)+.32;
  const position=new T.Vector3(...p.position);
  root.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const attr=mesh.geometry.getAttribute('position');
    for(let i=0;i<attr.count;i++){
      const v=new T.Vector3().fromBufferAttribute(attr,i).applyMatrix4(mesh.matrixWorld);vertices++;
      native.expandByPoint(v.clone().applyAxisAngle(new T.Vector3(0,1,0),p.baseYaw??0).add(position));
      const radius=Math.hypot(v.x,v.z);maximumRadius=Math.max(maximumRadius,radius);
      if(full){swept.expandByPoint(new T.Vector3(-radius,v.y,-radius).add(position));swept.expandByPoint(new T.Vector3(radius,v.y,radius).add(position));}
      else{
        const candidates=[a,b];
        for(const base of [Math.atan2(v.z,v.x),Math.atan2(-v.x,v.z)])for(let k=-3;k<=3;k++){const t=base+k*Math.PI;if(t>=a&&t<=b)candidates.push(t);}
        for(const t of candidates)swept.expandByPoint(v.clone().applyAxisAngle(new T.Vector3(0,1,0),t).add(position));
      }
    }
    mesh.geometry.dispose();
  });
  return {id:p.id,type:p.type,position:p.position,baseYaw:p.baseYaw??0,rotationSweep:full?'continuous360degrees':[-.32,.32],maximumLocalHorizontalRadius:maximumRadius,vertices,nativeBounds:record(native),sweptBounds:record(swept),box:swept,
    within24x16:swept.min.x>=-12&&swept.max.x<=12&&swept.min.z>=-8&&swept.max.z<=8};
}
const rentalLayout=JSON.parse(fs.readFileSync(path.join(assetDir,'grand-rental-finish-v2-layout.json'),'utf8'));
const rentalProductSweeps=rentalLayout.products.map(productSweep);
const half = Math.PI / 2;
const specs = [
  {id:'S1',identity:'Content / Anamorphic Studio',root:[-18,0,-113],yaw:half,target:[-20,0,-58],targetYaw:half,
    names:['grand-anamorphic-shape-v3-shell','grand-anamorphic-shape-v3-interior','grand-anamorphic-shape-v3-visitors'],hall:[],
    source:['src/venue/zones/ReferenceAnamorphic.tsx','src/venue/data/anamorphic.ts','public/models/expo/grand-anamorphic-shape-v3-layout.json']},
  {id:'S2',identity:'LED Rental Solutions',root:[-18,0,-175],yaw:half,target:[20,0,-58],targetYaw:-half,
    names:['grand-rental-finish-v2-shell','grand-rental-finish-v2-interior','grand-rental-finish-v2-visitors'],hall:['grand-rental-finish-v2-hall'],
    source:['src/venue/zones/ReferenceLedRental2026.tsx','src/venue/data/ledRental2026.ts','public/models/expo/grand-rental-finish-v2-layout.json']},
  {id:'S3',identity:'AV Engineering / Show Control / Live Production',root:[-18,0,-145],yaw:half,target:[-20,0,-88],targetYaw:half,
    names:['grand-technical-shape-v3-shell','grand-technical-shape-v3-interior','grand-technical-shape-v3-visitors'],hall:['technical-reference-hall-rig-v3'],
    source:['src/venue/zones/ReferenceTechnical.tsx','src/venue/data/technical.ts','public/models/expo/grand-technical-shape-v3-layout.json']},
  {id:'S4',identity:'Projection Mapping',root:[18,0,-205],yaw:-half,target:[20,0,-88],targetYaw:-half,
    names:['projection-finish-v2-shell','projection-finish-v2-interior','projection-finish-v2-visitors'],hall:['projection-finish-v2-hall'],
    source:['src/venue/zones/ReferenceProjection.tsx','src/venue/data/projection.ts','public/models/expo/projection-finish-v2-layout.json']},
  {id:'R',identity:'Reception / Curved LED',root:[0,0,-80],yaw:0,target:[20,0,-30],targetYaw:-half,
    names:['grand-reception-brand-wall-v2','grand-reception-visitors'],hall:[],
    source:['src/venue/zones/ReferenceReception.tsx','src/venue/data/grand.ts','public/models/expo/grand-reception-brand-wall-v2-layout.json']},
];

const results = [];
for (const spec of specs) {
  const opaque = boxFrom(spec.names), visible = boxFrom(spec.names,true);
  if(spec.id==='S2')for(const p of rentalProductSweeps){opaque.union(p.box);visible.union(p.box);}
  if (spec.id === 'S4') {
    const crystal = load('projection-finish-v2-crystals').all.clone().translate(new T.Vector3(0,.915,-2.8));
    opaque.union(crystal); visible.union(crystal);
  }
  const complete = opaque.clone().union(boxFrom(spec.hall));
  if (spec.id === 'R') {
    // RingScreen's two live rings each create four hanging cylinders.
    // Outer ring is decisive: radius4.9, height1.4, top localY.7+3.2=3.9.
    complete.expandByPoint(new T.Vector3(2.2,10.23994+2*3.9,-3.5));
  }
  const before = matrix(spec.root,spec.yaw), after = matrix(spec.target,spec.targetYaw);
  const delta = after.clone().multiply(before.clone().invert());
  results.push({...spec,scale:[1,1,1],nativeFloorAnchor:[0,.12,0],nativeFrontDirection:[0,0,1],
    currentFloorAnchor:[spec.root[0],.12,spec.root[2]],targetFloorAnchor:[spec.target[0],.12,spec.target[2]],
    currentFrontDirection:arr(new T.Vector3(0,0,1).transformDirection(before)),targetFrontDirection:arr(new T.Vector3(0,0,1).transformDirection(after)),
    currentMatrix:before.toArray(),proposedMatrix:after.toArray(),rigidDelta:delta.toArray(),
    nativeOpaqueBounds:record(opaque),nativeVisibleBounds:record(visible),nativeCompleteBounds:record(complete),
    currentCompleteBounds:record(cornerBox(complete,before)),proposedOpaqueBounds:record(cornerBox(opaque,after)),proposedCompleteBounds:record(cornerBox(complete,after)),
    allocationNative:{min:[-12,0,-8],max:[12,12.821,8]},
    allocationMismatch:spec.id==='R'?{frontageRequired:opaque.max.x-opaque.min.x,frontageAllocated:24,totalExcess:opaque.max.x-opaque.min.x-24,positiveEdgeExcess:opaque.max.x-12,negativeEdgeSpare:opaque.min.x+12}:null});
}

// Actual triangle test, rather than treating overlapping rig AABBs as collisions.
const s1 = combinedGeometry(['grand-anamorphic-shape-v3-shell'],p=>!p.hidden&&p.role!=='platform');
const s3rig = combinedGeometry(['technical-reference-hall-rig-v3']);
s1.boundsTree = new MeshBVH(s1);
const relativeRigToS1 = new T.Matrix4().makeTranslation(30,0,0);
const actualRigS1 = s1.boundsTree.intersectsGeometry(s3rig,relativeRigToS1);
const hitNames = [];
if (actualRigS1) for (const primitive of load('grand-anamorphic-shape-v3-shell').primitives) {
  const one = combinedGeometry(['grand-anamorphic-shape-v3-shell'],p=>p===primitive);
  one.boundsTree=new MeshBVH(one);
  if (one.boundsTree.intersectsGeometry(s3rig,relativeRigToS1)) hitNames.push(primitive.name);
}
const hitBoundsNative = new T.Box3(); let intersectionTrianglePairs = 0;
s3rig.boundsTree = new MeshBVH(s3rig);
s1.boundsTree.bvhcast(s3rig.boundsTree,relativeRigToS1,{intersectsTriangles(a,b){
  const edge = new T.Line3();
  if(a.intersectsTriangle(b,edge,true)) {
    intersectionTrianglePairs++;
    hitBoundsNative.expandByPoint(edge.start); hitBoundsNative.expandByPoint(edge.end);
  }
  return false;
}});
const spacingTests = [30,31,31.3,31.31642,32,32.02265,34.21673,36].map(separation=>({
  separation,
  technicalRigS1ShellTriangleIntersection:s1.boundsTree.intersectsGeometry(s3rig,new T.Matrix4().makeTranslation(separation,0,0)),
  conservativeLeftWholeBoundsLongitudinalGap:separation-12-load('technical-reference-hall-rig-v3').all.max.x,
  // Right yaw=-90 gives plan-s = centreS - nativeX. Projection's most forward
  // corner is its max nativeX18.193, rental's deepest corner is -16.00372.
  correctedRightWholeRigBoundsLongitudinalGap:separation+load('grand-rental-finish-v2-hall').all.min.x-load('projection-finish-v2-hall').all.max.x,
}));
const actualSweep=[];
for(let mm=30000;mm<=31330;mm+=10) {
  const separation=mm/1000,intersects=s1.boundsTree.intersectsGeometry(s3rig,new T.Matrix4().makeTranslation(separation,0,0));
  if(!actualSweep.length||actualSweep.at(-1).intersects!==intersects)actualSweep.push({separation,intersects});
}

const pillars = [
  {id:'P1',identity:'hero',center:[-7.7,.111,-51.5],target:[-7.5,.111,-25],w:2.05,h:12.6},
  {id:'P2',identity:'companion',center:[-15.6,.111,-51.8],target:[7.5,.111,-25],w:1.85,h:10.9},
  {id:'P3',identity:'alpine',center:[-3.6,.111,-54.2],target:[-7.5,.111,-35],w:1.8,h:11.2},
  {id:'P4',identity:'forest',center:[-17.6,.111,-55.5],target:[7.5,.111,-35],w:1.7,h:8.5},
].map(p=>{
  const half=(p.w+.3)/2;
  const nativeBody=new T.Box3(new T.Vector3(-p.w/2,.11,-p.w/2),new T.Vector3(p.w/2,.11+p.h,p.w/2));
  const nativeBase=new T.Box3(new T.Vector3(-half,0,-half),new T.Vector3(half,.11,half));
  const full=nativeBody.clone().union(nativeBase); full.max.y=.11+p.h+.024;
  return {...p,source:'src/venue/zones/ReferencePillars.tsx',yaw:0,scale:[1,1,1],
    floorDatum:.12,baseBottomWorld:.111,bodyBottomWorld:.221,
    currentBody:record(nativeBody.clone().translate(new T.Vector3(...p.center))),currentBase:record(nativeBase.clone().translate(new T.Vector3(...p.center))),
    proposedBody:record(nativeBody.clone().translate(new T.Vector3(...p.target))),proposedBase:record(nativeBase.clone().translate(new T.Vector3(...p.target))),
    proposedCompleteOpaque:record(full.clone().translate(new T.Vector3(...p.target))),baseFitsProvisional3mBox:p.w+.3<=3,
    plantarOwnership:'No planter in each procedural pillar assembly. Separate shared gallery includes planting.'};
});

const galleryNames=['grand-pillar-gallery','grand-pillar-visitors'];
const galleryMatrix=new T.Matrix4().makeTranslation(-9,.111,-50);
const gallery={id:'arrival-gallery-shared',names:galleryNames,scale:[1,1,1],currentMatrix:galleryMatrix.toArray(),
  nativeBounds:record(boxFrom(galleryNames)),currentBounds:record(boxFrom(galleryNames).applyMatrix4(galleryMatrix)),
  target:null,status:'Ownership/placement unresolved: this complete material-batched reception/branding/lounge/planting assembly cannot follow four different pillar deltas.',
  source:['src/venue/zones/ReferencePillars.tsx','scripts/blender/rebuild_grand_pillar_gallery.py','scripts/blender/rebuild_pillar_gallery.py'],
  furnishings:'Rear branding wall; stone wainscot; long reception joinery; fluting/tablets/vase; five lounge blocks; four authored plants plus curved leaves; seven visitors.',
};
const galleryNative=boxFrom(galleryNames),galleryFootprintCentre=galleryNative.getCenter(new T.Vector3());
galleryFootprintCentre.y=.009;
const galleryCandidateAnchor=new T.Vector3(-20,.12,-30),galleryCandidateYaw=half;
const galleryCandidateRoot=galleryCandidateAnchor.clone().sub(galleryFootprintCentre.clone().applyAxisAngle(new T.Vector3(0,1,0),half));
const galleryCandidateMatrix=matrix(galleryCandidateRoot.toArray(),half);
gallery.proposedOnlyArrivalLounge={status:'PROPOSED — NOT APPLIED',nativeStableFootprintAnchor:arr(galleryFootprintCentre),targetAnchor:arr(galleryCandidateAnchor),root:arr(galleryCandidateRoot),yaw:galleryCandidateYaw,
  completeBounds:record(galleryNative.clone().applyMatrix4(galleryCandidateMatrix)),
  fit:'Fits X[-28,-12],s[18,42] without scaling; the retained reception/branding joinery makes it more than a newly furnished empty lounge. Owner approval still required for full alternate arrangement.'};

const document={
  generatedAt:new Date().toISOString(),status:'READ-ONLY PROPOSED FIT MEASUREMENTS — NOT APPLIED',units:'metres',
  method:'GLB POSITION buffer vertices, glTF scene/node accumulated matrices; original asset hashes; standard rigid yaw (no mirrors/scaling). All mesh vertices measured. Runtime reception ring suspension analytically included. Material- or node-hidden floor layers reported separately; beam/glow/light coverage is not an obstruction volume.',
  planningRegistration:{O:[0,.12,0],yaw:0,scale:1,formula:'A_world = O + R_y(0)*A_plan. Stall native anchor=[0,.12,0], so geometry root Y stays 0; do not add .12 twice.',status:'Requested parent registration for numeric report, not independently surveyed by this helper.'},
  parentTransforms:'Scene building group / Gallery / Boulevard / ZoneGroup have identity transforms; only named Reference groups add root/yaw. Pillar gallery has[-9,0,-50] beneath outer Y=.111.',
  assemblies:results,pillars,gallery,
  rentalProductSweeps:rentalProductSweeps.map(({box,...p})=>p),
  rentalProductSweepMethod:'Reconstructs actual source primitive vertices, including casing/rim geometries and nested DNA/corner transforms. For each vertex applies analytic extrema over baseYaw±.32 or full yaw. The full yaw radial envelope is exact for the authored vertex set. Visual-only sphere glow is excluded from opaque clearance.',
  triangleChecks:[{id:'technical-rig-vs-content-studio',method:'three-mesh-bvh MeshBVH.intersectsGeometry on all actual triangles; proposed S1,S3 relative translation+30m nativeX',intersects:actualRigS1,affectedS1MeshNames:hitNames,
    intersectionTrianglePairs,intersectionEdgeBoundsInS1Native:record(hitBoundsNative),intersectionEdgeBoundsInPlan:record(hitBoundsNative.clone().applyMatrix4(matrix([-20,0,-58],half))),
    note:'Do not treat a false triangle test as proof of clearance if one closed volume contains another. Here the candidate is a sparse open truss system, checked against all S1 shell surfaces.'}],
  proposedOnlyAlternatives:{status:'PROPOSED — NOT APPLIED',spacingTests,actualSurfaceSweep:{step:.01,range:[30,31.33],transitions:actualSweep,note:'Only this pair of triangle meshes. First clear sample is not proven global smallest viable court spacing.'},
    conservativeCourtSpacing:36,conservativeGap: .02,
    conservativeCourtSpacingRationale:'36 m exceeds 34.19672012 m combined rental/projection rig longitudinal extents, and 32.00264359 m content/technical complete extents, preserving at least .02 m air gap. Relative court positions change, so approval required. Neither protected hall nor arena moves. This is conservative, not a proven minimum.',
    receptionCentredAllocationFrontageMinimum:27.406686782836914,
    receptionPracticalCentredAllocationFrontage:28,
    receptionRationale:'Native accepted panel reaches +13.70334339 m from stable architectural anchor. A centred allocation therefore needs 2*13.70334339=27.40668678 m, despite total geometry width 25.5283432 m. Native geometry/anchor unchanged.',
    allOtherRigBounds:'S2 rig versus reception full assembly has .17128086 m longitudinal gap at original 28 m centre separation. Across courts the rig extrema retain 8.99736214 m transverse gap (S3 rig maxX=-.99736214; S2/S4 rig minX=8). Additive optics are excluded as non-solid effects.',
  },
  assets:[...files.values()].map(a=>({name:a.name,file:a.file,sha256:a.sha256,bytes:a.bytes,vertices:a.vertices,triangles:a.triangles,all:record(a.all),runtimeVisible:record(a.visible),roles:Object.fromEntries(Object.entries(a.roles).map(([k,v])=>[k,record(v)]))})),
  limitations:['Script does not alter application/assets or validate protected arena itself.','Light influence ranges and additive glow planes are not physical-clearance obstructions.','Any alternative shift is a proposal only; preserve all current accepted designs.'],
};
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'measured-assemblies.json'),JSON.stringify(document,null,2)+'\n');
let md='# Complete-assembly measurements\n\nREAD-ONLY FIT AUDIT — PROPOSED, NOT APPLIED. Units: metres.\n\n';
md+='Planning mapping used for this numeric report: O=[0,.12,0], yaw=0, scale=1. Native stall footprint/floor anchor=[0,.12,0], hence geometry root Y=0. The existing building is not transformed.\n\n';
md+='| Zone | Current root / yaw | Native opaque bounds X / Y / Z | Native complete bounds including own rig | Proposed complete world bounds |\n|---|---|---|---|---|\n';
for(const a of results)md+=`| ${a.id} ${a.identity} | ${JSON.stringify(a.root)} / ${a.yaw} | ${JSON.stringify(a.nativeOpaqueBounds)} | ${JSON.stringify(a.nativeCompleteBounds)} | ${JSON.stringify(a.proposedCompleteBounds)} |\n`;
md+='\n## Fit findings\n\n- The four service architectures/opaque props fit their native 24×16 reservations. Their selected heights differ and have been preserved.\n';
md+='- Reception requires 25.5283432 m native frontage. With the architectural anchor unchanged, its positive end overhangs the 24 m allocation by 1.7033434 m. Do not recenter or shrink it silently.\n';
md+='- Reception live halo hang-points reach Y=18.03994, beyond the geometry-only asset top Y=11.73394. The height leaves .96006 m under the nominal Y=19 roof; lower roof rigging still needs a detailed check.\n';
md+=`- Actual S3 overhead truss against S1 shell at proposed court centres: ${actualRigS1?'INTERSECTS':'no triangle-surface intersection found'}. Affected mesh names: ${hitNames.join('; ')||'none'}. The rig AABBs overlap by 2.00264 m in the longitudinal direction; this is not by itself a physical collision finding.\n`;
md+=`- There are ${intersectionTrianglePairs} intersecting triangle pairs. Their intersection-edge plan bounds are ${JSON.stringify(record(hitBoundsNative.clone().applyMatrix4(matrix([-20,0,-58],half))))}. This survives an equal longitudinal shift of all targets.\n`;
md+='- Local stall hall-context rigs are real mounted geometry: rental 32.00744×23 m at Y=11.725–12.462; technical 40.00529×34.00528 m at Y=9.236–10.294; projection 36.19683×23 m at Y=15.693–16.523. Keep them attached for any approved move; check them beyond each nominal footprint.\n';
md+='- P1–P4 bodies and native bases fit provisional 3×3 m boxes without scaling. Hero body height is 12.6 m; cap reaches Y=12.845. Native base bottom Y=.111 differs from common finished floor .12 by 9 mm, an existing condition preserved by a horizontal relocation.\n';
md+='- All seven runtime rental product swept envelopes fit inside 24×16 m. Exact primitive vertex sweeps include nested DNA turns and corner panels, casing/rims, continuous volumetric rotation and baseYaw±.32 sweeps. Individual bounds are in JSON.\n';
md+='- Shared pillar gallery is separate from the four display bodies. Its complete world bounds are X[-20.2,.8875],Y[.111,7.351],Z[-59.23,-44.275]. It contains retained reception, branding, lounge, planting and people; do not delete, duplicate or attach it to four different pillar deltas. A specific arrival-lounge placement is unresolved.\n';
md+='\n## Alternative spacing checks — PROPOSED, NOT APPLIED\n\n';
md+='| Court-centre spacing | Actual S3rig/S1shell intersection | Whole left bounds gap | Whole right rig bounds gap |\n|---|---|---|---|\n';
for(const s of spacingTests)md+=`| ${s.separation} | ${s.technicalRigS1ShellTriangleIntersection} | ${r(s.conservativeLeftWholeBoundsLongitudinalGap)} | ${r(s.correctedRightWholeRigBoundsLongitudinalGap)} |\n`;
md+=`\nA 10 mm sample sweep found transitions: ${JSON.stringify(actualSweep)}. This is pairwise surface evidence, not a proof of the smallest possible complete layout.\n\n`;
md+='A conservative whole-bounds alternative uses 36 m court-centre spacing: compared with 30 m this moves Court 2 farther toward the arena by 6 m, preserving current assembly scales and all local objects. Left whole-bounds gap is 3.99735641 m; right whole-rig gap is 1.80327988 m. A 32 m spacing clears the tested actual S1/S3 surfaces but leaves conservative rig envelopes overlapping. Vertical separation makes the right rig pair physically disjoint. The 36 m option is conservative and is not proven to be the smallest viable alternative. The .02 m whole-bounds gap threshold is 34.21673 m.\n\n';
md+='Keep Reception centred on its native anchor and reserve 28 m frontage (minimum 27.40668678 m centred envelope), rather than the asymmetric 25.529 m total width alone. This expands its planning allocation, not its geometry. Combine with the separately measured uniform longitudinal shift needed to clear the fixed vestibule; such a shift does not by itself solve the inter-court collision.\n\n';
md+=`Optional complete shared-gallery-to-arrival-lounge candidate: ${JSON.stringify(gallery.proposedOnlyArrivalLounge)}. It is not applied.\n`;
md+='\n## Dependencies\n\n- Root/yaw constants are duplicated in anamorphic.ts and technical.ts; rental rotation is hardcoded+90°. GRAND-only edits would leave some assemblies or camera projections behind.\n- ReferenceProjection and ReferenceLedRental2026 hide complete installations by journey.progress. For a simultaneous court overview those visibility gates and ZoneGroup worldZ ranges must be updated as part of any approved integration.\n- Screens, local lights, sculpture, rays, kiosks, identity layers and contact-shadow receivers are children of each reference root and should share one rigid delta. Detached view/visit/calibration vectors and shared floor/wayfinding anchors require explicit matching updates.\n- No browser, protected arena survey, floor polygon/obstacle check, or app changes performed by this report-only helper.\n';
md+='\nFull exact bounds, transforms and asset hashes: measured-assemblies.json. Reproduce: node scripts/measure-placement-assemblies.mjs.\n';
fs.writeFileSync(path.join(out,'assembly-measurements.md'),md);
console.log(JSON.stringify({out,assemblies:results.map(a=>({id:a.id,native:a.nativeCompleteBounds,proposed:a.proposedCompleteBounds})),triangleChecks:document.triangleChecks},null,2));
