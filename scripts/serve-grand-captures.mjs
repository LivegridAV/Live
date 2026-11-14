// Explicit local review recorder sink. Never part of the exported website.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const directory=path.resolve(process.argv[2]??'reports/grand-stalls/20261018-implementation/recordings');
const reportsRoot=path.resolve('reports');
if(!directory.startsWith(reportsRoot+path.sep))throw new Error('Recording output must remain inside this project reports directory');
fs.mkdirSync(directory,{recursive:true});
const origins=new Set(['http://127.0.0.1:4310','http://127.0.0.1:4320','http://127.0.0.1:4315','http://localhost:4310','http://localhost:4320','http://localhost:4315']);
http.createServer(async(req,res)=>{
  const origin=req.headers.origin;
  if(!origin||!origins.has(origin)){res.writeHead(403).end();return;}
  const headers={'Access-Control-Allow-Origin':origin,'Vary':'Origin','Cache-Control':'no-store'};
  if(req.method==='OPTIONS'){
    res.writeHead(204,{...headers,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}).end();return;
  }
  const url=new URL(req.url,'http://127.0.0.1:4321');
  const name=url.searchParams.get('name')??'';
  if(req.method!=='POST'||url.pathname!=='/recording'||!/^scene-[a-z0-9_-]+\.(webm|json)$/i.test(name)){
    res.writeHead(400,headers).end('Invalid recording filename');return;
  }
  const target=path.resolve(directory,name);
  if(path.dirname(target)!==directory){res.writeHead(400,headers).end();return;}
  const chunks=[];let bytes=0;
  try{
    for await(const chunk of req){bytes+=chunk.length;if(bytes>256*1024*1024)throw Error('Recording exceeds 256 MB limit');chunks.push(chunk);}
    if(!bytes)throw Error('Empty recording');
    fs.writeFileSync(target,Buffer.concat(chunks),{flag:'wx'});
    res.writeHead(201,{...headers,'Content-Type':'application/json'}).end(JSON.stringify({file:path.relative(process.cwd(),target).replaceAll('\\','/'),bytes}));
    console.log(JSON.stringify({saved:name,bytes}));
  }catch(error){res.writeHead(error.code==='EEXIST'?409:400,headers).end(error.message);}
}).listen(4321,'127.0.0.1',()=>console.log('Local canvas recorder sink: http://127.0.0.1:4321 (only project recording files)'));
