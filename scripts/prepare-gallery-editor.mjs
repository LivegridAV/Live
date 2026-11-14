// Split exactly the vertices changed by the gallery edit into movable assemblies.
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const out=path.join(root,'assets/blender/projection-gallery-editor');fs.mkdirSync(out,{recursive:true});
for(const kind of ['shell','interior']){
  const old=fs.readFileSync(path.join(root,`public/models/expo/projection-finish-v2-${kind}.glb`));
  const data=fs.readFileSync(path.join(root,`public/models/expo/projection-finish-v2-gallery-${kind}.glb`));
  const len=data.readUInt32LE(12),doc=JSON.parse(data.subarray(20,20+len));
  const oldBin=old.subarray(28+old.readUInt32LE(12)),bin=data.subarray(28+len);
  const chunks=[bin];let total=bin.length;const nodes=[],meshes=[];
  for(const n of doc.nodes){if(n.mesh===undefined)continue;
    for(const p of doc.meshes[n.mesh].primitives){
      const a=doc.accessors[p.attributes.POSITION],v=doc.bufferViews[a.bufferView],o=(v.byteOffset??0)+(a.byteOffset??0),stride=v.byteStride??12;
      const groups=Array.from({length:a.count},(_,i)=>{
        const q=o+i*stride;return bin.subarray(q,q+12).equals(oldBin.subarray(q,q+12))?0:bin.readFloatLE(q)<0?-1:1;
      });
      const ia=doc.accessors[p.indices],iv=doc.bufferViews[ia.bufferView],io=(iv.byteOffset??0)+(ia.byteOffset??0),size=ia.componentType===5123?2:4;
      const sets=new Map([[0,[]],[-1,[]],[1,[]]]);
      for(let i=0;i<ia.count;i+=3){const tri=[0,1,2].map(k=>size===2?bin.readUInt16LE(io+(i+k)*size):bin.readUInt32LE(io+(i+k)*size));
        const sides=tri.map(i=>groups[i]);if(!sides.every(s=>s===sides[0]))throw Error('Partially transformed triangle');sets.get(sides[0]).push(...tri);
      }
      for(const [side,indices] of sets){if(!indices.length)continue;
        const b=Buffer.alloc(indices.length*4);indices.forEach((v,i)=>b.writeUInt32LE(v,i*4));
        doc.bufferViews.push({buffer:0,byteOffset:total,byteLength:b.length,target:34963});chunks.push(b);total+=b.length;
        doc.accessors.push({bufferView:doc.bufferViews.length-1,componentType:5125,count:indices.length,type:'SCALAR'});
        const name=(side<0?'LEFT GALLERY':side>0?'RIGHT GALLERY':'PAVILION')+' | '+n.name;
        meshes.push({name,primitives:[{...p,indices:doc.accessors.length-1}]});
        nodes.push({...n,name,mesh:meshes.length-1,extras:{...n.extras,editableGallerySide:side}});
      }
    }
  }
  doc.nodes=nodes;doc.meshes=meshes;doc.scenes=[{nodes:nodes.map((_,i)=>i)}];doc.scene=0;doc.buffers[0].byteLength=total;
  const json=Buffer.from(JSON.stringify(doc)),pad=Buffer.alloc(Math.ceil(json.length/4)*4,32);json.copy(pad);
  const output=Buffer.alloc(28+pad.length+total);output.writeUInt32LE(0x46546c67,0);output.writeUInt32LE(2,4);output.writeUInt32LE(output.length,8);
  output.writeUInt32LE(pad.length,12);output.writeUInt32LE(0x4e4f534a,16);pad.copy(output,20);
  output.writeUInt32LE(total,20+pad.length);output.writeUInt32LE(0x004e4942,24+pad.length);Buffer.concat(chunks).copy(output,28+pad.length);
  fs.writeFileSync(path.join(out,kind+'.glb'),output);console.log(kind,nodes.length,'parts');
}
