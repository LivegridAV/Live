import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const out='reports/grand-stalls/20261018-implementation';
const audit='reports/visual-audit/20261018-visual-audit-01';
fs.mkdirSync(`${out}/references`,{recursive:true});
fs.mkdirSync(`${out}/baseline/captures`,{recursive:true});
const refs={
 'led-rental':'C:/Users/VJNir/Downloads/Livegrid AV Booth.png',
 projection:'C:/Users/VJNir/Downloads/ChatGPT Image Oct 16, 2026, 09_32_18 PM-1.png',
 pillars:'C:/Users/VJNir/Downloads/ChatGPT Image Sep 23, 2026, 12_29_33 AM (2).png',
 reception:'C:/Users/VJNir/Downloads/ChatGPT Image Sep 23, 2026, 12_29_33 AM (3).png',
 anamorphic:'C:/Users/VJNir/Downloads/ChatGPT Image Sep 23, 2026, 12_29_33 AM (4).png',
 technical:'C:/Users/VJNir/Downloads/ChatGPT Image Sep 23, 2026, 12_29_33 AM (5).png',
};
const referenceManifest=[];
for(const [stall,file]of Object.entries(refs)){const dest=`${out}/references/${stall}.png`;fs.copyFileSync(file,dest);referenceManifest.push({stall,source:file,path:path.relative(out,dest).replaceAll('\\','/'),sha256:crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex')});}
fs.writeFileSync(`${out}/REFERENCE_MANIFEST.json`,JSON.stringify(referenceManifest,null,2));
const hero=JSON.parse(fs.readFileSync(`${audit}/HERO_SELECTION.json`)),captures=JSON.parse(fs.readFileSync(`${audit}/CAPTURE_MANIFEST.json`)).captures;
const before=[];
for(const [stall,id]of Object.entries(hero)){
 const source=captures.find(c=>c.id===id),dest=`${out}/baseline/captures/${stall}-prior-audit.jpg`;
 fs.copyFileSync(`${audit}/${source.path}`,dest);
 before.push({stall,id,path:path.relative(out,dest).replaceAll('\\','/'),sourceAudit:audit,original:source.path,capturedAt:source.sample?.at,viewport:source.viewport,camera:source.sample?.camera,progress:source.progress,sha256:crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex'),comparison:'Actual prior local-build render, before this architectural implementation. New diagnostic/reference views are separately framed; do not treat different cameras/viewport sizes as pixel-match evidence.'});
}
fs.writeFileSync(`${out}/BEFORE_MANIFEST.json`,JSON.stringify(before,null,2));
console.log(JSON.stringify({references:referenceManifest.length,before:before.length}));
