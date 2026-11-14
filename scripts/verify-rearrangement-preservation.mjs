import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import ts from 'typescript';
import * as THREE from 'three';

// Report-only, deterministic checks against the frozen pre-move working tree.
// This never writes an app source, model, historical report or registry input.
const root=process.cwd();
const report=path.join(root,'reports/placement-implementation/20261019-rearrangement');
const baseline=path.join(report,'baseline');
const require=createRequire(import.meta.url);
const read=file=>fs.readFileSync(path.resolve(root,file),'utf8');
const json=file=>JSON.parse(read(file));
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const hash=file=>sha(fs.readFileSync(path.resolve(root,file)));
const snapshot=file=>fs.readFileSync(path.join(baseline,file+'.snapshot'),'utf8');
const norm=text=>text.replaceAll('\r\n','\n');
const before=json(path.relative(root,path.join(baseline,'BEFORE_MANIFEST.json')));
const measured=json(path.relative(root,path.join(baseline,'measured-assemblies.json')));
const checks=[];
const check=(name,pass,detail={})=>{const result={name,pass,...detail};checks.push(result);return result;};
const now=new Date().toISOString();

// Execute saved/current TS data and shader hooks, rather than regex-evaluating
// numerical expressions or depending on the page's chosen camera state.
function loader(useBaseline=false,overrides={}){
  const cache=new Map();
  function load(file){
    file=path.resolve(root,file);
    if(cache.has(file))return cache.get(file).exports;
    const module={exports:{}};cache.set(file,module);
    const source=useBaseline&&fs.existsSync(path.join(baseline,path.relative(root,file)+'.snapshot'))
      ?snapshot(path.relative(root,file)):fs.readFileSync(file,'utf8');
    const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText;
    const localRequire=name=>{
      if(Object.hasOwn(overrides,name))return overrides[name];
      if(name==='three')return THREE;
      if(name.startsWith('.')){
        let target=path.resolve(path.dirname(file),name);
        if(target.endsWith('.json'))return JSON.parse(fs.readFileSync(target,'utf8'));
        if(!path.extname(target))target=fs.existsSync(target+'.ts')?target+'.ts':target+'.tsx';
        return load(target);
      }
      return require(name);
    };
    new Function('require','module','exports',output)(localRequire,module,module.exports);
    return module.exports;
  }
  return load;
}
const currentLoad=loader(),oldLoad=loader(true);
const registry=currentLoad('src/venue/data/placements.ts');
const placements=registry.PLACEMENTS;
const registryInputHash=hash('src/venue/data/placements.ts');
const vecError=(a,b)=>Math.max(...a.map((v,i)=>Math.abs(v-b[i])));
const matrix=(id,old=false)=>new THREE.Matrix4().fromArray(registry.placementWorldMatrix(id,old));
const rigid=[];
for(const [id,p] of Object.entries(placements)){
  const m=matrix(id),old=matrix(id,true),delta=m.clone().multiply(old.clone().invert());
  const rootAfter=registry.transformOldWorldToNew(id,p.baseline.root);
  const rootCheck=check(`${id}: original root maps once to absolute final root`,vecError(rootAfter,p.root)<1e-10,{id,errorMetres:vecError(rootAfter,p.root)});
  const scale=new THREE.Vector3();m.decompose(new THREE.Vector3(),new THREE.Quaternion(),scale);
  const rigidCheck=check(`${id}: no scale or reflection`,Math.abs(m.determinant()-1)<1e-10&&vecError(scale.toArray(),[1,1,1])<1e-10&&p.scale===1,{id,determinant:m.determinant(),scale:scale.toArray()});
  rigid.push({id,label:p.label,before:p.baseline,after:{root:p.root,yaw:p.yaw,scale:p.scale},beforeWorldMatrix:old.toArray(),afterWorldMatrix:m.toArray(),rigidDelta:delta.toArray(),nativeFloorAnchor:p.nativeFloorAnchor,worldFloorAnchor:registry.placementWorldPoint(id,p.nativeFloorAnchor),nativeCompleteBounds:p.nativeCompleteBounds,worldCompleteBounds:registry.placementWorldBounds(id),pass:rootCheck.pass&&rigidCheck.pass});
}
check('L: measured asymmetric lounge anchor is the intended world floor centre',vecError(registry.placementWorldPoint('L',placements.L.nativeFloorAnchor),[-20,.12,-47.195])<1e-8);
check('R: absolute inward yaw is minus 90 degrees',placements.R.yaw===-Math.PI/2);
for(const id of ['S1','S2','S3','S4']){
  const v=registry.transformOldWorldDirectionToNew(id,[Math.sin(placements[id].baseline.yaw),0,Math.cos(placements[id].baseline.yaw)]);
  check(`${id}: original facade now faces shared forum`,v[0]*(placements[id].root[0]<0?1:-1)>.999999,{front:v});
}
for(const id of ['P1','P2','P3','P4'])check(`${id}: original 111mm outer datum retained`,placements[id].root[1]===.111&&placements[id].baseline.root[1]===.111);
fs.writeFileSync(path.join(report,'rigid-source-preservation.json'),JSON.stringify({schema:'rigid-source-preservation-v2',generatedAt:now,status:checks.every(x=>x.pass)?'PASS':'FAIL',scope:'Source registry rigid transform declarations. Actual mounted bounds/clearances are separate evidence in measured-placement-registry.json and implemented-fit-check.json.',registryInput:'src/venue/data/placements.ts',registryInputSha256:registryInputHash,assemblies:rigid,checks:[...checks],limitations:['Numerical source-frame verification is not a rendered-scene or collision test.','Absolute poses and original-world helpers are evaluated from the saved baseline; remounting reads the same absolute root, never composes D repeatedly.']},null,2)+'\n');

// Byte-identical GLBs prove embedded native geometry, topology, normals, UVs,
// vertex colours, authored transforms, material definitions and embedded art.
const assets=measured.assets.map(asset=>{
  const currentSha256=hash(asset.file),bytes=fs.statSync(asset.file).size;
  return {...asset,currentSha256,currentBytes:bytes,pass:asset.sha256===currentSha256&&asset.bytes===bytes};
});
check('All 20 complete installed GLB files remain byte-identical',assets.length===20&&assets.every(a=>a.pass),{assetCount:assets.length});
const protectedAssets=before.protectedDependencyReconciliation.filter(x=>!x.file.startsWith('src/')).map(x=>({...x,currentSha256:hash(x.file),pass:hash(x.file)===x.sha256}));
check('Protected stage, repeatable hall, floor maps, stage art and dimensions bytes unchanged',protectedAssets.every(x=>x.pass),{assetCount:protectedAssets.length});

const sourceInventory=before.sources.map(file=>{const currentSha256=hash(file.file);return {...file,currentSha256,unchanged:currentSha256===file.sha256};});
const wholeLocalFiles=[
 'src/venue/zones/ReferenceAnamorphic.tsx','src/venue/zones/ReferenceTechnical.tsx',
 'src/venue/three/screens.tsx','src/venue/three/displayGeometry.ts','src/venue/three/ledMaterial.ts',
 'src/venue/three/architecturalLettering.ts','src/venue/three/projectionMaterials.ts',
 'src/venue/three/rental2026Materials.ts','src/venue/three/sculptureProjection.ts',
 'src/venue/three/ProjectionRays.tsx','src/venue/three/ProjectionContactShadow.tsx',
 'src/venue/three/TechnicalContactShadow.tsx','src/venue/media/ledRental2026Painters.ts',
 'src/venue/media/projectionPainters.ts','src/venue/media/technicalPainters.ts',
 'src/venue/media/painters.ts','src/venue/media/programs.ts','src/venue/data/media.ts',
];
const sourceChecks=wholeLocalFiles.map(file=>check(`Native behavior source unchanged: ${file}`,norm(read(file))===norm(snapshot(file)),{file}));
function localChildren(file){const source=norm(read(file)),old=norm(snapshot(file));return check(`Complete installation child JSX unchanged: ${path.basename(file)}`,source.slice(source.indexOf('<ExpoAsset name='))===old.slice(old.indexOf('<ExpoAsset name=')),{file});}
for(const file of ['src/venue/zones/ReferenceReception.tsx','src/venue/zones/ReferenceLedRental2026.tsx','src/venue/zones/ReferenceProjection.tsx'])sourceChecks.push(localChildren(file));
const pillarFile='src/venue/zones/ReferencePillars.tsx',pillarCurrent=norm(read(pillarFile)),pillarOld=norm(snapshot(pillarFile));
sourceChecks.push(check('Four-sided pillar lettering, material, face UV, native geometry functions unchanged',pillarCurrent.slice(pillarCurrent.indexOf('function lettering('),pillarCurrent.indexOf('export function ReferencePillars'))===pillarOld.slice(pillarOld.indexOf('function lettering('),pillarOld.indexOf('export function ReferencePillars')),{file:pillarFile}));
sourceChecks.push(check('Pillar child body/base/cap/seams/lettering/light/spill source unchanged',pillarCurrent.slice(pillarCurrent.indexOf('<RedesignedColumn media='),pillarCurrent.indexOf('\n        </group></group>')).trim()===pillarOld.slice(pillarOld.indexOf('<RedesignedColumn media='),pillarOld.indexOf('\n        </group>\n      ))}')).trim(),{file:pillarFile}));
const specs=[...pillarOld.matchAll(/\{ id: "(\w+)", x: [^,]+, z: [^,]+, h: ([\d.]+), w: ([\d.]+), media: "([^"]+)", color: "([^"]+)" \}/g)].map(x=>({id:x[1],h:+x[2],w:+x[3],media:x[4],color:x[5]}));
const curSpecs=[...pillarCurrent.matchAll(/\{ id: "(\w+)", h: ([\d.]+), w: ([\d.]+), media: "([^"]+)", color: "([^"]+)" \}/g)].map(x=>({id:x[1],h:+x[2],w:+x[3],media:x[4],color:x[5]}));
sourceChecks.push(check('Four pillar native dimensions, media and colours unchanged',specs.length===4&&JSON.stringify(specs)===JSON.stringify(curSpecs),{baseline:specs,current:curSpecs}));
const registrySources=['ReferenceAnamorphic','ReferenceLedRental2026','ReferenceTechnical','ReferenceProjection','ReferenceReception','ReferencePillars'].map(name=>`src/venue/zones/${name}.tsx`);
const mountedModels=registrySources.flatMap(file=>[...read(file).matchAll(/<ExpoAsset name="([^"]+)"/g)].map(m=>({name:m[1],file})));
sourceChecks.push(check('Each imported installed GLB mounts once in the six installation components',mountedModels.length===19&&new Set(mountedModels.map(x=>x.name)).size===19,{mountCount:mountedModels.length,uniqueAssetCount:new Set(mountedModels.map(x=>x.name)).size,note:'The twentieth GLB is MappedSculpture, loaded once through useGLTF rather than ExpoAsset.'}));

// Compare actual onBeforeCompile outputs. Shared hall/arena call the optional
// frame function without a placement ID; that branch must remain exact.
const oldFinish=oldLoad('src/venue/three/architecturalFinish.ts');
const newFinish=currentLoad('src/venue/three/architecturalFinish.ts');
const shader=()=>({uniforms:{},vertexShader:'#include <common>\n#include <begin_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <normal_fragment_maps>\n#include <aomap_fragment>\n#include <lights_fragment_end>'});
const materialSnapshot=m=>Object.fromEntries(['color','emissive','emissiveIntensity','roughness','metalness','transparent','opacity','depthWrite','depthTest','side','envMapIntensity','transmission','thickness','ior','clearcoat','clearcoatRoughness'].filter(k=>m[k]!==undefined).map(k=>[k,m[k]?.toArray?m[k].toArray():m[k]]));
function finishOutput(prepare,name,id){const m=new THREE.MeshStandardMaterial({name,roughness:.27,metalness:.19});const mesh=new THREE.Mesh(new THREE.BoxGeometry(),m);prepare(mesh,id);const s=shader();m.onBeforeCompile(s,{});const output={material:materialSnapshot(mesh.material),vertex:s.vertexShader,fragment:s.fragmentShader,uniforms:Object.keys(s.uniforms),cacheKey:m.customProgramCacheKey(),shadow:[mesh.castShadow,mesh.receiveShadow]};mesh.geometry.dispose();m.dispose();return output;}
const genericNames=['Venue stone','Honed pathway stone','Arena granite','Black powder coat','Soft upholstery','Technical | rough cast black metal counter','Technical | concealed warm white LED','Glass pane','Frosted acrylic','Leaf colour','Rocketbox | body','Porcelain substrate'];
const defaultShaderChecks=genericNames.map(name=>{const a=finishOutput(oldFinish.prepareArchitecture,name),b=finishOutput(newFinish.prepareArchitecture,name);return check(`Protected default material hook byte-equivalent: ${name}`,JSON.stringify(a)===JSON.stringify(b),{name,baselineOutputSha256:sha(JSON.stringify(a)),currentOutputSha256:sha(JSON.stringify(b))});});
const frameChecks=[];
for(const id of ['S1','S2','S3','S4','R','L']){
 const {worldToBaseline,baselineToWorldRotation}=newFinish.installationFinishFrame(id);let maxError=0;
 for(const point of [[0,0,0],[2.7,4.1,-3.9],[-5.4,.12,7.8]]){
   const old=new THREE.Vector3(...point).applyMatrix4(matrix(id,true));
   const mapped=new THREE.Vector3(...point).applyMatrix4(matrix(id)).applyMatrix4(worldToBaseline);
   maxError=Math.max(maxError,old.distanceTo(mapped));
 }
 const rotationError=new THREE.Matrix3().setFromMatrix4(matrix(id).multiply(matrix(id,true).invert())).elements.reduce((e,v,i)=>Math.max(e,Math.abs(v-baselineToWorldRotation.elements[i])),0);
 frameChecks.push(check(`${id}: procedural grain and normal frame follows exact rigid delta`,maxError<1e-10&&rotationError<1e-10,{id,maxPositionErrorMetres:maxError,maxRotationComponentError:rotationError}));
}

// Technical PBR settings and image URLs are compared with a loader stub. Only
// the two new rigid-frame uniforms may differ, never the author tuning.
const stubThree={...THREE,TextureLoader:class{load(url){const t=new THREE.Texture();t.name=url;return t;}}};
const oldTech=loader(true,{three:stubThree})('src/venue/three/technicalMaterials.ts');
const newTech=loader(false,{three:stubThree})('src/venue/three/technicalMaterials.ts');
function techOutput(fn,name){const original=new THREE.MeshStandardMaterial({name});const mesh=new THREE.Mesh(new THREE.BoxGeometry(),original);fn(mesh);const s=shader();mesh.material.onBeforeCompile(s,{});return {material:materialSnapshot(mesh.material),uniforms:Object.fromEntries(Object.entries(s.uniforms).filter(([key])=>!['uTechWorldToBaseline','uTechBaselineToWorldRotation'].includes(key)).map(([key,{value}])=>[key,value?.isTexture?{name:value.name,colorSpace:value.colorSpace,repeat:value.repeat.toArray(),wrapS:value.wrapS,wrapT:value.wrapT,anisotropy:value.anisotropy}:value])),shadow:[mesh.castShadow,mesh.receiveShadow]};}
const techNames=['Technical | soft warm grey upholstery','Technical | brushed stainless steel','Technical | rough cast black metal counter','Technical | charcoal architectural panel','Technical | honed pathway stone','Technical | clear acrylic','Technical | V3 cyan AV letters','Technical | exposed fascia porcelain lettering','Technical | faceted ice blue metallic emblem','Technical | overhead truss steel','Technical | warm pearl canopy diffuser'];
const technicalChecks=techNames.map(name=>check(`Technical material appearance parameters preserved: ${name}`,JSON.stringify(techOutput(oldTech.applyTechnicalMaterials,name))===JSON.stringify(techOutput(newTech.applyTechnicalMaterials,name)),{name}));

// PMREM construction is captured before GPU conversion. This compares every
// native reflected emitter, not merely the registry import string.
function rentalEmitterCapture(saved){
 let captured;
 const stub={...THREE,PMREMGenerator:class{
  fromScene(scene,...parameters){scene.updateMatrixWorld(true);const emitters=[];scene.traverse(node=>{if(node instanceof THREE.Mesh)emitters.push({worldMatrix:node.matrixWorld.toArray(),colour:node.material.color.toArray(),toneMapped:node.material.toneMapped,geometry:node.geometry.parameters});});captured={background:scene.background.toArray(),parameters,emitters};return {texture:new THREE.Texture()};}
  dispose(){}
 }};
 loader(saved,{three:stub})('src/venue/three/rental2026Environment.ts').createRental2026Environment({});
 return captured;
}
const oldEmitters=rentalEmitterCapture(true),newEmitters=rentalEmitterCapture(false);
const emitterRotation=new THREE.Matrix4().makeRotationY(placements.S2.yaw-placements.S2.baseline.yaw);
let emitterMatrixError=0,emitterParametersEqual=oldEmitters.emitters.length===newEmitters.emitters.length;
oldEmitters.emitters.forEach((emitter,i)=>{
 const expected=emitterRotation.clone().multiply(new THREE.Matrix4().fromArray(emitter.worldMatrix)).toArray();
 const current=newEmitters.emitters[i];
 if(!current){emitterParametersEqual=false;return;}
 emitterMatrixError=Math.max(emitterMatrixError,vecError(expected,current.worldMatrix));
 const {worldMatrix,...native}=emitter,{worldMatrix:ignored,...currentNative}=current;
 emitterParametersEqual&&=JSON.stringify(native)===JSON.stringify(currentNative);
});
const rentalEmitterCheck=check('Rental PMREM native reflected emitters retain properties and follow changed installation yaw',emitterParametersEqual&&emitterMatrixError<1e-10&&JSON.stringify(oldEmitters.parameters)===JSON.stringify(newEmitters.parameters)&&JSON.stringify(oldEmitters.background)===JSON.stringify(newEmitters.background),{emitterCount:newEmitters.emitters.length,maxMatrixComponentError:emitterMatrixError,beforeYaw:placements.S2.baseline.yaw,afterYaw:placements.S2.yaw,method:'Capture PMREM input scene on CPU; compare every emitter after applying the pure old-to-new rotation, without translation in an infinite-distance IBL.'});
const galleryLightChecks=[{before:[-5,3.811,-57.2],native:[4,3.7,-7.2]},{before:[-15,5.711,-53.5],native:[-6,5.6,-3.5]}].map((light,i)=>{
 const expected=registry.transformOldWorldToNew('L',light.before),actual=registry.placementWorldPoint('L',light.native);
 return check(`L: detached shared gallery light ${i+1} retains native placement and 111mm datum`,vecError(expected,actual)<1e-10,{beforeWorld:light.before,afterWorld:actual,native:light.native,errorMetres:vecError(expected,actual)});
});
const oldSculpture=oldLoad('src/venue/three/sculptureProjection.ts'),newSculpture=currentLoad('src/venue/three/sculptureProjection.ts');
const projectionLayout=json('public/models/expo/projection-finish-v2-layout.json'),sculptureLayout=json('public/models/expo/projection-finish-v2-crystals-layout.json');
const projectorPositions=projectionLayout.projectors.map(p=>p.position);
const oldSculptureUniforms=oldSculpture.sculptureProjectionUniforms(new THREE.Texture(),projectorPositions,sculptureLayout.projectionDomain);
const newSculptureUniforms=newSculpture.sculptureProjectionUniforms(new THREE.Texture(),projectorPositions,sculptureLayout.projectionDomain);
let sculptureError=0;
for(const key of ['uSculptureProjector0','uSculptureProjector1','uSculptureProjector2']){
 const expected=registry.transformOldWorldToNew('S4',oldSculptureUniforms[key].value.toArray());
 sculptureError=Math.max(sculptureError,vecError(expected,newSculptureUniforms[key].value.toArray()));
}
for(const native of [[0,0,0],[2,3,-4],[-3,1,2]]){
 const oldWorld=new THREE.Vector3(...native).applyMatrix4(oldSculptureUniforms.uSculptureWorldToModel.value.clone().invert());
 const afterWorld=registry.transformOldWorldToNew('S4',oldWorld.toArray());
 const afterLocal=new THREE.Vector3(...afterWorld).applyMatrix4(newSculptureUniforms.uSculptureWorldToModel.value);
 sculptureError=Math.max(sculptureError,vecError(native,afterLocal.toArray()));
}
const sculptureCheck=check('Crystal world-space projector sources and inverse model field follow exact rigid placement',sculptureError<1e-10&&vecError(oldSculptureUniforms.uSculptureDomain.value.toArray(),newSculptureUniforms.uSculptureDomain.value.toArray())===0,{projectorCount:3,maxErrorMetres:sculptureError,localDomain:newSculptureUniforms.uSculptureDomain.value.toArray()});

// Projector-calibrated anamorphic artwork must retain exactly the original NDC
// samples, rather than simply looking plausible after the placement.
const oldA=oldLoad('src/venue/data/anamorphic.ts'),newA=currentLoad('src/venue/data/anamorphic.ts');
function projector(view){const c=new THREE.PerspectiveCamera(view.fov,view.aspect,.1,400);c.position.set(...view.position);c.lookAt(...view.look);c.updateMatrixWorld();return c;}
const ca=projector(oldA.ANAMORPHIC_VIEW),cb=projector(newA.ANAMORPHIC_VIEW);
const studioLayout=json('public/models/expo/grand-anamorphic-shape-v3-layout.json');
const corner=studioLayout.mainCorner,points=[...corner.contours.leftXY.map(([x,y])=>[x+corner.fold[0],y,corner.fold[2]]),...corner.contours.rightZY.map(([z,y])=>[corner.fold[0],y,z+corner.fold[2]])];
let ndcError=0;
for(const point of points){const a=new THREE.Vector3(...point).applyMatrix4(matrix('S1',true)).project(ca),b=new THREE.Vector3(...point).applyMatrix4(matrix('S1')).project(cb);ndcError=Math.max(ndcError,a.distanceTo(b));}
const calibrationCheck=check('Anamorphic projector calibration preserves all authored cut-contour NDC samples',ndcError<1e-10&&oldA.ANAMORPHIC_VIEW.fov===newA.ANAMORPHIC_VIEW.fov&&oldA.ANAMORPHIC_VIEW.aspect===newA.ANAMORPHIC_VIEW.aspect,{sampleCount:points.length,maxNdcError:ndcError,beforeView:oldA.ANAMORPHIC_VIEW,afterView:newA.ANAMORPHIC_VIEW});

// Optional frame routes only owned installations. This normalises the two
// intentional call-site edits to prove no unrelated GLB-processing branch moved.
const expo='src/venue/three/ExpoAsset.tsx';
let normalisedExpo=norm(read(expo)).replace('import type { InstallationId } from "../data/placements";\n','').replace(/\nfunction installationFinishId\(name:string\):InstallationId\|undefined \{[\s\S]*?\n\}\n/,'\n').replace('prepareArchitecture(model,installationFinishId(name))','prepareArchitecture(model)');
const canonicalTs=text=>ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,removeComments:true}}).outputText;
const expoCheck=check('ExpoAsset default protected asset preprocessing unchanged after optional frame routing',canonicalTs(normalisedExpo)===canonicalTs(snapshot(expo)),{file:expo,note:'Only the placement type import, optional owned-installation lookup and prepareArchitecture frame argument are normalised. TypeScript canonical output ignores empty lines and comments.'});

const dependencyRecords=before.protectedDependencyReconciliation.map(p=>({...p,currentSha256:hash(p.file),unchanged:hash(p.file)===p.sha256}));
const arenaExact=['src/venue/Venue.tsx','src/venue/zones/Architecture.tsx','src/venue/zones/Arena.tsx','src/venue/zones/Audience.tsx','src/venue/zones/HouseCeiling.tsx','src/venue/zones/Arrival.tsx','src/venue/zones/Tunnel.tsx','src/venue/zones/Exhibition.tsx','src/venue/three/materials.ts','src/venue/three/ZoneGroup.tsx','src/venue/three/rig.tsx','src/venue/three/venueFloor.ts','src/venue/systems/ShowCue.tsx','src/venue/systems/journey.ts','src/venue/ui/StageMode.tsx'];
const arenaChecks=arenaExact.map(file=>check(`Protected venue implementation bytes unchanged: ${file}`,hash(file)===before.sources.find(x=>x.file===file).sha256,{file}));
const sceneOld=norm(snapshot('src/venue/Scene.tsx')),sceneCurrent=norm(read('src/venue/Scene.tsx'));
// The actual Arena and HouseCeiling import/render statements are separately
// compared without assuming an exact, currently variable ZoneGroup spelling.
const arenaStatements=text=>text.split('\n').filter(line=>/<Arena\b|<Audience\b|<HouseCeiling\b|<MainStage\b/.test(line)).map(x=>x.trim());
arenaChecks.push(check('Scene protected arena and ceiling component mount statements unchanged',JSON.stringify(arenaStatements(sceneOld))===JSON.stringify(arenaStatements(sceneCurrent)),{baseline:arenaStatements(sceneOld),current:arenaStatements(sceneCurrent)}));
const dense=json(path.relative(root,path.join(report,'arena-dense-path-comparison.json')));
arenaChecks.push(check('Protected arena authored camera sequence unchanged at 1001 dense samples',dense.status==='PASS'&&dense.sampleCount===1001&&Object.values(dense.maxAbsoluteErrors).every(x=>x===0),{evidence:'arena-dense-path-comparison.json',progress:dense.progress,maxAbsoluteErrors:dense.maxAbsoluteErrors,currentSourceHashMatchesEvidence:dense.currentPathSha256===hash('src/venue/data/path.ts')}));

const appearanceAudit=[
 {component:'Generic architectural finish',file:'src/venue/three/architecturalFinish.ts',classification:'B local appearance preservation / A protected default',status:defaultShaderChecks.every(x=>x.pass)&&frameChecks.every(x=>x.pass)?'PASS':'FAIL',method:'D inverse maps moved world samples to saved author world; normal perturbation rotates with D. Shared hall/arena undefined frame hook outputs compared exactly.'},
 {component:'Technical PBR triplanar material',file:'src/venue/three/technicalMaterials.ts',classification:'B local appearance preservation',status:technicalChecks.every(x=>x.pass)?'PASS':'FAIL',method:'Same image maps, repeating/scales, colour/roughness/metalness/strength parameters. Position/normal sampling rebased with D inverse; detail vectors rotate with D.'},
 {component:'Rental material micrograin',file:'src/venue/three/rental2026Materials.ts',classification:'B local',status:'PASS',method:'Unchanged local shader wrapper preserves generic architectural frame injected upstream.'},
 {component:'Projection finish micrograin',file:'src/venue/three/projectionMaterials.ts',classification:'B local',status:'PASS',method:'Unchanged shader uses native position rather than world coordinates; no relocation edit required.'},
 {component:'Anamorphic cut-display calibration',file:'src/venue/data/anamorphic.ts',classification:'B detached input',status:calibrationCheck.pass?'PASS':'FAIL',method:`Full original projector pose rebased using D, FOV/aspect unchanged; ${points.length} original contour NDC samples numerically invariant.`},
 {component:'Crystal projection field',file:'src/venue/three/sculptureProjection.ts',classification:'B local and detached uniform',status:sculptureCheck.pass?'PASS':'FAIL',method:'Unchanged implementation derives source rays from current PROJECTION_ROOT/ROTATION and inverse model matrix. All three source rays and three inverse-model samples numerically follow D; native sculptureUv registration occurs before install root transform.'},
 {component:'Local rope spill, real projector rays, contact shadows',file:'src/venue/zones/ReferenceProjection.tsx',classification:'B local',status:'PASS',method:'Complete authored child JSX unchanged and inherits the single installation root; native shadow offscreen capture remains local.'},
 {component:'Shared pillar-gallery lights',file:'src/venue/zones/ReferencePillars.tsx',classification:'B detached input',status:galleryLightChecks.every(x=>x.pass)?'PASS':'FAIL',method:'Moved into L parent with old-world light positions converted to original GLB-local [4,3.7,-7.2] and [-6,5.6,-3.5]; original .111m outer datum retained and numerical D check passes.'},
 {component:'Rental PMREM reflected practicals',file:'src/venue/three/rental2026Environment.ts',classification:'B detached appearance',status:rentalEmitterCheck.pass?'PASS':'FAIL',method:`Native emitter parent now uses registry RENTAL2026_ROTATION[1]. All ${newEmitters.emitters.length} input emitters retain panels, luminance, dimensions and PMREM settings and follow S2's changed yaw in the CPU scene comparison.`},
 {component:'Technical and projection PMREM practicals',file:'src/venue/three/technicalEnvironment.ts; src/venue/three/projectionEnvironment.ts',classification:'B detached appearance',status:'PASS',method:'Source unchanged; S3 and S4 yaws unchanged. IBL depends on rotation, not the relocated world translation.'},
 {component:'Basin wave phase and reflection',file:'src/venue/three/BasinWater.tsx',classification:'B detached appearance / C progress scheduling',status:'ROOT REVIEW PENDING',method:'Root added D inverse for old wave world phase, kept native basin material and geometry and actual surface.matrixWorld reflection camera; new progress range follows S1.'},
 {component:'Rental/projection polished floor finish masks',file:'src/venue/three/polishedFloor.ts',classification:'B finish footprint / C shared floor',status:'ROOT REVIEW PENDING',method:'Root rigidly rebased old finish rectangles with D. Shared tile world coordinate phase retained; arena floor mask domain must remain outside edited masks.'},
 {component:'Detached environment light targets and cues',file:'src/venue/three/environment.tsx',classification:'B detached input / C exhibition timing',status:'ROOT REVIEW PENDING',method:'Root owns complete lights/targets and exhibition progress rebase; protected arena branches require final source/browser comparison.'},
];
const arenaReviewFile=path.join(report,'arena-protection-check.json');
const arenaReview=fs.existsSync(arenaReviewFile)?JSON.parse(fs.readFileSync(arenaReviewFile,'utf8')):null;
const arenaReviewCurrent=arenaReview?.status==='PASS CPU/SOURCE PROTECTION'
 &&arenaReview.inputs.environmentSha256===hash('src/venue/three/environment.tsx')
 &&arenaReview.inputs.polishedFloorSha256===hash('src/venue/three/polishedFloor.ts')
 &&arenaReview.inputs.basinWaterSha256===hash('src/venue/three/BasinWater.tsx')
 &&arenaReview.inputs.pathSha256===hash('src/venue/data/path.ts')
 &&arenaReview.inputs.registrySha256===registryInputHash;
if(arenaReviewCurrent){
 for(const item of appearanceAudit)if(item.status==='ROOT REVIEW PENDING'){
  item.status='PASS CPU/SOURCE REVIEW';
  item.method+=' Final hash-matched arena-protection-check.json evaluates active light/fog output, zero protected floor masks, basin native phase and source preservation. Rendered/temporal pixels remain separate.';
 }
}
const categoryFiles=sourceInventory.map(record=>({ ...record,category:record.file.includes('/zones/Arena')||record.file.includes('/zones/Audience')||record.file.includes('/zones/HouseCeiling')||record.file.includes('/three/rig.')||record.file.includes('/ui/StageMode')?'A':record.file.includes('/Reference')||/\/data\/(anamorphic|technical|projection|ledRental2026|grand)\./.test(record.file)||/\/(architecturalFinish|technicalMaterials|rental2026Environment|ExpoAsset|BasinWater)\./.test(record.file)?'B or shared A/B':record.file.includes('/path.')||record.file.includes('CameraRig')?'C with protected A segment':record.unchanged?'UNCHANGED dependency':'C / shared integration',review:record.unchanged?'BYTE IDENTICAL':record.file.includes('/three/environment')||record.file.includes('/three/polishedFloor')?(arenaReviewCurrent?'CPU/SOURCE REVIEW PASS; GPU/temporal pixels separate':'ROOT FINAL REVIEW PENDING'):'Authorized exhibition integration; scope-specific tests above'}));
const results={schema:'installation-preservation-v3',generatedAt:now,status:checks.every(x=>x.pass)?'PASS SOURCE/NUMERICAL CHECKS':'FAIL',scope:'Frozen baseline → runtime source, local installed GLB assets, authored shader behavior and projector calibration. Does not replace rendered placement, fit or navigation QA.',baselineManifestSha256:hash(path.join(baseline,'BEFORE_MANIFEST.json')),registryInputSha256:registryInputHash,summary:{checks:checks.length,passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass).length,installedAssets:assets.length,protectedAssetChecks:protectedAssets.length,frozenSources:sourceInventory.length,byteIdenticalSources:sourceInventory.filter(x=>x.unchanged).length},assets,protectedAssets,localSourceChecks:sourceChecks,sharedDefaultShaderChecks:defaultShaderChecks,materialFrameChecks:frameChecks,technicalParameterChecks:technicalChecks,rentalEmitterCheck,galleryLightChecks,sculptureCheck,calibrationCheck,expoDefaultRouteCheck:expoCheck,arenaChecks,allChecks:checks,limitations:['SHA256 byte identity of all installed GLBs proves native payload preservation; it does not prove the GPU shader/render environment or visit frame is visually correct.','The baseline contains hashes for 20 installed GLBs and eight protected public dependencies. Other external media are inventoried from source unchanged behavior, not newly claimed to have a prior hash baseline.','Root-owned shared environment/floor/progress/UI source edits remain explicit review items; source hashes record their changes rather than pretending the whole shared file is unchanged.','Actual mounted root/geometry tests, user-access clearance and browser visual captures belong to the other final report artifacts.','No asset files, application sources or historical evidence are modified by this script.']};
results.rootSharedReview={evidence:'arena-protection-check.json',hashMatched:arenaReviewCurrent,status:arenaReview?.status??'NOT RUN',note:'Scope-specific CPU/source proof; rendered/temporal pixels are separate.'};
results.limitations[2]='Root-owned shared environment/floor/progress/UI changes are certified only by their scope-specific CPU/source proof and separate final render evidence; the whole shared file is not claimed unchanged.';
fs.writeFileSync(path.join(report,'installation-preservation.json'),JSON.stringify(results,null,2)+'\n');
fs.writeFileSync(path.join(report,'detached-appearance-audit.json'),JSON.stringify({generatedAt:now,scope:'World-space effect/finish/calibration audit',registryInputSha256:registryInputHash,items:appearanceAudit,materialFrames:frameChecks,defaultProtectedShaderChecks:defaultShaderChecks,calibrationCheck},null,2)+'\n');
fs.writeFileSync(path.join(report,'category-ABC-source-review.json'),JSON.stringify({generatedAt:now,categories:{A:'Arena/stage geometry, complete experience and spatial sequence protected; shared outputs checked separately.',B:'Installed local native geometry, dimensions, assets, materials/behavior protected; one rigid world relocation and detached input rebase authorized.',C:'Exhibition connector, approach navigation, culling, timings, wayfinding and shared integration authorized; no arena transformation.'},sources:categoryFiles,protectedDependencies:dependencyRecords},null,2)+'\n');
const md=`# Installation preservation and detached appearance\n\nGenerated ${now}. **${results.status}** (${results.summary.passed}/${results.summary.checks} source/numerical checks).\n\nThis report uses the newly frozen pre-move working tree, not the older proposal baseline. It separately records strict native preservation and authorized exhibition integration. Rendered screenshots and collision/navigation QA remain separate evidence.\n\n- All ${assets.length} installed GLBs: ${assets.every(x=>x.pass)?'byte-identical':'MISMATCH'} SHA256; embedded geometry, indices, UVs, authored local node transforms, materials, vertex AO and visitors are preserved.\n- ${protectedAssets.length} public protected dependencies: ${protectedAssets.every(x=>x.pass)?'byte-identical':'MISMATCH'}, including flagship stage and hall GLBs, original dimensions, stage artwork and floor image maps.\n- ${defaultShaderChecks.length} representative shared hall/arena material branches: exact baseline/current onBeforeCompile outputs, parameter snapshots and cache keys compared.\n- Anamorphic projector: ${points.length} authored cut-contour samples; maximum NDC deviation ${ndcError}.\n- Dense arena camera: ${dense.sampleCount} authored samples, all position/target/FOV/quaternion errors exactly zero. This is undamped path evidence; it does not independently prove pointer, damping or viewport state.\n\n| World-dependent component | Status | Preservation mechanism |\n|---|---|---|\n${appearanceAudit.map(x=>`| ${x.component} | ${x.status} | ${x.method} |`).join('\n')}\n\nFiles changed by root for exhibition/shared integration are retained in category-ABC-source-review.json with before/current hashes. Pending root review is not reported as an unconditional arena pass.\n\nSee installation-preservation.json for full hashes and all assertions; rigid-source-preservation.json for original/absolute matrices; measured-placement-registry.json and implemented-fit-check.json for independent geometric evidence.\n\n## Limits\n\n${results.limitations.map(x=>`- ${x}`).join('\n')}\n`;
fs.writeFileSync(path.join(report,'INSTALLATION_PRESERVATION.md'),md);
console.log(JSON.stringify({status:results.status,summary:results.summary,failed:checks.filter(x=>!x.pass).map(x=>({name:x.name,file:x.file})),outputs:['rigid-source-preservation.json','installation-preservation.json','detached-appearance-audit.json','category-ABC-source-review.json','INSTALLATION_PRESERVATION.md']}));
if(checks.some(x=>!x.pass))process.exitCode=1;
