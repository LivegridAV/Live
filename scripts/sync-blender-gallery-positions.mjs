// Apply saved Blender controller transforms to the website's original gallery edit.
// Read-only extraction is performed by Blender; never overwrite the user's .blend.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..'),models=path.join(root,'public/models/expo');
const saved=JSON.parse(fs.readFileSync(path.join(root,'reports/projection-gallery-edit/blender-saved-transforms.json')));
const layout=JSON.parse(fs.readFileSync(path.join(models,'projection-finish-v2-gallery-layout.json')));
const controllers=new Map([-1,1].map(side=>[side,saved.find(o=>o.name.startsWith(side<0?'LEFT GALLERY -':'RIGHT GALLERY -'))]));
for(const c of controllers.values())if(!c||c.scale.some(v=>Math.abs(v-1)>1e-5)||Math.abs(c.rotation[0])+Math.abs(c.rotation[1])>1e-5)throw Error('Expected floor translation and yaw only');
const rotate=(p,side)=>{const a=controllers.get(side).rotation[2],c=Math.cos(a),s=Math.sin(a);return [c*p[0]+s*p[2],p[1],-s*p[0]+c*p[2]];};
function move(p,side=Math.sign(p[0])){
  const g=layout.architecture.galleries.find(g=>g.side===side),c=controllers.get(side);
  const local=[p[0]-g.center[0],p[1]-5.4,p[2]-g.center[2]],r=rotate(local,side);
  return [r[0]+c.location[0],r[1]+c.location[2],r[2]-c.location[1]];
}
const hash=b=>createHash('sha256').update(b).digest('hex');
const report={savedControllers:[...controllers.values()],assets:[]};
for(const kind of ['shell','interior']){
  const src=fs.readFileSync(path.join(models,`projection-finish-v2-gallery-${kind}.glb`));
  const old=fs.readFileSync(path.join(models,`projection-finish-v2-${kind}.glb`));
  const len=src.readUInt32LE(12),doc=JSON.parse(src.subarray(20,20+len)),bin=Buffer.from(src.subarray(28+len)),original=old.subarray(28+old.readUInt32LE(12));
  const accessor=i=>{const a=doc.accessors[i],v=doc.bufferViews[a.bufferView];return {a,offset:(v.byteOffset??0)+(a.byteOffset??0),stride:v.byteStride??(a.type==='VEC4'?16:12)};};
  const read=(a,i)=>[0,1,2].map(k=>bin.readFloatLE(a.offset+i*a.stride+k*4));
  const write=(a,i,p)=>p.forEach((v,k)=>bin.writeFloatLE(v,a.offset+i*a.stride+k*4));
  const touched=new Set();let count=0;
  for(const mesh of doc.meshes)for(const primitive of mesh.primitives){
    const ai=primitive.attributes.POSITION;if(touched.has(ai))continue;touched.add(ai);
    const pos=accessor(ai),norm=primitive.attributes.NORMAL===undefined?null:accessor(primitive.attributes.NORMAL),tan=primitive.attributes.TANGENT===undefined?null:accessor(primitive.attributes.TANGENT);
    for(let i=0;i<pos.a.count;i++){
      const off=pos.offset+i*pos.stride;
      if(bin.subarray(off,off+12).equals(original.subarray(off,off+12)))continue;
      const p=read(pos,i),side=Math.sign(p[0]);write(pos,i,move(p,side));
      if(norm)write(norm,i,rotate(read(norm,i),side));if(tan)write(tan,i,rotate(read(tan,i),side));count++;
    }
    pos.a.min=[Infinity,Infinity,Infinity];pos.a.max=[-Infinity,-Infinity,-Infinity];
    for(let i=0;i<pos.a.count;i++)read(pos,i).forEach((v,k)=>{pos.a.min[k]=Math.min(pos.a.min[k],v);pos.a.max[k]=Math.max(pos.a.max[k],v);});
  }
  const json=Buffer.from(JSON.stringify(doc)),pad=Buffer.alloc(Math.ceil(json.length/4)*4,32);json.copy(pad);
  const output=Buffer.alloc(28+pad.length+bin.length);output.writeUInt32LE(0x46546c67,0);output.writeUInt32LE(2,4);output.writeUInt32LE(output.length,8);
  output.writeUInt32LE(pad.length,12);output.writeUInt32LE(0x4e4f534a,16);pad.copy(output,20);output.writeUInt32LE(bin.length,20+pad.length);output.writeUInt32LE(0x004e4942,24+pad.length);bin.copy(output,28+pad.length);
  const file=`projection-finish-v2-blender-${kind}.glb`;fs.writeFileSync(path.join(models,file),output);
  layout.stats[kind]={...layout.stats[kind],file,bytes:output.length,sha256:hash(output)};
  report.assets.push({file,verticesMoved:count,sha256:hash(output)});
}
// Use the actual saved child screen matrices, including Blender axis conversion.
for(const a of layout.apertures.filter(a=>a.id.startsWith('projection-application-'))){
  const s=saved.find(o=>o.name===a.id+' - website screen');if(!s)throw Error('Missing screen '+a.id);
  const m=s.matrix;[a.x,a.y,a.z]=[m[0][3],m[2][3],-m[1][3]];
  a.rotation=[0,Math.atan2(m[1][0],m[0][0]),0];a.w=Math.hypot(m[0][0],m[1][0],m[2][0]);a.width=a.w;
  a.h=Math.hypot(m[0][1],m[1][1],m[2][1]);a.height=a.h;
}
for(const f of layout.fixtures)if(f.kind==='gallery-downlight')f.position=move(f.position);
const galleryRegion=([x,,z])=>Math.abs(x)>4&&Math.abs(x)<11.8&&z>-4&&z<-1;
for(const p of layout.opticalPaths)if(p.role!=='overhead'&&p.path.every(galleryRegion))p.path=p.path.map(v=>move(v));
for(const f of layout.architecture.flutedFields)f.center=move(f.center,f.side);
for(const v of layout.architecture.vineAnchors)v.position=move(v.position,v.side);
function box(b,side){const corners=[];for(const x of [b.min[0],b.max[0]])for(const y of [b.min[1],b.max[1]])for(const z of [b.min[2],b.max[2]])corners.push(move([x,y,z],side));return {min:[0,1,2].map(i=>Math.min(...corners.map(p=>p[i]))),max:[0,1,2].map(i=>Math.max(...corners.map(p=>p[i])))};}
for(const p of layout.plants)if(p.id.startsWith('gallery integrated climbing leaf column')){const side=Math.sign(p.position[0]);p.position=move(p.position,side);p.bounds=box(p.bounds,side);}
for(const t of layout.typography)if(t.position&&galleryRegion(t.position)){const side=Math.sign(t.position[0]);t.position=move(t.position,side);if(t.bounds)t.bounds=box(t.bounds,side);if(typeof t.yaw==='number')t.yaw+=controllers.get(side).rotation[2];}
// Update gallery origins last: all delta transforms above reference the editor's original pivots.
for(const g of layout.architecture.galleries){g.center=move(g.center,g.side);g.yaw+=controllers.get(g.side).rotation[2];}
layout.version='projection-galleries-saved-blender-20261021';
layout.blenderSource='assets/blender/projection-gallery-editor/LivegridAV-Projection-Editable.blend';
layout.assets=Object.fromEntries(Object.values(layout.stats).map(v=>[v.file.replace('.glb',''),v]));
fs.writeFileSync(path.join(models,'projection-finish-v2-blender-layout.json'),JSON.stringify(layout,null,2)+'\n');
fs.writeFileSync(path.join(root,'reports/projection-gallery-edit/blender-sync.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.assets));
