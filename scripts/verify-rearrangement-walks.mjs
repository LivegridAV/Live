/** Fresh, source-driven capsule checks of current entry/interior routes. */
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import * as T from 'three';
import ts from 'typescript';
import {tree,hash,makeItem,box} from './placement-geometry.mjs';
import {items,fixed,configurationHash} from './verify-rearrangement-fit.mjs';
const require=createRequire(import.meta.url),cache=new Map();
function readTs(file){
  file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;
  const source=fs.readFileSync(file,'utf8'),tsModule={exports:{}};cache.set(file,tsModule);
  const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const relative=id=>{
    if(!id.startsWith('.'))return require(id);
    const base=path.resolve(path.dirname(file),id);
    if(base.endsWith('.json'))return JSON.parse(fs.readFileSync(base,'utf8'));
    return readTs(fs.existsSync(base)?base:base+'.ts');
  };
  new Function('require','module','exports',js)(relative,tsModule,tsModule.exports);return tsModule.exports;
}
const visits=readTs('src/venue/data/stallVisits.ts'),journey=readTs('src/venue/data/path.ts');
const owners={reception:'R',anamorphic:'S1',technical:'S3','led-rental':'S2',projection:'S4'};
// The fixed arrival/tunnel were never relocated. Include their physical side
// cabinets and roof in this route-only proof, without treating floor glass or
// creative immersive imagery as an obstruction.
const tunnelSide=[];
for(const side of [-1,1])tunnelSide.push(box([.25,4.95,25],[side*3.13,2.325,-15.9]));
tunnelSide.push(box([6.5,.25,25],[0,4.78,-15.9]));
const tunnelObstacle=makeItem('protected-tunnel-cabinets',tunnelSide,new T.Matrix4());
const walkObstacles=[...items,...fixed,tunnelObstacle];
const radius=.3,step=.1,coverRadius=radius+step/2,bodyLow=.1,bodyHigh=2.1;
const scratch=new T.Vector3(),closest=new T.Vector3();
function segmentSegment(p1,q1,p2,q2){
  const d1=q1.clone().sub(p1),d2=q2.clone().sub(p2),r=p1.clone().sub(p2),a=d1.dot(d1),e=d2.dot(d2),f=d2.dot(r);let s,t;
  if(a<1e-20&&e<1e-20)return p1.distanceToSquared(p2);
  if(a<1e-20){s=0;t=T.MathUtils.clamp(f/e,0,1);}
  else{const c=d1.dot(r);if(e<1e-20){t=0;s=T.MathUtils.clamp(-c/a,0,1);}else{const b=d1.dot(d2),den=a*e-b*b;s=den!==0?T.MathUtils.clamp((b*f-c*e)/den,0,1):0;t=(b*s+f)/e;if(t<0){t=0;s=T.MathUtils.clamp(-c/a,0,1);}else if(t>1){t=1;s=T.MathUtils.clamp((b-c)/a,0,1);}}}
  return d1.multiplyScalar(s).add(p1).distanceToSquared(d2.multiplyScalar(t).add(p2));
}
function capsuleTriangle(a,b,triangle){
  const vertices=[triangle.a,triangle.b,triangle.c],line=new T.Line3(a,b);
  let best=Math.min(triangle.closestPointToPoint(a,closest).distanceToSquared(a),triangle.closestPointToPoint(b,closest).distanceToSquared(b));
  for(const p of vertices)best=Math.min(best,line.closestPointToPoint(p,true,closest).distanceToSquared(p));
  for(let i=0;i<3;i++)best=Math.min(best,segmentSegment(a,b,vertices[i],vertices[(i+1)%3]));
  const normal=triangle.getNormal(new T.Vector3()),d0=normal.dot(scratch.copy(a).sub(triangle.a)),d1=normal.dot(scratch.copy(b).sub(triangle.a));
  if(d0*d1<=0&&Math.abs(d0-d1)>1e-15){const p=a.clone().lerp(b,d0/(d0-d1));if(triangle.containsPoint(p))best=0;}
  return best;
}
function capsuleHits(position,obstacles=items){
  const floor=position[2]<-30?.12:0;
  const a=new T.Vector3(position[0],floor+bodyLow+radius,position[2]),b=new T.Vector3(position[0],floor+bodyHigh-radius,position[2]);
  const bounds=new T.Box3().setFromPoints([a,b]).expandByScalar(coverRadius),hits=[];
  for(const obstacle of obstacles){
    if(!obstacle.box.intersectsBox(bounds))continue;
    let hit=false,point;
    tree(obstacle).shapecast({intersectsBounds:box=>box.intersectsBox(bounds),intersectsTriangle:triangle=>{
      if(capsuleTriangle(a,b,triangle)<coverRadius*coverRadius){hit=true;point=triangle.getMidpoint(new T.Vector3()).toArray();return true;}return false;
    }});
    if(hit)hits.push({object:obstacle.id,triangleMidpoint:point});
  }
  return hits;
}
function localPoint(id,p){return new T.Vector3(...p).applyMatrix4(new T.Matrix4().fromArray(items.find(i=>i.id===id).matrix).invert()).toArray();}
function routeSamples(points){
  const result=[];for(let seg=0;seg<points.length-1;seg++){
    const a=new T.Vector3(...points[seg]),b=new T.Vector3(...points[seg+1]),count=Math.max(1,Math.ceil(a.distanceTo(b)/step));
    for(let n=0;n<=count;n++)result.push({segment:seg,t:n/count,position:a.clone().lerp(b,n/count).toArray()});
  }return result;
}
const routes=[];
for(const stall of Object.keys(owners)){
  const id=owners[stall],points=visits.stallWalkRoute(stall),samples=routeSamples(points),collisions=[];
  for(const sample of samples){const hits=capsuleHits(sample.position,walkObstacles);if(hits.length)collisions.push({...sample,local:localPoint(id,sample.position),hits});}
  routes.push({stall,id,worldWaypoints:points,localWaypoints:[visits.STALL_VISITS[stall].entry,...visits.STALL_VISITS[stall].via,visits.STALL_VISITS[stall].inside],samples:samples.length,status:collisions.length?'FAIL':'PASS',collisionSamples:collisions});
}
const sample=journey.createSample(),mainCollisions=[];let prior;const mainSamples=[];
for(let n=0;n<=3000;n++){
  const p=.789*n/3000;journey.samplePath(p,sample);const point=sample.pos.toArray();
  if(prior){const distance=new T.Vector3(...point).distanceTo(new T.Vector3(...prior.position));const subdivisions=Math.max(1,Math.ceil(distance/step));for(let k=1;k<=subdivisions;k++)mainSamples.push({progress:prior.progress+(p-prior.progress)*k/subdivisions,position:new T.Vector3(...prior.position).lerp(new T.Vector3(...point),k/subdivisions).toArray()});}
  else mainSamples.push({progress:p,position:point});prior={progress:p,position:point};
}
for(const s of mainSamples){const hits=capsuleHits(s.position,walkObstacles);if(hits.length)mainCollisions.push({...s,hits});}
const controls=[{name:'Content Studio counter is obstructed',id:'S1',local:[-5.3,1.77,6],expectedCollision:true},{name:'Projection sculpture plinth is obstructed',id:'S4',local:[0,1.77,-2.8],expectedCollision:true},{name:'Central forum at cross-link is clear',world:[0,1.77,-140],expectedCollision:false}].map(c=>{
  const point=c.world??new T.Vector3(...c.local).applyMatrix4(new T.Matrix4().fromArray(items.find(i=>i.id===c.id).matrix)).toArray(),hits=capsuleHits(point,walkObstacles);
  return {...c,world:point,hits,status:(hits.length>0)===c.expectedCollision?'PASS':'FAIL'};
});
const result={schema:'livegrid-rearrangement-walk-capsule-v1',generatedAt:new Date().toISOString(),configurationHash,
  sourceHashes:{stallVisits:hash(fs.readFileSync('src/venue/data/stallVisits.ts')),path:hash(fs.readFileSync('src/venue/data/path.ts'))},
  method:'Current actual STALL_VISITS and stallWalkRoute functions evaluated from TypeScript source; complete world meshes from current registry. Vertical body capsule radius.3 m, bottomfloor+.1/topfloor+2.1. Samples≤.1 m along every straight walk segment, conservative radius inflation+.05 m covers intervening centre positions. Main Hermite path additionally sampled densely and subdivided to≤.1 m; its interpolation approximation is not an analytic curve-distance proof.',
  radiusMetres:radius,sampleStepMetres:step,conservativeSampleRadiusMetres:coverRadius,bodyHeightAboveFloor:[bodyLow,bodyHigh],
  controls,routes,mainJourney:{progressRange:[0,.789],samples:mainSamples.length,status:mainCollisions.length?'FAIL':'PASS',collisionSamples:mainCollisions},
  limitations:['Checks static authored people/furniture and source routes. Browser traversal and final framing remain separate checks.','Capsule treats every route as floor-level human travel, even when authored camera is above eye level; it is intentionally conservative.','No accessibility or building-code certification.','The initial establishing dolly from an arbitrary current review viewpoint to an entry point is not included in each authored entry-to-interior polyline.'],
};
const dir='reports/placement-implementation/20261019-rearrangement';
fs.writeFileSync(`${dir}/walk-capsule-check.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({routes:routes.map(r=>({stall:r.stall,status:r.status,collisions:r.collisionSamples.length,first:r.collisionSamples[0],last:r.collisionSamples.at(-1)})),main:{status:result.mainJourney.status,samples:mainSamples.length,collisions:mainCollisions.length,first:mainCollisions[0],last:mainCollisions.at(-1)}},null,2));
export {capsuleHits,routeSamples,localPoint};
