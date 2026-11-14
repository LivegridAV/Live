/* eslint-disable @typescript-eslint/no-require-imports -- Reproducible Node CommonJS asset preparation script. */
/** Reproducible isolated screen light; no booth/reference pixels. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
const {createCanvas,loadImage}=require('C:/Users/VJNir/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const out=__dirname,root=path.resolve(out,'../../..'),fract=v=>v-Math.floor(v);
const manifestPath=path.join(out,'asset-manifest.json');
const previousHero=fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath)).hero:undefined;
const random=(x,y,s)=>fract(Math.sin(x*127.1+y*311.7+s)*43758.5453123);
const smooth=x=>x*x*(3-2*x),mix=(a,b,t)=>a+(b-a)*t;
function noise(u,v,n,seed){const x=u*n,y=v*n,ix=Math.floor(x),iy=Math.floor(y),sx=smooth(fract(x)),sy=smooth(fract(y));const q=(a,b)=>random(((a%n)+n)%n,((b%n)+n)%n,seed);return mix(mix(q(ix,iy),q(ix+1,iy),sx),mix(q(ix,iy+1),q(ix+1,iy+1),sx),sy);}
function fbm(u,v,s){return noise(u,v,4,s)*.48+noise(u,v,8,s+1)*.26+noise(u,v,16,s+2)*.15+noise(u,v,32,s+3)*.075+noise(u,v,64,s+4)*.035;}
const W=2048,H=1536,field=createCanvas(W,H),c=field.getContext('2d'),small=createCanvas(1024,768),b=small.getContext('2d'),pixels=b.createImageData(1024,768);
for(let y=0;y<768;y++)for(let x=0;x<1024;x++){
  const u=x/1024,v=y/768,warp=fbm(u,v,87.4),cloud=fbm(u+(warp-.5)*.22,v+(warp-.5)*.16,18.7);
  const blue=smooth(Math.max(0,Math.min(1,(cloud-.34)*3.65))),gold=smooth(Math.max(0,Math.min(1,(fbm(u,v,56.8)-.62)*8)))*.60;
  const icy=[mix(242,45,blue),mix(241,133,blue),mix(235,223,blue)];
  const gleam=fbm(u,v,100.4)*.14+.86;
  const rgb=[mix(icy[0],253*gleam,gold),mix(icy[1],225*gleam,gold),mix(icy[2],171*gleam,gold)];
  pixels.data.set([...rgb,255],(y*1024+x)*4);
}
b.putImageData(pixels,0,0);c.drawImage(small,0,0,W,H);
// Small irregular patches are projected light detail; the final crystal facets
// and their silhouette come exclusively from the real three-dimensional GLB.
for(let row=-1;row<23;row++)for(let col=-1;col<31;col++){
  const x=col*74+random(col,row,91)*45,y=row*74+random(col,row,61)*43,r=19+random(col,row,25)*43;
  c.beginPath();c.moveTo(x-r*.55,y-r);c.lineTo(x+r,y-r*.12);c.lineTo(x-r*.35,y+r);c.closePath();
  c.fillStyle=random(col,row,17)>.82?'rgba(255,223,159,.13)':'rgba(224,245,255,.08)';c.fill();
}
const branches=[];
function branch(x,y,a,len,width,seed,depth=0){const points=[[x,y]],count=Math.ceil(len/9);let angle=a;
  for(let i=0;i<count;i++){angle=mix(angle,a+Math.sin(i*.53+seed)*.16+(random(i,depth,seed)-.5)*.90,.65);const d=len/count*(.8+.4*random(i,4,seed));x+=Math.cos(angle)*d;y+=Math.sin(angle)*d;points.push([x,y]);
    if(depth<2&&i>4&&i<count-4&&random(i,depth+7,seed)>.91)branch(x,y,angle+(random(i,11,seed)>.5?1:-1)*(.55+random(i,13,seed)*.75),len*(.12+.18*random(i,16,seed)),width*.48,seed+i*1.7+9,depth+1);
  }branches.push({points,width});}
for(let i=0;i<31;i++)branch(-100+random(i,3,31)*(W+200),-140+random(i,8,92)*H,.95+random(i,4,44)*1.1,260+random(i,7,71)*650,(1.2+random(i,9,3)*2.5)*1.8,i*3.47+8);
function stroke(points,width,color){c.beginPath();c.moveTo(...points[0]);for(let i=1;i<points.length;i++)c.lineTo(...points[i]);c.lineWidth=width;c.strokeStyle=color;c.stroke();}
c.lineJoin='round';c.lineCap='round';
for(const item of branches)stroke(item.points,item.width*5.5,'rgba(75,173,249,.10)');
for(const item of branches)stroke(item.points,item.width*1.6,'rgba(216,241,255,.78)');
for(const item of branches)stroke(item.points,item.width*.60,'rgba(255,255,247,.98)');

(async()=>{
  const nebula=await loadImage(path.join(root,'public/media/led-rental-showcase/nebula.webp'));
  const input=createCanvas(1024,1024),ic=input.getContext('2d');ic.drawImage(nebula,0,0,1024,1024);const src=ic.getImageData(0,0,1024,1024);
  const cosmic=createCanvas(1024,1024),s=cosmic.getContext('2d'),data=s.createImageData(1024,1024);
  for(let y=0;y<1024;y++)for(let x=0;x<1024;x++){
    const dx=(x-512)/512,dy=(y-512)/512,r=Math.sqrt(dx*dx+dy*dy)*.70,a=Math.atan2(dy,dx)+.66*Math.exp(-r*1.2);
    const sx=Math.max(0,Math.min(1023,Math.round(512+Math.cos(a)*r*512))),sy=Math.max(0,Math.min(1023,Math.round(512+Math.sin(a)*r*512))),si=(sy*1024+sx)*4;
    const luminance=(src.data[si]*.20+src.data[si+1]*.25+src.data[si+2]*.55)/255,v=Math.pow(luminance,1.05),star=Math.max(0,(luminance-.80)/.20),i=(y*1024+x)*4;
    data.data.set([4+v*60+star*72,12+v*150+star*65,22+v*157+star*54,255],i);
  }s.putImageData(data,0,0);
  // These fine warm dust points retain the restrained champagne notes seen
  // in the ceiling content while the broad field remains deep teal/navy.
  for(let i=0;i<520;i++){const x=random(i,4,77)*1024,y=random(i,8,50)*1024;s.fillStyle=i%9?'rgba(167,239,236,.32)':'rgba(235,208,132,.52)';s.fillRect(x,y,i%13?.7:1.6,i%13?.7:1.6);}
  const pano=createCanvas(2560,1024),pc=pano.getContext('2d');pc.drawImage(cosmic,0,307,1024,410,0,0,2560,1024);
  const fieldPng=field.toBuffer('image/png');fs.writeFileSync(path.join(out,'crystal-light-native.png'),fieldPng);
  await sharp(fieldPng).webp({quality:97,effort:6}).toFile(path.join(out,'crystal-light.webp'));
  fs.writeFileSync(path.join(out,'cosmic-swirl-native.png'),cosmic.toBuffer('image/png'));
  await sharp(cosmic.toBuffer('image/png')).webp({quality:96,effort:6}).toFile(path.join(out,'cosmic-swirl.webp'));
  fs.writeFileSync(path.join(out,'cosmic-panorama-native.png'),pano.toBuffer('image/png'));
  await sharp(pano.toBuffer('image/png')).webp({quality:96,effort:6}).toFile(path.join(out,'cosmic-panorama.webp'));
  const assets=[];for(const name of fs.readdirSync(out).filter(n=>/\.(png|webp)$/.test(n)).sort()){const raw=fs.readFileSync(path.join(out,name)),m=await sharp(raw).metadata();assets.push({file:name,width:m.width,height:m.height,bytes:raw.length,sha256:crypto.createHash('sha256').update(raw).digest('hex')});}
  fs.writeFileSync(manifestPath,JSON.stringify({date:'2026-10-16',reference:'ChatGPT Image Oct 16, 2026, 09_32_18 PM-1.png',method:'Native blue/white/gold projected light plus existing isolated nebula artwork graded/warped with native Canvas2D; no reference-booth pixels.',branches:branches.length,assets,...(previousHero?{hero:previousHero}:{})},null,2)+'\n');
  console.log(JSON.stringify({branches:branches.length,assets},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
