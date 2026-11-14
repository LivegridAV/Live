// Reproducible CC0 texture preparation. Run with Node from the repository root.
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { unzipSync } from "three/examples/jsm/libs/fflate.module.js";

const out = new URL("./", import.meta.url);
const records = [];
const sha = b => crypto.createHash("sha256").update(b).digest("hex");
async function download(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return Buffer.from(await response.arrayBuffer());
}
async function scalar(buffer, size) {
  return sharp(buffer).resize(size, size).extractChannel(0).raw().toBuffer();
}
async function savePack(name, maps, info, floor = false) {
  const size = 1024;
  await sharp(maps.color).resize(floor ? 2048 : size, floor ? 2048 : size).webp({quality: 94, effort: 6}).toFile(fileURLToPath(new URL(`${name}-color.webp`, out)));
  const normal = await sharp(maps.normal).resize(size,size).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const normalized = Buffer.alloc(size*size*3);
  for(let i=0;i<size*size;i++) {
    const at=i*normal.info.channels;
    let x=normal.data[at]/127.5-1,y=normal.data[at+1]/127.5-1,z=normal.data[at+2]/127.5-1;
    const length=Math.sqrt(x*x+y*y+z*z)||1;x/=length;y/=length;z/=length;
    normalized[i*3]=Math.round((x+1)*127.5);normalized[i*3+1]=Math.round((y+1)*127.5);normalized[i*3+2]=Math.round((z+1)*127.5);
  }
  await sharp(normalized,{raw:{width:size,height:size,channels:3}}).webp({lossless:true,effort:6}).toFile(fileURLToPath(new URL(`${name}-normal.webp`,out)));
  const rough=await scalar(maps.rough,size),ao=maps.ao?await scalar(maps.ao,size):Buffer.alloc(size*size,255);
  const orm=Buffer.alloc(size*size*3);
  for(let i=0;i<size*size;i++){orm[i*3]=ao[i];orm[i*3+1]=floor?Math.round(158+rough[i]*.28):rough[i];orm[i*3+2]=0;}
  await sharp(orm,{raw:{width:size,height:size,channels:3}}).webp({lossless:true,effort:6}).toFile(fileURLToPath(new URL(`${name}-orm.webp`,out)));
  const files=[];
  for(const suffix of ["color","normal","orm"]){const file=`${name}-${suffix}.webp`,b=await fs.readFile(new URL(file,out));files.push({file,bytes:b.length,sha256:sha(b)});}
  records.push({name,...info,outputs:files});console.log(name,files.map(f=>`${f.file} ${f.bytes}`).join(", "));
}
async function ambient(name,id,res,floor=false){
  const url=`https://ambientcg.com/get?file=${id}_${res}-JPG.zip`,zip=await download(url),entries=unzipSync(zip);
  const find = suffix => {const key=Object.keys(entries).find(k=>new RegExp(`_${suffix}\\.jpg$`,"i").test(k));if(!key)return undefined;return Buffer.from(entries[key]);};
  const maps={color:find("Color"),normal:find("NormalGL"),rough:find("Roughness"),ao:find("AmbientOcclusion")};
  if(!maps.color||!maps.normal||!maps.rough)throw Error(`Missing maps in ${id}: ${Object.keys(entries).join(",")}`);
  await savePack(name,maps,{provider:"ambientCG",asset:id,source:`https://ambientcg.com/a/${id}`,download:url,archiveSha256:sha(zip),license:"CC0-1.0",licenseUrl:"https://docs.ambientcg.com/license/"},floor);
}
async function fabric(){
  const api="https://api.polyhaven.com/files/poly_wool_herringbone",info=JSON.parse(await download(api));
  const sources={color:info.Diffuse["1k"].jpg.url,normal:info.nor_gl["1k"].jpg.url,rough:info.Rough["1k"].jpg.url,ao:info.AO["1k"].jpg.url};
  const pairs=await Promise.all(Object.entries(sources).map(async([key,url])=>[key,await download(url)]));
  await savePack("wool",Object.fromEntries(pairs),{provider:"Poly Haven",asset:"poly_wool_herringbone",source:"https://polyhaven.com/a/poly_wool_herringbone",downloads:sources,license:"CC0-1.0",licenseUrl:"https://polyhaven.com/license",physicalSampleHeightMetres:.3});
}
await Promise.all([ambient("floor","Marble024","2K",true),ambient("steel","Metal009","1K"),ambient("cast","Metal029","1K"),fabric()]);
await fs.writeFile(new URL("provenance.json",out),JSON.stringify({purpose:"Actual 3D PBR surface maps for the technical showcase; no photographic scene overlays.",preparedAt:new Date().toISOString(),channels:{color:"sRGB albedo",normal:"OpenGL tangent normal; resized normals renormalized, lossless WebP",orm:"R=ambient occlusion,G=linear roughness,B=0. Metalness is a physical material constant."},processing:"Albedo encoded WebP quality94. All normal/ORM data lossless WebP. Source maps resampled to1024², floor albedo2048². Floor roughness remapped numerically to0.62–0.90 so a material multiplier can preserve polished yet softened reflections. No painted lighting or fake highlights.",assets:records},null,2)+"\n");
