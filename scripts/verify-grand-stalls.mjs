import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {Matrix4,Vector3,Quaternion} from 'three';

const root=process.cwd(),report=path.join(root,'reports/grand-stalls/20261018-implementation');
const config=JSON.parse(fs.readFileSync('public/models/expo/grand-dimensions.json','utf8'));
const floor=config.master.floor,tol=config.master.tolerance;
function readGlb(file){
  const bytes=fs.readFileSync(file);let p=12,json,bin;
  while(p<bytes.length){const length=bytes.readUInt32LE(p),type=bytes.readUInt32LE(p+4);const data=bytes.subarray(p+8,p+8+length);if(type===0x4e4f534a)json=JSON.parse(data.toString('utf8'));if(type===0x004e4942)bin=data;p+=length+8;}
  const views=json.bufferViews,accessors=json.accessors;
  const cache=new Map();
  function positions(index){if(cache.has(index))return cache.get(index);const a=accessors[index],v=views[a.bufferView],stride=v.byteStride??12,start=(v.byteOffset??0)+(a.byteOffset??0);if(a.componentType!==5126||a.type!=='VEC3')throw Error('Unexpected position accessor');const list=[];for(let i=0;i<a.count;i++)list.push(new Vector3(bin.readFloatLE(start+i*stride),bin.readFloatLE(start+i*stride+4),bin.readFloatLE(start+i*stride+8)));cache.set(index,list);return list;}
  const meshes=[];
  function visit(index,parent){const n=json.nodes[index],local=n.matrix?new Matrix4().fromArray(n.matrix):new Matrix4().compose(new Vector3(...(n.translation??[0,0,0])),new Quaternion(...(n.rotation??[0,0,0,1])),new Vector3(...(n.scale??[1,1,1]))),matrix=parent.clone().multiply(local);if(n.mesh!==undefined){const points=json.meshes[n.mesh].primitives.flatMap(p=>positions(p.attributes.POSITION).map(v=>v.clone().applyMatrix4(matrix)));meshes.push({name:n.name,extras:n.extras??{},points});}for(const c of n.children??[])visit(c,matrix);}
  for(const n of json.scenes[json.scene??0].nodes)visit(n,new Matrix4());
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(const m of meshes)for(const v of m.points)for(let i=0;i<3;i++){min[i]=Math.min(min[i],v.getComponent(i));max[i]=Math.max(max[i],v.getComponent(i));}
  return {file,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),meshes,bounds:{min,max,size:max.map((v,i)=>v-min[i])}};
}
const names={anamorphic:'grand-anamorphic-shell',technical:'grand-technical-shell','led-rental':'grand-rental-shell',projection:'projection-grand-v1'};
const measurements=[];
for(const [stall,name]of Object.entries(names)){
  const model=readGlb(`public/models/expo/${name}.glb`),b=model.bounds;
  const actual={width:b.size[0],depth:b.size[2],height:b.max[1]-floor,fasciaTop:b.max[1]};
  const deviations={width:actual.width-config.master.width,depth:actual.depth-config.master.depth,height:actual.height-config.master.height};
  measurements.push({stall,asset:name,actual,design:config.master,deviations,tolerance:tol,pass:Object.values(deviations).every(v=>Math.abs(v)<=tol),bounds:b,sha256:model.sha256,bytes:model.bytes,method:'Every POSITION vertex after glTF scene-node transforms, measured along authored local architectural axes. Overall height from common finished floor, not lowest below-floor plinth vertex. Runtime root rotation does not change frontage/depth.'});
}
const reception=JSON.parse(fs.readFileSync('public/models/expo/grand-reception-layout.json','utf8'));
measurements.push({stall:'reception',classification:'open installation within reserved common envelope',reservation:config.master,actualGeometry:reception.geometry.bounds,maximumHeight:reception.geometry.bounds.max[1]-floor,pass:reception.geometry.bounds.max[1]<=config.master.fasciaTop+tol&&reception.geometry.bounds.min[0]>=-12-tol&&reception.geometry.bounds.max[0]<=12+tol&&reception.geometry.bounds.min[2]>=-8-tol&&reception.geometry.bounds.max[2]<=8+tol});
// Static physical checks for the rental aisle, tested against actual vertices
// below 2.1m. An envelope/vertex check is not a swept human collision solver.
const routeChecks=[];
for(const name of ['grand-rental-shell','grand-rental-interior','grand-rental-visitors']){
 const m=readGlb(`public/models/expo/${name}.glb`);let intrusion=0;
 for(const node of m.meshes)for(const p of node.points)if(p.y>floor+.06&&p.y<floor+2.1&&p.x>-1.2&&p.x<1.2&&p.z>-5.8&&p.z<7.99)intrusion++;
 routeChecks.push({asset:name,route:'2.4m principal rental aisle, X[-1.2,1.2], Z[-5.8,8]',verticesInsideBelowHeadHeight:intrusion,pass:intrusion===0});
}
const baseline=JSON.parse(fs.readFileSync(path.join(report,'baseline/working-tree.json'),'utf8'));
const changes=baseline.files.map(item=>{if(!fs.existsSync(item.file))return {file:item.file,status:'deleted'};const hash=crypto.createHash('sha256').update(fs.readFileSync(item.file)).digest('hex');return hash===item.sha256?null:{file:item.file,status:'changed',before:item.sha256,after:hash};}).filter(Boolean);
const oldAssets=changes.filter(c=>/\.(glb|webp|png|jpg|mp4|webm)$/.test(c.file));
const out={createdAt:new Date().toISOString(),units:'metres',master:config.master,measurements,routeChecks,baselineAssetPreservation:{changedOrDeletedPreExistingBinaryAssets:oldAssets,pass:oldAssets.length===0},sourceChanges:changes,limitations:['Geometry tolerances measure the authored virtual design, not reference-image similarity.','Static route checks do not certify physical accessibility or a projector installation.','Reception is intentionally open and uses a reserved envelope/height limit; it is not a closed shell.']};
fs.mkdirSync(report,{recursive:true});fs.writeFileSync(path.join(report,'MEASUREMENTS.json'),JSON.stringify(out,null,2));
console.log(JSON.stringify({shells:measurements.map(m=>({stall:m.stall,actual:m.actual,pass:m.pass})),routeChecks,preservedAssets:oldAssets.length}));
if(measurements.some(m=>!m.pass)||routeChecks.some(m=>!m.pass)||oldAssets.length)process.exitCode=1;

// Dimensioned actual-placement plan, derived from the same runtime config.
const sx=x=>200+(x+40)*5,sy=z=>75+(-z-26)*5;
const colours=['#b4bfd4','#a0cfc3','#aab3ca','#c8bd9c','#88c9cf'];
let elements='';let i=0;
for(const [id,p]of Object.entries(config.placements)){
 const co=Math.cos(p.yaw),si=Math.sin(p.yaw),corners=[[-12,-8],[12,-8],[12,8],[-12,8]],world=corners.map(([x,z])=>[p.root[0]+co*x+si*z,p.root[2]-si*x+co*z]);
 elements+=`<polygon points="${world.map(([x,z])=>`${sx(x)},${sy(z)}`).join(' ')}" fill="${colours[i]}22" stroke="${colours[i]}" stroke-width="2"/><text x="${sx(p.root[0])}" y="${sy(p.root[2])}" fill="#fff" font-size="12" text-anchor="middle">${id.toUpperCase()}</text><text x="${sx(p.root[0])}" y="${sy(p.root[2])+20}" fill="#bbc9d0" font-size="11" text-anchor="middle">24 × 16 m · H≤12.701 m</text>`;i++;
}
for(const p of [{id:'HERO',x:-7.7,z:-51.5,w:2.05},{id:'RIBBON',x:-15.6,z:-51.8,w:1.85},{id:'ALPINE',x:-3.6,z:-54.2,w:1.8},{id:'FOREST',x:-17.6,z:-55.5,w:1.7}])elements+=`<rect x="${sx(p.x-p.w/2)}" y="${sy(p.z+p.w/2)}" width="${p.w*5}" height="${p.w*5}" fill="#d0ae6b"/><text x="${sx(p.x)-12}" y="${sy(p.z)-12}" fill="#e7ca90" font-size="9" text-anchor="end">${p.id}</text>`;
const auditPath=path.join(report,'verification/main-journey-collision.json');
const journeySamples=fs.existsSync(auditPath)?JSON.parse(fs.readFileSync(auditPath,'utf8')).samples.filter(s=>s.scenario==='exact-path-target'):[];
const routeLine=journeySamples.length?`<polyline points="${journeySamples.filter((_,i)=>i%10===0).map(s=>`${sx(s.position[0])},${sy(s.position[2])}`).join(' ')}" fill="none" stroke="#68cab0" stroke-width="2" stroke-dasharray="4 3"/>`:'';
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="920" height="1220" viewBox="0 0 920 1220">
<rect width="920" height="1220" fill="#071015"/><g font-family="Segoe UI,Arial">
<text x="40" y="30" fill="#f8f2e7" font-size="22">LIVEGRID AV · MEASURED VENUE PLAN</text>
<text x="40" y="55" fill="#acbbc2" font-size="12">Actual runtime placements · equal X/Z scale · metres · common finished floor +0.120 m</text>
<rect x="${sx(-40)}" y="${sy(-26)}" width="${80*5}" height="${212*5}" fill="none" stroke="#4b626e"/>
${elements}${routeLine}
<text x="${sx(4)}" y="${sy(-65)}" fill="#85cfb9" font-size="11">Tested ordinary camera route</text>
<text x="640" y="125" fill="#afc0c8" font-size="12">24 × 16 m reservations</text>
<text x="640" y="147" fill="#afc0c8" font-size="12">Pillars retain native footprints</text>
<text x="640" y="169" fill="#afc0c8" font-size="12">2.0 m interior principal targets</text>
<text x="640" y="191" fill="#afc0c8" font-size="12">1.2 m secondary route targets</text>
<text x="640" y="224" fill="#85cfb9" font-size="11">Green line = sampled camera centre</text>
<text x="640" y="243" fill="#afc0c8" font-size="11">30 cm proximity check, not a</text>
<text x="640" y="262" fill="#afc0c8" font-size="11">measured 2 m pedestrian corridor</text>
<text x="40" y="1160" fill="#d2dbdf" font-size="13">Full-size shells: W24.000 × D16.000 × H12.701 m · frontage is local X, depth local Z.</text>
<text x="40" y="1185" fill="#9aadb7" font-size="12">Reception is an open feature reservation. Pillars, tunnel and arena remain distinct installation types.</text>
<text x="40" y="1205" fill="#9aadb7" font-size="11">Virtual-layout targets; not construction or accessibility certification. See MEASUREMENTS.json for actual deviations.</text>
</g></svg>`;
fs.writeFileSync(path.join(report,'VENUE_PLAN.svg'),svg);
