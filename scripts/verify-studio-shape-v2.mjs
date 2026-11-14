import fs from 'node:fs';
import crypto from 'node:crypto';
import {Matrix4,Quaternion,Vector3} from 'three';

// Read actual exported vertices and node transforms. Labels and JSON bounds
// are not used as evidence for the geometry/entry-envelope checks below.
function model(name){
  const file=`public/models/expo/${name}.glb`,bytes=fs.readFileSync(file);
  let offset=12,gltf,bin;
  while(offset<bytes.length){const n=bytes.readUInt32LE(offset),type=bytes.readUInt32LE(offset+4),chunk=bytes.subarray(offset+8,offset+8+n);if(type===0x4e4f534a)gltf=JSON.parse(chunk);if(type===0x004e4942)bin=chunk;offset+=8+n;}
  const cache=new Map();
  function points(index){
    if(cache.has(index))return cache.get(index);
    const a=gltf.accessors[index],v=gltf.bufferViews[a.bufferView],start=(v.byteOffset??0)+(a.byteOffset??0),stride=v.byteStride??12;
    if(a.type!=='VEC3'||a.componentType!==5126)throw Error('Unexpected position accessor');
    const result=Array.from({length:a.count},(_,i)=>new Vector3(bin.readFloatLE(start+i*stride),bin.readFloatLE(start+i*stride+4),bin.readFloatLE(start+i*stride+8)));
    cache.set(index,result);return result;
  }
  const meshes=[];
  function visit(index,parent){
    const n=gltf.nodes[index],local=n.matrix?new Matrix4().fromArray(n.matrix):new Matrix4().compose(new Vector3(...(n.translation??[0,0,0])),new Quaternion(...(n.rotation??[0,0,0,1])),new Vector3(...(n.scale??[1,1,1]))),matrix=parent.clone().multiply(local);
    if(n.mesh!==undefined)meshes.push({name:n.name,role:n.extras?.grandRole,points:gltf.meshes[n.mesh].primitives.flatMap(p=>points(p.attributes.POSITION).map(q=>q.clone().applyMatrix4(matrix)))});
    for(const child of n.children??[])visit(child,matrix);
  }
  for(const n of gltf.scenes[gltf.scene??0].nodes)visit(n,new Matrix4());
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(const mesh of meshes)for(const p of mesh.points)for(let i=0;i<3;i++){min[i]=Math.min(min[i],p.getComponent(i));max[i]=Math.max(max[i],p.getComponent(i));}
  return {file,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,meshes,bounds:{min,max,size:max.map((q,i)=>q-min[i])}};
}
const names=['shell','interior','visitors'].map(x=>`grand-anamorphic-shape-v2-${x}`),models=names.map(model),layout=JSON.parse(fs.readFileSync('public/models/expo/grand-anamorphic-shape-v2-layout.json'));
const routes=layout.routes[0].clearEnvelopesXZ.map(([xMin,xMax,zMin,zMax])=>({xMin,xMax,zMin,zMax,yMin:.18,yMax:2.22}));
const entryChecks=models.map(m=>{
 const hits=[];
 for(const mesh of m.meshes){let count=0;for(const p of mesh.points)if(routes.some(route=>p.x>route.xMin&&p.x<route.xMax&&p.z>route.zMin&&p.z<route.zMax&&p.y>route.yMin&&p.y<route.yMax))count++;
 if(count)hits.push({mesh:mesh.name,role:mesh.role,vertices:count});}
 return {file:m.file,verticesInsidePrincipalEnvelope:hits.reduce((n,h)=>n+h.vertices,0),hits,pass:hits.length===0};
});
const seam={leftScreenPlaneZ:layout.mainCorner.fold[2],rightScreenPlaneX:layout.mainCorner.fold[0],rightEndZ:layout.mainCorner.fold[2]-layout.mainCorner.rightWidth,galleryStartZ:layout.shapeHierarchy.galleryFromZ,architecturalJointM:Math.abs(layout.mainCorner.fold[2]-layout.mainCorner.rightWidth-layout.shapeHierarchy.galleryFromZ)};
const canopyPoints=models[0].meshes.filter(m=>m.role==='studio-canopy'&&/black architectural steel/i.test(m.name)).flatMap(m=>m.points);
const bladePoints=models[0].meshes.filter(m=>m.role==='entry-brand-blade').flatMap(m=>m.points);
if(!canopyPoints.length||!bladePoints.length)throw Error('Expected authored canopy/blade meshes missing');
const canopyClearance={method:'Actual exported black oval/reed POSITION vertices versus every blade/frame/lettering vertex; separated along Z, plus X gap from live LED endpoint.',canopyVertexCount:canopyPoints.length,bladeVertexCount:bladePoints.length,canopyMaxZ:Math.max(...canopyPoints.map(p=>p.z)),bladeMinZ:Math.min(...bladePoints.map(p=>p.z)),canopyMaxX:Math.max(...canopyPoints.map(p=>p.x)),heroEndpointX:layout.mainCorner.fold[0]-layout.mainCorner.leftWidth};
canopyClearance.bladeGapZ=canopyClearance.bladeMinZ-canopyClearance.canopyMaxZ;canopyClearance.heroGapX=canopyClearance.heroEndpointX-canopyClearance.canopyMaxX;canopyClearance.pass=canopyClearance.bladeGapZ>.40&&canopyClearance.heroGapX>.065;
const before=JSON.parse(fs.readFileSync('reports/stall-shape-correction/20261018/studio-baseline-hashes.json','utf8').replace(/^\uFEFF/,''));
const preserved=before.filter(p=>p.path.endsWith('.glb')).map(p=>({...p,unchanged:crypto.createHash('sha256').update(fs.readFileSync(p.path)).digest('hex')===p.sha256}));
const out={createdAt:new Date().toISOString(),version:layout.version,models:models.map(({meshes,...m})=>m),routes,entryChecks,seam,canopyClearance,shapeHierarchy:layout.shapeHierarchy,clearHeight:layout.architecturalDimensions.clearHeight,originalAssets:preserved,limitations:['Vertex-envelope test, not swept triangle/capsule collision certification. Root additionally checks actual walk route.','Reference has no recovered CAD. Shape, materials, media and people cannot be claimed pixel identical.','External 24 x16 m includes the common floor reservation; highest crown follows pillar datum, stepped side pavilions deliberately lower.']};
fs.mkdirSync('reports/architecture-correction-20261018',{recursive:true});fs.writeFileSync('reports/architecture-correction-20261018/studio-shape-v2-geometry.json',JSON.stringify(out,null,2));
console.log(JSON.stringify({assets:out.models,entryChecks,seam,canopyClearance,clearHeight:out.clearHeight,oldAssetsUnchanged:preserved.every(p=>p.unchanged)},null,2));
if(entryChecks.some(p=>!p.pass)||preserved.some(p=>!p.unchanged)||!canopyClearance.pass)process.exitCode=1;
