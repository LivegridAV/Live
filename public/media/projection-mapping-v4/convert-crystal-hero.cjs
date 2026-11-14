/* eslint-disable @typescript-eslint/no-require-imports -- Reproducible Node CommonJS hero image conversion script. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
const out=__dirname,root=path.resolve(out,'../../..'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const file=path.join(out,'crystals-hero.png'),m=await sharp(file).metadata();if(m.width!==1600||m.height!==900)throw new Error('Hero must contain the complete actual crystal geometry at 1600×900.');
 await sharp(file).webp({quality:95,effort:6}).toFile(path.join(out,'crystals-hero.webp'));
 const manifest=JSON.parse(fs.readFileSync(path.join(out,'asset-manifest.json')));manifest.assets=[];
 for(const name of fs.readdirSync(out).filter(n=>/\.(png|webp)$/.test(n)).sort()){const data=fs.readFileSync(path.join(out,name)),meta=await sharp(data).metadata();manifest.assets.push({file:name,width:meta.width,height:meta.height,bytes:data.length,sha256:hash(data)});}
 const geometry=path.join(root,'public/models/expo/projection-crystals.glb');manifest.hero={source:'crystals-hero.png',method:'Actual current crystal GLB rendered in Blender against native navy/teal cosmic background; no booth or reference photo pixels.',geometrySHA256:fs.existsSync(geometry)?hash(fs.readFileSync(geometry)):null,fieldSHA256:hash(fs.readFileSync(path.join(out,'crystal-light.webp')))};
 fs.writeFileSync(path.join(out,'asset-manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest.assets.find(a=>a.file==='crystals-hero.webp'),null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
