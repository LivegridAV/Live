import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Export/server verification only. Rendered page evidence is collected separately.
const origin=process.argv[2]??'http://127.0.0.1:4310';
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))throw Error('Only the local unpublished server is permitted');
const root=process.cwd(),out=path.join(root,'out');
const report=path.join(root,'reports/grand-stalls/20261018-implementation');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const dependencyAudit=path.join(report,'verification/asset-retention-and-dependencies.json');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const routes=files(out).filter(file=>file.endsWith('.html')).map(file=>'/'+path.relative(out,file).replaceAll(path.sep,'/')).filter(url=>!url.startsWith('/_next/'));
const results=[];
for(const url of routes){const r=await fetch(origin+url,{method:'HEAD'});results.push({url,status:r.status,pass:r.status===200});}
for(const url of ['/design-v2','/visual-final']){const r=await fetch(origin+url,{method:'HEAD'});results.push({url,status:r.status,expected:404,pass:r.status===404});}
const assets=files(path.join(root,'public/models/expo')).filter(file=>/\/(?:grand-|projection-grand-).*\.glb$/.test(file.replaceAll('\\','/')));
const assetChecks=[];
for(const file of assets){
  const relative=path.relative(path.join(root,'public'),file),exportFile=path.join(out,relative),url='/'+relative.replaceAll(path.sep,'/');
  const r=await fetch(origin+url,{method:'HEAD'});
  const sourceBytes=fs.statSync(file).size;
  const same=fs.existsSync(exportFile)&&hash(file)===hash(exportFile);
  assetChecks.push({url,status:r.status,sourceBytes,servedBytes:Number(r.headers.get('content-length')),sha256:hash(file),exportIdentical:same,pass:r.status===200&&same&&Number(r.headers.get('content-length'))===sourceBytes});
}
const html=await(await fetch(origin+'/')).text();
const chunks=[...new Set([...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1]))];
const chunkChecks=[];
for(const url of chunks){const r=await fetch(origin+url,{method:'HEAD'});chunkChecks.push({url,status:r.status,pass:r.status===200});}
const build=await(await fetch(origin+'/build-info.json')).json();
const result={createdAt:new Date().toISOString(),origin,scope:'Fresh unpublished static export; no deployment',build,htmlRoutes:results,assets:assetChecks,chunks:chunkChecks,pass:[...results,...assetChecks,...chunkChecks].every(r=>r.pass),limits:['HTTP/export tests are not proof of visual quality. See actual browser captures, camera attributes and recording metadata.','Existing unrelated working-tree changes were retained. Baseline asset hashes are checked separately.'],activeDependencyAudit:{path:path.relative(report,dependencyAudit),sha256:hash(dependencyAudit)}};
fs.writeFileSync(path.join(report,'verification/final-local-export.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({origin,build,htmlRoutes:results.length,assets:assetChecks.length,chunks:chunkChecks.length,pass:result.pass,failures:[...results,...assetChecks,...chunkChecks].filter(r=>!r.pass)}));
if(!result.pass)process.exitCode=1;
