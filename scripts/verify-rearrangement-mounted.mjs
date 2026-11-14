import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import ts from 'typescript';
import * as THREE from 'three';

const root=process.cwd(),dir=path.join(root,'reports/placement-implementation/20261019-rearrangement');
const beforeFile=path.join(dir,'baseline/actual-scene-manifest.json'),afterFile=path.join(dir,'actual-scene-after.json');
const before=JSON.parse(fs.readFileSync(beforeFile)),after=JSON.parse(fs.readFileSync(afterFile));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const output=ts.transpileModule(fs.readFileSync(path.join(root,'src/venue/data/placements.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const module={exports:{}};new Function('module','exports',output)(module,module.exports);
const registry=module.exports;
const rowsBefore=before.records,rowsAfter=after.records,newById=new Map(rowsAfter.map(x=>[x.id,x]));
const checks=[],recordFailures=[];
const check=(name,pass,detail={})=>{const row={name,pass,...detail};checks.push(row);return row;};
const maxError=(a,b)=>a?.length===b?.length?Math.max(0,...a.map((v,i)=>Math.abs(v-b[i]))):Infinity;
check('Before/after actual scene record count preserved',rowsBefore.length===rowsAfter.length,{before:rowsBefore.length,after:rowsAfter.length});
check('Both captures include the complete mounted scene rather than visible-only geometry',before.allZones&&after.allZones,{beforeMethod:before.method,afterMethod:after.method,beforeCutawayHeight:before.cutawayHeight,afterCutawayHeight:after.cutawayHeight,note:'Only viewport cutaway visibility is ignored by the inspector; original uncut native attributes and world bounds remain recorded.'});

const arenaPrefix='scene/18:Group/8:Group/';
const arenaBefore=rowsBefore.filter(r=>r.id.startsWith(arenaPrefix)),arenaAfter=rowsAfter.filter(r=>r.id.startsWith(arenaPrefix));
check('Complete actual arena/approach/stage record identity set preserved',arenaBefore.length===615&&same(arenaBefore.map(x=>x.id).sort(),arenaAfter.map(x=>x.id).sort()),{records:arenaBefore.length,semanticRegistration:'Scene → Arena → Approach and Stage. Scene component ordering and Arena source are separately byte-identical except exhibition mount range outside this branch.'});
// MovingHead roots have a unique fixed clamp body and five descendants under
// the animated yoke, as authored in rig.tsx. Do not misreport different clock
// phases as a moved stage or quietly discard arbitrary world differences.
const moverBases=arenaBefore.filter(r=>r.id.endsWith('/0:Mesh')&&r.material?.length===1&&r.material[0].type==='MeshStandardMaterial'&&r.material[0].color==='0e1112'&&r.material[0].roughness===.5&&r.material[0].metalness===.8);
const movingBranches=moverBases.map(r=>r.id.slice(0,-'/0:Mesh'.length)+'/1:Group/');
const isMoverPhase=r=>movingBranches.some(prefix=>r.id.startsWith(prefix));
const beamIds=new Set(moverBases.map(r=>r.id.slice(0,-'/0:Mesh'.length)+'/1:Group/2:Group/2:Mesh'));
const pulsingPoolIds=new Set(['scene/18:Group/8:Group/0:Group/0:Group/9:Mesh','scene/18:Group/8:Group/1:Group/7:Mesh']);
const hazeId='scene/18:Group/8:Group/1:Group/5:Group/25:Mesh';
check('Expected fixed mover anchors and their articulated branches identified',moverBases.length===73&&arenaBefore.filter(isMoverPhase).length===365,{fixedBases:moverBases.length,animatedYokeHeadRecords:arenaBefore.filter(isMoverPhase).length,source:'src/venue/three/rig.tsx:167 MovingHead; src/venue/zones/Arena.tsx:Approach/StageLighting',note:'73 = 4 concourse heads + 69 stage heads. Five native child meshes per yoke may differ in world pose with elapsedTime.'});
function withoutOpacity(material){return material?.map(({opacity,...rest})=>rest);}
const arenaDetails=arenaBefore.map(old=>{
 const current=newById.get(old.id);
 const phase=isMoverPhase(old),opacityPhase=beamIds.has(old.id)||pulsingPoolIds.has(old.id),haze=old.id===hazeId;
 const fields={present:!!current,nativeGeometry:same(old.geometry,current?.geometry),nativeDirectLocalMatrix:same(old.localMatrix,current?.localMatrix),nameAndType:old.name===current?.name&&old.type===current?.type,staticUserData:same(old.userData,current?.userData),worldMatrix:phase?'UNSYNCHRONISED MOVING-HEAD PHASE':same(old.worldMatrix,current?.worldMatrix),worldBounds:phase||haze?'UNSYNCHRONISED ANIMATED BOUNDS':same(old.worldBounds,current?.worldBounds),materialAttributes:opacityPhase?same(withoutOpacity(old.material),withoutOpacity(current?.material)):same(old.material,current?.material)};
 const pass=Object.values(fields).every(x=>x===true||typeof x==='string');
 if(!pass)recordFailures.push({scope:'A arena',id:old.id,fields,before:old,after:current});
 return {id:old.id,name:old.name,fields,pass,...(phase?{temporalWorldDeviation:maxError(old.worldMatrix,current?.worldMatrix)}:{}),...(opacityPhase?{beforeOpacity:old.material?.map(x=>x.opacity),afterOpacity:current?.material?.map(x=>x.opacity)}:{})};
});
check('All actual arena native geometry/index hashes and direct local matrices preserved',arenaDetails.every(x=>x.fields.present&&x.fields.nativeGeometry&&x.fields.nativeDirectLocalMatrix&&x.fields.staticUserData),{recordCount:arenaDetails.length,attributeScope:'position, normal, UV and any additional native vertex attributes present in the capture; indices and direct mesh matrices.'});
const staticArena=arenaDetails.filter(x=>x.fields.worldMatrix===true);
check('All fixed actual arena world transforms preserved exactly',staticArena.length===250&&arenaDetails.every(x=>x.fields.worldMatrix===true||x.fields.worldMatrix==='UNSYNCHRONISED MOVING-HEAD PHASE'),{staticRecordCount:staticArena.length,animatedDescendantsExcluded:365,fixedMoverAnchorCount:moverBases.length});
check('All non-animated actual arena bounds preserved exactly',arenaDetails.every(x=>x.fields.worldBounds===true||x.fields.worldBounds==='UNSYNCHRONISED ANIMATED BOUNDS'),{staticBoundsRecords:arenaDetails.filter(x=>x.fields.worldBounds===true).length,animatedMoverBoundsExcluded:365,driftingHazeBoundsExcluded:1});
check('Actual arena scalar material attributes preserved outside known unsynchronised beam/pool opacity',arenaDetails.every(x=>x.fields.materialAttributes),{records:arenaDetails.length,opacityPhaseRecords:beamIds.size+pulsingPoolIds.size,exceptionProperties:['opacity'],method:'Name/type/colour/roughness/metalness remain exact even for excluded opacity phases. Only 73 mover beams and two authored pulsating pools have time-varying opacity excluded.'});
const fixedMeshScopes=[
 ['Full merged flagship-stage payload including deck, scenery and stairs','scene/18:Group/8:Group/1:Group/0:Group/',4],
 ['Complete panel array, housings, rims, brand and floor display','scene/18:Group/8:Group/1:Group/1:Group/',62],
 ['House ceiling','scene/18:Group/8:Group/1:Group/3:Group/',3],
 ['Instanced seating meshes and aisle guides','scene/18:Group/8:Group/1:Group/4:Group/',8],
 ['Fixed arena shell/roof/house structural trusses','scene/18:Group/3:Group/',66],
 ['Fixed arena portal','scene/18:Group/2:Group/',6],
];
const fixedScopes=fixedMeshScopes.map(([name,prefix,expected])=>{
 const items=rowsBefore.filter(x=>x.id.startsWith(prefix));
 const comparisons=items.map(r=>({id:r.id,pass:same(r,newById.get(r.id))}));
 const pass=items.length===expected&&comparisons.every(x=>x.pass);
 check(`Mounted protected scope unchanged: ${name}`,pass,{prefix,records:items.length,expectedRecords:expected});
 return {name,prefix,records:items.length,pass,comparisons};
});

// Match installation leaves by semantic parent paths. Pillars received an
// extra rigid wrapper, so their child suffixes are aligned explicitly rather
// than relying on the incidental global array index.
const galleryMarker='/0:Redesigned four-sided LED pillar gallery/';
const oldGallery=rowsBefore.find(x=>x.id.includes(galleryMarker)).id.split(galleryMarker)[0]+galleryMarker;
const newGallery=rowsAfter.find(x=>x.id.includes(galleryMarker)).id.split(galleryMarker)[0]+galleryMarker;
const scopes={
 S1:{marker:'/0:Grand anamorphic corner and occupied Content Studio/'},
 S2:{marker:'/0:LED Rental Solutions · October 2026 pavilion/'},
 S3:{marker:'/0:Engineering, show control and live production/'},
 S4:{marker:'/0:Projection mapping · crystalline architecture pavilion/'},
 R:{marker:'/0:Reception curved LED installation/'},
 L:{before:oldGallery+'0:Group/',after:newGallery+'0:Complete shared gallery and arrival lounge/'},
 P1:{before:oldGallery+'1:Group/',after:newGallery+'1:hero four-sided LED installation/0:Group/'},
 P2:{before:oldGallery+'2:Group/',after:newGallery+'2:companion four-sided LED installation/0:Group/'},
 P3:{before:oldGallery+'3:Group/',after:newGallery+'3:alpine four-sided LED installation/0:Group/'},
 P4:{before:oldGallery+'4:Group/',after:newGallery+'4:forest four-sided LED installation/0:Group/'},
};
function matrix(id,saved){return new THREE.Matrix4().fromArray(registry.placementWorldMatrix(id,saved));}
function mappedBounds(bounds,delta){if(!bounds)return undefined;const box=new THREE.Box3(new THREE.Vector3(...bounds.min),new THREE.Vector3(...bounds.max)).applyMatrix4(delta);return {min:box.min.toArray(),max:box.max.toArray()};}
function boundsError(a,b){if(!a&&!b)return 0;if(!a||!b)return Infinity;return Math.max(maxError(a.min,b.min),maxError(a.max,b.max));}
const installations=[];
for(const [id,scope] of Object.entries(scopes)){
 let oldPrefix=scope.before,newPrefix=scope.after;
 if(scope.marker){const a=rowsBefore.find(r=>r.id.includes(scope.marker)),b=rowsAfter.find(r=>r.id.includes(scope.marker));oldPrefix=a?.id.split(scope.marker)[0]+scope.marker;newPrefix=b?.id.split(scope.marker)[0]+scope.marker;}
 const oldRows=rowsBefore.filter(x=>x.id.startsWith(oldPrefix)).map(x=>({key:x.id.slice(oldPrefix.length),record:x}));
 const currentRows=rowsAfter.filter(x=>x.id.startsWith(newPrefix)).map(x=>({key:x.id.slice(newPrefix.length),record:x}));
 if(id==='L')for(let i=0;i<2;i++){
  const oldLight=rowsBefore.find(r=>r.id===oldGallery+`${5+i}:PointLight`);
  const currentLight=currentRows.find(x=>x.key===`${2+i}:PointLight`);
  oldRows.push({key:`@shared-gallery-fixture-${i}`,record:oldLight});
  if(currentLight)currentLight.key=`@shared-gallery-fixture-${i}`;
 }
 const currentByKey=new Map(currentRows.map(x=>[x.key,x.record]));
 const delta=matrix(id).multiply(matrix(id,true).invert());
 let maxWorldMatrixError=0,maxWorldBoundsError=0;
 const comparisons=oldRows.map(({key,record:a})=>{
  const b=currentByKey.get(key),expectedWorld=new THREE.Matrix4().fromArray(a.worldMatrix).premultiply(delta).toArray();
  const matrixError=maxError(expectedWorld,b?.worldMatrix),boundError=boundsError(mappedBounds(a.worldBounds,delta),b?.worldBounds);
  maxWorldMatrixError=Math.max(maxWorldMatrixError,matrixError);maxWorldBoundsError=Math.max(maxWorldBoundsError,boundError);
  const fields={present:!!b,nativeGeometry:same(a.geometry,b?.geometry),nativeDirectLocalMatrix:same(a.localMatrix,b?.localMatrix),materialAttributes:same(a.material,b?.material),lightColour:a.color===b?.color,lightIntensity:a.intensity===b?.intensity,worldDelta:matrixError<1e-7,worldBoundsDelta:boundError<1e-6};
  const pass=Object.values(fields).every(Boolean);
  if(!pass)recordFailures.push({scope:id,key,fields,matrixError,boundError,before:a,after:b});
  return {key,oldId:a.id,newId:b?.id,fields,matrixError,boundError,pass};
 });
 const keysMatch=oldRows.length===currentRows.length&&oldRows.every(x=>currentByKey.has(x.key));
 const pass=keysMatch&&comparisons.every(x=>x.pass);
 check(`Mounted installation ${id} preserves native leaves and exact rigid D`,pass,{id,beforeRecords:oldRows.length,afterRecords:currentRows.length,matchedKeys:keysMatch,maxWorldMatrixComponentError:maxWorldMatrixError,maxWorldBoundsErrorMetres:maxWorldBoundsError});
 installations.push({id,beforePrefix:oldPrefix,afterPrefix:newPrefix,beforeRecords:oldRows.length,afterRecords:currentRows.length,keysMatch,maxWorldMatrixError,maxWorldBoundsError,pass,comparisons});
}
const result={schema:'mounted-protection-check-v2',generatedAt:new Date().toISOString(),status:checks.every(x=>x.pass)?'PASS MOUNTED STATIC/NATIVE PROTECTION':'FAIL',inputs:{before:{file:path.relative(root,beforeFile),sha256:hash(beforeFile),capturedAt:before.capturedAt,url:before.url},after:{file:path.relative(root,afterFile),sha256:hash(afterFile),capturedAt:after.capturedAt,url:after.url},registrySha256:hash(path.join(root,'src/venue/data/placements.ts'))},summary:{checks:checks.length,passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass).length,wholeSceneBefore:rowsBefore.length,wholeSceneAfter:rowsAfter.length,arenaRecords:arenaDetails.length,fixedArenaWorldMatrices:staticArena.length,nativeGeometryAndDirectLocalMatrices:arenaDetails.length,installationRecords:installations.reduce((n,x)=>n+x.beforeRecords,0),installationAssemblies:installations.length},checks,protectedFixedScopes:fixedScopes,arena:{recordComparisons:arenaDetails,dynamicPhaseExclusions:{movingHeadRoots:moverBases.map(r=>r.id.slice(0,-'/0:Mesh'.length)),movingHeadDescendants:365,beamOpacityRecords:beamIds.size,pulsingPoolOpacityIds:[...pulsingPoolIds],driftingHazeBoundsId:hazeId,sourceBytesUnchanged:['src/venue/three/rig.tsx','src/venue/zones/Arena.tsx'],note:'These are recorded as unsynchronised capture phase, not as equal world poses or equal temporal pixels. Fixed bases, native geometry, direct local leaf matrices and non-opacity material properties remain compared.'}},installations,failures:recordFailures,limitations:['Actual renderer scene snapshots, not rendered pixel equality. Before and after were captured at different clocks; moving-head parent poses, beam/pool opacity and drifting haze instance bounds are explicitly not compared as temporal equality.','The inspector stores native geometry attribute/index FNV hashes plus scalar material fields, not texture pixels, shader source/uniforms, complete materials or per-instance matrix/colour arrays. Source/asset SHA256 and executable shader tests in separate artifacts supply additional protection evidence.','The eight seating mesh/group records, native geometry, world bounds and source are identical; this manifest does not independently prove every one of 1680 instance matrices or per-person colours.','Capture follows the 15:44 static build. Later BasinWater waveB time-sign correction has no geometry/transform effect and is independently verified in arena-protection-check.json.','Visibility selection is diagnostic; captured object.visible is not a claim that the original normal-route culling result is identical. Navigation/entry browser QA is separate.']};
fs.writeFileSync(path.join(dir,'mounted-protection-check.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,summary:result.summary,failures:checks.filter(x=>!x.pass).map(x=>({name:x.name,...(x.id?{id:x.id}:{}),before:x.beforeRecords,after:x.afterRecords,error:x.maxWorldMatrixComponentError})),recordFailures:recordFailures.length,sampleFailures:recordFailures.slice(0,4).map(x=>({scope:x.scope,id:x.id,key:x.key,fields:x.fields,matrixError:x.matrixError,boundError:x.boundError}))}));
if(checks.some(x=>!x.pass))process.exitCode=1;
