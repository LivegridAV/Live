/** Read-only GLB and geometric-clearance helpers for placement implementation proofs. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as T from 'three';
import { MeshBVH } from 'three-mesh-bvh';

const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const vec=v=>v.toArray().map(x=>+x.toFixed(8));
const rec=b=>({min:vec(b.min),max:vec(b.max),size:vec(b.getSize(new T.Vector3()))});
const cache=new Map();
const rigid=(p,yaw)=>new T.Matrix4().makeRotationY(yaw).setPosition(...p);
function load(name){
  if(cache.has(name))return cache.get(name);
  const file=`public/models/expo/${name}.glb`,b=fs.readFileSync(file),length=b.readUInt32LE(12);
  const d=JSON.parse(b.toString('utf8',20,20+length)),bin=length+28,primitives=[];
  function walk(i,parent,hidden=false){
    const n=d.nodes[i],m=new T.Matrix4();
    if(n.matrix)m.fromArray(n.matrix);else m.compose(new T.Vector3(...(n.translation??[0,0,0])),new T.Quaternion(...(n.rotation??[0,0,0,1])),new T.Vector3(...(n.scale??[1,1,1])));
    m.premultiply(parent);const role=n.extras?.grandRole??'unclassified';
    hidden=hidden||['floor','shared-floor'].includes(role)||!!n.extras?.grandSharedFloor;
    if(n.mesh!=null)for(const p of d.meshes[n.mesh].primitives){
      const a=d.accessors[p.attributes.POSITION],bv=d.bufferViews[a.bufferView],off=bin+(bv.byteOffset??0)+(a.byteOffset??0),stride=bv.byteStride??12;
      const positions=new Float32Array(a.count*3),v=new T.Vector3();
      for(let k=0;k<a.count;k++){
        v.set(b.readFloatLE(off+k*stride),b.readFloatLE(off+k*stride+4),b.readFloatLE(off+k*stride+8)).applyMatrix4(m);positions.set(v.toArray(),k*3);
      }
      let indices;
      if(p.indices!=null){const ia=d.accessors[p.indices],ib=d.bufferViews[ia.bufferView],io=bin+(ib.byteOffset??0)+(ia.byteOffset??0),[read,bytes]=({5121:['readUInt8',1],5123:['readUInt16LE',2],5125:['readUInt32LE',4]})[ia.componentType];indices=Uint32Array.from({length:ia.count},(_,k)=>b[read](io+k*bytes));}
      else indices=Uint32Array.from({length:a.count},(_,k)=>k);
      primitives.push({name:n.name,role,hidden,material:d.materials[p.material]?.name,positions,indices});
    }
    for(const child of n.children??[])walk(child,m,hidden);
  }
  for(const node of d.scenes[d.scene??0].nodes)walk(node,new T.Matrix4());
  const result={name,file,sha256:hash(b),primitives};cache.set(name,result);return result;
}
function fromAsset(name,filter=()=>true){return load(name).primitives.filter(p=>!p.hidden&&filter(p)).map(p=>{
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(p.positions.slice(),3));g.setIndex(new T.BufferAttribute(p.indices.slice(),1));return g;
});}
function combine(geometries){
  const count=geometries.reduce((n,g)=>n+g.attributes.position.count,0),indexCount=geometries.reduce((n,g)=>n+(g.index?.count??g.attributes.position.count),0);
  const pos=new Float32Array(count*3),indices=new Uint32Array(indexCount);let nv=0,ni=0;
  for(const g of geometries){pos.set(g.attributes.position.array,nv*3);for(let i=0;i<(g.index?.count??g.attributes.position.count);i++)indices[ni++]=nv+(g.index?g.index.getX(i):i);nv+=g.attributes.position.count;}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setIndex(new T.BufferAttribute(indices,1));g.computeBoundingBox();return g;
}
const box=(size,p=[0,0,0])=>new T.BoxGeometry(...size).translate(...p);
const plane=(size,p,rotation)=>new T.PlaneGeometry(...size).applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(...rotation)).setPosition(...p));
function makeItem(id,geometries,matrix,extra={}){
  const g=combine(geometries);g.applyMatrix4(matrix);g.computeBoundingBox();
  return {id,g,box:g.boundingBox.clone(),matrix:matrix.toArray(),...extra};
}
function tree(item){ return item.g.boundsTree ??= new MeshBVH(item.g); }
export {load,fromAsset,combine,makeItem,tree,rigid,box,plane,rec,hash};
