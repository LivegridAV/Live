/** Rebuild only the two marked galleries from the preserved authored GLBs.
 * Run: node scripts/reposition-projection-galleries.mjs
 * Native +Z faces the entrance. Keep the outer edges fixed while widening inward.
 * No mesh regeneration: original topology, UVs, materials and unrelated bytes survive.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public/models/expo');
const layout=JSON.parse(fs.readFileSync(path.join(root,'projection-finish-v2-layout.json'),'utf8'));
const widthScale=1.2, back=3.3, outer=11.6;
const move=([x,y,z])=>[Math.sign(x)*outer+(x-Math.sign(x)*outer)*widthScale,y,z-back];
const galleryYaw=side=>-side*.25;
const newYaw=yaw=>Math.atan2(Math.sin(yaw),Math.cos(yaw)*widthScale);
const rotateY=([x,y,z],yaw)=>[Math.cos(yaw)*x+Math.sin(yaw)*z,y,-Math.sin(yaw)*x+Math.cos(yaw)*z];
function moveLetter(p){
  const side=Math.sign(p[0]),yaw=galleryYaw(side),center=[side*8.72,0,.8];
  const local=rotateY(p.map((v,i)=>v-center[i]),-yaw);
  const rotated=rotateY(local,newYaw(yaw));return rotated.map((v,i)=>v+move(center)[i]);
}
const contains=([x,,z])=>Math.abs(x)>5.35&&Math.abs(x)<11.7&&z>-.7&&z<2.3;
const vines=layout.plants.filter(p=>p.id.startsWith('gallery integrated climbing leaf column'));
const inBox=(p,b)=>p.every((v,i)=>v>=b.min[i]-.0001&&v<=b.max[i]+.0001);
const hash=b=>createHash('sha256').update(b).digest('hex');
const audit={widthScale,backMetres:back,outerAnchor:outer,assets:[]};
function patchAsset(kind){
  const input=fs.readFileSync(path.join(root,`projection-finish-v2-${kind}.glb`));
  const jsonLength=input.readUInt32LE(12),doc=JSON.parse(input.subarray(20,20+jsonLength));
  const bin=Buffer.from(input.subarray(28+jsonLength));
  const access=i=>{const a=doc.accessors[i],v=doc.bufferViews[a.bufferView];return {a,offset:(v.byteOffset??0)+(a.byteOffset??0),stride:v.byteStride??(a.type==='VEC4'?16:12)};};
  const read=(a,i)=>[0,1,2].map(k=>bin.readFloatLE(a.offset+i*a.stride+k*4));
  const write=(a,i,p)=>p.forEach((v,k)=>bin.writeFloatLE(v,a.offset+i*a.stride+k*4));
  let changed=0;
  const rows=[];
  for(const node of doc.nodes){
    if(node.mesh===undefined)continue;
    if(kind==='shell'&&node.extras?.grandRole!=='architecture')continue;
    for(const primitive of doc.meshes[node.mesh].primitives){
      const material=doc.materials[primitive.material].name;
      if(kind==='interior'&&!/varied textured living foliage|natural woody olive stems/.test(material))continue;
      if(node.matrix||node.translation||node.rotation||node.scale)throw Error('Expected baked native XYZ coordinates');
      const pos=access(primitive.attributes.POSITION),points=Array.from({length:pos.a.count},(_,i)=>read(pos,i));
      const ia=access(primitive.indices),size=ia.a.componentType===5123?2:4;
      const indices=Array.from({length:ia.a.count},(_,i)=>size===2?bin.readUInt16LE(ia.offset+i*size):bin.readUInt32LE(ia.offset+i*size));
      let selected;
      if(kind==='shell'){
        selected=points.map(contains);
        for(let i=0;i<indices.length;i+=3){
          const n=indices.slice(i,i+3).filter(v=>selected[v]).length;
          if(n&&n!==3)throw Error(`Selection cuts a triangle in ${node.name}`);
        }
      }else{
        // Select complete connected leaf/stem islands within the four recorded vine bounds.
        // This excludes nearby freestanding plants even when their leaves cross a box edge.
        const parents=points.map((_,i)=>i);
        const find=i=>{while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;};
        for(let i=0;i<indices.length;i+=3){parents[find(indices[i+1])]=find(indices[i]);parents[find(indices[i+2])]=find(indices[i]);}
        const groups=new Map();
        points.forEach((_,i)=>{const r=find(i);if(!groups.has(r))groups.set(r,[]);groups.get(r).push(i);});
        selected=points.map(()=>false);
        for(const ids of groups.values())if(node.name.includes('gallery integrated climbing leaf column')||vines.some(v=>ids.every(i=>inBox(points[i],v.bounds))))ids.forEach(i=>selected[i]=true);
      }
      const count=selected.filter(Boolean).length;if(!count)continue;
      const normals=primitive.attributes.NORMAL===undefined?null:access(primitive.attributes.NORMAL);
      const tangents=primitive.attributes.TANGENT===undefined?null:access(primitive.attributes.TANGENT);
      selected.forEach((yes,i)=>{
        if(!yes)return;
        const lettering=/clean ivory brand lettering/.test(material);
        const moved=move(points[i]);
        write(pos,i,lettering?moveLetter(points[i]):moved);
        if(lettering){
          const yaw=galleryYaw(Math.sign(points[i][0])),delta=newYaw(yaw)-yaw;
          if(normals)write(normals,i,rotateY(read(normals,i),delta));
          if(tangents)write(tangents,i,rotateY(read(tangents,i),delta));
          return;
        }
        if(normals){const n=read(normals,i);n[0]/=widthScale;const length=Math.hypot(...n);write(normals,i,n.map(v=>v/length));}
        if(tangents){const n=read(tangents,i);n[0]*=widthScale;const length=Math.hypot(...n);write(tangents,i,n.map(v=>v/length));}
      });
      pos.a.min=[Infinity,Infinity,Infinity];pos.a.max=[-Infinity,-Infinity,-Infinity];
      points.forEach((_,i)=>read(pos,i).forEach((v,k)=>{pos.a.min[k]=Math.min(pos.a.min[k],v);pos.a.max[k]=Math.max(pos.a.max[k],v);}));
      // Selection must remain within the pavilion's 24 x 16 metre envelope.
      if(pos.a.min[0]<-12.01||pos.a.max[0]>12.01||pos.a.min[2]<-8.01||pos.a.max[2]>8.01)throw Error('Gallery exceeds pavilion');
      rows.push({node:node.name,vertices:count});changed+=count;
    }
  }
  if(!changed)throw Error(`No ${kind} geometry moved`);
  const json=Buffer.from(JSON.stringify(doc)),padded=Buffer.alloc(Math.ceil(json.length/4)*4,32);json.copy(padded);
  const output=Buffer.alloc(28+padded.length+bin.length);
  output.writeUInt32LE(0x46546c67,0);output.writeUInt32LE(2,4);output.writeUInt32LE(output.length,8);
  output.writeUInt32LE(padded.length,12);output.writeUInt32LE(0x4e4f534a,16);padded.copy(output,20);
  output.writeUInt32LE(bin.length,20+padded.length);output.writeUInt32LE(0x004e4942,24+padded.length);bin.copy(output,28+padded.length);
  const file=`projection-finish-v2-gallery-${kind}.glb`;fs.writeFileSync(path.join(root,file),output);
  audit.assets.push({file,verticesMoved:changed,rows,sourceSha256:hash(input),sha256:hash(output)});
  layout.stats[kind]={...layout.stats[kind],file,bytes:output.length,sha256:hash(output)};
}
patchAsset('shell');patchAsset('interior');
const widened=yaw=>Math.hypot(Math.cos(yaw)*widthScale,Math.sin(yaw));
for(const a of layout.apertures.filter(a=>a.id.startsWith('projection-application-'))){
  [a.x,a.y,a.z]=move([a.x,a.y,a.z]);const factor=widened(a.rotation[1]);
  a.w*=factor;a.width=a.w;a.rotation[1]=Math.atan2(Math.sin(a.rotation[1]),Math.cos(a.rotation[1])*widthScale);
}
for(const g of layout.architecture.galleries){
  const factor=widened(g.yaw);g.center=move(g.center);g.width*=factor;g.screenWidth*=factor;
  g.yaw=Math.atan2(Math.sin(g.yaw),Math.cos(g.yaw)*widthScale);g.clearInnerEdge=Math.abs(move([g.side*g.clearInnerEdge,0,0])[0]);
}
for(const f of layout.architecture.flutedFields){f.center=move(f.center);f.width*=widthScale;f.ribPitch*=widthScale;}
for(const v of layout.architecture.vineAnchors){v.position=move(v.position);v.width*=widthScale;}
for(const p of vines){p.position=move(p.position);p.bounds={min:move(p.bounds.min),max:move(p.bounds.max)};}
for(const f of layout.fixtures)if(f.kind==='gallery-downlight')f.position=move(f.position);
for(const p of layout.opticalPaths)if(p.role!=='overhead'&&p.path.every(contains))p.path=p.path.map(move);
for(const t of layout.typography)if(t.position&&contains(t.position)){
  t.position=moveLetter(t.position);if(t.bounds)t.bounds={min:moveLetter(t.bounds.min),max:moveLetter(t.bounds.max)};
  if(typeof t.yaw==='number')t.yaw=newYaw(t.yaw);
  t.fontAspectRatioPreserved=true;
}
layout.version='projection-galleries-rear-wide-20261021';
layout.galleryEdit={backMetres:back,widthScale,outerAnchor:outer,source:'projection-finish-v2-layout.json'};
layout.assets=Object.fromEntries(Object.values(layout.stats).map(v=>[v.file.replace('.glb',''),v]));
fs.writeFileSync(path.join(root,'projection-finish-v2-gallery-layout.json'),JSON.stringify(layout,null,2)+'\n');
fs.mkdirSync(path.resolve(root,'../../../reports/projection-gallery-edit'),{recursive:true});
fs.writeFileSync(path.resolve(root,'../../../reports/projection-gallery-edit/geometry-check.json'),JSON.stringify(audit,null,2)+'\n');
console.log(JSON.stringify(audit,null,2));
