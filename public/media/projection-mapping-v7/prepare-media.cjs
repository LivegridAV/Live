/* eslint-disable @typescript-eslint/no-require-imports -- Reproducible Node CommonJS optical field and actual-model hero preparation. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
const out=__dirname,root=path.resolve(out,'../../..'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const fract=x=>x-Math.floor(x),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
(async()=>{
  const source=path.join(root,'public/media/projection-mapping-v6/rear-blue-particulate.webp');
  const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const low=await sharp(source).blur(18).ensureAlpha().raw().toBuffer();
  const result=Buffer.from(data);
  for(let i=0;i<data.length;i+=4){
    const originalL=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2],lowL=.2126*low[i]+.7152*low[i+1]+.0722*low[i+2];
    const fine=clamp((originalL-lowL-15)/70,0,1),dither=(fract(Math.sin(i*.017+7.3)*43758.5453)-.5)*.55;
    for(let channel=0;channel<3;channel++){
      const calm=low[i+channel]*.66+(data[i+channel]-low[i+channel])*.86;
      let value=calm*(1-fine*.72)+data[i+channel]*.94*fine*.72+dither;
      value*=channel===0?.94:channel===1?.99:1;
      result[i+channel]=clamp(value,channel===0?1:channel===1?3:8,238);
    }
  }
  const native=await sharp(result,{raw:{width:info.width,height:info.height,channels:4}}).png().toBuffer();
  fs.writeFileSync(path.join(out,'rear-ocean-particulate-native.png'),native);
  await sharp(native).webp({quality:97,effort:6}).toFile(path.join(out,'rear-ocean-particulate.webp'));
  const roofSource=path.join(root,'public/media/projection-mapping-v6/roof-cyan-particulate.webp');
  const roof=await sharp(roofSource).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const roofLow=await sharp(roofSource).blur(18).ensureAlpha().raw().toBuffer(),roofResult=Buffer.from(roof.data);
  for(let i=0;i<roof.data.length;i+=4){
    for(let channel=0;channel<3;channel++){
      // Retain crisp particulate while suppressing the broad icy-white streaks.
      const value=(roofLow[i+channel]*.70+(roof.data[i+channel]-roofLow[i+channel])*.84)*[.75,1,.85][channel];
      roofResult[i+channel]=clamp(value,channel===0?1:channel===1?3:5,230);
    }
  }
  const roofNative=await sharp(roofResult,{raw:{width:roof.info.width,height:roof.info.height,channels:4}}).png().toBuffer();
  fs.writeFileSync(path.join(out,'roof-teal-particulate-native.png'),roofNative);
  await sharp(roofNative).webp({quality:97,effort:6}).toFile(path.join(out,'roof-teal-particulate.webp'));
  await sharp(path.join(out,'crystals-hero.png')).webp({quality:96,effort:6}).toFile(path.join(out,'crystals-hero.webp'));
  const assets=[];for(const file of fs.readdirSync(out).filter(f=>/\.(png|webp)$/.test(f)).sort()){const raw=fs.readFileSync(path.join(out,file)),meta=await sharp(raw).metadata();assets.push({file,width:meta.width,height:meta.height,bytes:raw.length,sha256:hash(raw)});}
  const model=JSON.parse(fs.readFileSync(path.join(root,'public/models/expo/projection-crystals-v7-layout.json'),'utf8'));
  fs.writeFileSync(path.join(out,'asset-manifest.json'),JSON.stringify({date:'2026-10-17',method:'Frequency-separated calm rear and teal roof fields from existing original V6 isolated rasters; full actual V7 crystal GLB rendered in Blender for hero.',rearSource:{file:'public/media/projection-mapping-v6/rear-blue-particulate.webp',sha256:hash(fs.readFileSync(source)),broadFieldGain:.66,fineGain:.86},roofSource:{file:'public/media/projection-mapping-v6/roof-cyan-particulate.webp',sha256:hash(fs.readFileSync(roofSource)),broadFieldGain:.70,fineGain:.84,rgbGrade:[.75,1,.85]},modelSHA256:model.sha256,projectionDomain:model.projectionDomain,assets},null,2)+'\n');
  console.log(JSON.stringify(assets.filter(a=>a.file.endsWith('.webp')),null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
