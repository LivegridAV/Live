/* eslint-disable @typescript-eslint/no-require-imports -- Reproducible Node CommonJS gallery asset preparation script. */
/** Eight isolated monitor views; never a complete reference booth image. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
const out=__dirname,root=path.resolve(out,'../../..'),SIZE=[1024,576];
const views=[
 {name:'architecture',source:'public/media/projection-mapping/applications.webp',quadrant:0},
 {name:'concert',source:'public/media/led-rental-pavilion-v3/applications.webp',quadrant:0},
 {name:'product-car',source:'public/media/projection-mapping-v4/product-car-original.png'},
 {name:'interactive',source:'public/media/projection-mapping/applications.webp',quadrant:3},
 {name:'landmark',source:'public/media/projection-mapping/hero.webp',crop:[.235,.20,.53,.73]},
 {name:'brand-palace',source:'public/media/projection-mapping/hero.webp'},
 {name:'interior',source:'public/media/projection-mapping-v4/interior-event-original.png'},
 {name:'event-crowd',source:'public/media/led-rental-pavilion-v2/applications.webp',quadrant:1},
];
(async()=>{
 const composite=[];
 for(let i=0;i<views.length;i++){
   const view=views[i],source=path.join(root,view.source),meta=await sharp(source).metadata();let pipeline=sharp(source);
   if(view.quadrant!==undefined){const halfW=Math.floor(meta.width/2),halfH=Math.floor(meta.height/2),left=(view.quadrant%2)*halfW,top=Math.floor(view.quadrant/2)*halfH;pipeline=pipeline.extract({left,top,width:view.quadrant%2?meta.width-halfW:halfW,height:view.quadrant<2?halfH:meta.height-halfH});}
   if(view.crop){const [x,y,w,h]=view.crop;pipeline=pipeline.extract({left:Math.round(x*meta.width),top:Math.round(y*meta.height),width:Math.round(w*meta.width),height:Math.round(h*meta.height)});}
   const png=await pipeline.resize(...SIZE,{fit:'cover',position:'centre'}).png().toBuffer();
   const target='application-'+i+'-'+view.name+'.webp';await sharp(png).webp({quality:95,effort:6}).toFile(path.join(out,target));
   composite.push({input:png,left:(i%2)*SIZE[0],top:Math.floor(i/2)*SIZE[1]});view.variant=i;view.file=target;view.sourceSHA256=crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');
 }
 const png=await sharp({create:{width:2048,height:2304,channels:3,background:'#02070c'}}).composite(composite).png().toBuffer();
 fs.writeFileSync(path.join(out,'applications-original.png'),png);await sharp(png).webp({quality:95,effort:6}).toFile(path.join(out,'applications.webp'));
 fs.writeFileSync(path.join(out,'gallery-sources.json'),JSON.stringify({columns:2,rows:4,cellSize:SIZE,views},null,2)+'\n');
 console.log(JSON.stringify(views.map(({variant,name,file})=>({variant,name,file})),null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
