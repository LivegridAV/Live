/** Execute the current TS sampler against the immutable, pre-relocation path. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import ts from 'typescript';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const report=path.join(root,'reports/placement-implementation/20261019-rearrangement');
const require=createRequire(import.meta.url),cache=new Map();
function moduleAt(file){
  file=path.resolve(file);
  if(cache.has(file))return cache.get(file).exports;
  if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file));
  const module={exports:{}};cache.set(file,module);
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{
    target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true,
  }}).outputText;
  const localRequire=spec=>{
    if(!spec.startsWith('.'))return require(spec);
    let target=path.resolve(path.dirname(file),spec);
    if(!path.extname(target))target+='.ts';
    return moduleAt(target);
  };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(localRequire,module,module.exports);
  return module.exports;
}
const before=JSON.parse(fs.readFileSync(path.join(report,'baseline/arena-dense-path.json')));
const source=path.join(root,'src/venue/data/path.ts'),current=moduleAt(source),sample=current.createSample(),T=require('three');
const errors={positionMetres:0,lookMetres:0,fovDegrees:0,quaternionComponents:0};
const samples=before.samples.map(b=>{
  current.samplePath(b.progress,sample);
  const quaternion=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().lookAt(sample.pos,sample.look,new T.Vector3(0,1,0)));
  const a={localProgress:b.localProgress,progress:b.progress,position:sample.pos.toArray(),look:sample.look.toArray(),fov:sample.fov,quaternion:quaternion.toArray(),segment:sample.segment};
  for(let i=0;i<3;i++){
    errors.positionMetres=Math.max(errors.positionMetres,Math.abs(b.position[i]-a.position[i]));
    errors.lookMetres=Math.max(errors.lookMetres,Math.abs(b.look[i]-a.look[i]));
  }
  for(let i=0;i<4;i++)errors.quaternionComponents=Math.max(errors.quaternionComponents,Math.abs(b.quaternion[i]-a.quaternion[i]));
  errors.fovDegrees=Math.max(errors.fovDegrees,Math.abs(b.fov-a.fov));
  return a;
});
const result={
  schema:'arena-dense-path-comparison-v1',generatedAt:new Date().toISOString(),
  status:Object.values(errors).every(error=>error===0)?'PASS':'FAIL',
  baselineSha256:before.sha256,currentPathSha256:crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),
  sampleCount:samples.length,progress:[before.startProgress,before.endProgress],
  baselineKeyframeCount:before.originalFrameCount,currentKeyframeCount:current.KEYFRAMES.length,
  preservedTangentMultiplier:60,maxAbsoluteErrors:errors,
  method:'Execute current TypeScript path.ts sampler for exactly the saved 1001 progress values. Compare authored THREE lookAt quaternions, positions, targets and lens. Frozen arena interpolation retains original tangent neighbours and multiplier60.',
  limitations:'This compares the authored undamped spatial sequence. It does not simulate viewport compensation, idle/pointer drift or camera damping history; their unchanged arena behavior is checked separately in source/browser verification.',
  samples,
};
fs.writeFileSync(path.join(report,'arena-dense-path-comparison.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,sampleCount:samples.length,...errors,currentKeyframeCount:current.KEYFRAMES.length},null,2));
process.exitCode=result.status==='PASS'?0:1;
