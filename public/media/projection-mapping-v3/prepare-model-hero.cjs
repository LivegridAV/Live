const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
(async()=>{
  const out=__dirname;
  const requested=process.argv[2];
  const latest='sculpture-hero-render-blue.png';
  const sourceName=requested??(await fs.access(path.join(out,latest)).then(()=>latest,()=> 'sculpture-hero-render.png'));
  const source=path.join(out,sourceName);
  await sharp(source).webp({quality:93,effort:6}).toFile(path.join(out,'sculpture-hero.webp'));
  const assets=[];
  for(const file of (await fs.readdir(out)).filter(f=>/\.(png|webp)$/.test(f)).sort()){
    const bytes=await fs.readFile(path.join(out,file)),metadata=await sharp(bytes).metadata();
    assets.push({file,width:metadata.width,height:metadata.height,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
  }
  await fs.writeFile(path.join(out,'asset-manifest.json'),JSON.stringify({created:'2026-10-16',heroSource:sourceName,method:'native procedural light fields and actual Blender sculpture render; no reference raster cropping',assets},null,2));
  console.log(JSON.stringify(assets.filter(a=>a.file.endsWith('.webp')),null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
