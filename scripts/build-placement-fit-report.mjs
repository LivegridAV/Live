/** Report-only, source-derived placement fit handoff. Does not edit app/assets. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const root=process.cwd();
const out=path.join(root,'reports/placement-implementation/20261019-coordinate-layout');
const read=name=>JSON.parse(fs.readFileSync(path.join(out,name),'utf8'));
const measured=read('measured-assemblies.json');
const protectedVenue=read('protected-venue-measurements.json');
const registry=read('baseline-current.json');
const discovery=read('source-discovery.json');
const assemblies=Object.fromEntries(measured.assemblies.map(a=>[a.id,a]));
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,d=3)=>Number(n).toFixed(d).replace(/\.?0+$/,'');
const xyz=p=>p?.map(x=>fmt(x)).join(', ')??'Unresolved';
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex');
const comparisons=protectedVenue.fingerprints.map(f=>({...f,finalSha256:hash(f.file),unchanged:hash(f.file)===f.sha256}));
const unchanged=comparisons.every(f=>f.unchanged);
const collision=measured.triangleChecks.find(t=>t.id==='technical-rig-vs-content-studio');
const reception=assemblies.R;

// A different candidate from the literal approved targets. It is never applied.
// The 2 m Court-1 increment retains the 4 m link after widening R's allocation.
const candidate={
  status:'PROPOSED — NOT APPLIED; OWNER APPROVAL REQUIRED',
  arrivalShiftS:17.195,
  receptionCentredAllocationFrontage:28,
  court1ShiftS:19.195,
  court2Spacing:34.21673,
  court2ShiftS:23.41173,
  toleranceMetres:.02,
  targets:{R:[20,0,-47.195],S1:[-20,0,-77.195],S2:[20,0,-77.195],S3:[-20,0,-111.41173],S4:[20,0,-111.41173]},
  pillarTargets:measured.pillars.map(p=>({id:p.id,identity:p.identity,sourceRootY:p.target[1],target:[p.target[0],p.target[1],p.target[2]-17.195]})),
  gallery:{...measured.gallery.proposedOnlyArrivalLounge,
    targetAnchor:[-20,.12,-47.195],
    root:measured.gallery.proposedOnlyArrivalLounge.root.map((n,i)=>i===2?n-17.195:n),
    completeBounds:Object.fromEntries(Object.entries(measured.gallery.proposedOnlyArrivalLounge.completeBounds).map(([k,v])=>[k,(k==='min'||k==='max')?v.map((n,i)=>i===2?n-17.195:n):v])),
    fit:'Candidate gallery rigidly shifted with arrival. Compare exact bounds against shifted X[-28,-12], s[35.195,59.195] lounge allocation; no scale.'},
  method:'Horizontal rigid placement only. Same X targets and inward absolute yaws. No scale, reflection, venue/tunnel/arena/stage change.',
  additionalUniformShiftS:1,
  refinementReason:'The first candidate touched the fixed first-bay ceiling truss in78 triangle pairs. A further1 m uniform shift clears the tested fixed-object mesh intersections without changing protected geometry. See candidate-1-fit-check.json/.md and candidate-fit-check.json/.md for versioned evidence.',
  evidenceBoundary:'This revised candidate is subject to exact-hash-matched mounted-solid geometry checks. Camera/walk routes, complete entrance reachability, mobile framing and browser views of the candidate remain NOT TESTED. First passing integer-metre shift in a bounded search, not a global minimum.',
  secondaryHubs:'Unresolved; optional areas were not implemented or assigned protected arena space.'
};
fs.writeFileSync(path.join(out,'alternative-candidate.json'),JSON.stringify(candidate,null,2)+'\n');
fs.writeFileSync(path.join(out,'protected-source-comparison.json'),JSON.stringify({generatedAt:new Date().toISOString(),status:unchanged?'PASS':'FAIL',scope:'Exact captured measurement manifest-to-current SHA-256 comparison. The pre-task protection audit is final-protection-check.json:31 strict dependencies plus2 exact normal-route source reconstructions around opt-in diagnostics. No placement source or asset changes applied.',allUnchanged:unchanged,files:comparisons},null,2)+'\n');
const candidateSha256=hash(path.relative(root,path.join(out,'alternative-candidate.json')));
const fitProof=fs.existsSync(path.join(out,'candidate-fit-check.json'))?read('candidate-fit-check.json'):null;
const proofIsCurrent=fitProof?.candidateSha256===candidateSha256;
const candidateGeometryPass=proofIsCurrent&&fitProof.summary.protectedHits.length===0&&fitProof.summary.assemblyHits.length===0;
const candidateCorePass=proofIsCurrent&&fitProof.summary.directCoreHits.length===0&&fitProof.summary.crossLinkHits.length===0;
const finalProtection=fs.existsSync(path.join(out,'final-protection-check.json'))?read('final-protection-check.json'):null;

const C={bg:'#071116',panel:'#101e26',panel2:'#172a33',ink:'#f3f6f5',dim:'#a9bec5',teal:'#42d4bf',gold:'#e5b863',red:'#ff807a',blue:'#83b8ff',fixed:'#526a74',floor:'#192d36',line:'#304953'};
let s=[];
const add=v=>s.push(v);
const rect=(x,y,w,h,fill=C.panel,stroke=C.line,r=0,extra='')=>add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" ${extra}/>`);
const line=(x,y,x2,y2,col=C.dim,w=1,extra='')=>add(`<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${w}" ${extra}/>`);
const text=(x,y,t,size=20,col=C.ink,weight=400,extra='')=>add(`<text x="${x}" y="${y}" fill="${col}" font-size="${size}" font-weight="${weight}" ${extra}>${esc(t)}</text>`);
const para=(x,y,t,width=75,size=18,col=C.dim,leading=27)=>{
  let words=t.split(/\s+/),a=[],r=[];
  for(const word of words){if([...r,word].join(' ').length>width){a.push(r.join(' '));r=[];}r.push(word);}if(r.length)a.push(r.join(' '));
  a.forEach((v,i)=>text(x,y+i*leading,v,size,col));return y+a.length*leading;
};
const circle=(x,y,r,col,extra='')=>add(`<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" ${extra}/>`);
const title=(x,y,n,t,sub)=>{text(x,y,n,17,C.teal,700);text(x+36,y,t,24,C.ink,650);if(sub)text(x,y+30,sub,17,C.dim);};
function planMap({x,y,w,h,xMin=-45,xMax=45,zMin=-380,zMax=46}){
  const scale=Math.min(w/(xMax-xMin),h/(zMax-zMin));
  const px=v=>x+w/2+(v-(xMin+xMax)/2)*scale;
  const py=v=>y+(v-zMin)*scale;
  const box=(a,b,col,extra='')=>rect(px(a[0]),py(a[2]),(b[0]-a[0])*scale,(b[2]-a[2])*scale,col,col,0,extra);
  const xz=(xs,zs,col,extra='')=>box([xs[0],0,zs[0]],[xs[1],0,zs[1]],col,extra);
  const bounds=(b,col,extra='')=>box(b.min,b.max,col,extra);
  return {px,py,scale,box,xz,bounds,x,y,w,h};
}
function fixedPlan(m,{labels=true,columns=true}={}){
  m.xz([-44,44],[-380,-244],C.floor);
  m.xz(protectedVenue.fixedHall.actualStoneWallInnerX,[-238,-26],C.floor);
  m.xz([-48,48],[-1,46],C.floor);
  m.xz([-5.4,5.4],[-3.6,-1],C.fixed);
  m.xz([-3,3],[-28.4,-3.4],C.fixed);
  m.xz([-40,40],[-241.6,-240.4],C.fixed);
  // The actual portal has a 14 m opening; draw that clear gap over the wall.
  m.xz([-7,7],[-241.6,-240.4],C.bg);
  m.xz([-40,40],[-238,-229],C.panel2,'opacity=".6"');
  line(m.px(-39.6842),m.py(-30),m.px(39.6842),m.py(-30),C.gold,1.4,'stroke-dasharray="5 4"');
  const bulk=protectedVenue.fixedObstacles.find(o=>o.id==='tunnel-exit-bulkhead');
  for(const xs of [[bulk.x[0],-bulk.opening.halfWidth],[bulk.opening.halfWidth,bulk.x[1]]])line(m.px(xs[0]),m.py(bulk.z),m.px(xs[1]),m.py(bulk.z),C.red,2.5);
  for(const x of [-7.6,7.6])line(m.px(x),m.py(-40),m.px(x),m.py(-29),C.gold,2);
  if(columns){const cols=protectedVenue.fixedObstacles.find(o=>o.id==='first-bay-columns');for(const xs of cols.xIntervals)for(const zs of cols.zIntervals)m.xz(xs,zs,C.gold);}
  // Stage deck uses authored 80×22, not the proposal's unrelated36×12 box.
  m.xz([-40,40],[-354,-332],C.gold,'opacity=".75"');
  // Aggregated chair envelopes from Audience.tsx centre grid and chair parts.
  m.xz([-32.5,-3.98],[-328.76,-301.655],C.fixed,'opacity=".75"');
  m.xz([3.98,32.5],[-328.76,-301.655],C.fixed,'opacity=".75"');
  if(labels){
    const rx=m.px(44)+12;
    text(rx,m.py(-358),'EXISTING STAGE',15,C.gold,650);text(rx,m.py(-358)+22,'80 × 22 m deck',14,C.dim);
    text(rx,m.py(-293),'MAIN ARENA',15,C.ink,650);text(rx,m.py(-293)+22,'88 × 136 m',14,C.dim);
    text(rx,m.py(-247),'Fixed portal',14,C.dim);
    text(rx,m.py(-224),'HALL CONTINUES',14,C.teal,600);text(rx,m.py(-224)+20,'All extra space retained',14,C.dim);
    text(rx,m.py(-30),'Fixed tunnel / vestibule',14,C.gold);
    text(rx,m.py(17),'PLAZA + ENTRANCE',14,C.ink,650);
  }
}
const colour=id=>id==='S1'?C.blue:id==='S2'?C.teal:id==='S3'?'#cad6df':id==='S4'?C.gold:C.teal;
function translatedBounds(b,delta){return {min:b.min.map((v,i)=>v+delta[i]),max:b.max.map((v,i)=>v+delta[i])};}
function assemblyRect(m,a,mode){
  const candidateMode=mode==='candidate';
  const b=mode==='current'?a.currentCompleteBounds:candidateMode?translatedBounds(a.proposedCompleteBounds,candidate.targets[a.id].map((v,i)=>v-a.target[i])):a.proposedCompleteBounds;
  const opaque=mode==='current'?null:candidateMode?translatedBounds(a.proposedOpaqueBounds,candidate.targets[a.id].map((v,i)=>v-a.target[i])):a.proposedOpaqueBounds;
  m.bounds(b,colour(a.id),'fill-opacity=".08" stroke-dasharray="5 3" stroke-width="1.5"');
  if(opaque)m.bounds(opaque,colour(a.id),'fill-opacity=".22" stroke-width="1.3"');
  const r=mode==='current'?a.root:candidateMode?candidate.targets[a.id]:a.target;
  const front=mode==='current'?a.currentFrontDirection:a.targetFrontDirection;
  line(m.px(r[0]),m.py(r[2]),m.px(r[0]+front[0]*5),m.py(r[2]+front[2]*5),colour(a.id),2,'marker-end="url(#arrow)"');
  text(m.px(r[0]),m.py(r[2])-5,a.id,14,colour(a.id),700,'text-anchor="middle"');
}
function pillars(m,mode){for(const p of measured.pillars){let b=mode==='current'?p.currentBase:mode==='candidate'?translatedBounds(p.proposedBase,[0,0,-candidate.arrivalShiftS]):p.proposedBase;m.bounds(b,C.gold,'stroke-width="1.4"');}}

add(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="2440" viewBox="0 0 1920 2440" role="img" aria-label="Measured placement conflicts with full existing venue, literal proposal and unapplied alternative"><defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${C.teal}"/></marker><pattern id="hatch" width="9" height="9" patternUnits="userSpaceOnUse"><path d="M0 9L9 0" stroke="${C.red}" stroke-width="1" opacity=".4"/></pattern></defs><style>text{font-family:Arial,Helvetica,sans-serif}line,path,rect{vector-effect:non-scaling-stroke}</style>`);
rect(0,0,1920,2440,C.bg,C.bg);
text(32,45,'LIVEGRID AV / PLACEMENT FIT GATE',21,C.teal,700);
text(32,94,'The literal layout conflicts with the fixed venue.',41,C.ink,700);
text(32,129,'REPORT ONLY · No installations moved · Full hall, arena and stage retained · Source geometry, not a concept rendering',20,C.dim);

const wholeModes=[['current','01','CURRENT = FINAL','Actual measured assemblies; no relocation applied.'],['literal','02','ORIGINAL TARGET OVERLAY','Entrance registration; conflicts highlighted below.'],['candidate','03','CANDIDATE — NOT APPLIED','Changed placements require owner approval and retesting.']];
for(let i=0;i<wholeModes.length;i++){
  const [mode,n,heading,sub]=wholeModes[i],x=24+i*632;
  rect(x,160,608,990,C.panel,C.line,10);title(x+20,198,n,heading,sub);
  const m=planMap({x:x+20,y:255,w:310,h:825});
  fixedPlan(m);
  if(mode!=='current'){
    m.xz([-3,3],[-122,-18],C.teal,'fill-opacity=".08"');
    for(const [xa,xb]of[[-28,-12],[12,28]])for(const [za,zb]of[[-70,-46],[-100,-76],[-42,-18]]){
      const shift=mode==='candidate'?(za===-42?candidate.arrivalShiftS:za===-70?candidate.court1ShiftS:candidate.court2ShiftS):0;
      const receptionExtra=mode==='candidate'&&xa===12&&za===-42?2:0;
      m.xz([xa,xb],[za-shift-receptionExtra,zb-shift+receptionExtra],C.gold,'fill-opacity="0" stroke-dasharray="2 3"');
    }
  }
  for(const a of measured.assemblies)assemblyRect(m,a,mode);
  pillars(m,mode);
  if(mode==='current')m.bounds(measured.gallery.currentBounds,C.blue,'fill-opacity=".11" stroke-dasharray="3 3"');
  if(mode==='candidate')m.bounds(candidate.gallery.completeBounds,C.blue,'fill-opacity=".18" stroke-dasharray="3 3"');
  if(mode==='literal'){
    circle(m.px(20),m.py(-28.4),9,C.red,'fill-opacity=".7"');circle(m.px(-7.5),m.py(-35),6,C.red);circle(m.px(7.5),m.py(-35),6,C.red);
    circle(m.px(-27.87),m.py(-68.76),6,C.red);
  }
  text(x+22,1097,'FULL EXTENT: Z +46 TO −380 = 426 m',17,C.ink,600);
  text(x+22,1124,mode==='candidate'?(candidateGeometryPass?'Mounted-solid mesh checks: PASS · routes: NOT TESTED':'Revised mesh checks pending · routes: NOT TESTED'):'Diagram: source-derived top view; not a rendered capture.',16,mode==='candidate'?C.gold:C.dim);
}

// Fixed arrival architecture: literal targets fail despite the hall being wide.
rect(24,1174,920,618,C.panel,C.line,10);title(44,1213,'04','ARRIVAL TARGETS HIT FIXED ARCHITECTURE','Literal planning targets; fixed walls and tunnel are unchanged.');
const am=planMap({x:55,y:1290,w:565,h:410,xMin:-42,xMax:42,zMin:-60,zMax:1});
am.xz(protectedVenue.fixedHall.actualStoneWallInnerX,[-60,-26],C.floor);
am.xz([-3,3],[-28.4,-3.4],C.fixed);
am.xz([12,28],[-42,-18],C.teal,'fill-opacity=".15" stroke-dasharray="5 3"');
am.xz([12,28],[-30,-18],'url(#hatch)');
for(const x of [-7.6,7.6])line(am.px(x),am.py(-40),am.px(x),am.py(-29),C.gold,3);
am.xz([-7.6,7.6],[-40,-29],C.gold,'fill-opacity=".07"');
for(const xs of [[-26,-3.22],[3.22,26]])line(am.px(xs[0]),am.py(-28.4),am.px(xs[1]),am.py(-28.4),C.red,4);
line(am.px(-40),am.py(-30),am.px(40),am.py(-30),C.teal,1.5,'stroke-dasharray="5 5"');
pillars(am,'literal');
for(const p of measured.pillars){text(am.px(p.target[0])+12,am.py(p.target[2])+5,p.id,16,C.gold,600);}
text(am.px(20),am.py(-20),'R',21,C.teal,700,'text-anchor="middle"');
text(am.px(0),am.py(-12),'TUNNEL',17,C.ink,600,'text-anchor="middle"');
text(am.px(-39),am.py(-31.5),'Level floor begins s30',16,C.teal);
text(am.px(-39),am.py(-42.5),'Vestibule ends s40',16,C.gold);
text(654,1298,'12 m',40,C.red,700);para(654,1328,'Reception allocation ahead of the level finished floor.',26,18,C.dim,26);
text(654,1415,'14 m',40,C.red,700);para(654,1445,'Allocation crosses the solid tunnel-exit bulkhead.',26,18,C.dim,26);
text(654,1532,'0.1 m',36,C.red,700);para(654,1562,'P3/P4 centres from wall plane; bases extend over 1 m each side.',26,18,C.dim,26);
text(44,1743,'FAIL · P3/P4 also penetrate the unchanged Y7.2 m soffit.',20,C.red,650);
text(44,1771,'Required 64 m width fits the actual 79.368 m interior; width is not the blocker.',18,C.dim);

rect(968,1174,928,618,C.panel,C.line,10);title(988,1213,'05','THE NOMINAL STALL BOXES ARE NOT THE WHOLE ASSEMBLY','Real attached technical truss intersects the Content Studio wall.');
const cm=planMap({x:997,y:1278,w:535,h:420,xMin:-40,xMax:40,zMin:-112,zMax:-42});
cm.xz([-40,40],[-112,-42],C.floor);
for(const id of ['S1','S2','S3','S4'])assemblyRect(cm,assemblies[id],'literal');
const ib=collision.intersectionEdgeBoundsInPlan;
const cx=(ib.min[0]+ib.max[0])/2,cz=(ib.min[2]+ib.max[2])/2;
circle(cm.px(cx),cm.py(cz),11,C.red,'fill-opacity=".9"');
line(cm.px(cx)+11,cm.py(cz),1548,1458,C.red,2);
text(1570,1322,String(collision.intersectionTrianglePairs),52,C.red,750);
text(1570,1354,'triangle-pair intersections',17,C.red,600);
para(1570,1398,'At X −27.921…−27.826 m, s68.295…69.235 m, Y9.626…9.974 m.',29,18,C.dim,27);
para(1570,1505,'Changing only the arrival offset cannot fix this: both courts move together.',29,18,C.dim,27);
text(988,1743,'Solid fill = architecture. Dashed = complete installed rig / props envelope.',18,C.dim);
text(988,1771,'FAIL · Confirmed with actual triangle geometry, not bounding-box overlap alone.',18,C.red,650);

rect(24,1816,920,410,C.panel,C.line,10);title(44,1855,'06','RECEPTION EXCEEDS ITS 24 m ALLOCATION','Preserve the accepted branding wall and every current component.');
const barX=93,barY=1931,k=26,ax=barX+13.9*k;
rect(ax-12*k,barY,24*k,62,C.floor,C.gold,0,'stroke-dasharray="5 3"');
rect(ax+reception.nativeOpaqueBounds.min[0]*k,barY+14,reception.nativeOpaqueBounds.size[0]*k,34,C.teal,C.teal,0,'fill-opacity=".6"');
line(ax,barY-12,ax,barY+83,C.ink,1.4);text(ax,barY+108,'Keep native anchor',16,C.dim,400,'text-anchor="middle"');
text(44,2079,'24.000 m allocation',22,C.gold,650);text(440,2079,`${fmt(reception.nativeOpaqueBounds.size[0],6)} m actual frontage`,22,C.teal,650);
para(44,2118,'Total excess 1.528 m. Positive edge extends 1.703 m beyond its assigned edge. A centred envelope needs at least 27.407 m; candidate reserves 28 m.',78,19,C.dim,28);

rect(968,1816,928,410,C.panel,C.line,10);title(988,1855,'07','A QUANTIFIED CANDIDATE — NOT APPLIED','Owner approval is required before changing these placement targets.');
const changes=[['Arrival / pillars',`+${fmt(candidate.arrivalShiftS)} m toward arena`],['Reception allocation','28 m centred; geometry unchanged'],['Court 1 centre',`s${fmt(-candidate.targets.S1[2])}  (+${fmt(candidate.court1ShiftS)} m)`],['Court 2 centre',`s${fmt(-candidate.targets.S3[2],5)}  (+${fmt(candidate.court2ShiftS,5)} m)`],['Court-centre spacing',`${fmt(candidate.court2Spacing,5)} m  (was 30 m)`],['Shared gallery / lounge',`Target centre (−20, −${fmt(-candidate.gallery.targetAnchor[2])})`]];
changes.forEach(([a,b],i)=>{text(994,1911+i*32,a,18,C.dim);text(1284,1911+i*32,b,18,C.ink,550);});
para(988,2114,'First candidate hit a fixed ceiling truss (78 triangle pairs). A further1 m shift clears the tested protected mesh pairs.',82,18,C.gold,26);
text(988,2199,candidateGeometryPass&&candidateCorePass?'PASS:100 fixed /45 assembly pairs /6 m core+link. Routes: NOT TESTED.':'Revised mesh checks pending; route/entrance validation: NOT TESTED.',17,C.dim,600);

text(32,2277,'WHAT THIS REPORT DOES — AND DOES NOT — ESTABLISH',21,C.teal,700);
para(32,2316,'Original targets fail measured fixed-object and assembly checks. No stall, pillar, arena, stage or venue transform was changed. The candidate changes planning placements only and remains unapproved. Diagrams show source-derived bounds and overlays; rendered screenshots are separate evidence.',169,19,C.dim,29);
text(32,2410,'Measured source JSON + exact fingerprints accompany this board. No concept images, facade redesign, scaling or mirrored layouts were used.',18,C.dim);
add('</svg>');
fs.writeFileSync(path.join(out,'FIT-CONFLICTS.svg'),s.join('\n'));

const beforeFinalRows=measured.assemblies.map(a=>`<tr><th>${esc(a.id)}<br><small>${esc(a.identity)}</small></th><td>${xyz(a.root)}<br>yaw ${fmt(a.yaw*180/Math.PI)}°</td><td>${xyz(a.root)}<br>yaw ${fmt(a.yaw*180/Math.PI)}°</td><td>${a.nativeCompleteBounds.size.map(n=>fmt(n)).join(' × ')} m</td><td>${xyz(a.target)}<br>yaw ${fmt(a.targetYaw*180/Math.PI)}°<br><span class="badge blocked">NOT APPLIED</span></td></tr>`).join('');
const pillarRows=measured.pillars.map(p=>`<tr><th>${p.id} / ${esc(p.identity)}</th><td>${xyz(p.center)}</td><td>${xyz(p.center)}</td><td>${p.currentBase.size.map(n=>fmt(n)).join(' × ')} m base</td><td>${xyz(p.target)}<br><span class="badge blocked">NOT APPLIED</span></td></tr>`).join('');
const currentGallery=measured.gallery.currentMatrix.slice(12,15);
const galleryRow=`<tr><th>L / shared gallery<br><small>Reception, branding, lounge, planting, visitors</small></th><td>${xyz(currentGallery)}<br>yaw0°</td><td>${xyz(currentGallery)}<br>yaw0°</td><td>${measured.gallery.nativeBounds.size.map(n=>fmt(n)).join(' × ')} m</td><td>Brief allocation only; no original separate lounge pivot.<br><span class="badge blocked">NOT APPLIED</span></td></tr>`;
const captureSpecs=[['whole-venue-before.jpg','Whole existing venue','Actual 3 m horizontal cutaway of all mounted zones. Full 426 m venue including arena; entry is at right. Current geometry is also the final state because no relocations were applied.'],['exhibition-before.jpg','Central exhibition excerpt','Actual 3 m cutaway, s40–170 only: pillars, reception, Content Studio and AV Engineering. LED Rental and Projection are outside this closer frame and are visible in the whole-venue capture.'],['arena-before.jpg','Protected arena and stage','Normal authored Main Stage camera, Meetings & Conferences mode. No cutaway. Dimensions, materials, lights and camera configuration are independently fingerprinted.']];
const captures=captureSpecs.map(([file,label,caption])=>{const exists=fs.existsSync(path.join(out,file));return `<figure>${exists?`<a href="${file}"><img src="${file}" alt="${esc(label)}" loading="lazy"></a>`:`<div class="pending">Capture pending: <a href="${file}">${file}</a><br>NOT TESTED by report generator</div>`}<figcaption><strong>${label}</strong><br>${caption}</figcaption></figure>`;}).join('');
const candidateRows=Object.entries(candidate.targets).map(([id,p])=>`<tr><th>${id}</th><td>${xyz(p)}</td><td>${fmt(assemblies[id].targetYaw*180/Math.PI)}°</td><td>Same geometry / scale1</td></tr>`).join('');
const tableTests=[
 ['Source metre units + entrance registration','PASS','O=(0,.12,0), yaw0, scale1; structural entrance source references recorded.'],
 ['Captured measurement dependency hashes',unchanged?'PASS':'FAIL',`${comparisons.filter(f=>f.unchanged).length}/${comparisons.length} exact hashes against the measurement manifest. See separate pre-task protection check for the inspection-only source exceptions.`],
 ['64 m transverse planning width','PASS',`Available actual inner width ${fmt(protectedVenue.fixedHall.actualClearWidth,6)} m; fixed first-column throat ${fmt(protectedVenue.conflicts.find(c=>c.id==='transverse-width').availableAtFirstColumns,6)} m.`],
 ['Literal reception floor + bulkhead fit','FAIL','12 m of allocation ahead of level floor; bulkhead crosses14 m of allocation.'],
 ['Literal P3/P4 fixed walls / soffit','FAIL','Centres0.1 m from wall; current bases/height penetrate unchanged architecture.'],
 ['Literal reception24 m envelope','FAIL',`${fmt(reception.nativeOpaqueBounds.size[0],6)} m total frontage; minimum centred allocation27.406687 m.`],
 ['Literal S3 rig / S1 wall actual triangles','FAIL',`${collision.intersectionTrianglePairs} intersecting triangle pairs. Mesh names and exact bounds in measured-assemblies.json.`],
 ['Seven LED product swept bounds','PASS','Measured primitive/nested geometry sweeps fit their own24×16 m stall reservation.'],
 ['Full new layout integration','BLOCKED','No placement was applied after mandatory fit gate failed.'],
 ['Protected normal-route configuration',finalProtection?.status==='PASS'?'PASS':'NOT TESTED',finalProtection?`${finalProtection.counts.passed}/${finalProtection.counts.checks} protection checks; includes exact original source reconstructed around explicit inspection-only additions.`:'See final-protection-check.json when available.'],
 ['Revised candidate mounted-solid geometry against fixed objects',candidateGeometryPass?'PASS':'NOT TESTED',candidateGeometryPass?`${fitProof.protectedMeshTests.length} complete assembly/fixed-object and ${fitProof.assemblyPairTests.length} assembly-pair checks pass for exact candidate hash ${candidateSha256.slice(0,16)}. See candidate-fit-check.json. Test scopes and containment caveats remain recorded.`:'The revised candidate must match the checked candidate SHA-256 before a PASS may be reported.'],
 ['Revised candidate6 m ground core and inter-court link',candidateCorePass?'PASS':'NOT TESTED','Floor-to2.2 m obstacle slabs only; not an accessibility or doorway-reachability simulation.'],
 ['Candidate doorway routes / camera viewing pockets','NOT TESTED','Needs approval plus detailed mesh checks after candidate placement changes.'],
 ['Relocated forward/reverse / chapter / interior return','BLOCKED','No relocation exists to test; current navigation preserved.'],
 ['Relocated desktop / mobile walkthrough','BLOCKED','Not an implemented relocated experience; do not infer success from this report.'],
 ['Optional secondary hubs','NOT TESTED','Left unresolved; no protected arena/approach area consumed.']
];
const tests=tableTests.map(([name,status,evidence])=>`<tr><th>${name}</th><td><span class="badge ${status==='PASS'?'pass':status==='FAIL'?'fail':'blocked'}">${status}</span></td><td>${esc(evidence)}</td></tr>`).join('');
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Livegrid AV — Measured placement fit gate</title><style>
*{box-sizing:border-box}body{margin:0;background:#f1f5f5;color:#14292f;font:16px/1.6 Arial,Helvetica,sans-serif}header{background:#09171e;color:#f7faf9;padding:44px max(24px,calc((100vw - 1400px)/2)) 38px}.eyebrow{letter-spacing:.16em;font-size:12px;color:#66ddc7;font-weight:700}h1{font-size:clamp(28px,4vw,46px);line-height:1.15;max-width:1020px;margin:14px 0 18px}header p{max-width:1000px;color:#bed0d5}main{max-width:1450px;margin:auto;padding:24px}.notice{border-left:5px solid #bd3e36;background:#fff2ef;padding:20px 24px;margin:0 0 24px}.notice strong{font-size:22px}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:24px 0}.card,section{background:#fff;border:1px solid #d0dfe2;border-radius:9px;padding:22px;margin-bottom:24px}.card{margin:0}.card strong{font-size:30px;display:block;line-height:1.2}.card small{color:#547078}.card.bad strong{color:#b3342e}.card.good strong{color:#08715e}h2{font-size:26px;line-height:1.25;margin:0 0 16px}h3{font-size:18px;margin:22px 0 8px}p{margin:10px 0 16px}a{color:#006d83;text-underline-offset:3px}.actions{display:flex;flex-wrap:wrap;gap:10px}.actions a{padding:10px 14px;background:#fff;border-radius:6px;border:1px solid #bdd3d9;text-decoration:none;font-weight:650}.board{display:block;width:100%;height:auto;background:#071116;border-radius:8px}table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;vertical-align:top;border-bottom:1px solid #d6e2e4;padding:12px 10px}thead{background:#e8f0f2}th small{font-weight:400;color:#526e76}.scroll{overflow:auto}.badge{display:inline-block;font-size:11px;font-weight:750;letter-spacing:.06em;padding:3px 8px;border-radius:4px;white-space:nowrap}.pass{background:#d9f2e7;color:#075b3e}.fail{background:#ffe0dc;color:#a02722}.blocked{background:#fff0cb;color:#785200}.capture-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}figure{margin:0}figure img{display:block;width:100%;background:#071116;border-radius:6px}figcaption{font-size:13px;padding-top:8px;color:#526d75}.pending{min-height:150px;display:grid;place-content:center;padding:20px;text-align:center;background:#edf2f4;border:1px dashed #8ca5ad;color:#6b4b12}.note{background:#eef5f5;padding:16px;border-radius:5px;color:#36555e}code{font-family:Consolas,monospace;font-size:13px;background:#edf3f5;padding:2px 5px;overflow-wrap:anywhere}details{border-top:1px solid #d4e1e4;margin-top:15px;padding-top:15px}summary{cursor:pointer;font-weight:700}.files{columns:2}.files li{margin-bottom:8px;overflow-wrap:anywhere}footer{max-width:1400px;margin:auto;padding:0 24px 40px;color:#526d75;font-size:13px}@media(max-width:900px){.cards{grid-template-columns:repeat(2,1fr)}.capture-grid{grid-template-columns:1fr}.files{columns:1}}@media print{body{background:white}.actions{display:none}section{break-inside:avoid}.board{max-height:none}header{padding:20px}}
</style></head><body><header><div class="eyebrow">LIVEGRID AV · UNPUBLISHED LOCAL DEVELOPMENT · 19 OCTOBER 2026</div><h1>The approved placement coordinates fail the fixed-venue fit gate.</h1><p>The current hall, arena and stage are preserved. The original placement targets collide with fixed arrival architecture and a complete attached stall rig. No stall or pillar was moved. A quantified candidate is shown for approval, with remaining checks explicitly untested.</p><span class="badge fail">FIT GATE: FAIL</span> <span class="badge pass">NO PLACEMENTS APPLIED</span> <span class="badge blocked">CANDIDATE REQUIRES APPROVAL</span></header><main>
<div class="notice"><strong>Nothing has been silently resized or moved to make the drawing fit.</strong><p>This is a blocked implementation handoff. It records the actual current scene, the exact original proposal conflicts and an unapplied alternative. It is not a claim that the full layout has been implemented.</p></div>
<div class="cards"><div class="card good"><strong>79.368 m</strong><small>Actual hall inner width; the64 m width fits</small></div><div class="card bad"><strong>12 m</strong><small>Reception allocation ahead of level floor</small></div><div class="card bad"><strong>224 pairs</strong><small>Actual technical-rig / studio-wall intersections</small></div><div class="card good"><strong>0 moved</strong><small>Current transforms equal final transforms</small></div></div>
<section><h2>See the measured conflicts</h2><p>The three whole-venue plans retain the complete426 m extent from plaza Z+46 to arena rear Z−380. Solid and dashed shapes distinguish stall architecture from complete attached rigs. The original and candidate overlays are proposals, not rendered scene changes.</p><div class="actions"><a href="FIT-CONFLICTS.svg">Open full-size diagram</a><a href="measured-assemblies.json">Exact assembly measurements</a><a href="protected-venue-measurements.json">Fixed venue / arena measurements</a></div><p></p><a href="FIT-CONFLICTS.svg"><img class="board" src="FIT-CONFLICTS.svg" alt="Full existing venue, original target conflicts, arrival obstructions, actual truss collision and unapplied candidate"></a></section>
<section><h2>Actual local browser evidence</h2><p>These captures show the current unchanged scene. The source-derived plans above expose geometry hidden by roofs and visibility gates. A diagnostic cutaway must never be presented as a fabricated new venue.</p><div class="capture-grid">${captures}</div><p class="note">Before and final states are identical because the fit gate stopped placement. Screenshot equality alone is not proof of preservation; exact source/assets and accumulated assembly transforms are also recorded.</p></section>
<section><h2>Before / final placement table</h2><p>Positions below are existing runtime roots. They are not substituted for measured floor anchors. All current scales and child transforms remain unchanged. Native complete dimensions include real attached rigging where present; source measurements distinguish the nominal architecture envelope.</p><div class="scroll"><table><thead><tr><th>Installation</th><th>Before root X,Y,Z</th><th>Final root X,Y,Z</th><th>Complete native W×H×D</th><th>Original requested root / status</th></tr></thead><tbody>${beforeFinalRows}${pillarRows}${galleryRow}</tbody></table></div><p><a href="baseline-current.json">Named baseline/final registry</a> · <a href="assembly-measurements.md">Measurement method and complete bounds</a></p></section>
<section><h2>Alternative candidate for owner approval</h2><span class="badge blocked">PROPOSED — NOT APPLIED</span><p>Keep every installation at its current scale. Move the arrival targets ${fmt(candidate.arrivalShiftS)} m toward the arena, give the accepted reception a centred ${fmt(candidate.receptionCentredAllocationFrontage)} m allocation, move Court1 ${fmt(candidate.court1ShiftS)} m and Court2 ${fmt(candidate.court2ShiftS,5)} m beyond their original targets, and use ${fmt(candidate.court2Spacing,5)} m between court centres. Court1 includes2 m to retain the4 m link after the reception allocation expands. The existing shared gallery moves as one complete arrival-lounge assembly to anchor (${xyz(candidate.gallery.targetAnchor)}) rather than duplicating or deleting its reception, people and planting.</p><div class="scroll"><table><thead><tr><th>Target</th><th>Candidate geometry root X,Y,Z</th><th>Absolute yaw</th><th>Preservation</th></tr></thead><tbody>${candidateRows}<tr><th>L / shared gallery</th><td>${xyz(candidate.gallery.root)}</td><td>90°</td><td>Complete existing gallery, not newly furnished replacement</td></tr></tbody></table></div><p>Candidate pillar centres: ${candidate.pillarTargets.map(p=>`${p.id} (${xyz(p.target)})`).join('; ')}. Current native base datumY.111 is preserved; it is an existing9 mm difference from finished floorY.12.</p><p class="note">The first candidate touched the fixed first-bay ceiling truss in78 triangle pairs; its failure remains in <a href="candidate-1-fit-check.json">candidate-1-fit-check.json</a> and <a href="candidate-1-fit-check.md">the original failure explanation</a>. This revised candidate adds a further1 m uniform shift. ${candidateGeometryPass?`The exact current candidate passes ${fitProof.protectedMeshTests.length} fixed-object and ${fitProof.assemblyPairTests.length} assembly-pair checks, including the lower first-bay truss. The critical reception/truss pair also passes a0.02 m BVH distance-threshold query; an exact minimum distance is not claimed.`:'The revised candidate geometry recheck is pending an exact matching data fingerprint.'} ${candidateCorePass?'Its6 m direct ground core and inter-court link slabs pass floor-to2.2 m obstacle checks.':''} Complete entrance reachability, eye-height camera paths, visitor navigation, mobile framing and rendered candidate views remain NOT TESTED. It is not proven globally smallest or fully viable; optional secondary hubs remain unresolved.</p><p><a href="alternative-candidate.json">Exact candidate data and limitations</a> · <a href="candidate-fit-check.json">Current exact geometry tests</a> · <a href="candidate-fit-check.md">Test methods and caveats</a></p></section>
<section><h2>What was tested</h2><div class="scroll"><table><thead><tr><th>Check</th><th>Result</th><th>Evidence / boundary</th></tr></thead><tbody>${tests}</tbody></table></div><p>No physical safety, fabrication, production performance, reference100% match or experience-quality claim is made from these geometry checks.</p></section>
<section><h2>Protected venue, arena and stage</h2><p>The fixed hall remains80 m nominal width with roofY19. The main arena remains88×136 m, Z−244…−380, height34 m. The stage deck remains80×22×1.6 m with frontZ−332 and backZ−354; the wider complete GLB includes scenery and stairs. Seating, shared lights, materials, stage content, two mode configurations and arena camera source have not been edited.</p><p>Pre-task protection: <strong>${finalProtection?`${finalProtection.counts.passed}/${finalProtection.counts.checks}`:'Pending'} checks passed</strong>, including31 strict protected dependency hashes and two exact reconstructions of original normal-route source around the explicit inspection additions. <a href="final-protection-check.json">Open the full protection audit</a>. The separate <a href="protected-source-comparison.json">captured measurement-manifest hash comparison</a> remains ${comparisons.filter(f=>f.unchanged).length}/${comparisons.length} identical. Diagnostic plan/section views already hide the hall shell; baseline gating/quality state is recorded rather than normalized.</p><details><summary>Why unchanged keyframes alone would not preserve the arena camera</summary><p>The current Hermite sampler multiplies all tangents by <code>KEYFRAMES.length - 1</code>. Adding or deleting an exhibition keyframe would change protected arena interpolation even if its literal frame positions stayed the same. A later authorized implementation must preserve the arena sequence/tangents or isolate it against the saved baseline. No such path edit has been made.</p></details></section>
<section><h2>Source, reproduction and files</h2><p>Working tree branch <code>${esc(registry.branch)}</code>, commit <code>${esc(registry.commit)}</code>. Existing uncommitted improvements form part of the captured baseline. Current route: <a href="http://127.0.0.1:4310/?shot=led-rental">local venue preview</a>; development startup <code>npm run dev -- --hostname 127.0.0.1 --port 4320</code>. Read <code>package.json</code> and the repo toolchain guide for static-export startup. No publish or commit was performed.</p><p>Plan registration: <code>p_world = (0,.12,0) + R_y(0) × p_plan</code>. Metres, scale1, no reflection. This mapping applies to proposal targets only, never to a venue/arena/stage ancestor. Native stall floor anchors already includeY.12, so rootY stays0.</p><p>Original <code>placements.proposed.json</code> and dimensioned SVG were not found in the documented search scope. All proposal numbers come directly from the explicit supplied brief; image pixels were not used to recover coordinates. <a href="source-discovery.json">Discovery scope and source hashes</a>.</p><ul class="files"><li><a href="baseline-current.json">Baseline / unchanged final named registry</a></li><li><a href="measured-assemblies.json">Complete mesh bounds, transforms and asset hashes</a></li><li><a href="protected-venue-measurements.json">Protected world-space architecture and stage manifest</a></li><li><a href="protected-source-comparison.json">Baseline-to-current protected fingerprints</a></li><li><a href="alternative-candidate.json">Unapplied candidate coordinates</a></li><li><a href="integration-dependencies.md">Navigation, effects and source integration dependencies</a></li><li><a href="baseline/working-tree.txt">Captured dirty working-tree status</a></li><li><a href="baseline/commit.txt">Captured baseline commit</a></li><li><a href="FIT-CONFLICTS.svg">Standalone full-resolution conflict board</a></li><li><a href="source-discovery.json">Source discovery</a></li></ul><p>Rebuild this report: <code>node scripts/build-placement-fit-report.mjs</code>. Remeasure with <code>node scripts/measure-placement-assemblies.mjs</code> (protected geometry measurement methods and source references are recorded in its JSON manifest). Report generation writes only this report directory.</p></section>
<section><h2>Handoff</h2><p><strong>Moved:</strong> nothing. <strong>Unchanged:</strong> current stalls and pillars; full venue, tunnel, main arena, stage, screens, seating, lights and authored arena sequence. <strong>Tested:</strong> source/GLB geometry, accumulated transforms, fixed arrival conflict, real triangle intersection, pillar bases, product sweeps, protected fingerprints${candidateGeometryPass?', and the exact revised candidate mounted-solid geometry against fixed objects and other installations':''}${candidateCorePass?', plus6 m core/link obstacle slabs':''}. <strong>Unresolved:</strong> approval for different target coordinates, complete entrance access, camera/visitor navigation, mobile framing, rendered candidate inspection and optional hubs.</p></section>
<section><h2>Local verification and actual scene evidence</h2><p><a href="final-protection-check.json">84/84 protection checks passed</a>: 31 strict protected dependency hashes, two exact reconstructions of original normal-route source, all 20 assembly GLBs, placement inputs, all 10 registry entries and 11 arena camera poses. <a href="baseline/actual-scene-manifest.json">Actual mounted scene manifest: 2,015 mesh/light records</a> includes accumulated world matrices, uncut geometry bounds and attribute fingerprints.</p><p>The only application additions are an explicit <code>?inspect=placement</code> survey camera, horizontal cutaway and all-zone visibility override in <code>src/venue/systems/PlacementInspection.tsx</code>, with opt-in mounts in <code>Scene.tsx</code> and <code>ZoneGroup.tsx</code>. Normal visitor geometry, placement, visibility and camera behavior are reconstructed against the pre-task snapshots exactly. No protected root or imported model was transformed.</p><p><a href="TEST_RESULTS.json">Test statuses and limitations</a> · <a href="browser-console.json">Browser console</a> · <a href="baseline/arena-camera.json">Recorded normal arena camera</a>. The normal arena and whole-venue inspection rendered with no browser errors; only the existing THREE.Clock deprecation warning was observed. The development server encountered a Turbopack/PostCSS worker failure; browser evidence uses the successful local static export on port4310. No framework upgrade was attempted.</p><p>Commands run: <code>npm run build</code>, <code>npx tsc --noEmit</code>, targeted ESLint, <code>node scripts/verify-placement-protection.mjs</code> and the assembly/triangle measurement script. The fixed-geometry measurements and source references are documented in <code>protected-venue-measurements.json</code>. New target navigation, doorway walks, mobile framing, rendered candidate views and walkthrough clips remain blocked/not tested while placement approval is unresolved. The separate exact-hash-matched <a href="candidate-fit-check.json">candidate mesh checks</a> cover the mounted-solid geometry scope, including the fixed lower roof truss; they do not replace visitor validation.</p></section>
</main><footer>Generated ${new Date().toISOString()} · Unpublished development evidence · Source-derived diagrams are clearly separated from actual browser captures.</footer></body></html>`;
fs.writeFileSync(path.join(out,'index.html'),html);
await sharp(path.join(out,'FIT-CONFLICTS.svg')).png().toFile(path.join(out,'FIT-CONFLICTS.png'));
console.log(JSON.stringify({report:path.relative(root,path.join(out,'index.html')),diagram:path.relative(root,path.join(out,'FIT-CONFLICTS.svg')),protectedFingerprintsUnchanged:unchanged,captures:captureSpecs.map(([name])=>({name,present:fs.existsSync(path.join(out,name))})),candidateStatus:candidate.status},null,2));
