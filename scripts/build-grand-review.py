"""Build a repeatable native-image review of the unpublished Grand Stalls work.
Uses only actual local captures, selected references and measured project data.
Missing captures remain visibly pending. No generated reference-as-proof imagery.
"""
from __future__ import annotations
import argparse, hashlib, html, io, json, math, re, subprocess, textwrap
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT=Path(__file__).resolve().parents[1]
REPORT=ROOT/'reports/grand-stalls/20261018-implementation'
OUT=REPORT/'IMAGE_REVIEW'
W=2400
BG='#081015'; PANEL='#111c22'; EDGE='#34454c'; WHITE='#f2f3ed'; MUTED='#afbdc2'; TEAL='#66d5bf'; GOLD='#e4c88e'; PENDING='#bca581'
STALLS=[('pillars','Four-sided LED pillars'),('reception','Reception / curved LED'),('anamorphic','Content / Anamorphic Studio'),('technical','AV Engineering / Show Control / Live Production'),('led-rental','LED Rental Solutions'),('projection','Projection Mapping')]
FONTS=Path('C:/Windows/Fonts')
def font(size,bold=False):
    for name in (['segoeuib.ttf','arialbd.ttf'] if bold else ['segoeui.ttf','arial.ttf']):
        if (FONTS/name).exists(): return ImageFont.truetype(str(FONTS/name),size)
    return ImageFont.load_default(size=size)
def read_json(file,default=None):
    try:return json.loads(file.read_text(encoding='utf-8-sig'))
    except (FileNotFoundError,json.JSONDecodeError):return default

def sha(file):return hashlib.sha256(file.read_bytes()).hexdigest()
def txt(draw,xy,text,size=28,fill=WHITE,bold=False):draw.text(xy,str(text),font=font(size,bold),fill=fill)
def wrapped(draw,xy,text,width,size=25,fill=MUTED,bold=False,line_gap=8,max_lines=None):
    f=font(size,bold); words=str(text).split(); lines=[]; line=''
    for word in words:
        candidate=f'{line} {word}'.strip()
        if draw.textlength(candidate,font=f)>width and line:lines.append(line);line=word
        else:line=candidate
    if line:lines.append(line)
    if max_lines and len(lines)>max_lines:lines=lines[:max_lines-1]+[lines[max_lines-1]+' ...']
    for i,line in enumerate(lines):draw.text((xy[0],xy[1]+i*(size+line_gap)),line,font=f,fill=fill)
    return len(lines)*(size+line_gap)

SOURCES={};PENDING_ITEMS=[];IMAGES={}
def image_file(file):
    if not file:return None
    file=Path(file)
    key=str(file)
    if key in IMAGES:return IMAGES[key]
    try:
        payload=file.read_bytes()
        with Image.open(io.BytesIO(payload)) as source:
            source.load(); image=ImageOps.exif_transpose(source).convert('RGB')
        SOURCES[str(file.relative_to(REPORT))]={'sha256':hashlib.sha256(payload).hexdigest(),'width':image.width,'height':image.height,'bytes':len(payload)}
        IMAGES[key]=image
        return image
    except (FileNotFoundError,OSError,ValueError):
        IMAGES[key]=None
        return None

def capture(stall,view):
    stems=[f'{stall}-{view}']
    if stall=='led-rental':stems += [f'rental-{view}']
    if stall=='pillars' and view=='front':stems += ['pillars-overview','pillars-normal']
    for stem in stems:
        extensions=('.png','.jpg','.jpeg','.webp') if 'native' in view else ('.jpg','.png','.jpeg','.webp')
        for ext in extensions:
            file=REPORT/'captures'/f'{stem}{ext}'
            if file.exists():return file
    return None

def card(canvas,box,label,file=None,caption='',pending_key=None,not_required=False):
    x,y,w,h=box;draw=ImageDraw.Draw(canvas)
    draw.rounded_rectangle((x,y,x+w,y+h),radius=10,fill=PANEL,outline=EDGE,width=2)
    txt(draw,(x+18,y+15),label,25,TEAL if file else MUTED,True)
    cap_h=84 if caption else 28
    image_box=(x+12,y+58,w-24,h-58-cap_h)
    img=image_file(file)
    if img:
        thumb=ImageOps.contain(img,(int(image_box[2]),int(image_box[3])),Image.Resampling.LANCZOS)
        canvas.paste(thumb,(int(image_box[0]+(image_box[2]-thumb.width)/2),int(image_box[1]+(image_box[3]-thumb.height)/2)))
        txt(draw,(x+w-195,y+19),f'{img.width} x {img.height}',18,MUTED)
    else:
        message='NOT AN ENCLOSED STALL' if not_required else 'PENDING ACTUAL CAPTURE'
        inner=(image_box[0]+18,image_box[1]+18,image_box[0]+image_box[2]-18,image_box[1]+image_box[3]-18)
        draw.rectangle(inner,outline='#556069',width=2)
        draw.line((inner[0],inner[1],inner[2],inner[3]),fill='#25343c',width=2)
        draw.line((inner[0],inner[3],inner[2],inner[1]),fill='#25343c',width=2)
        bbox=draw.textbbox((0,0),message,font=font(29,True));textwidth=bbox[2]
        txt(draw,(x+(w-textwidth)/2,y+h/2-8),message,29,PENDING,True)
        if pending_key and not not_required:PENDING_ITEMS.append(pending_key)
    if caption:wrapped(draw,(x+18,y+h-cap_h+8),caption,w-36,20,MUTED,max_lines=3)
    return bool(img)

def header(canvas,kicker,title,subtitle):
    draw=ImageDraw.Draw(canvas)
    draw.rectangle((0,0,W,8),fill=TEAL)
    txt(draw,(46,30),kicker.upper(),25,TEAL,True)
    # Preserve complete long titles with actual font metrics, never squeeze type.
    size=49
    while draw.textlength(title,font=font(size,True))>W-92 and size>32:size-=1
    txt(draw,(46,69),title,size,WHITE,True)
    wrapped(draw,(48,132),subtitle,W-96,25,MUTED,max_lines=2)

def save(canvas,name):
    OUT.mkdir(parents=True,exist_ok=True);file=OUT/name;canvas.save(file,optimize=True);return file

def render_venue_plan():
    source=REPORT/'VENUE_PLAN.svg';target=REPORT/'VENUE_PLAN.png'
    if source.exists():
        try:
            subprocess.run(['node','--input-type=module','-e',"import sharp from 'sharp'; await sharp(process.argv[1],{density:170}).png().toFile(process.argv[2]);",str(source),str(target)],cwd=ROOT,check=True,capture_output=True)
        except (subprocess.CalledProcessError,FileNotFoundError):return None
    return target if target.exists() else None

def performance_rows(record):
    rows=[]
    for sample in record.get('samples',[]):
        data=sample.get('dataset',{})
        try:timing=json.loads(data.get('timing','{}'))
        except (ValueError,TypeError):timing={}
        match=re.match(r'^(\d+)\s*fps',sample.get('text',''))
        rows.append({'stall':sample.get('stall','unknown'),'fps':int(match.group(1)) if match else None,'timing':timing,'moving':data.get('cameraMoving'),'mode':data.get('cameraMode'),'capturedAt':sample.get('capturedAt')})
    order={'reception':0,'anamorphic':1,'technical':2,'led-rental':3,'projection':4,'pillars':5}
    return sorted(rows,key=lambda row:order.get(row['stall'],99))

def main():
    global REPORT,OUT
    parser=argparse.ArgumentParser();parser.add_argument('--report',default=str(REPORT));args=parser.parse_args()
    REPORT=Path(args.report).resolve();OUT=REPORT/'IMAGE_REVIEW';OUT.mkdir(parents=True,exist_ok=True)
    measurements=read_json(REPORT/'MEASUREMENTS.json',{})
    before=read_json(REPORT/'BEFORE_MANIFEST.json',[])
    references=read_json(REPORT/'REFERENCE_MANIFEST.json',[])
    baseline={row['stall']:row for row in before}; refs={row['stall']:row for row in references}
    master=measurements.get('master',read_json(ROOT/'public/models/expo/grand-dimensions.json',{}).get('master',{}))
    current_measurements={row['stall']:row for row in measurements.get('measurements',[])}
    performance=read_json(REPORT/'verification/performance-after.json',{})
    perf_rows=performance_rows(performance)
    responsive=read_json(REPORT/'verification/responsive-qa.json',{})
    final_logs=read_json(REPORT/'verification/final-browser-logs-after-replay.json',[])
    final_qa=read_json(REPORT/'FINAL_QA.json',{})
    corridors=read_json(REPORT/'verification/actual-corridor-width-sat.json',{})
    replay_checks={row['stall']:row for row in read_json(REPORT/'verification/fixed-camera-qa.json',{}).get('checks',[])}
    generated=[];date=datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')
    for index,(stall,title) in enumerate(STALLS,1):
        canvas=Image.new('RGB',(W,3302),BG);draw=ImageDraw.Draw(canvas)
        kind='Installation' if stall=='pillars' else 'Open feature reservation' if stall=='reception' else 'Full-size service stall'
        header(canvas,f'{index:02d} / selected design preserved',title,f'{kind} | Current unpublished 3D build | References and earlier renders are labelled separately | {date}')
        col=752;gap=28;xs=[44,44+col+gap,44+2*(col+gap)]
        ref=REPORT/refs[stall]['path'] if stall in refs else None
        pre=REPORT/baseline[stall]['path'] if stall in baseline else None
        card(canvas,(xs[0],210,col,490),'SELECTED REFERENCE',ref,'User-supplied appearance target. This is not a screenshot of the implementation.')
        card(canvas,(xs[1],210,col,490),'BEFORE / EARLIER LOCAL BUILD',pre,'Historical camera and viewport. The new grand geometry needs different framing; these are not pixel-registered comparisons.')
        card(canvas,(xs[2],210,col,490),'CURRENT 3D / FRONT',capture(stall,'front'),'Actual local browser render. Read the source image at native size; no reference image overlay.',f'{stall}:front')
        card(canvas,(44,742,1142,450),'BEFORE / RECORDED HISTORICAL CAMERA',pre,'Original local-build screenshot. Recorded camera pose and original viewport are preserved in BEFORE_MANIFEST.json.')
        replay_caption='Historical projection camera X -49.80 m is outside the current hall (X +/-40 m). The nearly black obstructed result is preserved; it is not a missing asset or failed render.' if stall=='projection' else 'Current geometry at the exact historical pose. Recorded aspect is replayed; screenshot/canvas pixel sizes differ, so this is not a pixel-registered image comparison. Media remains live.'
        replay_build=replay_checks.get(stall,{}).get('captureBuild',{}).get('builtAt','not recorded')
        replay_caption=f'Source build {replay_build}. '+replay_caption
        card(canvas,(1214,742,1142,450),'RECORDED CAMERA REPLAY / LOCAL 3D',capture(stall,'fixed-camera'),replay_caption,f'{stall}:fixed-camera')
        if stall=='pillars':
            card(canvas,(44,1234,1142,620),'CURRENT / APPROACH OR LEFT',capture(stall,'left'),'Actual arrival sequence / lower-content clearance.',f'{stall}:left')
            card(canvas,(1214,1234,1142,620),'CURRENT / RIGHT OR CIRCULATION',capture(stall,'right'),'Four-sided pillars remain a distinct installation, not an enclosed service booth.',f'{stall}:right')
        else:
            card(canvas,(44,1234,1142,620),'CURRENT / INSIDE THE SAME VOLUME',capture(stall,'interior'),'Real room geometry at a human-scale eye position. No separate interior scene or painted room.',f'{stall}:interior')
            card(canvas,(1214,1234,1142,620),'CURRENT / INTERIOR LOOKING OUT',capture(stall,'exit'),'Actual view from the occupied interior toward the facade / venue return.',f'{stall}:exit')
        plan_caption='The pillars are an open installation. Runtime placement and the common benchmark are shown in the measured venue plan.' if stall=='pillars' else 'Actual geometry with overhead elements removed. Metre design-envelope datums are labelled.'
        card(canvas,(xs[0],1896,col,492),'ORTHOGRAPHIC PLAN / CUTAWAY',capture(stall,'plan'),plan_caption,f'{stall}:plan',not_required=stall=='pillars')
        section_caption='Actual cut through the occupied studio entry axis, local X -6.350 m; the near side is removed.' if stall=='anamorphic' else 'Actual central clipping plane removes the near half. Overall height and overhead clearance differ.'
        if stall=='pillars':section_caption='No enclosed room or ceiling-clearance section applies to this open pillar installation.'
        card(canvas,(xs[1],1896,col,492),'LONGITUDINAL SECTION / CUTAWAY',capture(stall,'section'),section_caption,f'{stall}:section',not_required=stall=='pillars')
        card(canvas,(xs[2],1896,col,492),'CURRENT / CRITICAL DETAIL',capture(stall,'detail'),'Actual trim, surface, basin or display detail. A detail render alone does not validate every joint.',f'{stall}:detail')
        card(canvas,(xs[0],2432,col,450),'CURRENT / LEFT THREE-QUARTER',capture(stall,'left'),'Separate camera to inspect architectural return and physical depth.',f'{stall}:left')
        card(canvas,(xs[1],2432,col,450),'CURRENT / RIGHT THREE-QUARTER',capture(stall,'right'),'Actual view; differing framing is explicitly allowed for comparison, not a match percentage.',f'{stall}:right')
        branding=capture(stall,'branding-left-native') if stall=='projection' else capture(stall,'entrance')
        entry_caption='Source crop from the actual branding panel, enlarged for report display. Open the original file for native pixels.' if stall=='projection' else 'Circulation passes between the open four-face bodies; there is no separate enclosed interior.' if stall=='pillars' else 'Actual entry looking toward the interior focal point.'
        card(canvas,(xs[2],2432,col,450),'BRANDING / SOURCE CROP' if stall=='projection' else 'CURRENT / ENTRANCE',branding,entry_caption,f'{stall}:branding-left-native' if stall=='projection' else f'{stall}:entrance',not_required=stall=='pillars')
        row=current_measurements.get(stall,{})
        draw.line((46,2922,W-46,2922),fill=EDGE,width=2)
        if row.get('actual'):
            a=row['actual'];d=row.get('deviations',{});line=f"MEASURED SHELL  {a['width']:.3f} x {a['depth']:.3f} x {a['height']:.3f} m   |   design tolerance +/- {row.get('tolerance',.02):.3f} m"
            txt(draw,(48,2952),line,29,TEAL,True)
            txt(draw,(48,2997),'Deviation W / D / H: '+ ' / '.join(f'{d.get(k,0):+.6f}' for k in ['width','depth','height'])+' m',25,MUTED)
        elif stall=='reception':
            txt(draw,(48,2952),'RESERVED ENVELOPE 24.000 x 16.000 m | height limit 12.701 m',29,TEAL,True)
            txt(draw,(48,2997),f"Open feature actual top above floor: {row.get('maximumHeight',0):.3f} m. Its suspended halo is deliberately lower than an enclosed shell.",25,MUTED)
        else:
            txt(draw,(48,2952),'PILLAR BENCHMARK 12.701 m above the common finished floor',29,TEAL,True)
            txt(draw,(48,2997),'Four-face body roles retained. Background joinery terminates before the central venue route.',25,MUTED)
        wrapped(draw,(48,3052),'Visible differences remain: exact people and poses, plant silhouettes, photographic material response, dressing density and some reference proportions. Captured images do not establish complete reference equivalence.',W-96,26,GOLD,max_lines=3)
        wrapped(draw,(48,3172),'Geometry: original Blender assets. People: Microsoft Rocketbox Avatar Library, MIT. Surface maps: documented ambientCG / Poly Haven CC0. Source type: Segoe UI; report: Segoe UI / Arial. No publishing or physical certification.',W-96,21,MUTED,max_lines=3)
        generated.append(save(canvas,f'{index:02d}-{stall}.png'))
    # Overview: current scene renders only; no reference photograph is used as proof.
    canvas=Image.new('RGB',(W,1840),BG);draw=ImageDraw.Draw(canvas)
    header(canvas,'Grand-scale implementation / local review','One measured standard. Six retained identities.',f"Four enclosed shells: 24.000 x 16.000 x 12.701 m | Continuous exhibition floor +0.120 m | Genuine connected interiors | {date}")
    for i,(stall,title) in enumerate(STALLS):
        x=44+(i%2)*1170;y=212+(i//2)*475
        card(canvas,(x,y,1142,440),title,capture(stall,'front'),'Current local 3D screenshot. Full detail, reference and before evidence are on the individual board.',f'{stall}:front')
    wrapped(draw,(48,1665),'Evidence labels separate actual renders, historical cameras, references and cutaways. Responsive checks emulate viewport sizes on the recorded desktop; no physical phone/tablet or controlled before/after speedup is claimed. No visual-match percentage is assigned.',W-96,28,GOLD,max_lines=2)
    txt(draw,(48,1770),'UNPUBLISHED DEVELOPMENT BUILD  |  No deployment performed  |  Open the full images to inspect native evidence',23,MUTED)
    generated.insert(0,save(canvas,'00-overview.png'))
    # Measured venue plan plus honest geometry/verification status.
    plan=render_venue_plan();canvas=Image.new('RGB',(W,1860),BG);draw=ImageDraw.Draw(canvas)
    header(canvas,'Integration / measurable geometry','A continuous floor and real routes',f'Master datums, actual runtime placement and camera triangle checks | {date}')
    card(canvas,(44,212,950,1430),'MEASURED RUNTIME PLACEMENT PLAN',plan,'Diagram from shared placement data and measured envelope. This is a plan drawing, not a browser render.',pending_key='venue-plan-svg-render')
    collision=read_json(REPORT/'verification/main-journey-collision.json',{})
    clean=bool(collision) and not collision.get('insideHits') and not collision.get('nearHits')
    txt(draw,(1040,230),'SHARED DIMENSIONS',32,TEAL,True)
    y=290
    for line in [f"External width: {master.get('width',24):.3f} m",f"External depth: {master.get('depth',16):.3f} m",f"Height above finished floor: {master.get('height',12.701):.3f} m",f"Principal fascia top: +{master.get('fasciaTop',12.821):.3f} m",f"Finished floor: +{master.get('floor',.12):.3f} m",'Principal / secondary virtual route targets: 2.0 / 1.2 m']:
        txt(draw,(1040,y),line,29,WHITE);y+=51
    y+=32;txt(draw,(1040,y),'ORDINARY CAMERA / TRIANGLE AUDIT',32,TEAL,True);y+=66
    audit=f"{collision.get('count',0):,} camera poses, {collision.get('meshBatches',0)} mesh batches. {'No sampled eye point inside / within 0.30 m of audited solid geometry.' if clean else 'Triangle check incomplete or flags remain; inspect the JSON.'}"
    y+=wrapped(draw,(1040,y),audit,1290,29,WHITE,max_lines=4)+24
    y+=wrapped(draw,(1040,y),'Includes dense path targets and simulated 15 s / 30 s forward and reverse camera/progress damping at 60 Hz. Actual glTF node transforms, root rotations and crystal placement are applied.',1290,26,MUTED,max_lines=4)+28
    y+=wrapped(draw,(1040,y),'Limits: no swept human-body or physical-access certification. People and soft foliage are excluded. A source/triangle check is not a rendered traversal or video proof.',1290,26,GOLD,max_lines=4)+32
    if corridors:
        flags=sum(row.get('hardObjectFlags',0)+row.get('visitorFlags',0)+row.get('softFoliageFlags',0) for row in corridors.get('segments',[]))
        width_text=f"SEPARATE WIDTH CHECK: {len(corridors.get('segments',[]))} standing corridor/turn prisms at Y0.15–2.20 m; {flags} hard-object, visitor or foliage flags. Specific 2 m principal / 1.2 m Projection branch and Rental 2.4 m declared strip; no general aisle certification."
        y+=wrapped(draw,(1040,y),width_text,1290,25,TEAL,max_lines=3)+20
    txt(draw,(1040,y),'RENDERED FLOOR / TRAVERSAL EVIDENCE',30,TEAL,True);y+=62
    floor=capture('venue','floor-traversal') or capture('venue','floor') or capture('journey','floor') or capture('floor','traversal')
    floor_caption='A fixed material/phase/datum must remain coherent while the camera moves. Video and responsive test evidence are listed separately.'
    media_validation=read_json(REPORT/'verification/recording-media-validation.json',{})
    hall_record=next((row for row in media_validation.get('recordings',[]) if row.get('pass') and row.get('classification')=='shared-venue-traversal'),None)
    if hall_record:
        frames=hall_record.get('filmstrip',{}).get('frames',[])
        if frames:
            frame=frames[min(4,len(frames)-1)];floor=REPORT/frame['path']
            floor_caption=f"Actual decoded native-journey floor sample at {frame['atSeconds']:.2f} s. Raw movie and packet/PTS integrity records are linked; this is not a synthesized view."
    card(canvas,(1040,y,1310,420),'ACTUAL CONNECTING-FLOOR VIEW',floor,floor_caption,'venue:floor-traversal')
    wrapped(draw,(48,1690),'Materials remain separate: satin black, green coating, metal, translucent acrylic, upholstery and stone. Reflection softness belongs to the floor, not the entire camera image. Human/furniture scale is independent of the new shell.',W-96,26,MUTED,max_lines=3)
    generated.append(save(canvas,'07-floor-routes-measurements.png'))
    films=[row for row in media_validation.get('recordings',[]) if row.get('pass') and (REPORT/row.get('filmstrip',{}).get('path','missing')).is_file()]
    if films:
        canvas=Image.new('RGB',(W,270+len(films)*500+170),BG);draw=ImageDraw.Draw(canvas)
        header(canvas,'Recorded movement / real canvas frames','Actual routes through the connected venue','Service-stall walkthroughs and shared-floor journey | Stream-copy seekable containers retain raw packet hashes and PTS | Full videos are linked in the HTML report')
        for index,row in enumerate(films):
            image=image_file(REPORT/row['filmstrip']['path'])
            if image:
                thumb=ImageOps.contain(image,(W-88,463),Image.Resampling.LANCZOS);canvas.paste(thumb,(44,220+index*500))
        wrapped(draw,(48,270+len(films)*500),'Actual file cadence includes recording/review overhead. The shared-floor clip predates one Reception visitor relocation; its floor and native journey path are unchanged. Encoded timestamps/poses are evidence; target URLs or earlier position-only moving flags do not certify a settled angle. Strips do not show every instant.',W-96,25,GOLD,max_lines=3)
        generated.append(save(canvas,'08-recorded-routes.png'))
    if perf_rows:
        canvas=Image.new('RGB',(W,1810),BG);draw=ImageDraw.Draw(canvas)
        header(canvas,'Observed render conditions / final local export','Frame rate and frame spikes are separate evidence',f"Unrecorded desktop samples | One active 3D tab | High quality | 1280 x 720 viewport, DPR 1 | Export {performance.get('builtAt','timestamp pending')}")
        columns=[48,540,820,1130,1435,1770,2095]
        headings=['AREA','LATEST FPS','P95 FRAME','MAX FRAME','FRAMES >50 ms','>100 ms','FRAMES']
        for x,label in zip(columns,headings):txt(draw,(x,234),label,23,TEAL,True)
        labels=dict(STALLS)
        for index,row in enumerate(perf_rows):
            y=296+index*145;t=row['timing']
            draw.rounded_rectangle((44,y-12,W-44,y+119),radius=7,fill=PANEL,outline=EDGE,width=1)
            label={'anamorphic':'Content Studio','technical':'Technical','led-rental':'LED Rental','projection':'Projection','reception':'Reception','pillars':'Four-sided pillars'}.get(row['stall'],row['stall'])
            values=[label,str(row['fps']) if row['fps'] is not None else 'n/a',f"{t.get('p95Ms','n/a')} ms",f"{t.get('maxMs','n/a')} ms",str(t.get('over50','n/a')),str(t.get('over100','n/a')),f"{t.get('frames',0):,}"]
            for x,value in zip(columns,values):txt(draw,(x+5,y+7),value,32,WHITE,True)
            subtitle='Native journey retains idle camera movement.' if row['stall']=='pillars' else 'Front review camera settled; procedural screen media remains live.'
            txt(draw,(columns[0]+5,y+62),subtitle,21,MUTED)
        worst=sorted(perf_rows,key=lambda row:row['timing'].get('p95Ms',0),reverse=True)[:3]
        worst_text='; '.join(f"{row['stall']} {row['timing'].get('p95Ms','?')} ms" for row in worst)
        over100=sum(row['timing'].get('over100',0) for row in perf_rows)
        timing_note=f'The FPS value covers the latest 60 frames. P95, maximum frame time and spike counts cover each independently reset window, so recent FPS can conceal longer frames. Highest P95 values: {worst_text}. Frames above 100 ms across these windows: {over100}.'
        wrapped(draw,(48,1200),timing_note,W-96,29,GOLD,max_lines=4)
        wrapped(draw,(48,1393),'Scope: recorded NVIDIA RTX 2060 desktop / Chrome 155. Phone and tablet captures emulate viewport sizes on this desktop; they are not physical-device performance tests. The historical before build was not measured under controlled matching conditions, so no before/after speedup is asserted.',W-96,28,MUTED,max_lines=4)
        wrapped(draw,(48,1580),'Unrecorded render timing is distinct from encoded walkthrough cadence, which also includes recording and review-tool overhead. Full sample poses, frame counters, timestamps and render conditions are preserved in verification/performance-after.json. No universal frame-rate guarantee is inferred.',W-96,27,MUTED,max_lines=4)
        generated.append(save(canvas,'09-render-conditions.png'))
    responsive_checks=[row for row in responsive.get('checks',[]) if (REPORT/row.get('file','missing')).is_file()]
    if responsive_checks:
        canvas=Image.new('RGB',(W,1930),BG);draw=ImageDraw.Draw(canvas)
        header(canvas,'Viewport checks / rendered product controls','Portrait layouts and in-place resize','Actual fresh phone/tablet-size desktop viewports | DPR 1 | Native desktop GPU remains in use | No physical mobile-device test')
        responsive_titles=['RENTAL / PHONE FRESH LOAD','RENTAL / PHONE TO TABLET RESIZE','TECHNICAL / TABLET FRESH LOAD']
        for index,row in enumerate(responsive_checks[:3]):
            x=44+index*780;vp=row.get('viewport',{});controls=row.get('controls',[])
            caption=f"{vp.get('width','?')} x {vp.get('height','?')} CSS viewport. Horizontal overflow: {row.get('horizontalOverflow','not recorded')}. DOM rectangles: {sum(bool(c.get('visible')) for c in controls)}/{len(controls)} controls visible."
            card(canvas,(x,212,752,1310),responsive_titles[index],REPORT/row['file'],caption)
        wrapped(draw,(48,1575),'The rental interior controls remain usable after resizing the entered scene, and the tablet technical fresh load exposes the same review navigation. A portrait camera shows a narrower part of the wide stall; these images do not establish full-facade visibility at every aspect ratio.',W-96,29,GOLD,max_lines=4)
        log_note=f"The recorded session contains {len(responsive.get('logs',[]))} console log entries; inspect their timestamps and source." if responsive.get('logs') else 'The final recorded responsive-session console list is empty.'
        wrapped(draw,(48,1760),f'Source: verification/responsive-qa.json. IAB JPEG dimensions differ from CSS viewports and may omit the lower control area; visibility comes from recorded DOM rectangles. {log_note} Desktop viewport emulation does not reproduce mobile GPU, memory, touch latency or battery constraints.',W-96,26,MUTED,max_lines=3)
        generated.append(save(canvas,'10-responsive-viewports.png'))
    # Native actual detail crops remain accessible independently of composed boards.
    excluded_native={'projection-walk-01.jpg'} # Earlier lighting/camera stage; not final rendered evidence.
    actual_files=sorted(p for p in (REPORT/'captures').glob('*') if p.is_file() and p.suffix.lower() in ['.jpg','.png','.jpeg','.webp'] and p.name not in excluded_native and not (p.suffix.lower() in ['.jpg','.jpeg'] and 'native' in p.stem and p.with_suffix('.png').exists()) and not any(w in p.name.lower() for w in ['failed','blank','pending','-pre-']))
    unique_pending=sorted(set(PENDING_ITEMS))
    pending_verification=[]
    if not final_qa:pending_verification.append('Final coordinated QA record is absent.')
    if not final_qa.get('navigation',{}).get('renderedMovementRecorded'):pending_verification.append('Final recorded connected-venue movement evidence is absent.')
    if final_qa.get('recordedMovement',{}).get('count',0)<6:pending_verification.append('Five service walkthroughs plus shared-venue recording are incomplete.')
    if not final_qa.get('responsive',{}).get('pass'):pending_verification.append('Final scoped responsive fresh-load/resize checks are incomplete.')
    if final_qa.get('performance',{}).get('sampleCount',0)<6:pending_verification.append('Six final unrecorded single-tab timing samples are incomplete.')
    if not final_qa.get('fixedCamera',{}).get('pass'):pending_verification.append('Six historical camera replay checks are incomplete.')
    width_qa=final_qa.get('standingCorridorWidths',{})
    if not width_qa.get('prismCount') or any(width_qa.get(key,0) for key in ['hardObjectFlags','visitorFlags','foliageFlags']):pending_verification.append('Specific standing-width corridor-prism audit is incomplete or has flags.')
    status={'createdAt':datetime.now(timezone.utc).isoformat(),'scope':'Unpublished current development build','boardCount':len(generated),'actualCaptureCount':len(actual_files),'pendingImages':unique_pending,'sourceImages':SOURCES,'boards':[{'path':str(f.relative_to(REPORT)),'bytes':f.stat().st_size,'sha256':sha(f)} for f in generated],'comparisonLimit':'New reference views are separately framed. Fixed-camera pairs replay the historical pose; actual viewport/render conditions require their QA metadata. Media remains live; no image-match score.','excludedEvidence':['captures/excluded/*','captures/projection-walk-01.jpg (earlier stage)','Earlier native JPEG crops where a final PNG of the same name is present','verification/*failed*'],'diagnosticLimit':'Cutaways and envelope dimension datums are labelled. Final mesh deviations are in MEASUREMENTS.json.','generator':'scripts/build-grand-review.py','finalQa':'FINAL_QA.json' if final_qa else None,'verificationEvidence':{key:final_qa.get(key) for key in ['localExport','sourceChecks','recordedMovement','navigation','standingCorridorWidths','fixedCamera','responsive','performance','console']},'remainingDifferences':final_qa.get('remainingDifferences',[]),'pendingVerification':pending_verification,'exactReferenceMatchClaimed':False}
    (REPORT/'REVIEW_STATUS.json').write_text(json.dumps(status,indent=2),encoding='utf-8')
    dimensions=''.join(f"<tr><td>{html.escape(stall)}</td><td>{row.get('actual',{}).get('width','Reserved')}</td><td>{row.get('actual',{}).get('depth','24 x16 m open feature')}</td><td>{row.get('actual',{}).get('height',row.get('maximumHeight','—'))}</td><td>{'within tolerance' if row.get('pass') else 'review required'}</td></tr>" for stall,row in current_measurements.items())
    figures=''.join(f'<figure><a href="{f.relative_to(REPORT).as_posix()}"><img src="{f.relative_to(REPORT).as_posix()}" loading="lazy" alt="{html.escape(f.stem)} image review board"></a><figcaption>{html.escape(f.stem)} — open full-resolution PNG</figcaption></figure>' for f in generated)
    recordings=sorted(p for folder in ['recordings','captures'] for p in (REPORT/folder).glob('*') if p.is_file() and p.suffix.lower() in ['.mp4','.webm'] and not p.stem.endswith('-seekable') and '.part' not in p.name)
    media_rows={row['raw']:row for row in media_validation.get('recordings',[])}
    clip_rows=[]
    for f in recordings:
        seekable=f.with_name(f.stem+'-seekable.webm')
        player=seekable if seekable.exists() else f
        metadata=f.with_name(f.stem+'-metadata.json')
        metadata_link=f' · <a href="{metadata.relative_to(REPORT).as_posix()}">Timestamps / camera / stream metadata</a>' if metadata.exists() else ' · recording metadata pending'
        raw_link=f' · <a href="{f.relative_to(REPORT).as_posix()}">Untouched raw source</a>'
        filmstrip=f.with_name(f.stem+'-filmstrip.png')
        strip=f'<a href="{filmstrip.relative_to(REPORT).as_posix()}"><img src="{filmstrip.relative_to(REPORT).as_posix()}" alt="Actual decoded video-frame filmstrip" loading="lazy"></a>' if filmstrip.exists() else ''
        validation=media_rows.get(f.name,{})
        if validation.get('classification')=='shared-venue-traversal':
            low,high=validation['progressRange'];description=f'Shared venue floor traversal / native journey {low:.3f}–{high:.3f}; filename retains a previous shot. Recorded before the final single Reception visitor relocation; floor geometry and native path are unchanged.'
        else:description='Actual service-stall entry / interior / look-out / venue return recording.'
        clip_rows.append(f'<figure><video controls preload="metadata" style="width:100%" src="{player.relative_to(REPORT).as_posix()}"></video>{strip}<figcaption>{html.escape(description)} {html.escape(player.name)} — seekable stream copy when present{metadata_link}{raw_link}</figcaption></figure>')
    clips=''.join(clip_rows) or '<p class="note">Actual entry-to-interior-to-exit clips and the shared-venue traversal recording are pending. Still images do not demonstrate continuous movement.</p>'
    qa_files=sorted(p for p in REPORT.rglob('*.json') if 'baseline/source' not in p.as_posix() and any(k in p.name.lower() for k in ['qa','validation','performance','capture_manifest']) and p.name!='REVIEW_STATUS.json')
    qa_links=''.join(f'<li><a href="{p.relative_to(REPORT).as_posix()}">{html.escape(p.relative_to(REPORT).as_posix())}</a></li>' for p in qa_files) or '<li>Final rendered and responsive QA record pending.</li>'
    perf_table=''.join(f"<tr><td>{html.escape(row['stall'])}</td><td>{row['fps'] if row['fps'] is not None else 'n/a'}</td><td>{row['timing'].get('p95Ms','n/a')}</td><td>{row['timing'].get('maxMs','n/a')}</td><td>{row['timing'].get('over50','n/a')}</td><td>{row['timing'].get('over100','n/a')}</td><td>{row['timing'].get('frames','n/a')}</td></tr>" for row in perf_rows)
    perf_section=f'<h2>Final local render timing</h2><p>{html.escape(performance.get("method",""))}</p><table><thead><tr><th>Area</th><th>Latest FPS (60 frames)</th><th>P95 ms</th><th>Max ms</th><th>Frames &gt;50 ms</th><th>&gt;100 ms</th><th>Window frames</th></tr></thead><tbody>{perf_table}</tbody></table><p class="note">A recent FPS label can conceal frame spikes; read the full-window P95, maximum and counts alongside it. These are unrecorded desktop observations on NVIDIA RTX 2060 / Chrome 155, distinct from encoded video cadence. Pillars retain idle camera movement. No controlled before/after speedup or physical phone/tablet performance claim is made. <a href="verification/performance-after.json">Full timing and render conditions</a>.</p>' if perf_rows else '<p class="note">Final unrecorded single-tab performance evidence is pending.</p>'
    log_errors=[entry for entry in final_logs if entry.get('level')=='error']
    log_warnings=[entry for entry in final_logs if entry.get('level')=='warn']
    console_note=f'<p class="muted">The final multi-load replay log contains {len(log_errors)} error entries and {len(log_warnings)} warning entries. The recorded warnings are Three.Clock deprecation notices from the production dependency chunk. Earlier empty snapshots were point-in-time observations, not a universal warning-free claim. <a href="verification/final-browser-logs-after-replay.json">Final log evidence</a>.</p>' if (REPORT/'verification/final-browser-logs-after-replay.json').exists() else ''
    native=''.join(f'<a href="captures/{html.escape(f.name)}">{html.escape(f.name)}</a>' for f in actual_files)
    pending=''.join(f'<li>{html.escape(x)}</li>' for x in unique_pending) or '<li>No missing image slots detected. Read the final test/route limitations separately.</li>'
    document=f'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LivegridAV — Grand Stalls Implementation Review</title><style>
    :root{{color-scheme:dark}}*{{box-sizing:border-box}}body{{margin:0;background:#081015;color:#f2f3ed;font:16px/1.6 Segoe UI,Arial,sans-serif}}main{{max-width:1500px;margin:auto;padding:38px 24px 70px}}header{{border-top:4px solid #66d5bf;padding:24px 0}}small,.muted{{color:#afbdc2}}h1{{font-size:clamp(28px,4vw,54px);line-height:1.14;margin:9px 0 18px}}h2{{font-size:25px;margin:38px 0 12px}}a{{color:#8ce3cc}}.facts{{display:flex;gap:15px;flex-wrap:wrap}}.facts span{{border:1px solid #34454c;padding:9px 14px;border-radius:5px}}.note{{border-left:3px solid #e4c88e;padding:12px 18px;background:#111c22}}figure{{margin:30px 0;background:#111c22;border:1px solid #34454c}}figure img{{display:block;width:100%;height:auto}}figcaption{{padding:10px 16px;color:#afbdc2;font-size:13px}}table{{border-collapse:collapse;width:100%;font-size:14px}}td,th{{text-align:left;padding:10px 12px;border-bottom:1px solid #34454c}}.native{{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:9px}}.native a{{overflow-wrap:anywhere}}summary{{cursor:pointer;color:#e4c88e}}code{{color:#bde4da}}@media print{{body{{background:white;color:#17242b}}main{{padding:0}}figure{{break-inside:avoid}}}}
    </style><main><header><small>LIVEGRID AV / UNPUBLISHED LOCAL IMPLEMENTATION</small><h1>Grand-scale architecture.<br>Measured depth. Retained identities.</h1><p>Visual review of the six selected designs in the actual connected 3D venue. Reference photographs, historical pre-change renders and current local screenshots are clearly labelled.</p><div class="facts"><span>W24.000 × D16.000 × H12.701 m</span><span>Finished floor +0.120 m</span><span>{len(actual_files)} actual captures</span><span>{len(unique_pending)} image slots pending</span></div><p class="muted">Generated {date}. This review is repeatable as further verified captures arrive.</p></header>
    <p class="note">No reference-match percentage is claimed. New Front and reference views are separately framed. Additional fixed-camera pairs replay the historical pose; their viewport and render conditions are documented in QA metadata. Historical/current screenshot pixel sizes differ, so they are not pixel-registered. Projection's old X -49.80 m camera is outside the current hall's X +/-40 m bounds: its nearly black obstructed replay is preserved explicitly, not presented as a missing asset or failed render. Live media can differ between loads. Diagnostic cutaways show actual geometry, with design-envelope dimensions and separately measured overhead clearance. Missing evidence is shown explicitly.</p>
    <h2>Measured envelopes</h2><table><thead><tr><th>Stall</th><th>Width(m)</th><th>Depth(m)</th><th>Height above floor(m)</th><th>Geometry tolerance ±0.020 m</th></tr></thead><tbody>{dimensions}</tbody></table>
    <p><a href="FINAL_QA.json">Final coordinated QA and remaining limits</a> · <a href="DETAIL_REGISTER_FINAL.md">Element / detail register</a> · <a href="IMPLEMENTATION_NOTES.md">Implementation, assets and licences</a> · <a href="MEASUREMENTS.json">Geometry measurements / deviations</a> · <a href="VENUE_PLAN.svg">Dimensioned venue plan</a> · <a href="verification/main-journey-collision.json">Sampled camera / triangle check</a> · <a href="AISLE_WIDTH_EVIDENCE.md">Specific aisle-width scope</a> · <a href="verification/actual-corridor-width-sat.json">Actual standing-width prism SAT</a> · <a href="BEFORE_MANIFEST.json">Historical camera provenance</a> · <a href="REFERENCE_MANIFEST.json">Selected reference provenance</a> · <a href="REVIEW_STATUS.json">Review evidence manifest</a></p>
    <h2>Image review</h2>{figures}<h2>Native actual screenshots</h2><p class="muted">These link directly to browser captures. Composed boards only fit these images into report panels; they do not repaint the design.</p><div class="native">{native}</div>
    {perf_section}<h2>Test records and limitations</h2><ul>{qa_links}</ul>{console_note}<p class="muted">Read timestamps and scoped results; an earlier check does not automatically verify a later asset change. Phone/tablet evidence is viewport emulation on the recorded desktop browser, not a physical mobile-device benchmark. Before/after render conditions are not controlled for a speedup claim.</p><h2>Recorded movement</h2><p><a href="verification/recording-protocol.md">Local canvas recording protocol and limitations</a>. Superseded Reception and Projection movie bundles remain byte-preserved under <code>recordings/earlier/</code>; the current players below use the replacement bundles.</p>{clips}<h2>Evidence still pending</h2><details open><summary>{len(unique_pending)} missing image slots</summary><ul>{pending}</ul></details>
    <h2>Run and inspect locally</h2><p>From the project root, run <code>npm run dev -- --port 4320</code> for the source server. For the unpublished export used by final QA: run <code>npm run build</code>, then <code>node scripts/serve-export.mjs</code>; the latter binds <code>127.0.0.1:4310</code>. The venue opens by itself once the scene is ready; use the review controls after that.</p><p>Primary review routes: <a href="http://127.0.0.1:4310/?shot=pillars">Pillars</a> · <a href="http://127.0.0.1:4310/?shot=reception&amp;view=front">Reception</a> · <a href="http://127.0.0.1:4310/?shot=anamorphic&amp;view=front">Content Studio</a> · <a href="http://127.0.0.1:4310/?shot=technical&amp;view=front">Technical</a> · <a href="http://127.0.0.1:4310/?shot=led-rental&amp;view=front">LED Rental</a> · <a href="http://127.0.0.1:4310/?shot=projection&amp;view=front">Projection</a>. <code>perf=1</code> displays scoped diagnostics; <code>camera=baseline</code> replays the historical camera; <code>record=1</code> exposes the local canvas recorder.</p>
    <p class="note">Exact source-reference human likeness/poses, plant silhouettes, photographic material response, scene-dressing density and some architectural proportions still differ. Available Rocketbox people are MIT-licensed substitutes; surface maps carry documented CC0 provenance. Local IAB timing is not universal performance evidence; viewport-emulated captures are not physical phone/tablet hardware tests, and no controlled before/after speedup is asserted. A virtual layout is not construction, accessibility or projector-coverage certification.</p>
    <p>Implementation notes: <a href="floor-navigation-implementation.md">Shared floor / real-room navigation</a> · <a href="PROJECTION_IMPLEMENTATION.md">Projection architecture and measured routes</a> · <a href="baseline/studio-technical-implementation.md">Studio / technical changes</a>. Assets and typography are listed in the source/licence notes. No deployment or publication was performed.</p>
    </main></html>'''
    (REPORT/'index.html').write_text(document,encoding='utf-8')
    print(json.dumps({'boards':len(generated),'actualCaptures':len(actual_files),'pendingImageSlots':len(unique_pending),'report':str(REPORT/'index.html')},indent=2))

if __name__=='__main__':main()
