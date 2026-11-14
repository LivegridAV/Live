import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const root=process.cwd();
const out=path.join(root,'reports/grand-stalls/20261018-implementation/baseline');
fs.mkdirSync(out,{recursive:true});
const files=execFileSync('rg',['--files','src/venue','scripts/blender','public/models/expo','public/media'],{encoding:'utf8'}).trim().split(/\r?\n/);
const manifest={createdAt:new Date().toISOString(),branch:execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim(),commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),status:execFileSync('git',['status','--short'],{encoding:'utf8'}),files:files.map(file=>({file,bytes:fs.statSync(file).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}))};
fs.writeFileSync(path.join(out,'working-tree.json'),JSON.stringify(manifest,null,2));
for(const file of files.filter(f=>/\.(tsx?|py|json)$/.test(f)&&!f.includes('__pycache__'))){
  const dest=path.join(out,'source',file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(file,dest);
}
console.log(JSON.stringify({out,files:files.length,branch:manifest.branch,commit:manifest.commit}));
