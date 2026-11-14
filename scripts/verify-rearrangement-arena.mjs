import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import ts from 'typescript';
import * as THREE from 'three';

// Read-only source/evaluated CPU review of the shared components modified for
// exhibition integration. These assertions do not claim rendered pixel parity.
const root=process.cwd(),dir=path.join(root,'reports/placement-implementation/20261019-rearrangement'),base=path.join(dir,'baseline');
const require=createRequire(import.meta.url),read=f=>fs.readFileSync(path.resolve(root,f),'utf8'),norm=s=>s.replaceAll('\r\n','\n');
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root,f))).digest('hex');
const snapshot=f=>fs.readFileSync(path.join(base,f+'.snapshot'),'utf8');
const before=JSON.parse(fs.readFileSync(path.join(base,'BEFORE_MANIFEST.json')));
const dense=JSON.parse(fs.readFileSync(path.join(dir,'arena-dense-path-comparison.json')));
const checks=[];
const check=(name,pass,details={})=>{const r={name,pass,...details};checks.push(r);return r;};
const canonical=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,removeComments:true}}).outputText;
function loader(saved=false,overrides={}){
 const cache=new Map();
 function load(file){
  file=path.resolve(root,file);if(cache.has(file))return cache.get(file).exports;
  const module={exports:{}};cache.set(file,module);
  const snap=path.join(base,path.relative(root,file)+'.snapshot');
  const source=fs.readFileSync(saved&&fs.existsSync(snap)?snap:file,'utf8');
  const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const localRequire=name=>{
   if(Object.hasOwn(overrides,name))return overrides[name];if(name==='three')return THREE;
   if(name.startsWith('.')||name.startsWith('@/')){let p=name.startsWith('@/')?path.resolve(root,'src',name.slice(2)):path.resolve(path.dirname(file),name);if(p.endsWith('.json'))return JSON.parse(fs.readFileSync(p,'utf8'));if(!path.extname(p))p=fs.existsSync(p+'.ts')?p+'.ts':p+'.tsx';return load(p);}
   return require(name);
  };
  new Function('require','module','exports',output)(localRequire,module,module.exports);return module.exports;
 }
 return load;
}
const current=loader(),old=loader(true),registry=current('src/venue/data/placements.ts');
const currentZones=current('src/venue/data/zones.ts'),oldZones=old('src/venue/data/zones.ts');
const samples=dense.samples;
check('1001 arena progress zone IDs and copy are unchanged',samples.length===1001&&samples.every(s=>{
 const a=oldZones.zoneAt(s.progress),b=currentZones.zoneAt(s.progress);return ['id','label','title','line','priority'].every(k=>a[k]===b[k]);
}),{sampleCount:samples.length,progress:[.812,1],note:'Approach start range changed before the protected interval; the zone selected at every protected progress sample is identical.'});

// Hooks are executed against actual Three light objects. React, R3F frame
// registration and JSX mounting are substituted only to avoid a GPU/browser.
function lightHarness(saved){
 const refs=[],effects=[],frames=[],scene=new THREE.Scene(),journey={progress:.812},show={mode:0,cue:0};
 const react={useRef:value=>{const ref={current:value};refs.push(ref);return ref;},useMemo:fn=>fn(),useEffect:fn=>effects.push(fn)};
 const state={scene,gl:{}};
 const fiber={useThree:selector=>selector?selector(state):state,useFrame:fn=>frames.push(fn)};
 const jsx={Fragment:Symbol('fragment'),jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
 const load=loader(saved,{react,'@react-three/fiber':fiber,'react/jsx-runtime':jsx,'../systems/journey':{journey,show}});
 const tree=load('src/venue/three/environment.tsx').LightRig();
 const lights=[];
 function mount(node){
  if(!node)return;if(Array.isArray(node)){node.forEach(mount);return;}
  const props=node.props??{};let object;
  if(node.type==='primitive')object=props.object;
  else if(node.type==='ambientLight')object=new THREE.AmbientLight(props.color,props.intensity);
  else if(node.type==='hemisphereLight')object=new THREE.HemisphereLight(...(props.args??[]));
  else if(node.type==='pointLight')object=new THREE.PointLight(undefined,props.intensity,props.distance,props.decay);
  else if(node.type==='spotLight')object=new THREE.SpotLight(undefined,props.intensity,props.distance,props.angle,props.penumbra,props.decay);
  if(object){if(props.ref)props.ref.current=object;scene.add(object);lights.push(object);}
  mount(props.children);
 }
 mount(tree);effects.forEach(fn=>fn());
 function tick(sample,time,mode,cue){
  journey.progress=sample.progress;show.mode=mode;show.cue=cue;
  const camera=new THREE.PerspectiveCamera(sample.fov,1.7,.1,500);camera.position.set(...sample.position);camera.lookAt(...sample.look);camera.updateMatrixWorld();
  for(const fn of frames)fn({camera,clock:{elapsedTime:time}},1/60);
  scene.updateMatrixWorld(true);
  const active=lights.filter(x=>x.intensity>1e-12).map(x=>({type:x.type,intensity:x.intensity,position:x.position.toArray(),quaternion:x.quaternion.toArray(),color:x.color.toArray(),ground:x.groundColor?.toArray(),distance:x.distance,decay:x.decay,width:x.width,height:x.height,angle:x.angle,penumbra:x.penumbra,target:x.target?.position.toArray(),shadow:x.shadow?{normalBias:x.shadow.normalBias,near:x.shadow.camera.near,far:x.shadow.camera.far}:undefined}));
  return {active,registered:lights.length,inactive:lights.filter(x=>x.intensity<=1e-12).length,fog:scene.fog?{color:scene.fog.color.toArray(),density:scene.fog.density}:null};
 }
 return {tick,load};
}
let lightOutputsEqual=true,firstLightMismatch=null,lightCount=0;
const lightStates=[{mode:0,cue:0},{mode:1,cue:1},{mode:.5,cue:.7}];
for(const state of lightStates){
 const a=lightHarness(true),b=lightHarness(false);
 for(let i=0;i<samples.length;i++){
  const left=a.tick(samples[i],i/60+8,state.mode,state.cue),right=b.tick(samples[i],i/60+8,state.mode,state.cue);lightCount++;
  if(JSON.stringify(left)!==JSON.stringify(right)){lightOutputsEqual=false;firstLightMismatch??={progress:samples[i].progress,state,before:left,after:right};}
 }
}
check('Arena active lighting/fog outputs unchanged under normal/festival/intermediate cue states',lightOutputsEqual,{evaluatedFrames:lightCount,showStates:lightStates,firstMismatch:firstLightMismatch,method:'Execute complete saved/current LightRig hooks using actual Three lights at the 1001 identical protected camera samples with matched elapsed time, dt and starting smoothing state. Zero-power exhibition lights may have relocated transforms and are intentionally excluded from active output comparison; their zero intensity/count are compared.',limitations:'This CPU check does not compare temporal pixels, accumulated smoothing from a different pre-arena journey history, volumetric render phase or GPU output.'});

const environmentFile='src/venue/three/environment.tsx';
function region(file,start,end,saved=false){const text=norm(saved?snapshot(file):read(file));const a=text.indexOf(start);return end==='__END__'?text.slice(a):text.slice(a,text.indexOf(end,a));}
for(const [label,start,end] of [
 ['House zone look/festival constants','const LOOKS:','const PROJECTION_LOOK'],
 ['Arena festival blend function','const _blend:','export function LightRig'],
 ['Camera-following key/fill/rim light output','    const base = rental','    if(projection){\n      // Fixed overhead'],
 ['Screen light spill function','let poolTex:','__END__'],
]){
 const a=start==='let poolTex:'?norm(snapshot(environmentFile)).slice(norm(snapshot(environmentFile)).indexOf(start)):region(environmentFile,start,end,true);
 const b=start==='let poolTex:'?norm(read(environmentFile)).slice(norm(read(environmentFile)).indexOf(start)):region(environmentFile,start,end);
 check(`Shared environment protected branch unchanged: ${label}`,a.length>0&&canonical(a)===canonical(b),{file:environmentFile});
}
const sourceGates=[];
for(const sample of samples){const p=sample.progress,ep=registry.EXHIBITION_PROGRESS;
 const smooth=(a,b,x)=>THREE.MathUtils.smoothstep(x,a,b);
 const technical=smooth(ep.technical.start,ep.technical.start+.012,p)*(1-smooth(ep.technical.end-.007,ep.technical.end,p));
 const studio=smooth(ep.anamorphic.start,ep.anamorphic.start+.01,p)*(1-smooth(ep.anamorphic.end-.013,ep.anamorphic.end,p));
 const reception=smooth(ep.reception.start,ep.reception.start+.016,p)*(1-smooth(ep.reception.end-.016,ep.reception.end,p));
 const rental=registry.inExhibitionRange('rental',p),projection=registry.inExhibitionRange('projection',p),basin=registry.inExhibitionRange('anamorphic',p);
 const pavilionPs=current('src/venue/data/pavilions.ts').VENUE_PAVILIONS.map(x=>x.p);
 const near=Math.max(0,1-Math.min(...pavilionPs.map(x=>Math.abs(p-x)))/.03);
 if(technical||studio||reception||rental||projection||basin||near)sourceGates.push({p,technical,studio,reception,rental,projection,basin,near});
}
check('All exhibition local material/light/basin switches are off throughout protected arena progress',sourceGates.length===0,{sampleCount:samples.length,failures:sourceGates,note:'Actual runtime EP records and pavilion progress declarations evaluated with the same smoothstep equations used in environment.tsx. Complete LightRig outputs are independently executed above.'});

const oldFloor=old('src/venue/three/polishedFloor.ts'),newFloor=current('src/venue/three/polishedFloor.ts');
const floorRegions=[];
const smoothstep=(a,b,x)=>THREE.MathUtils.smoothstep(x,a,b);
function mask(floor,x,z){return smoothstep(floor.worldMinXZ[0],floor.worldMinXZ[0]+floor.edgeMetres,x)*smoothstep(floor.worldMinXZ[1],floor.worldMinXZ[1]+floor.edgeMetres,z)*(1-smoothstep(floor.worldMaxXZ[0]-floor.edgeMetres,floor.worldMaxXZ[0],x))*(1-smoothstep(floor.worldMaxXZ[1]-floor.edgeMetres,floor.worldMaxXZ[1],z));}
for(const key of ['RENTAL_FLOOR_FINISH','PROJECTION_FLOOR_FINISH']){
 const a=oldFloor[key],b=newFloor[key],{worldMinXZ,worldMaxXZ,...beforeParameters}=a,{worldMinXZ:ignoredMin,worldMaxXZ:ignoredMax,...afterParameters}=b;
 let maxArenaMask=0,count=0;
 for(let z=-233.4;z>=-380;z-=1)for(let x=-44;x<=44;x+=4){maxArenaMask=Math.max(maxArenaMask,mask(a,x,z),mask(b,x,z));count++;}
 const id=key.startsWith('RENTAL')?'S2':'S4';
 const corners=[]; // analytical transformed bounds supplement the sampled mask check
 for(const x of [a.worldMinXZ[0],a.worldMaxXZ[0]])for(const z of [a.worldMinXZ[1],a.worldMaxXZ[1]])corners.push(registry.transformOldWorldToNew(id,[x,0,z]));
 const expectedMin=[Math.min(...corners.map(p=>p[0])),Math.min(...corners.map(p=>p[2]))],expectedMax=[Math.max(...corners.map(p=>p[0])),Math.max(...corners.map(p=>p[2]))];
 const boundError=Math.max(...expectedMin.map((v,i)=>Math.abs(v-b.worldMinXZ[i])),...expectedMax.map((v,i)=>Math.abs(v-b.worldMaxXZ[i])));
 const pass=JSON.stringify(beforeParameters)===JSON.stringify(afterParameters)&&boundError<1e-10&&maxArenaMask===0&&a.worldMinXZ[1]>-233.4&&b.worldMinXZ[1]>-233.4;
 floorRegions.push({key,id,before:a,after:b,analyticalArenaSeparation:{protectedFrontZ:-233.4,beforeGapMetres:a.worldMinXZ[1]+233.4,afterGapMetres:b.worldMinXZ[1]+233.4},maxArenaMask,sampleCount:count,boundError,pass});
 check(`Floor finish ${id}: same tuning, exact rigid patch rebase and zero protected arena mask`,pass,floorRegions.at(-1));
}
check('Continuous public floor registration, maps, UV origin and tile phase unchanged',hash('src/venue/three/venueFloor.ts')===before.sources.find(x=>x.file==='src/venue/three/venueFloor.ts').sha256&&hash('src/venue/zones/Architecture.tsx')===before.sources.find(x=>x.file==='src/venue/zones/Architecture.tsx').sha256,{floorOrigin:current('src/venue/three/venueFloor.ts').VENUE_FLOOR,files:['src/venue/three/venueFloor.ts','src/venue/zones/Architecture.tsx']});
check('Polished-floor shader implementation unchanged beyond the two finish footprint declarations',canonical(region('src/venue/three/polishedFloor.ts','export function preparePolishedFloor','__END__',true))===canonical(region('src/venue/three/polishedFloor.ts','export function preparePolishedFloor','__END__')),{note:'Checks exported shader body; both old/new finish masks are analytically zero in the full protected region, so their altered constants have no arena output contribution.'});

const basinFile='src/venue/three/BasinWater.tsx',oldBasin=norm(snapshot(basinFile)),newBasin=norm(read(basinFile));
let normalisedBasin=newBasin.replace('import { inExhibitionRange, placementWorldMatrix } from "../data/placements";\n','')
 .replace(/\n      uBasinBaselineWorld:\{value:new THREE.Matrix4\(\).fromArray\(placementWorldMatrix\("S1",true\)\)\n        \.multiply\(new THREE.Matrix4\(\).fromArray\(placementWorldMatrix\("S1"\)\).invert\(\)\)\},/,'')
 .replace('        uniform mat4 uBasinBaselineWorld;\n','')
 .replace('          vec3 basinAuthoredWorld=(uBasinBaselineWorld*vec4(vBasinWorld,1.0)).xyz;\n','')
 .replaceAll('basinAuthoredWorld','vBasinWorld')
 .replace('!inExhibitionRange("anamorphic",state.progress)','state.progress<.546||state.progress>.596');
check('Basin native material/reflection/mesh behavior unchanged outside inverse rigid phase and progress rebase',canonical(normalisedBasin)===canonical(oldBasin),{file:basinFile,note:'The exact allowed additions (inverse-D uniform, phase coordinate and new progress gate) are removed for comparison; all other code must canonicalise identically.'});
function waveExpressions(source){return ['A','B'].map(id=>source.match(new RegExp(`float basinWave${id}=sin\\(([^;]+)\\);`))?.[1]);}
const beforeWaves=waveExpressions(oldBasin),afterWaves=waveExpressions(newBasin);
const evaluate=(expression,point,t)=>new Function('vBasinWorld','basinAuthoredWorld','uBasinTime',`return Math.sin(${expression});`)(new THREE.Vector3(...point),new THREE.Vector3(...point),t);
const inverse=new THREE.Matrix4().fromArray(registry.placementWorldMatrix('S1',true)).multiply(new THREE.Matrix4().fromArray(registry.placementWorldMatrix('S1')).invert());
let waveError=0;
for(const point of [[-4,.12,3],[0,.12,0],[6,.12,-2]]){
 const oldPoint=new THREE.Vector3(...point).applyMatrix4(new THREE.Matrix4().fromArray(registry.placementWorldMatrix('S1',true)));
 const newPoint=new THREE.Vector3(...point).applyMatrix4(new THREE.Matrix4().fromArray(registry.placementWorldMatrix('S1'))).applyMatrix4(inverse);
 for(const t of [0,1,17.5])for(let i=0;i<2;i++)waveError=Math.max(waveError,Math.abs(evaluate(beforeWaves[i],oldPoint.toArray(),t)-evaluate(afterWaves[i],newPoint.toArray(),t)));
}
check('Basin both authored world-wave phases preserved including time direction',waveError<1e-10,{sampleCount:18,maxWaveError:waveError,beforeExpressions:beforeWaves,afterExpressions:afterWaves});

const strictFiles=before.protectedDependencyReconciliation.filter(x=>!['src/venue/Scene.tsx','src/venue/data/grand.ts','src/venue/three/environment.tsx','src/venue/three/ExpoAsset.tsx','src/venue/three/architecturalFinish.ts','src/venue/three/polishedFloor.ts','src/venue/systems/CameraRig.tsx','src/venue/data/path.ts'].includes(x.file));
const strictHashes=strictFiles.map(f=>({file:f.file,beforeSha256:f.sha256,currentSha256:hash(f.file),pass:hash(f.file)===f.sha256}));
check('All strictly unchanged arena/building dependencies match the frozen baseline',strictHashes.every(x=>x.pass),{fileCount:strictHashes.length});
const dimensions=JSON.parse(read('public/models/expo/grand-dimensions.json'));
check('Shared hall master data untouched, existing 80 × 212 × 19 m hall retained',dimensions.hall.halfWidth===40&&Math.abs(dimensions.hall.from-dimensions.hall.to)===212&&dimensions.hall.roofHeight===19,{hall:dimensions.hall});
check('Arena dense authored path has zero position/look/FOV/quaternion deviation',dense.status==='PASS'&&dense.sampleCount===1001&&Object.values(dense.maxAbsoluteErrors).every(x=>x===0)&&dense.currentPathSha256===hash('src/venue/data/path.ts'),{pathInputSha256:hash('src/venue/data/path.ts'),comparison:'arena-dense-path-comparison.json',errors:dense.maxAbsoluteErrors});
const sceneSource=norm(read('src/venue/Scene.tsx')),sceneBefore=norm(snapshot('src/venue/Scene.tsx'));
const arenaMounts=s=>s.split('\n').filter(x=>/<ArenaPortal\b|<ArenaShell\b|<Arena\b/.test(x)).map(x=>x.trim());
check('Scene mounts fixed ArenaPortal/ArenaShell/Arena without added transform',JSON.stringify(arenaMounts(sceneSource))===JSON.stringify(arenaMounts(sceneBefore)),{before:arenaMounts(sceneBefore),after:arenaMounts(sceneSource)});

const result={schema:'arena-protection-check-v2',generatedAt:new Date().toISOString(),status:checks.every(x=>x.pass)?'PASS CPU/SOURCE PROTECTION':'FAIL',protectedScope:{arenaWidthMetres:88,arenaDepthMetres:136,arenaRoofHeightMetres:34,arenaZ:[-244,-380],approachProtectedFrontZ:-233.4,arenaAndStageMoved:false,temporalPixelsCompared:false},summary:{checks:checks.length,passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass).length,evaluatedLightFrames:lightCount,denseCameraSamples:samples.length},checks,strictHashes,finishFootprints:floorRegions,inputs:{baselineManifestSha256:hash(path.join(base,'BEFORE_MANIFEST.json')),environmentSha256:hash(environmentFile),polishedFloorSha256:hash('src/venue/three/polishedFloor.ts'),basinWaterSha256:hash(basinFile),pathSha256:hash('src/venue/data/path.ts'),registrySha256:hash('src/venue/data/placements.ts')},limitations:['No temporal media/light-phase pixels or GPU render buffers compared.','Active lighting is compared with matched elapsed time, camera, cue and starting smoothing state; different pre-arena damping histories are not simulated.','Zero-power relocated exhibition lights have different transforms; they are excluded from active radiance output and their zero intensity/count is checked.','Actual mounted mesh geometry/world transform comparisons and final browser captures are separate evidence; strict GLB/native source hashes and dense path evidence are included here.','Headless React/R3F substitutions only register frame callbacks, refs and Three lights; no application file is mutated.']};
fs.writeFileSync(path.join(dir,'arena-protection-check.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,summary:result.summary,failed:checks.filter(x=>!x.pass).map(x=>x.name)}));
if(checks.some(x=>!x.pass))process.exitCode=1;
