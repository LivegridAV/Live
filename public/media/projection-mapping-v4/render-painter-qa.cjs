/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS QA harness transpiles and inspects the native painters. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),sharp=require('sharp');
const {createCanvas,Image:NativeImage}=require('C:/Users/VJNir/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const root=process.cwd(),loaded=[],cache=new Map(),out=path.join(root,'qa/projection-mapping-v4');
class LocalImage extends NativeImage{set src(url){super.src=fs.readFileSync(path.join(root,'public',url.split('?')[0]));loaded.push(this.decode());}}
function load(file){if(cache.has(file))return cache.get(file);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;const box={exports:{},Image:LocalImage,document:{createElement:()=>createCanvas(300,150)},console,performance,require:id=>load(path.join(path.dirname(file),id+'.ts'))};vm.runInNewContext(code,box);cache.set(file,box.exports);return box.exports;}
const m=load(path.join(root,'src/venue/media/projectionPainters.ts'));
const names=['architecture','concert','product-car','interactive','landmark','brand-palace','interior','event-crowd'];
const jobs=[['crystal-field',m.projectionCrystal,2048,1536,0],['cosmic-ceiling',m.projectionCeiling,1024,1024,0],['curved-backdrop',m.projectionBackdrop,2560,1024,0],...names.map((n,i)=>['application-'+i+'-'+n,m.projectionApplications,1024,576,i])];
if(fs.existsSync(path.join(root,'public',m.PROJECTION_ART.hero.split('?')[0])))jobs.push(['crystal-hero',m.projectionHero,1536,864,0],['crystal-kiosk',m.projectionKiosk,1024,640,0]);
(async()=>{fs.mkdirSync(out,{recursive:true});
 for(const [,paint,w,h,variant]of jobs){const canvas=createCanvas(w,h);paint({ctx:canvas.getContext('2d'),w,h,t:4,accent:'#71d6cf',variant});}await Promise.all(loaded);
 const report=[];
 for(const [name,paint,w,h,variant]of jobs){const canvas=createCanvas(w,h),p={ctx:canvas.getContext('2d'),w,h,t:4,accent:'#71d6cf',variant};paint(p);const png=canvas.toBuffer('image/png');fs.writeFileSync(path.join(out,name+'.png'),png);await sharp(png).resize({width:Math.min(w,1280)}).jpeg({quality:94}).toFile(path.join(out,name+'.jpg'));if(name==='crystal-field')await sharp(png).resize(400,300).png().toFile(path.join(out,'crystal-field-400px.png'));
   paint({...p,t:0});const start=canvas.toBuffer('image/png');paint({...p,t:24});const end=canvas.toBuffer('image/png');if(!start.equals(end))throw new Error(name+' does not loop exactly');report.push({name,width:w,height:h,period24Exact:true});}
 const ctx=createCanvas(2560,1024).getContext('2d');ctx.font='500 60px "Segoe UI",Arial,sans-serif';ctx.letterSpacing='3.0px';const copy=['FROM','IMAGINATION','TO IMMERSION'].map(text=>({text,width:ctx.measureText(text).width,safeWidth:460}));if(copy.some(item=>item.width>460))throw new Error('Left backdrop copy exceeds its clear band: '+JSON.stringify(copy));
 ctx.font='500 42px "Segoe UI",Arial,sans-serif';ctx.letterSpacing='2.1px';const right=['PROJECTION MAPPING','REAL SPACES','REAL EMOTIONS'].map(text=>({text,width:ctx.measureText(text).width,safeWidth:475}));if(right.some(item=>item.width>475))throw new Error('Right backdrop copy exceeds its clear band: '+JSON.stringify(right));copy.push(...right);
 fs.writeFileSync(path.join(out,'canvas-qa.json'),JSON.stringify({painters:report,backdropCopy:copy},null,2)+'\n');console.log(JSON.stringify({painters:report,backdropCopy:copy},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
