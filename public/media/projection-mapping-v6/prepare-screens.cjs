/* eslint-disable @typescript-eslint/no-require-imports -- Reproducible Node CommonJS screen artwork preparation. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
const {createCanvas}=require('C:/Users/VJNir/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const root=path.resolve(__dirname,'../../..'),out=__dirname,hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const random=(n,s)=>{const v=Math.sin(n*127.1+s*311.7)*43758.5453123;return v-Math.floor(v);};
const views=[
  ['architecture','public/media/projection-mapping-v4/application-0-architecture.webp'],
  ['concert','public/media/projection-mapping-v4/application-1-concert.webp'],
  ['product-car','public/media/projection-mapping-v4/application-2-product-car.webp'],
  ['interactive','public/media/projection-mapping-v6/interactive-original.png'],
  ['landmark','public/media/projection-mapping-v6/landmark-original.png'],
  ['brand-palace','public/media/projection-mapping-v4/application-5-brand-palace.webp'],
  ['interior','public/media/projection-mapping-v4/application-6-interior.webp'],
  ['event-exhibition','public/media/projection-mapping-v6/event-original.png'],
];
(async()=>{
  const blue=path.join(out,'blue-particulate-original.png');
  await sharp(blue).resize(2560,1024,{fit:'cover',position:'centre'}).webp({quality:97,effort:6}).toFile(path.join(out,'rear-blue-particulate.webp'));
  const {data,info}=await sharp(blue).resize(1536,1536,{fit:'cover',position:'centre'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  for(let i=0;i<data.length;i+=4){const r=data[i],g=data[i+1],b=data[i+2];data[i]=Math.round(r*.88);data[i+1]=Math.min(255,Math.round(g*1.12+b*.13));data[i+2]=Math.round(b*.95);}
  const roof=createCanvas(info.width,info.height),c=roof.getContext('2d'),image=c.createImageData(info.width,info.height);image.data.set(data);c.putImageData(image,0,0);
  for(let i=0;i<900;i++){const x=random(i,21)*1536,y=random(i,83)*1536,size=i%23?.58:1.25;c.fillStyle=i%17?'rgba(170,232,248,.34)':'rgba(230,204,153,.44)';c.fillRect(x,y,size,size);}
  const roofPNG=roof.toBuffer('image/png');fs.writeFileSync(path.join(out,'roof-cyan-particulate-native.png'),roofPNG);
  await sharp(roofPNG).webp({quality:97,effort:6}).toFile(path.join(out,'roof-cyan-particulate.webp'));
  const composite=[],sources=[];
  for(let i=0;i<views.length;i++){
    const [name,relative]=views[i],source=path.join(root,relative),png=await sharp(source).resize(1024,576,{fit:'cover',position:'centre'}).png().toBuffer(),file=`application-${i}-${name}.webp`;
    await sharp(png).webp({quality:96,effort:6}).toFile(path.join(out,file));
    composite.push({input:png,left:(i%2)*1024,top:Math.floor(i/2)*576});sources.push({variant:i,name,file,source:relative,sourceSHA256:hash(fs.readFileSync(source))});
  }
  const atlas=await sharp({create:{width:2048,height:2304,channels:3,background:'#02070c'}}).composite(composite).png().toBuffer();
  fs.writeFileSync(path.join(out,'applications-native.png'),atlas);await sharp(atlas).webp({quality:96,effort:6}).toFile(path.join(out,'applications.webp'));
  fs.writeFileSync(path.join(out,'gallery-sources.json'),JSON.stringify({columns:2,rows:4,cellSize:[1024,576],views:sources},null,2)+'\n');
  const assets=[];for(const file of fs.readdirSync(out).filter(f=>/\.(png|webp)$/.test(f)).sort()){const raw=fs.readFileSync(path.join(out,file)),meta=await sharp(raw).metadata();assets.push({file,width:meta.width,height:meta.height,bytes:raw.length,sha256:hash(raw)});}
  fs.writeFileSync(path.join(out,'asset-manifest.json'),JSON.stringify({date:'2026-10-17',method:'Built-in image_gen isolated artwork plus deterministic native resampling, roof grading and fine particle overlay. No reference-booth image pixels.',assets},null,2)+'\n');
  console.log(JSON.stringify(assets.filter(a=>a.file.endsWith('.webp')),null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
