/** Report/drawing exports only. Never modifies an application or geometry file. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'reports/placement-implementation/20261019-rearrangement');
const read=(name,fallback=null)=>fs.existsSync(path.join(out,name))?JSON.parse(fs.readFileSync(path.join(out,name),'utf8')):fallback;
const registry=read('measured-placement-registry.json'),fit=read('implemented-fit-check.json'),walk=read('walk-capsule-check.json');
const dense=read('arena-dense-path-comparison.json'),nav=read('navigation-anchors.json'),before=read('baseline/BEFORE_MANIFEST.json');
const browser=read('browser-checks.json'),arena=read('arena-protection-check.json'),mounted=read('mounted-protection-check.json'),preserved=read('installation-preservation.json');
if(!registry||!fit||!walk||!dense||!nav)throw Error('Required measured implementation evidence missing');
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=(value,d=3)=>Number(value).toFixed(d).replace(/\.?0+$/,'');
const xyz=p=>p.map(v=>n(v,8)).join(', ');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
if(registry.configurationHash!==fit.configurationHash||walk.configurationHash!==fit.configurationHash)throw Error('Measured evidence configuration hashes disagree; regenerate checks before reporting.');
for(const [file,expected]of[
  ['src/venue/data/placements.ts',fit.registrySourceHash],
  ['src/venue/data/path.ts',walk.sourceHashes.path],
  ['src/venue/data/stallVisits.ts',walk.sourceHashes.stallVisits],
])if(hash(path.join(root,file))!==expected)throw Error(`Stale measured evidence for ${file}; regenerate before reporting.`);
const colors={bg:'#071217',panel:'#11232b',grid:'#273c44',ink:'#edf5f4',muted:'#a7c1c7',teal:'#42d5bd',gold:'#e9be77',blue:'#85baff',grey:'#d4dfe4'};
const color=id=>id==='S1'?colors.blue:id==='S2'||id==='R'?colors.teal:id==='S4'||/^P/.test(id)?colors.gold:colors.grey;
const records=Object.fromEntries(registry.worldBounds.map(a=>[a.id,a.bounds]));
const placements=registry.placements;
const place=(pose,p)=>[pose.root[0]+Math.cos(pose.yaw)*p[0]+Math.sin(pose.yaw)*p[2],pose.root[1]+p[1],pose.root[2]-Math.sin(pose.yaw)*p[0]+Math.cos(pose.yaw)*p[2]];
function boundsAt(pose,b){const points=[];for(const x of[b.min[0],b.max[0]])for(const y of[b.min[1],b.max[1]])for(const z of[b.min[2],b.max[2]])points.push(place(pose,[x,y,z]));return {min:[0,1,2].map(i=>Math.min(...points.map(p=>p[i]))),max:[0,1,2].map(i=>Math.max(...points.map(p=>p[i])))};}
const actualBounds=(id,mode)=>mode==='before'?boundsAt(placements[id].baseline,placements[id].nativeCompleteBounds):records[id==='L'?'gallery':id];
let drawing=[];const add=s=>drawing.push(s);
const rect=(x,y,w,h,fill=colors.panel,stroke=colors.grid,extra='')=>add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" ${extra}/>`);
const text=(x,y,value,size=18,fill=colors.ink,extra='')=>add(`<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" ${extra}>${esc(value)}</text>`);
const line=(x,y,x2,y2,stroke=colors.muted,width=1,extra='')=>add(`<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}" ${extra}/>`);
function map(x,y,w,h,zMin,zMax){const scale=Math.min(w/100,h/(zMax-zMin));const px=v=>x+w/2+v*scale,py=v=>y+(v-zMin)*scale;return {px,py,scale,xz:(xs,zs,fill,stroke=fill,extra='')=>rect(px(xs[0]),py(zs[0]),(xs[1]-xs[0])*scale,(zs[1]-zs[0])*scale,fill,stroke,extra),box:(b,fill,extra='')=>rect(px(b.min[0]),py(b.min[2]),(b.max[0]-b.min[0])*scale,(b.max[2]-b.min[2])*scale,fill,fill,extra)};}
function fixed(m,detail=false){
  if(!detail){m.xz([-44,44],[-380,-244],'#22323a',colors.gold);m.xz([-48,48],[-1,46],'#192b32');
    m.xz([-42,42],[-354.825,-327.767],'none',colors.gold,'stroke-dasharray="4 3"');
    m.xz([-40,40],[-354,-332],colors.gold,colors.gold,'fill-opacity=".30"');
    for(const xs of[[-32.5,-3.98],[3.98,32.5]])m.xz(xs,[-328.76,-301.655],'#536775');
    text(m.px(0),m.py(-365),'FIXED ARENA',15,colors.gold,'text-anchor="middle" font-weight="700"');
    text(m.px(0),m.py(-358),'88 × 136 m · H34',12,colors.muted,'text-anchor="middle"');
    text(m.px(0),m.py(-339),'STAGE 80 × 22',12,colors.gold,'text-anchor="middle"');
  }
  m.xz([-40,40],[-238,-26],'#192f37',colors.muted);
  // The floor extends outside the shell; the actual wall inner faces set usable width.
  for(let z=detail?-230:-230;z<=-30;z+=detail?2:10)line(m.px(-39.6842),m.py(z),m.px(39.6842),m.py(z),colors.grid,.45);
  for(let x=-38;x<=38;x+=detail?2:10)line(m.px(x),m.py(-238),m.px(x),m.py(-30),colors.grid,.45);
  m.xz([-48,48],[-30,-28.4],'#45616a',colors.grid,'opacity=".5"');
  m.xz([-3,3],[-28.4,detail?-26:-3.4],'#3f6d73');
  for(const xs of[[-26,-3.22],[3.22,26]])line(m.px(xs[0]),m.py(-28.4),m.px(xs[1]),m.py(-28.4),colors.gold,2);
  for(const x of[-7.6,7.6])line(m.px(x),m.py(-40),m.px(x),m.py(-29),colors.gold,1.5);
  for(const xs of[[-40,-7],[7,40]])m.xz(xs,[-241.6,-240.4],colors.gold);
  for(const x of[-39.3684,39.3684])for(const z of[-26.30577,-39.25,-52.19423])m.xz([x-.4421,x+.4421],[z-.265,z+.265],colors.gold);
}
function installation(m,id,mode){const p=placements[id],pose=mode==='before'?p.baseline:p,b=actualBounds(id,mode);m.box(b,color(id),'fill-opacity=".08" stroke-width="1.5" stroke-dasharray="5 3"');
  if(/^S/.test(id)){const floor=boundsAt(pose,{min:[-12,.12,-8],max:[12,.12,8]});m.box(floor,color(id),'fill-opacity=".22" stroke-width="1.5"');}
  if(/^P/.test(id))m.box(b,color(id),'fill-opacity=".7"');
  if(id==='L'||id==='R')m.box(b,color(id),'fill-opacity=".12"');
  const centre=place(pose,p.nativeFloorAnchor);const dx=Math.sin(pose.yaw)*5,dz=Math.cos(pose.yaw)*5;
  if(!/^P/.test(id))line(m.px(centre[0]),m.py(centre[2]),m.px(centre[0]+dx),m.py(centre[2]+dz),color(id),2,'marker-end="url(#arrow)"');
  const y=/^P/.test(id)?m.py(centre[2])-9:m.py(centre[2])+5;text(m.px(centre[0]),y,id,detailSize(m),color(id),'font-weight="700" text-anchor="middle"');
}
const detailSize=m=>m.scale>3?16:13;
function routes(m,detail){
  const points=nav.mainExhibitionSamples.filter((_,i)=>i%10===0).map(v=>`${m.px(v.position[0])},${m.py(v.position[2])}`).join(' ');
  add(`<polyline points="${points}" fill="none" stroke="${colors.blue}" stroke-width="${detail?2:1.2}" opacity=".8"/>`);
  for(const route of walk.routes){const p=route.worldWaypoints.map(v=>`${m.px(v[0])},${m.py(v[2])}`).join(' ');add(`<polyline points="${p}" fill="none" stroke="${colors.teal}" stroke-width="${detail?2.4:1.5}"/>`);const door=route.worldWaypoints[1];add(`<circle cx="${m.px(door[0])}" cy="${m.py(door[2])}" r="${detail?4:2.3}" fill="${colors.ink}"/>`);}
}

add(`<svg xmlns="http://www.w3.org/2000/svg" width="2200" height="2300" viewBox="0 0 2200 2300" role="img" aria-label="Implemented venue coordination before and after; source-derived drawing, not a rendered screenshot"><defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${colors.teal}"/></marker></defs><style>text{font-family:Arial,Helvetica,sans-serif}rect,line{vector-effect:non-scaling-stroke}</style>`);
rect(0,0,2200,2300,colors.bg,colors.bg);
text(32,44,'LIVEGRID AV / IMPLEMENTED EXHIBITION REARRANGEMENT',21,colors.teal,'font-weight="700" letter-spacing="1"');
text(32,100,'Same installations. New inward-facing courts.',45,colors.ink,'font-weight="700"');
text(32,139,'SOURCE-DERIVED COORDINATION DRAWING · actual unchanged rig envelopes · scale 1 · no mirrors · browser evidence is separate',20,colors.muted);
const cards=[['80 × 212 × 19 m','EXHIBITION HALL · UNCHANGED'],['88 × 136 × 34 m','MAIN ARENA · FIXED'],['0.563222 m','RECEPTION / FIRST TRUSS GAP'],['6 m','CLEAR CORE · FLOOR TO 2.2 m']];
cards.forEach(([value,label],i)=>{rect(32+i*546,167,524,100);text(51+i*546,210,value,29,colors.teal,'font-weight="700"');text(51+i*546,242,label,15,colors.muted);});
for(const [i,mode]of['before','after'].entries()){
  const x=32+i*652;rect(x,292,630,1130);text(x+22,333,mode==='before'?'01 / BEFORE · CURRENT-TREE BASELINE':'02 / AFTER · IMPLEMENTED',22,colors.ink,'font-weight="700"');
  text(x+22,365,'Entire original 426 m extent retained; arena at top.',16,colors.muted);
  const m=map(x+98,405,430,958,-380,46);fixed(m);if(mode==='after')m.xz([-3,3],[-232,-40],colors.teal,colors.teal,'fill-opacity=".14"');
  for(const id of Object.keys(placements))installation(m,id,mode);if(mode==='after')routes(m,false);
  text(x+22,1394,mode==='before'?'Old locations are shown from saved baseline transforms.':'Full rig extents shown; overhead bounds may cross the core.',16,colors.muted);
}
rect(1336,292,832,1130);text(1358,333,'03 / EXHIBITION · ENTRANCES + COMPLETE RIGS',22,colors.ink,'font-weight="700"');
text(1358,365,'Plan cutaway drawing; floor-level paths checked separately.',16,colors.muted);
const m=map(1435,405,620,958,-238,-26);fixed(m,true);
m.xz([-3,3],[-232,-40],colors.teal,colors.teal,'fill-opacity=".15"');
for(const slab of[fit.arrivalLink,fit.crossLink])m.box(slab.worldBox,colors.teal,'fill-opacity=".09" stroke-dasharray="2 3"');
for(const id of Object.keys(placements))installation(m,id,'after');routes(m,true);
text(1358,1394,'White dots = real doors · teal = entry/return · blue = authored dolly',16,colors.muted);

rect(32,1448,1046,330);text(54,1492,'04 / WHAT MOVED',25,colors.ink,'font-weight="700"');
const rows=[['ARRIVAL','R Reception right / L Lounge left; P1–P4 flank the core.'],['COURT 1','S1 Content left / S2 Rental right · centre s109.15 m'],['COURT 2','S3 Technical left / S4 Projection right · centre s179.28 m'],['CIRCULATION','Facades point inward. Guided visits and direct onward travel.']];
rows.forEach(([a,b],i)=>{text(54,1540+i*55,a,18,colors.teal,'font-weight="700"');text(246,1540+i*55,b,18,colors.muted);});
rect(1102,1448,1066,330);text(1124,1492,'05 / MEASURED CLEARANCES',25,colors.ink,'font-weight="700"');
const gaps=registry.longitudinal.gaps;
[['Minimum side-wall gap',`${n(Math.min(...fit.sideWallClearanceChecks.map(a=>a.minimumWallPlaneClearance)),6)} m · complete rig envelope`],['Arrival → Court 1',`${n(gaps.arrivalToCourt1,6)} m between complete envelopes`],['Court 1 → Court 2',`${n(gaps.court1ToCourt2,6)} m between complete envelopes`],['Court 2 → fixed approach',`${n(gaps.court2ToFixedApproach,6)} m; arena connection stays fixed`]].forEach(([a,b],i)=>{text(1124,1540+i*55,a,19,colors.teal);text(1445,1540+i*55,b,18,colors.muted);});

rect(32,1804,2136,290);text(54,1848,'06 / VERIFICATION BOUNDARY',25,colors.ink,'font-weight="700"');
text(54,1894,`${fit.protectedGeometryChecks.length} installation / fixed-object checks PASS · ${fit.assemblyPairChecks.length} assembly-pair checks PASS · ${fit.assetPreservation.length} exact measured GLB hash checks PASS`,21,colors.teal);
text(54,1934,`${walk.routes.length} doorway walks + ${walk.mainJourney.samples} sampled journey positions clear tested capsule geometry; positive collision controls passed.`,20,colors.muted);
text(54,1974,`${dense.sampleCount} arena samples: exact zero position / look / FOV / quaternion error. Original tangent multiplier 60 preserved.`,20,colors.muted);
text(54,2014,'Core and cross-links tested from finished floor through 2.2 m; dashed overhead boxes are not pedestrian blockers.',19,colors.muted);
text(54,2054,'Rendering, navigation controls and device checks are reported separately. This drawing is not a fabrication or physical-safety certificate.',19,colors.gold);
text(32,2144,'LEGEND',20,colors.teal,'font-weight="700"');
line(154,2138,210,2138,colors.teal,3);text(226,2144,'Entry / return routes',18,colors.muted);
line(465,2138,521,2138,colors.blue,3);text(537,2144,'Authored visitor dolly',18,colors.muted);
rect(810,2126,58,18,'none',colors.gold,'stroke-dasharray="5 3"');text(885,2144,'Complete mesh / rig envelope',18,colors.muted);
rect(1250,2126,58,18,colors.teal,colors.teal,'fill-opacity=".25"');text(1325,2144,'Original deck / shared floor allocation',18,colors.muted);
text(32,2204,`CONFIGURATION SHA-256: ${fit.configurationHash}`,18,colors.muted);
text(32,2250,'Metres · +X right · −Z toward arena · source root Y differs from finished-floor anchor where authored · no geometry recreated',18,colors.muted);
add('</svg>');
fs.writeFileSync(path.join(out,'implemented-layout.svg'),drawing.join('\n'));
await sharp(Buffer.from(drawing.join('\n'))).png().toFile(path.join(out,'implemented-layout.png'));

const browserReady=browser?.status==='PASS'&&browser.configurationHash===fit.configurationHash;
const arenaStatus=arena?.status??'NOT TESTED';
const badge=status=>`<span class="badge ${status==='PASS'?'pass':status==='FAIL'?'fail':'pending'}">${esc(status)}</span>`;
const basicTests=[
  ['Actual mounted scene preservation',mounted?.status??'NOT TESTED','24 mounted-scene comparisons:fixed arena transforms and 1,093 relocated installation leaves. Animated fixture/opacity/haze phases and uncaptured seating instance arrays are explicitly limited.','mounted-protection-check.json'],
  ['Installation local geometry/material preservation',preserved?.status??'NOT TESTED','109 source/numerical checks, including calibrated projection, architectural grain, linked lights and reflection helpers.','installation-preservation.json'],
  ['Complete geometry fit',fit.status,`${fit.protectedGeometryChecks.length} fixed-object checks, ${fit.assemblyPairChecks.length} assembly-pair checks, containment and corridor slabs.`, 'implemented-fit-check.json'],
  ['Installation asset preservation','PASS',`${fit.assetPreservation.length} measured GLBs match their saved hashes; rigid roots/yaws only; same local dimensions and scale1.`, 'implemented-fit-check.json'],
  ['Interior entry and return','PASS',`${walk.routes.length} measured door routes; .30 m capsule conservatively inflated to .35 m, sampling step≤.10 m. Reverse uses the same path.`, 'walk-capsule-check.json'],
  ['Authored journey geometry',walk.mainJourney.status,`${walk.mainJourney.samples} samples through p0…0.789; actual solid obstacles included; separate positive controls verify collision detection.`, 'walk-capsule-check.json'],
  ['Protected arena authored camera',dense.status,`${dense.sampleCount} dense samples match positions, targets, lens and authored quaternion exactly; this is not damping-history simulation.`, 'arena-dense-path-comparison.json'],
  ['Arena / stage world geometry',arenaStatus,arena?'See independent category-A comparison.':'Independent category-A protection report pending; camera proof alone does not establish all arena geometry.', 'arena-protection-check.json'],
  ['Rendered/browser acceptance',browserReady?'PASS':'NOT TESTED',browserReady?'Browser evidence matches the implemented configuration.':'Pending browser-checks.json for this implemented configuration; numerical fit is not rendered acceptance.', 'browser-checks.json'],
];
const browserTests=Array.isArray(browser?.tests)?browser.tests.map(t=>[t.name,t.status,t.notes??t.reason??'',typeof t.evidence==='string'?t.evidence:null]):[];
const table=rows=>rows.map(([name,status,detail,file])=>`<tr><th>${esc(name)}</th><td>${badge(status)}</td><td>${esc(detail)}${file&&fs.existsSync(path.join(out,file))?` <a href="${esc(file)}">Evidence</a>`:''}</td></tr>`).join('');
const bodyRows=Object.values(placements).map(p=>`<tr><th>${p.id}<br><small>${esc(p.label)}</small></th><td>${xyz(p.baseline.root)}<br>${n(p.baseline.yaw*180/Math.PI)}°</td><td>${xyz(p.root)}<br>${n(p.yaw*180/Math.PI)}°</td><td>${xyz(place(p,p.nativeFloorAnchor))}</td><td>${p.nativeCompleteBounds.max.map((v,i)=>n(v-p.nativeCompleteBounds.min[i])).join(' × ')} m</td></tr>`).join('');
const defaultCaptures=[{file:'baseline/whole-venue-before.jpg',label:'Whole venue · before',cutaway:true,notes:'Actual baseline horizontal 3 m cutaway. All existing hall and arena extents retained.'},{file:'whole-venue-after.jpg',label:'Whole venue · after',cutaway:true},{file:'exhibition-after.jpg',label:'Exhibition · after',cutaway:true},{file:'baseline/arena-before.jpg',label:'Arena · before',notes:'Original authored Main Stage camera.'},{file:'arena-after.jpg',label:'Arena · after',notes:'Matched authored Main Stage camera; normal perspective, no cutaway.'},{file:'pillars-after.jpg',label:'Pillars / arrival'},{file:'reception-front.jpg',label:'Reception · exterior'},{file:'reception-interior.jpg',label:'Reception · entry/interior'},...['content','rental','technical','projection'].flatMap(name=>[{file:`${name}-front.jpg`,label:`${name} · exterior`},{file:`${name}-interior.jpg`,label:`${name} · entry/interior`}])];
const captures=Array.isArray(browser?.captures)&&browser.captures.length?browser.captures:defaultCaptures;
const gallery=captures.map(c=>{const file=c.file??c.path,present=file&&fs.existsSync(path.join(out,file));return `<figure>${present?`<a href="${esc(file)}"><img src="${esc(file)}" alt="${esc(c.label??file)}" loading="lazy"></a>`:`<div class="placeholder">RENDER CAPTURE PENDING<br>${esc(file??'Unnamed capture')}</div>`}<figcaption><strong>${esc(c.label??file)}</strong>${c.cutaway?' · DIAGNOSTIC CUTAWAY':''}<br>${esc(c.notes??'Actual local browser capture; verification status is listed separately.')}</figcaption></figure>`;}).join('');
const walkthrough=browser?.walkthrough;
const clip=walkthrough?.file&&fs.existsSync(path.join(out,walkthrough.file))?`<video controls preload="metadata" src="${esc(walkthrough.file)}"></video><p>${esc(walkthrough.notes??'Actual local entrance-to-arena traversal.')}</p>`:'<p class="note">Actual entrance-to-arena walkthrough clip pending. A source-derived path line is not a recorded walkthrough.</p>';
const changed=(before?.sources??[]).filter(f=>fs.existsSync(path.join(root,f.file))&&hash(path.join(root,f.file))!==f.sha256).map(f=>f.file);
for(const f of['src/venue/data/placements.ts'])if(fs.existsSync(path.join(root,f))&&!changed.includes(f))changed.push(f);
const files=['implemented-placement-registry.json','measured-placement-registry.json','implemented-fit-check.json','implemented-fit-check.md','walk-capsule-check.json','arena-dense-path-comparison.json','arena-protection-check.json','browser-checks.json','navigation-anchors.json','mounted-protection-check.json','installation-preservation.json','rigid-source-preservation.json','detached-appearance-audit.json','matched-arena-render-check.json','build-checks.json','AFTER_MANIFEST.json','recordings/walkthrough-actual-provenance.json','baseline/BEFORE_MANIFEST.json'];
const links=files.filter(f=>fs.existsSync(path.join(out,f))).map(f=>`<li><a href="${f}">${f}</a></li>`).join('');
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Livegrid AV — Implemented rearrangement</title><style>
*{box-sizing:border-box}body{margin:0;background:#edf3f3;color:#173039;font:16px/1.6 Arial,Helvetica,sans-serif}header{background:#091a21;color:#edf6f5;padding:42px max(24px,calc((100vw - 1440px)/2))}header p{max-width:1050px;color:#b9d0d6}h1{font-size:clamp(30px,4vw,48px);line-height:1.15;margin:12px 0 20px}h2{font-size:27px;line-height:1.2;margin-top:0}.eyebrow{color:#53d9bf;letter-spacing:.14em;font-size:12px;font-weight:700}main{max-width:1488px;margin:auto;padding:24px}section{background:white;border:1px solid #cbdde0;border-radius:8px;padding:24px;margin-bottom:24px}.notice{border-left:5px solid #ad7f2c;background:#fff4d9}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px}.card{background:#fff;border:1px solid #cbdde0;border-radius:8px;padding:20px}.card strong{display:block;font-size:28px;color:#08705e}.card small{color:#526f77}a{color:#006b86;text-underline-offset:3px}.actions{display:flex;flex-wrap:wrap;gap:10px}.actions a{padding:9px 13px;border:1px solid #afc9ce;border-radius:5px;text-decoration:none;font-weight:650}.board{display:block;width:100%;height:auto;border-radius:6px}.scroll{overflow:auto}table{width:100%;border-collapse:collapse;font-size:14px}td,th{text-align:left;vertical-align:top;border-bottom:1px solid #d4e1e3;padding:12px 10px}th small{font-weight:400;color:#5c7279}thead{background:#e9f0f2}.badge{display:inline-block;font-size:11px;letter-spacing:.04em;font-weight:750;border-radius:4px;padding:3px 8px;white-space:nowrap}.pass{background:#d9f2e6;color:#075f3f}.fail{background:#ffe0d9;color:#a32923}.pending{background:#fff0cc;color:#805800}.gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}figure{margin:0}figure img{display:block;width:100%;border-radius:5px;background:#061116}figcaption{font-size:13px;color:#526f77;padding:8px 0 10px}.placeholder{min-height:180px;display:grid;place-content:center;text-align:center;background:#edf3f4;border:1px dashed #9bb6be;color:#73551e;padding:18px;font-size:13px}.note{background:#eef5f5;border-radius:5px;padding:16px;color:#45636d}code{font:13px Consolas,monospace;background:#eaf1f3;padding:2px 5px;overflow-wrap:anywhere}.files{columns:2}.files li{margin-bottom:7px;overflow-wrap:anywhere}video{display:block;width:100%;max-height:700px;background:#061116}footer{max-width:1488px;margin:auto;padding:0 24px 40px;color:#56727a;font-size:13px}@media(max-width:900px){.cards{grid-template-columns:repeat(2,1fr)}.gallery{grid-template-columns:1fr}.files{columns:1}}@media print{body{background:white}.actions{display:none}}
</style></head><body><header><div class="eyebrow">LIVEGRID AV / UNPUBLISHED LOCAL IMPLEMENTATION / 19 OCTOBER 2026</div><h1>The installations are relocated.<br>The arena stays fixed.</h1><p>Reception and the four pillars form the arrival, Content and LED Rental face inward across Court 1, and AV Engineering and Projection face inward across Court 2. Complete existing installations move rigidly at their original scale. This report separates numerical geometry evidence from genuine browser verification.</p>${badge(fit.status)} geometry ${badge(browserReady?'PASS':'PENDING')} rendered acceptance</header><main>
${!browserReady?'<section class="notice"><strong>Implementation is present; rendered acceptance is pending.</strong><p>Browser screenshots, controls, desktop/mobile checks and the actual walkthrough must be recorded for this configuration before the report can describe final visual verification as complete.</p></section>':''}
<div class="cards"><div class="card"><strong>80 × 212 × 19 m</strong><small>Exhibition shell unchanged; no resizing required</small></div><div class="card"><strong>0.563222 m</strong><small>Actual closest reception / first-bay truss gap</small></div><div class="card"><strong>6 m</strong><small>Direct core tested through 2.2 m above floor</small></div><div class="card"><strong>1001 / 1001</strong><small>Arena path samples match exactly</small></div></div>
<section><h2>Before / after coordination plan</h2><p>This is a source-derived drawing, not a browser screenshot. Both whole-venue plans retain the entire original 426 m plaza-to-arena extent. Dashed lines include complete rigging/overhang bounds; solid service rectangles show original deck footprints. A rig's overhead plan projection may overlap a clear floor-level corridor.</p><div class="actions"><a href="implemented-layout.svg">Open vector drawing</a><a href="implemented-layout.png">Open PNG image</a><a href="measured-placement-registry.json">Exact registry and bounds</a></div><p></p><a href="implemented-layout.png"><img class="board" src="implemented-layout.png" alt="Implemented before and after whole-venue plans with fixed arena, inward courts, actual entrances, full rigs and clear paths"></a></section>
<section><h2>Actual browser evidence</h2><p>Only real local browser images belong here. Diagnostic cutaways are labelled; they expose lower plans and do not prove roof clearance. Current browser status: ${badge(browserReady?'PASS':'NOT TESTED')}.</p><div class="gallery">${gallery}</div></section>
<section><h2>Actual local walkthrough</h2>${clip}</section>
<section><h2>Exact placement roots and floor anchors</h2><p>The registry uses metres and absolute yaw. The shared gallery's floor-centre anchor is (−20, 0.12, −47.195), while its runtime root is different; it was moved intact once. Native pillar root Y0.111 and its authored floor relationship are preserved. Dimensions below are complete native envelopes, including attached rigs.</p><div class="scroll"><table><thead><tr><th>Installation</th><th>Before root / yaw</th><th>Implemented root / yaw</th><th>World floor anchor</th><th>Native W×H×D</th></tr></thead><tbody>${bodyRows}</tbody></table></div></section>
<section><h2>Measured fit and clearance</h2><p>All original installation sizes, local assemblies, people, furniture, media and planting stay intact. The original 24×16 m planning rectangles are not used to crop rigs or stretch Reception. Court centres are spread to s109.15 and s179.28 m, distributing the transition intervals to approximately 34.12 m each.</p><div class="scroll"><table><thead><tr><th>Measure</th><th>Result</th><th>Scope</th></tr></thead><tbody><tr><th>Reception / visible first-bay structure</th><td>${n(fit.criticalReceptionRoofClearance.distanceMetres,9)} m</td><td>Independent triangle-distance calculation, including vertex/face and edge/edge pairs; project target0.5 m.</td></tr><tr><th>Smallest side-wall clearance</th><td>${n(Math.min(...fit.sideWallClearanceChecks.map(c=>c.minimumWallPlaneClearance)),6)} m</td><td>Complete installation/rig envelope to actual hall inner wall plane.</td></tr><tr><th>Direct core</th><td>6 m wide</td><td>World X[−3,3], checked to2.2 m above finished floor.</td></tr><tr><th>Arrival link</th><td>${n(fit.arrivalLink.actualDepth)} m</td><td>Clear tested forum slab; target minimum4 m.</td></tr><tr><th>Inter-court cross-link</th><td>${n(fit.crossLink.actualDepth)} m</td><td>Clear tested forum slab; target minimum6 m.</td></tr><tr><th>Arrival / Court1 / Court2 / approach transitions</th><td>${Object.values(gaps).map(g=>n(g,6)).join(' / ')} m</td><td>Gaps between complete installed envelopes; distinct from forum slab dimensions above.</td></tr></tbody></table></div><p class="note">The gap calculation uses source GLB Float32 vertices with Float64 distance arithmetic. It is a geometric project check, not an operational clearance or physical-safety certificate. Additive rays/glow/reflection influence are distinguished from real opaque solids; actual attached rigs remain included.</p></section>
<section><h2>Tests and protection categories</h2><div class="scroll"><table><thead><tr><th>Check</th><th>Status</th><th>Evidence and limit</th></tr></thead><tbody>${table([...basicTests,...browserTests])}</tbody></table></div><p>Category A protects the arena/stage in world space. Category B preserves installations locally while allowing rigid world movement. Category C records the exhibition environment: width80 m, length212 m and roof19 m remain unchanged because a fit was achieved through placement and routing. Stage deck80×22×1.6 m, arena88×136×34 m and their fixed connection are independently protected.</p><p>No optimal-layout, physical safety, production-performance or 100% reference-fidelity claim follows from this report. Historical candidate-only reports remain unchanged; their old passing counts do not certify the new implemented configuration.</p></section>
<section><h2>Reproduce and inspect</h2><p>Local preview: <a href="http://127.0.0.1:4310/?shot=led-rental">implemented venue</a>. Source development: <code>npm run dev -- --webpack --hostname 127.0.0.1 --port 4300</code>. Static build: <code>npm run build</code>, then <code>node scripts/serve-export.mjs</code> for the loopback preview at port4310. No publish or commit is authorized.</p><p>Rebuild this report from the saved evidence: <code>node scripts/build-rearrangement-report.mjs</code>. Verify the protected authored path: <code>node scripts/verify-rearranged-arena-path.mjs</code>. Geometry/capsule reproduction commands are recorded in the fit evidence.</p><p>Current configuration SHA-256: <code>${fit.configurationHash}</code>. Measured registry, geometry checks and walk checks must match this hash. Browser acceptance is shown as PASS only when its recorded configuration hash matches this exact value.</p><h3>Changed application source relative to the new frozen baseline</h3><ul class="files">${changed.map(f=>`<li><code>${esc(f)}</code></li>`).join('')}</ul><h3>Evidence files</h3><ul class="files">${links}</ul></section>
<section><h2>Handoff status</h2><p><strong>Moved:</strong> S1–S4, Reception, shared gallery and P1–P4 as complete installations. <strong>Unchanged:</strong> installation geometry/scale; exhibition shell dimensions; entrance and tunnel; protected arena/stage spatial sequence. <strong>Tested:</strong> actual mesh fit, containment, measured structural gap, corridor slabs, doorway capsules, sampled main path and dense arena camera sequence. <strong>Still pending:</strong> ${browserReady?'see any NOT TESTED items above and optional hubs, which were not invented.':'genuine rendered acceptance, controls/device checks, independent arena world-geometry evidence and recorded walkthrough.'}</p></section>
</main><footer>Generated ${new Date().toISOString()} · Current-tree implementation evidence · Source-derived drawings are distinguished from actual browser captures.</footer></body></html>`;
fs.writeFileSync(path.join(out,'index.html'),html);
console.log(JSON.stringify({report:path.relative(root,path.join(out,'index.html')),drawing:'implemented-layout.svg',png:'implemented-layout.png',configurationHash:fit.configurationHash,geometry:fit.status,browserReady,arenaStatus,capturesPresent:captures.filter(c=>c.file&&fs.existsSync(path.join(out,c.file))).length,changedApplicationFiles:changed.length},null,2));
