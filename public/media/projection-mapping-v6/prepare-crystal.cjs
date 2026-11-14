/* eslint-disable @typescript-eslint/no-require-imports -- Reproducible Node CommonJS crystal projection texture preparation. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
const out=__dirname,hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
  const original=path.join(out,'crystal-caustic-original.png');
  const native=await sharp(original).resize(2048,1536,{fit:'cover',position:'centre'}).linear(.92,3).png().toBuffer();
  fs.writeFileSync(path.join(out,'crystal-caustic-native.png'),native);
  await sharp(native).webp({quality:97,effort:6}).toFile(path.join(out,'crystal-caustic.webp'));
  const file=path.join(out,'asset-manifest.json'),manifest=JSON.parse(fs.readFileSync(file,'utf8'));
  const names=['crystal-caustic-original.png','crystal-caustic-native.png','crystal-caustic.webp'];manifest.assets=manifest.assets.filter(a=>!names.includes(a.file));
  for(const name of names){const raw=fs.readFileSync(path.join(out,name)),meta=await sharp(raw).metadata();manifest.assets.push({file:name,width:meta.width,height:meta.height,bytes:raw.length,sha256:hash(raw)});}
  manifest.crystal={method:'One original built-in image_gen optical caustic field, resampled to2048×1536 with a .92 scale/+3 highlight shoulder; no painted geometry.',prompt:'crystal-prompt.json',loop:'Native painter24-second bounded drift; cached blue-only grade retains neutral and gold values.'};
  fs.writeFileSync(file,JSON.stringify(manifest,null,2)+'\n');
  const stats=await sharp(native).stats();console.log(JSON.stringify({assets:manifest.assets.filter(a=>names.includes(a.file)),channels:stats.channels.slice(0,3).map(({min,max,mean,stdev})=>({min,max,mean,stdev}))},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
