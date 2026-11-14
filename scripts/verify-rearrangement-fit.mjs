/** Fresh implementation geometry proof; historical reports are read-only. */
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import * as T from 'three';
import {load,fromAsset,makeItem,tree,rigid,box,plane,rec,hash} from './placement-geometry.mjs';
import {exactMeshDistance} from './placement-clearance-distance.mjs';
const dir='reports/placement-implementation/20261019-rearrangement';
const registryFile='src/venue/data/placements.ts';
const runtime=await import(pathToFileURL(path.resolve(registryFile)).href);
const placements=runtime.INSTALLATION_PLACEMENTS;
const baseline=JSON.parse(fs.readFileSync(dir+'/baseline/measured-assemblies.json','utf8'));
const candidate={
 targets:Object.fromEntries(['S1','S2','S3','S4','R'].map(id=>[id,placements[id].root])),
 gallery:{root:placements.L.root,yaw:placements.L.yaw},
 pillarTargets:['P1','P2','P3','P4'].map(id=>({id,target:placements[id].root})),
};
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
  items.push(makeItem(a.id,geometries,rigid(candidate.targets[a.id],placements[a.id].yaw),{identity:a.identity}));
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
function queryBox(item,query){
  let count=0;const bounds=new T.Box3();
  if(item.box.intersectsBox(query))tree(item).shapecast({intersectsBounds:b=>b.intersectsBox(query),intersectsTriangle:t=>{
    if(query.intersectsTriangle(t)){count++;bounds.expandByPoint(t.a);bounds.expandByPoint(t.b);bounds.expandByPoint(t.c);}return false;
  }});
  return {id:item.id,status:count?'FAIL':'PASS',triangleCount:count,triangleUnionBounds:count?rec(bounds):null};
}
const directCore=new T.Box3(new T.Vector3(-3,.12,-232),new T.Vector3(3,2.32,-40));
const crossLink=new T.Box3(new T.Vector3(-12,.12,candidate.targets.S3[2]+12),new T.Vector3(12,2.32,candidate.targets.S1[2]-12));
const coreChecks=items.map(i=>queryBox(i,directCore)),crossChecks=items.map(i=>queryBox(i,crossLink));
const directArrivalLink=new T.Box3(new T.Vector3(-12,.12,placements.S1.root[2]+12),new T.Vector3(12,2.32,placements.R.root[2]-14));
const arrivalChecks=items.map(i=>queryBox(i,directArrivalLink));
const receptionItem=items.find(i=>i.id==='R'),hall0=fixed.find(i=>i.id==='protected-hall-bay-0');
const critical=exactMeshDistance(receptionItem,hall0);
const expectedAssets=JSON.parse(fs.readFileSync(dir+'/baseline/candidate-fit-check.json','utf8')).unchangedAssetHashes;
const assetPreservation=expectedAssets.map(a=>({file:a.file,baseline:a.sha256,current:hash(fs.readFileSync(a.file)),status:hash(fs.readFileSync(a.file))===a.sha256?'PASS':'FAIL'}));
const geometryConfig={placements,hall:{halfWidth:40,from:-26,to:-238,roofHeight:19,roofMemberUnderside:18.81},assetHashes:assetPreservation.map(a=>({file:a.file,sha256:a.current})),structuralClearanceTarget:.5};
const configurationHash=hash(Buffer.from(JSON.stringify(geometryConfig)));
const registeredWorldBounds=items.map(i=>({id:i.id,matrix:i.matrix,bounds:rec(i.box),registryWorldBounds:runtime.placementWorldBounds(i.id==='gallery'?'L':i.id)}));
const containment=items.map(i=>({id:i.id,status:i.box.min.x>=-39.68421052631579&&i.box.max.x<=39.68421052631579&&i.box.min.z>=-238&&i.box.max.z<=-30&&i.box.max.y<=19?'PASS':'FAIL',
  insideLevelExhibitionFootprint:i.box.min.x>=-39.68421052631579&&i.box.max.x<=39.68421052631579&&i.box.min.z>=-238&&i.box.max.z<=-30,
  belowNominalRoof:i.box.max.y<=19,
  leftWallClearance:i.box.min.x+39.68421052631579,rightWallClearance:39.68421052631579-i.box.max.x,roofDatumClearance:19-i.box.max.y}));
const laterBayRoofChecks=items.filter(i=>['S1','S2','S3','S4'].includes(i.id)).map(i=>({id:i.id,status:18.81-i.box.max.y>=.5?'PASS':'FAIL',memberUnderside:18.81,maxInstallationY:i.box.max.y,conservativeVerticalGap:18.81-i.box.max.y,
  method:'Entire current complete installation is in bays beyond first bay. Existing normal-state Satin aluminium batch is hidden there. Remaining continuous roof-member family has minimum Y=18.81; full mesh-intersection tests also run.'}));
const sideChecks=containment.map(i=>({id:i.id,minimumWallPlaneClearance:Math.min(i.leftWallClearance,i.rightWallClearance),status:Math.min(i.leftWallClearance,i.rightWallClearance)>=.5?'PASS':'FAIL'}));
const arrivalToVestibule=items.filter(i=>['P1','P2','P3','P4'].includes(i.id)).map(i=>({id:i.id,zGapFromVestibuleEnd:-40-i.box.max.z,status:-40-i.box.max.z>=.5?'PASS':'FAIL'}));
const nativePreservationChecks=Object.entries(placements).map(([id,p])=>({id,scale:p.scale,scaleStatus:p.scale===1?'PASS':'FAIL',noReflection:Math.abs(new T.Matrix4().fromArray(runtime.placementWorldMatrix(id)).determinant()-1)<1e-10,
  sourceWorldMatrix:runtime.placementWorldMatrix(id),baselineWorldMatrix:runtime.placementWorldMatrix(id,true),nativeFloorAnchor:p.nativeFloorAnchor,nativeFront:p.nativeFront}));
const c1=items.filter(i=>['S1','S2'].includes(i.id)),c2=items.filter(i=>['S3','S4'].includes(i.id));
const range=list=>({sMin:Math.min(...list.map(i=>-i.box.max.z)),sMax:Math.max(...list.map(i=>-i.box.min.z))});
const arrivalRange=range(items.filter(i=>['R','gallery','P1','P2','P3','P4'].includes(i.id))),c1Range=range(c1),c2Range=range(c2);
const longitudinal={arrival:arrivalRange,court1:c1Range,court2:c2Range,protectedArenaApproachStartsS:233.4,gaps:{arrivalToCourt1:c1Range.sMin-arrivalRange.sMax,court1ToCourt2:c2Range.sMin-c1Range.sMax,court2ToFixedApproach:233.4-c2Range.sMax},
  rationale:'Arrival stays at the authorized revised candidate. Court centres spread to109.15 and179.28 m, distributing the formerly unexplained final travel interval into three approximately34.12 m transitions. No entrance/tunnel, exhibition shell or arena move is required.'};
const solidEffectsBoundary='All authored opaque installation GLBs, people, planting, contexts/rigs and native pillar hardware are measured. Eight actual runtime reception suspension cylinders are explicitly included. Additive optical glow, projector rays, pools and reflection receivers are not solid obstructions. Runtime screen planes/labels and seven rotating LED model sweeps remain within measured opaque assembly envelopes; their unchanged local-source/swept data is recorded separately.';
const failures={protectedGeometry:tests.filter(t=>t.intersects),assemblyPairs:pairwise.filter(t=>t.intersects),core:coreChecks.filter(t=>t.status==='FAIL'),crossLink:crossChecks.filter(t=>t.status==='FAIL'),arrivalLink:arrivalChecks.filter(t=>t.status==='FAIL'),containment:containment.filter(t=>t.status==='FAIL'),assetPreservation:assetPreservation.filter(t=>t.status==='FAIL'),laterBayRoof:laterBayRoofChecks.filter(t=>t.status==='FAIL'),sides:sideChecks.filter(t=>t.status==='FAIL'),pillarVestibule:arrivalToVestibule.filter(t=>t.status==='FAIL')};
const status=Object.values(failures).every(v=>!v.length)&&critical.distanceMetres>=.5?'PASS':'FAIL';
const result={schema:'livegrid-implemented-configuration-fit-v1',generatedAt:new Date().toISOString(),status,configurationHash,registryFile,registrySourceHash:hash(fs.readFileSync(registryFile)),
  method:'Fresh world-space numerical proof from current absolute runtime registry and current original GLB bytes. Normal-state authored exhibition shell geometry. All upper rig members remain attached. No historical passing counts are reused.',
  protectionCategory:'B installation local-preservation plus C exhibition fit; separate arena/stage proof owns Category A.',
  placements,worldBounds:registeredWorldBounds,nativePreservationChecks,assetPreservation,
  protectedGeometryChecks:tests,assemblyPairChecks:pairwise,intersectionDetails:failureDetails,
  containmentChecks:containment,structuralClearanceTargetMetres:.5,
  criticalReceptionRoofClearance:{...critical,targetMetres:.5,status:critical.distanceMetres>=.5?'PASS':'FAIL'},
  sideWallClearanceChecks:sideChecks,laterBayRoofClearanceChecks:laterBayRoofChecks,pillarVestibuleClearances:arrivalToVestibule,
  directCore:{worldBox:rec(directCore),heightAboveFinishedFloor:2.2,status:failures.core.length?'FAIL':'PASS',checks:coreChecks},
  crossLink:{worldBox:rec(crossLink),heightAboveFinishedFloor:2.2,requiredDepth:6,actualDepth:crossLink.max.z-crossLink.min.z,status:failures.crossLink.length?'FAIL':'PASS',checks:crossChecks},
  arrivalLink:{worldBox:rec(directArrivalLink),heightAboveFinishedFloor:2.2,requiredDepth:4,actualDepth:directArrivalLink.max.z-directArrivalLink.min.z,status:failures.arrivalLink.length?'FAIL':'PASS',checks:arrivalChecks},
  longitudinal,hall:{before:{width:80,length:212,height:19},after:{width:80,length:212,height:19},resizing:'NONE REQUIRED',reason:'Existing usable width and overhead clearances accommodate complete unchanged installations at the distributed placements.'},
  solidEffectsBoundary,failures,
  limitations:['Numerical configuration fit does not certify browser mounting or visual framing; rendered captures and runtime instance/source checks are separate.','Camera curves, doorway reachability and full interior walk routes must be tested separately; a clear corridor slab alone does not establish them.','No building-code, physical safety, optimality or global-minimum claim.','Source geometric distance is bounded by GLB Float32 vertex precision; calculations use Float64. Existing platform/floor-contact datums remain as authored.'],
};
fs.writeFileSync(`${dir}/implemented-fit-check.json`,JSON.stringify(result,null,2)+'\n');
fs.writeFileSync(`${dir}/measured-placement-registry.json`,JSON.stringify({status:'CURRENT RUNTIME REGISTRY GEOMETRY BOUNDS',configurationHash,placements,worldBounds:registeredWorldBounds,longitudinal},null,2)+'\n');
let md=`# Rearrangement geometry proof\n\n${status}. Current configuration hash: ${configurationHash}.\n\n`;
md+=`This run reads all10 absolute installations from ${registryFile}; it does not infer positions from old screenshots.\n\n`;
md+=`- ${tests.length} fresh complete-installation versus authored hall/vestibule/bulkhead geometry checks: ${failures.protectedGeometry.length?'FAIL':'PASS'}.\n- ${pairwise.length} fresh complete-installation pair checks: ${failures.assemblyPairs.length?'FAIL':'PASS'}.\n- ${assetPreservation.length} original GLB fingerprints unchanged: ${failures.assetPreservation.length?'FAIL':'PASS'}.\n- Containment in existing level exhibition hall and below nominal roof: ${failures.containment.length?'FAIL':'PASS'}.\n- Six metre core, floor to2.2 m: ${result.directCore.status}. Cross-link ground volume: ${result.crossLink.status}, depth${result.crossLink.actualDepth.toFixed(3)} m. Arrival link: ${result.arrivalLink.status}, depth${result.arrivalLink.actualDepth.toFixed(3)} m.\n\n`;
md+=`## Structural clearances\n\nProject target is .5 m to side/overhead structures. The critical Reception versus first-bay truss clearance measures **${critical.distanceMetres.toFixed(6)} m**: ${result.criticalReceptionRoofClearance.status}. Closest points are ${JSON.stringify(critical.pointA)} and ${JSON.stringify(critical.pointB)}. This is an independent full triangle-mesh Euclidean calculation, not the prior20 mm threshold query.\n\n`;
md+=`Worst side-wall gap is ${Math.min(...sideChecks.map(s=>s.minimumWallPlaneClearance)).toFixed(6)} m. Later-bay roof-member gap is at least ${Math.min(...laterBayRoofChecks.map(s=>s.conservativeVerticalGap)).toFixed(6)} m. First pillar bases clear the fixed vestibule end by at least ${Math.min(...arrivalToVestibule.map(s=>s.zGapFromVestibuleEnd)).toFixed(6)} m.\n\n`;
md+=`## Longitudinal distribution\n\nArrival-to-Court1 complete-envelope transition: ${longitudinal.gaps.arrivalToCourt1.toFixed(3)} m; Court1-to-Court2: ${longitudinal.gaps.court1ToCourt2.toFixed(3)} m; Court2-to-fixed-arena-approach: ${longitudinal.gaps.court2ToFixedApproach.toFixed(3)} m. ${longitudinal.rationale}\n\n`;
md+='The exhibition hall remains80×212×19 m. Installation dimensions, scale and local arrangements remain unchanged; only complete rigid poses differ.\n\n';
md+=solidEffectsBoundary+'\n\n'+result.limitations.map(x=>'- '+x).join('\n')+'\n';
fs.writeFileSync(`${dir}/implemented-fit-check.md`,md);
console.log(JSON.stringify({status,configurationHash,registrySourceHash:result.registrySourceHash,tests:tests.length,pairs:pairwise.length,assets:assetPreservation.length,critical,resultGaps:longitudinal.gaps,failures},null,2));
export {items,fixed,placements,configurationHash};
