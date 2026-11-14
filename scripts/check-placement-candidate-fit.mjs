/** Report-only candidate checks. Never applies proposed transforms to the app. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as T from 'three';
import { MeshBVH } from 'three-mesh-bvh';

const dir='reports/placement-implementation/20261019-coordinate-layout';
const candidate=JSON.parse(fs.readFileSync(`${dir}/alternative-candidate.json`,'utf8'));
const baseline=JSON.parse(fs.readFileSync(`${dir}/measured-assemblies.json`,'utf8'));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const vec=v=>v.toArray().map(x=>+x.toFixed(8));
const rec=b=>({min:vec(b.min),max:vec(b.max),size:vec(b.getSize(new T.Vector3()))});
const cache=new Map();
const rigid=(p,yaw)=>new T.Matrix4().makeRotationY(yaw).setPosition(...p);
function load(name){
  if(cache.has(name))return cache.get(name);
  const file=`public/models/expo/${name}.glb`,b=fs.readFileSync(file),length=b.readUInt32LE(12);
  const d=JSON.parse(b.toString('utf8',20,20+length)),bin=length+28,primitives=[];
  function walk(i,parent,hidden=false){
    const n=d.nodes[i],m=new T.Matrix4();
    if(n.matrix)m.fromArray(n.matrix);else m.compose(new T.Vector3(...(n.translation??[0,0,0])),new T.Quaternion(...(n.rotation??[0,0,0,1])),new T.Vector3(...(n.scale??[1,1,1])));
    m.premultiply(parent);const role=n.extras?.grandRole??'unclassified';
    hidden=hidden||['floor','shared-floor'].includes(role)||!!n.extras?.grandSharedFloor;
    if(n.mesh!=null)for(const p of d.meshes[n.mesh].primitives){
      const a=d.accessors[p.attributes.POSITION],bv=d.bufferViews[a.bufferView],off=bin+(bv.byteOffset??0)+(a.byteOffset??0),stride=bv.byteStride??12;
      const positions=new Float32Array(a.count*3),v=new T.Vector3();
      for(let k=0;k<a.count;k++){
        v.set(b.readFloatLE(off+k*stride),b.readFloatLE(off+k*stride+4),b.readFloatLE(off+k*stride+8)).applyMatrix4(m);positions.set(v.toArray(),k*3);
      }
      let indices;
      if(p.indices!=null){const ia=d.accessors[p.indices],ib=d.bufferViews[ia.bufferView],io=bin+(ib.byteOffset??0)+(ia.byteOffset??0),[read,bytes]=({5121:['readUInt8',1],5123:['readUInt16LE',2],5125:['readUInt32LE',4]})[ia.componentType];indices=Uint32Array.from({length:ia.count},(_,k)=>b[read](io+k*bytes));}
      else indices=Uint32Array.from({length:a.count},(_,k)=>k);
      primitives.push({name:n.name,role,hidden,material:d.materials[p.material]?.name,positions,indices});
    }
    for(const child of n.children??[])walk(child,m,hidden);
  }
  for(const node of d.scenes[d.scene??0].nodes)walk(node,new T.Matrix4());
  const result={name,file,sha256:hash(b),primitives};cache.set(name,result);return result;
}
function fromAsset(name,filter=()=>true){return load(name).primitives.filter(p=>!p.hidden&&filter(p)).map(p=>{
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(p.positions.slice(),3));g.setIndex(new T.BufferAttribute(p.indices.slice(),1));return g;
});}
function combine(geometries){
  const count=geometries.reduce((n,g)=>n+g.attributes.position.count,0),indexCount=geometries.reduce((n,g)=>n+(g.index?.count??g.attributes.position.count),0);
  const pos=new Float32Array(count*3),indices=new Uint32Array(indexCount);let nv=0,ni=0;
  for(const g of geometries){pos.set(g.attributes.position.array,nv*3);for(let i=0;i<(g.index?.count??g.attributes.position.count);i++)indices[ni++]=nv+(g.index?g.index.getX(i):i);nv+=g.attributes.position.count;}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setIndex(new T.BufferAttribute(indices,1));g.computeBoundingBox();return g;
}
const box=(size,p=[0,0,0])=>new T.BoxGeometry(...size).translate(...p);
const plane=(size,p,rotation)=>new T.PlaneGeometry(...size).applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(...rotation)).setPosition(...p));
function makeItem(id,geometries,matrix,extra={}){
  const g=combine(geometries);g.applyMatrix4(matrix);g.computeBoundingBox();
  return {id,g,box:g.boundingBox.clone(),matrix:matrix.toArray(),...extra};
}
function tree(item){return item.g.boundsTree??=(new MeshBVH(item.g));}
const items=[];
for(const a of baseline.assemblies){
  const geometries=[...a.names,...a.hall].flatMap(n=>fromAsset(n));
  if(a.id==='S4')geometries.push(...fromAsset('projection-finish-v2-crystals').map(g=>g.translate(0,.915,-2.8)));
  if(a.id==='R'){
    // Both live RingScreens contribute actual solid hanging cylinders. Their
    // geometry is not in grand-reception-brand-wall-v2.glb.
    const haloMatrix=new T.Matrix4().compose(new T.Vector3(2.2,10.23994,-3.5),new T.Quaternion(),new T.Vector3(7.6/4.9,2,3.85/4.9));
    for(const [radius,height] of [[4.9,1.4],[4.78,1.36]])for(let i=0;i<4;i++){
      const angle=i/4*Math.PI*2+Math.PI/4;
      geometries.push(new T.CylinderGeometry(.018,.018,3.2,6).translate(Math.cos(angle)*radius,height/2+1.6,Math.sin(angle)*radius).applyMatrix4(haloMatrix));
    }
  }
  items.push(makeItem(a.id,geometries,rigid(candidate.targets[a.id],a.targetYaw),{identity:a.identity}));
}
const gallery=makeItem('gallery',baseline.gallery.names.flatMap(n=>fromAsset(n)),rigid(candidate.gallery.root,candidate.gallery.yaw));items.push(gallery);
for(const p of baseline.pillars){
  const target=candidate.pillarTargets.find(x=>x.id===p.id).target;
  const geos=[box([p.w-.02,p.h-.02,p.w-.02],[0,.11+p.h/2,0]),box([p.w+.3,.11,p.w+.3],[0,.055,0]),box([p.w+.016,.024,p.w+.016],[0,.11+p.h+.012,0])];
  // Opaque screen planes at body limits; all four native faces remain.
  for(let i=0;i<4;i++){const m=new T.Matrix4().makeRotationY(i*Math.PI/2).setPosition(Math.sin(i*Math.PI/2)*p.w/2,.11+p.h/2,Math.cos(i*Math.PI/2)*p.w/2);geos.push(new T.PlaneGeometry(p.w,p.h).applyMatrix4(m));}
  items.push(makeItem(p.id,geos,rigid(target,0),{identity:p.identity}));
}

const fixed=[];
for(let i=0;i<8;i++){
  const z=-39.25-i*26.5,m=new T.Matrix4().makeScale(40/19,19/15,26.5/26).setPosition(0,0,z);
  const geos=fromAsset('hall-bay',p=>!(i>=1&&(/satin aluminium/i.test(p.material)||/integrated light/i.test(p.material))));
  fixed.push(makeItem(`protected-hall-bay-${i}`,geos,m,{source:'src/venue/zones/Architecture.tsx: HallShell; ExpoAsset applies hideHallColumns and darkHall visibility as authored.'}));
}
// Fixed vestibule, source from=-29,to=-40,h7.2,halfW7.6. Optical strips
// excluded; wall/ceiling surfaces and blade cabinets are retained.
const vestibule=[];
for(const s of [-1,1])vestibule.push(plane([11,7.2],[s*7.6,3.6,-34.5],[0,s>0?-Math.PI/2:Math.PI/2,0]));
vestibule.push(plane([15.2,11],[0,7.2,-34.5],[Math.PI/2,0,0]));
for(const s of [-1,1]){
  const bladeMatrix=new T.Matrix4().makeRotationY(s===-1?.26:-.26).setPosition(s*5.55,3.1,-38.8);
  vestibule.push(box([1,5.85,.11],[0,0,-.06]).applyMatrix4(bladeMatrix));
}
fixed.push(makeItem('protected-vestibule',vestibule,new T.Matrix4(),{source:'src/venue/zones/Exhibition.tsx: Vestibule'}));
function bulkhead(z){
  const shape=new T.Shape();shape.moveTo(-26,0);shape.lineTo(26,0);shape.lineTo(26,15);shape.lineTo(-26,15);shape.closePath();
  const hole=new T.Path();hole.moveTo(-3.22,0);hole.lineTo(-3.22,3.22*1.55);hole.lineTo(3.22,3.22*1.55);hole.lineTo(3.22,0);hole.closePath();shape.holes.push(hole);
  return new T.ShapeGeometry(shape).translate(0,0,z);
}
fixed.push(makeItem('protected-tunnel-exit-bulkhead',[bulkhead(-28.4)],new T.Matrix4(),{source:'src/venue/zones/Tunnel.tsx: Bulkhead'}));

const tests=[];
for(const a of items)for(const b of fixed){
  const broad=a.box.intersectsBox(b.box);
  if(broad)tree(b);
  const hit=broad?tree(a).intersectsGeometry(b.g,new T.Matrix4()):false;
  tests.push({a:a.id,b:b.id,status:hit?'FAIL':'PASS',method:broad?'actual triangle BVH surface intersection':'disjoint complete world-space bounds',intersects:hit});
}
const pairwise=[];
for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
  const a=items[i],b=items[j],broad=a.box.intersectsBox(b.box),hit=broad?tree(a).intersectsGeometry(b.g,new T.Matrix4()):false;
  pairwise.push({a:a.id,b:b.id,status:hit?'FAIL':'PASS',method:broad?'actual triangle BVH surface intersection':'disjoint complete world-space bounds',intersects:hit});
}
const failureDetails=[];
for(const fail of tests.filter(t=>t.intersects)){
  const a=items.find(i=>i.id===fail.a),b=fixed.find(i=>i.id===fail.b);
  const bounds=new T.Box3();let pairs=0;
  tree(a).bvhcast(tree(b),new T.Matrix4(),{intersectsTriangles(t1,t2){const edge=new T.Line3();if(t1.intersectsTriangle(t2,edge,true)){pairs++;bounds.expandByPoint(edge.start);bounds.expandByPoint(edge.end);}return false;}});
  const materials=[];
  if(fail.b==='protected-hall-bay-0')for(const p of load('hall-bay').primitives){
    const member=makeItem(p.name,fromAsset('hall-bay',other=>other===p),new T.Matrix4().fromArray(b.matrix));tree(member);
    if(tree(a).intersectsGeometry(member.g,new T.Matrix4()))materials.push({name:p.name,material:p.material,bounds:rec(member.box)});
  }
  failureDetails.push({...fail,intersectingTrianglePairs:pairs,intersectionEdgeBounds:rec(bounds),fixedMembers:materials});
}
const additionalShiftSearch=[];
let firstPassingAdditionalShift=tests.some(t=>t.intersects)?null:0;
for(let shift=1;firstPassingAdditionalShift!==0&&shift<=16;shift++){
  const failedPairs=[],inverseDelta=new T.Matrix4().makeTranslation(0,0,shift);
  for(const a of items)for(const b of fixed){
    const movedBox=a.box.clone().translate(new T.Vector3(0,0,-shift));
    if(!movedBox.intersectsBox(b.box))continue;
    tree(b);
    if(tree(a).intersectsGeometry(b.g,inverseDelta))failedPairs.push({a:a.id,b:b.id});
  }
  additionalShiftSearch.push({additionalShiftS:shift,status:failedPairs.length?'FAIL':'PASS',protectedIntersectionPairs:failedPairs,
    method:'All candidate assemblies shifted rigidly together; 100 candidate versus protected-object pairs tested by bounds then actual triangle BVHs. Pairwise assembly separations remain invariant.'});
  if(!failedPairs.length){firstPassingAdditionalShift=shift;break;}
}
const passingCandidate=firstPassingAdditionalShift==null?null:structuredClone(candidate);
if(passingCandidate){
  const shift=firstPassingAdditionalShift;
  passingCandidate.status='PROPOSED — NOT APPLIED; geometry-checked uniform-shift alternative, owner approval required';
  passingCandidate.arrivalShiftS+=shift;passingCandidate.court1ShiftS+=shift;passingCandidate.court2ShiftS+=shift;
  for(const target of Object.values(passingCandidate.targets))target[2]-=shift;
  for(const p of passingCandidate.pillarTargets)p.target[2]-=shift;
  passingCandidate.gallery.targetAnchor[2]-=shift;passingCandidate.gallery.root[2]-=shift;
  passingCandidate.gallery.completeBounds.min[2]-=shift;passingCandidate.gallery.completeBounds.max[2]-=shift;
  passingCandidate.evidenceBoundary=shift===0?'Current proposed candidate passes tested protected-geometry intersections. It remains unrendered; camera/navigation/entry reachability remains NOT TESTED. No global minimum claim.':'First passing additional integer-metre shift in bounded search, not a global minimum. Actual protected-geometry intersections are cleared. Assembly relative transforms and pairwise tests are unchanged. Candidate remains unrendered; camera/navigation/entry reachability remains NOT TESTED.';
}
fs.writeFileSync(`${dir}/candidate-shift-fit-check.json`,JSON.stringify({status:'PROPOSED — NOT APPLIED',sourceCandidateSha256:hash(fs.readFileSync(`${dir}/alternative-candidate.json`)),search:additionalShiftSearch,firstPassingAdditionalShiftS:firstPassingAdditionalShift,proposedCandidate:passingCandidate,limitations:['Only whole-installation rigid longitudinal shifts were tested, in 1 m increments.','No global-minimum claim, no application mutation, no browser navigation test.']},null,2)+'\n');
function queryBox(item,query){
  let count=0;const bounds=new T.Box3();
  if(item.box.intersectsBox(query))tree(item).shapecast({intersectsBounds:b=>b.intersectsBox(query),intersectsTriangle:t=>{
    if(query.intersectsTriangle(t)){count++;bounds.expandByPoint(t.a);bounds.expandByPoint(t.b);bounds.expandByPoint(t.c);}return false;
  }});
  return {id:item.id,status:count?'FAIL':'PASS',triangleCount:count,triangleUnionBounds:count?rec(bounds):null};
}
const directCore=new T.Box3(new T.Vector3(-3,.12,-134),new T.Vector3(3,2.32,-40));
const crossLink=new T.Box3(new T.Vector3(-12,.12,candidate.targets.S3[2]+12),new T.Vector3(12,2.32,candidate.targets.S1[2]-12));
const coreChecks=items.map(i=>queryBox(i,directCore)),crossChecks=items.map(i=>queryBox(i,crossLink));
const receptionItem=items.find(i=>i.id==='R'),hall0=fixed.find(i=>i.id==='protected-hall-bay-0');
tree(hall0);
const distanceTarget1={},distanceTarget2={};
const closeResult=tree(receptionItem).closestPointToGeometry(hall0.g,new T.Matrix4(),distanceTarget1,distanceTarget2,0,.02);
const criticalRoofClearance={
  pair:['R','protected-hall-bay-0'],thresholdMetres:.02,
  status:closeResult&&closeResult.distance<.02?'FAIL':'PASS',
  method:'MeshBVH.closestPointToGeometry with maximum search threshold .02 m and original normal-state first-bay mesh.',
  anyCandidatePointDistance:closeResult?.distance??null,
  pointOnReception:closeResult?vec(distanceTarget1.point):null,pointOnFixedHall:closeResult?vec(distanceTarget2.point):null,
  conclusion:closeResult&&closeResult.distance<.02?'A source triangle lies less than .02 m from the protected first-bay mesh.':'No source triangle pair is less than .02 m apart for this critical pair; exact global minimum distance is not claimed.',
};
const authoredImagesAndPlanes='Live screen planes, letters and runtime rental model sweeps are source-audited inside measured opaque envelopes. Their per-mesh triangle geometry is not duplicated in this helper; all seven rental swept bounds were independently computed in measured-assemblies.json and are inside the 24×16 shell. Optical rays, additive glow, reflection receivers and light influence ranges are not physical obstacles.';
const result={
  status:'PROPOSED CANDIDATE FIT CHECK — NOT APPLIED',generatedAt:new Date().toISOString(),candidateFile:`${dir}/alternative-candidate.json`,candidateSha256:hash(fs.readFileSync(`${dir}/alternative-candidate.json`)),
  method:'GLB mesh vertices with complete node and candidate assembly world transforms; actual pairwise BVH triangle-surface intersections where bounds overlap; source-derived vestibule/bulkhead primitives; explicit runtime reception hanging cylinders. Source/state visibility matches normal exhibition rendering. All tests are geometric and report-only.',
  units:'metres',tolerance:.02,
  candidateAssemblies:items.map(({g,box,...i})=>({...i,bounds:rec(box),vertices:g.attributes.position.count,triangles:g.index.count/3})),
  fixedObjects:fixed.map(({g,box,...i})=>({...i,bounds:rec(box),vertices:g.attributes.position.count,triangles:g.index.count/3})),
  unchangedAssetHashes:[...cache.values()].map(({name,file,sha256})=>({name,file,sha256})),
  protectedMeshTests:tests,assemblyPairTests:pairwise,
  failureDetails,
  additionalUniformShiftSearch:{search:additionalShiftSearch,firstPassingAdditionalShiftS:firstPassingAdditionalShift,detailFile:`${dir}/candidate-shift-fit-check.json`},
  directCore:{worldBox:rec(directCore),heightAboveFinishedFloor:2.2,checks:coreChecks},crossLink:{worldBox:rec(crossLink),heightAboveFinishedFloor:2.2,checks:crossChecks},
  criticalRoofClearance,
  roof:{receptionTop:18.03994,nominalRoofBottom:19,nominalRoofClearance:.96006,lowestContinuousChampagneRoofMemberY:18.81,verticalClearanceToContinuousRoofMember:.77006,note:'The complete normal-state hall geometry is additionally tested above, including visible first-bay column/truss batch. Hidden Satin aluminium for bays1–7 stays hidden, as in existing code.'},
  galleryBoundsCheck:{candidateBounds:rec(gallery.box),allocation:{x:[-28,-12],s:[18+candidate.arrivalShiftS,42+candidate.arrivalShiftS]},contained:gallery.box.min.x>=-28&&gallery.box.max.x<=-12&&gallery.box.min.z>=-(42+candidate.arrivalShiftS)&&gallery.box.max.z<=-(18+candidate.arrivalShiftS)},
  authoredImagesAndPlanes,
  summary:{protectedHits:tests.filter(t=>t.intersects),assemblyHits:pairwise.filter(t=>t.intersects),directCoreHits:coreChecks.filter(t=>t.status==='FAIL'),crossLinkHits:crossChecks.filter(t=>t.status==='FAIL')},
  limitations:[
    'No candidate has been implemented or rendered. Camera paths, visitor eye views, complete entrance reachability, and user-controlled forward/reverse navigation remain NOT TESTED.',
    'Pairwise surface tests do not by themselves prove separation when one closed volume wholly contains another. Candidate complete world bounds are also recorded to expose such a situation.',
    'No minimum-passage or building-code certification. Core test is an axis-aligned 6 m wide floor-to-2.2 m slab, not an accessibility simulation.',
    'Protected arena geometry lies far beyond the candidate assemblies (fixed approach begins nearZ-240.4); no arena object is moved. This helper does not recreate its protected scene/modes.',
    'Shared existing floor surface is deliberately excluded from collision obstacles. Source basement/platform interfaces remain as authored.',
    'Full current state remains unchanged; there is no globally smallest viable layout claim.',
  ],
};
fs.writeFileSync(`${dir}/candidate-fit-check.json`,JSON.stringify(result,null,2)+'\n');
const failed=[...result.summary.protectedHits,...result.summary.assemblyHits,...result.summary.directCoreHits,...result.summary.crossLinkHits];
const md=`# Candidate geometric fit checks\n\nPROPOSED — NOT APPLIED. Owner approval required.\n\nCandidate fingerprint: ${result.candidateSha256}.\n\n- ${tests.length} complete assembly versus protected hall/vestibule/bulkhead checks: ${result.summary.protectedHits.length?'FAIL':'PASS'} (${result.summary.protectedHits.length} object pairs intersect).\n- ${pairwise.length} candidate assembly pair checks: ${result.summary.assemblyHits.length?'FAIL':'PASS'} (${result.summary.assemblyHits.length} object pairs intersect).\n- Six metre direct core, floor to 2.2 m above finished floor: ${result.summary.directCoreHits.length?'FAIL':'PASS'} (${result.summary.directCoreHits.length} objects intrude).\n- Inter-court link, floor to 2.2 m above finished floor: ${result.summary.crossLinkHits.length?'FAIL':'PASS'} (${result.summary.crossLinkHits.length} objects intrude).\n- Shared gallery fits candidate arrival-lounge allocation: ${result.galleryBoundsCheck.contained?'PASS':'FAIL'}.\n- Critical Reception / first-bay roof clearance of at least .02 m: ${criticalRoofClearance.status}. ${criticalRoofClearance.conclusion}\n- Reception highest live hanger: Y=18.03994. Continuous champagne roof members start at Y=18.81, leaving .77006 m vertical separation. This clearance to one member family does not clear the lower first-bay Satin aluminium trusses; the complete normal-state geometry test includes them.\n\nFailures: ${JSON.stringify(failureDetails)}\n\n${authoredImagesAndPlanes}\n\n${result.limitations.map(l=>'- '+l).join('\n')}\n\nDetailed exact matrices, bounds, tests and hashes are in candidate-fit-check.json. Reproduce with node scripts/check-placement-candidate-fit.mjs.\n`;
fs.writeFileSync(`${dir}/candidate-fit-check.md`,md);
console.log(JSON.stringify({counts:{fixed:tests.length,pair:pairwise.length},summary:result.summary,gallery:result.galleryBoundsCheck,roof:result.roof},null,2));
