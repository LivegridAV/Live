"""Preserve actual canvas videos, add seekable containers and measured evidence.
No recoding or synthesized frames: ffmpeg copies streams and extracts real frames.
"""
from __future__ import annotations
import hashlib, json, os, shutil, subprocess, sys
from datetime import datetime, timezone
from pathlib import Path
from statistics import median
from urllib.parse import urlparse, parse_qs
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT=Path(__file__).resolve().parents[1]
REPORT=ROOT/'reports/grand-stalls/20261018-implementation'
RECORDINGS=REPORT/'recordings'
VERIFY=REPORT/'verification'
FFPROBE=shutil.which('ffprobe');FFMPEG=shutil.which('ffmpeg')

def run(args):
    result=subprocess.run(args,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=120)
    if result.returncode:raise RuntimeError(result.stderr[-1400:])
    return result.stdout

def sha(file):return hashlib.sha256(file.read_bytes()).hexdigest()

def probe(file):
    return json.loads(run([FFPROBE,'-v','error','-select_streams','v:0','-count_frames',
        '-show_packets','-show_data_hash','sha256','-show_entries',
        'stream=codec_name,width,height,r_frame_rate,avg_frame_rate,nb_read_frames,time_base:format=duration,size,bit_rate:packet=pts_time,dts_time,duration_time,size,data_hash',
        '-of','json',str(file)]))

def font(size,bold=False):
    for name in (['segoeuib.ttf','arialbd.ttf'] if bold else ['segoeui.ttf','arial.ttf']):
        file=Path('C:/Windows/Fonts')/name
        if file.exists():return ImageFont.truetype(str(file),size)
    return ImageFont.load_default(size=size)

def percentile(values,p):
    return sorted(values)[min(len(values)-1,int((len(values)-1)*p))] if values else None

def filmstrip(video,record,metadata):
    frames_dir=RECORDINGS/'frames';frames_dir.mkdir(exist_ok=True)
    pts=record['timestamps'];first=pts['firstPtsSeconds'];span=pts['lastPtsSeconds']-first
    samples=metadata.get('samples',[]);start=samples[0].get('performanceNow',0) if samples else 0
    groups=[]
    for sample in samples:
        t=(sample.get('performanceNow',start)-start)/1000
        target=parse_qs(urlparse(sample.get('url','')).query).get('view',['native'])[0]
        key=(sample.get('cameraMode'),target)
        if not groups or groups[-1]['key']!=key:groups.append({'key':key,'start':t,'end':t})
        else:groups[-1]['end']=t
    if record['classification']=='shared-venue-traversal':
        times=[]
        for target in [.340,.456,.566,.596,.692,.718]:
            near=[sample for sample in samples if sample.get('journeyProgress') is not None and abs(float(sample['journeyProgress'])-target)<.002]
            stable=[sample for sample in near if sample.get('cameraMoving')=='false']
            options=stable or near
            if options:sample=options[len(options)//2]
            else:sample=min(samples,key=lambda item:abs(float(item.get('journeyProgress') or 0)-target))
            times.append(max(first,min(pts['lastPtsSeconds']-.10,(sample['performanceNow']-start)/1000)))
    else:
        times=[max(first,min(pts['lastPtsSeconds']-.10,(group['start']+group['end'])/2)) for group in groups]
        times.append(max(first,pts['lastPtsSeconds']-.10))
        times=sorted(set(times))
        if len(times)>5:times=[times[round(index*(len(times)-1)/4)] for index in range(5)]
        while len(times)<5:
            edges=[first,*times,pts['lastPtsSeconds']];a,b=max(zip(edges,edges[1:]),key=lambda pair:pair[1]-pair[0])
            times.append((a+b)/2);times.sort()
    canvas=Image.new('RGB',(3000,600),'#081015');draw=ImageDraw.Draw(canvas)
    title='SHARED VENUE FLOOR / NATIVE JOURNEY' if record['classification']=='shared-venue-traversal' else record['raw'].replace('scene-','').split('-2026-')[0].replace('-',' ').upper()
    draw.text((32,24),'ACTUAL CANVAS RECORDING / '+title,font=font(37,True),fill='#f2f3ed')
    draw.text((32,77),f'{len(times)} decoded frames from the saved video. These are real recorded views; no reference artwork replaces the scene.',font=font(23),fill='#afbdc2')
    frame_rows=[]
    width=(3000-64-15*(len(times)-1))//len(times);frame_height=int(width*9/16)
    for index,t in enumerate(times):
        frame=frames_dir/f"{Path(record['raw']).stem}-{index:02d}.jpg"
        run([FFMPEG,'-nostdin','-hide_banner','-loglevel','error','-y','-ss',f'{t:.6f}','-i',str(video),'-frames:v','1','-q:v','2',str(frame)])
        with Image.open(frame) as source:image=ImageOps.exif_transpose(source).convert('RGB')
        thumbnail=ImageOps.contain(image,(width,frame_height),Image.Resampling.LANCZOS)
        x=32+index*(width+15);draw.rectangle((x,126,x+width,126+frame_height),outline='#34454c',width=2)
        canvas.paste(thumbnail,(x+(width-thumbnail.width)//2,126+(frame_height-thumbnail.height)//2))
        sample=min(samples,key=lambda item:abs((item.get('performanceNow',start)-start)/1000-t)) if samples else {}
        view=parse_qs(urlparse(sample.get('url','')).query).get('view',[sample.get('cameraMode','scene')])[0]
        label=f'{t:.2f} s / p {sample.get("journeyProgress")}' if record['classification']=='shared-venue-traversal' else f'Encoded time {t:.2f} s'
        draw.text((x,140+frame_height),label,font=font(25,True),fill='#8ce3cc')
        frame_rows.append({'atSeconds':t,'path':frame.relative_to(REPORT).as_posix(),'sha256':sha(frame),'nearestCameraMode':sample.get('cameraMode'),'nearestView':view})
    cadence=record['cadence']
    footer=f"{record['stream']['width']} x {record['stream']['height']} / {record['stream']['codec_name'].upper()} / {record['stream']['nb_read_frames']} decoded frames / {cadence['meanFpsFromPts']:.2f} fps from PTS / p95 interval {cadence['p95FrameIntervalMs']:.1f} ms"
    draw.text((32,525),footer,font=font(24),fill='#e4c88e')
    draw.text((32,564),'Raw source preserved. Packet hashes and PTS match after stream copy. Frames may be mid-turn; UI targets are not proof of a settled view.',font=font(21),fill='#afbdc2')
    target=RECORDINGS/f"{Path(record['raw']).stem}-filmstrip.png";canvas.save(target,optimize=True)
    return {'path':target.relative_to(REPORT).as_posix(),'sha256':sha(target),'frames':frame_rows}

def main():
    if not FFPROBE or not FFMPEG:raise SystemExit('Installed ffmpeg and ffprobe are required; no download attempted.')
    RECORDINGS.mkdir(parents=True,exist_ok=True);VERIFY.mkdir(exist_ok=True)
    previous_file=VERIFY/'recording-media-validation.json'
    try:previous={row['raw']:row for row in json.loads(previous_file.read_text(encoding='utf-8')).get('recordings',[])}
    except (FileNotFoundError,ValueError):previous={}
    records=[];reused=0
    for raw in sorted(RECORDINGS.glob('*.webm')):
        if raw.stem.endswith('-seekable') or '.part' in raw.name:continue
        entry={'raw':raw.name,'rawSha256':sha(raw)}
        cached=previous.get(raw.name,{})
        metadata_file=raw.with_name(raw.stem+'-metadata.json')
        metadata_hash=sha(metadata_file) if metadata_file.exists() else None
        if '--force' not in sys.argv and cached.get('pass') and cached.get('rawSha256')==entry['rawSha256'] and cached.get('metadataSha256')==metadata_hash:
            retain=[(RECORDINGS/cached.get('seekable','missing'),cached.get('seekableSha256')),
                (REPORT/cached.get('filmstrip',{}).get('path','missing'),cached.get('filmstrip',{}).get('sha256'))]
            retain.extend((REPORT/frame['path'],frame.get('sha256')) for frame in cached.get('filmstrip',{}).get('frames',[]))
            if retain and all(file.is_file() and expected and sha(file)==expected for file,expected in retain):
                entry=dict(cached);entry['integrityReused']={'at':datetime.now(timezone.utc).isoformat(),'reason':'Raw, metadata, seekable container, filmstrip and decoded-frame bytes match their prior verified SHA256 evidence. No new encoding/geometry claim.'}
                records.append(entry);reused+=1;continue
        try:
            original=probe(raw);packets=original.get('packets',[])
            pts=[float(packet['pts_time']) for packet in packets if 'pts_time' in packet]
            if len(pts)<2:raise RuntimeError('At least two encoded timestamps are required.')
            seekable=raw.with_name(raw.stem+'-seekable.webm');temporary=raw.with_name(raw.stem+'-seekable.part.webm')
            run([FFMPEG,'-nostdin','-hide_banner','-loglevel','error','-y','-i',str(raw),'-map','0','-c','copy',str(temporary)])
            remux=probe(temporary)
            hashes=[packet.get('data_hash') for packet in packets]
            payload_same=bool(hashes) and all(value and value.startswith('SHA256:') for value in hashes) and hashes==[packet.get('data_hash') for packet in remux.get('packets',[])]
            pts_same=[packet.get('pts_time') for packet in packets]==[packet.get('pts_time') for packet in remux.get('packets',[])]
            if not payload_same or not pts_same:raise RuntimeError('Remux packet payload or presentation timestamps differ; review required.')
            os.replace(temporary,seekable)
            intervals=[(b-a)*1000 for a,b in zip(pts,pts[1:])]
            metadata=json.loads(metadata_file.read_text(encoding='utf-8')) if metadata_file.exists() else {}
            samples=metadata.get('samples',[])
            progress=[float(sample['journeyProgress']) for sample in samples if sample.get('journeyProgress') is not None]
            progress_range=[min(progress),max(progress)] if progress else None
            journey_count=sum(sample.get('cameraMode')=='journey' for sample in samples)
            classification='shared-venue-traversal' if progress_range and progress_range[1]-progress_range[0]>.20 and journey_count>len(samples)*.8 else 'service-stall-walkthrough'
            last_duration=float(packets[-1].get('duration_time',0))
            entry.update({
                'pass':True,'seekable':seekable.name,'seekableSha256':sha(seekable),
                'metadata':metadata_file.name if metadata_file.exists() else None,
                'metadataSha256':sha(metadata_file) if metadata_file.exists() else None,
                'classification':classification,'progressRange':progress_range,
                'classificationBasis':'Actual cameraMode and recorded journey-progress span; URL shot and filename may retain a previous view.',
                'stream':original.get('streams',[{}])[0],
                'packetCount':len(packets),'payloadIdentical':payload_same,'presentationTimestampsIdentical':pts_same,
                'timestamps':{'firstPtsSeconds':pts[0],'lastPtsSeconds':pts[-1],'spanSeconds':pts[-1]-pts[0],
                    'lastPacketReportedDurationSeconds':last_duration,'lastPacketEndSeconds':pts[-1]+last_duration,
                    'seekableContainerDurationSeconds':float(remux.get('format',{}).get('duration',0))},
                'cadence':{'meanFpsFromPts':(len(pts)-1)/(pts[-1]-pts[0]),'medianFrameIntervalMs':median(intervals),
                    'p95FrameIntervalMs':percentile(intervals,.95),'maxFrameIntervalMs':max(intervals),
                    'intervalsOver100ms':sum(value>100 for value in intervals),'intervalsOver250ms':sum(value>250 for value in intervals)},
                'captureDurationSeconds':metadata.get('durationSeconds'),
                'recordedViewports':sorted({json.dumps(sample.get('viewport',{}),sort_keys=True) for sample in samples}),
                'recordedModes':sorted({sample.get('cameraMode','') for sample in samples}),
                'recordedViews':sorted({parse_qs(urlparse(sample.get('url','')).query).get('view',['native'])[0] for sample in samples}),
                'limits':['Requested stream frameRate and r_frame_rate are not measured rendered/encoded FPS. PTS intervals measure saved-file cadence.',
                    'Recording overhead differs from unrecorded frame timing. Holds caused by real review-tool latency remain in this raw evidence.',
                    'Filmstrip frames are actual video decodes, with sampled camera labels; they do not by themselves prove continuous unobstructed motion.'],
            })
            entry['filmstrip']=filmstrip(seekable,entry,metadata)
        except Exception as error:
            entry.update({'pass':False,'error':str(error)})
        records.append(entry)
    result={'createdAt':datetime.now(timezone.utc).isoformat(),'method':'ffmpeg stream copy / ffprobe actual packet SHA256, PTS, decoded-frame count / actual decoded-frame filmstrips',
        'passMeaning':'Stream-copy payload/timestamp integrity and frame extraction succeeded; route visibility, rendering quality and reference appearance require separate review.',
        'rawPreserved':True,'reusedUnchangedRecordings':reused,'reuseMethod':'Unchanged raw, metadata, seekable, filmstrip and frame hashes retain earlier verified packet/PTS proof; --force repeats ffprobe/decode.', 'toolVersions':{'ffmpeg':run([FFMPEG,'-version']).splitlines()[0],'ffprobe':run([FFPROBE,'-version']).splitlines()[0]},'recordings':records}
    target=VERIFY/'recording-media-validation.json';target.write_text(json.dumps(result,indent=2),encoding='utf-8')
    print(json.dumps({'recordings':len(records),'passed':sum(record.get('pass',False) for record in records),'failed':sum(not record.get('pass',False) for record in records),'reusedUnchanged':reused,'report':str(target)},indent=2))

if __name__=='__main__':main()
