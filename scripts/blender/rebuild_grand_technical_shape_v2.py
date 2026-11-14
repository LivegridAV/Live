"""Technical shape-v2 pavilion, native metres; preserves the rejected exports.

Run Blender --background --factory-startup --python this-file.py.
An actual ninety-degree folded crown replaces the rejected shallow chevron and
warehouse box. The selected reference's opaque and transmitted wings, narrow
left return, portrait right return and three canted working bays are independent
architectural assemblies. Human-scale equipment and visitors remain native.
"""
from pathlib import Path
import hashlib

OLD=Path(__file__).with_name('rebuild_technical_showcase.py')
exec(compile(OLD.read_text(encoding='utf-8').split('# Shared connected platform')[0],str(OLD),'exec'))
CFG=json.loads((ROOT/'public/models/expo/grand-dimensions.json').read_text())
M=CFG['master'];F=M['floor'];TOP=M['fasciaTop'];OUTDIR=ROOT/'public/models/expo'
ROOT_ANCHOR=CFG['placements']['technical']['root'];ROOT_YAW=CFG['placements']['technical']['yaw']
SCREENS=[];TYPOGRAPHY=[];ROLE_BOUNDS=[];EXPORTS={};ROUTE=[]
WORKTOP=1.10
ASSET_PREFIX='grand-technical-shape-v2'
EXPOSED_BRAND=BRAND.copy()
EXPOSED_BRAND.name='Technical | exposed fascia porcelain lettering'

def bounds(objects):
    bpy.context.view_layer.update()
    points=[ob.matrix_world@v.co for ob in objects if ob.type=='MESH' for v in ob.data.vertices]
    return {'min':[min(p.x for p in points),min(p.z for p in points),-max(p.y for p in points)],
            'max':[max(p.x for p in points),max(p.z for p in points),-min(p.y for p in points)]} if points else None

def record(role,before,overhead=False):
    objects=set(bpy.context.scene.objects)-before
    for ob in objects:
        if ob.type=='MESH':ob['grandRole']='section-wall' if role=='side-right' else role;ob['grandOverhead']=overhead
    ROLE_BOUNDS.append({'role':role,'bounds':bounds(objects),'overhead':overhead})
    return objects

def lift_native(before):
    for ob in set(bpy.context.scene.objects)-before:
        if ob.parent not in set(bpy.context.scene.objects)-before:ob.location.z+=F

def batch_export(name,objects):
    bpy.context.view_layer.update();meshes=[ob for ob in objects if ob.type=='MESH']
    for ob in meshes:
        matrix=ob.matrix_world.copy();ob.data=ob.data.copy();ob.parent=None;ob.matrix_world=matrix
    groups={}
    for ob in meshes:
        # Keep role boundaries so actual cutaways and measured plans remain possible.
        key=(ob.get('grandRole','detail'),ob.get('grandOverhead',False),ob.data.materials[0].name)
        groups.setdefault(key,[]).append(ob)
    result=[]
    for (role,overhead,finish),items in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for ob in items:ob.select_set(True)
        bpy.context.view_layer.objects.active=items[0]
        if len(items)>1:bpy.ops.object.join()
        ob=bpy.context.view_layer.objects.active;ob.name=f'{name} | {role} | {finish}'
        ob.data.transform(ob.matrix_world);ob.matrix_world=Matrix.Identity(4);ob.data.update()
        ob['grandRole']=role;ob['grandOverhead']=overhead;result.append(ob)
    bpy.ops.object.select_all(action='DESELECT')
    for ob in result:ob.select_set(True)
    path=OUTDIR/(name+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,
        export_materials='EXPORT',export_extras=True,export_cameras=False,export_lights=False,export_animations=False)
    EXPORTS[name]={'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size,'bounds':bounds(result)}
    return result

def sign(body,p,cap,width,**kwargs):
    # Uniform fit preserves font aspect and measures actual glyph bounds.
    kwargs.pop('semibold',None)
    ob=caption_text(body,p,cap,max_width=width,**kwargs)
    return ob

def exposed_sign(body,p,cap,width,**kwargs):
    ob=sign(body,p,cap,width,**kwargs)
    # Keep these native raised glyphs independent from both transmitting sheet
    # batches. Runtime draws this opaque white finish after its transmission
    # prepass, so the glazing cannot blur foreground copy into its background.
    ob.data.materials[0]=EXPOSED_BRAND
    return ob

def solid_plan(name,plan,bottom,top,mat):
    """Closed polygonal prism, including concave/mitered plan geometry."""
    n=len(plan)
    verts=[(x,y,z) for y in (bottom,top) for x,z in plan]
    faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
    faces.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
    ob=patch_mesh(name,verts,faces,mat)
    bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(ob.data);bm.free()
    return ob

def line_frame(a,b):
    d=Vector((b[0]-a[0],b[1]-a[1]))
    return d.length,math.atan2(-d.y,d.x),((a[0]+b[0])/2,(a[1]+b[1])/2)

def panel_on_line(name,a,b,bottom,top,depth,mat):
    length,yaw,mid=line_frame(a,b)
    before=set(bpy.context.scene.objects)
    box(name,(0,(bottom+top)/2,-depth/2),(length,top-bottom,depth),mat,.014)
    group(name+' fitted plane',before,(mid[0],0,mid[1]),yaw)
    return length,yaw,mid

def sloped_panel_on_line(name,a,b,bottom,top_a,top_b,depth,mat):
    length,yaw,mid=line_frame(a,b);normal=(math.sin(yaw),math.cos(yaw))
    back_a=(a[0]-normal[0]*depth,a[1]-normal[1]*depth)
    back_b=(b[0]-normal[0]*depth,b[1]-normal[1]*depth)
    verts=[(a[0],bottom,a[1]),(b[0],bottom,b[1]),(back_b[0],bottom,back_b[1]),(back_a[0],bottom,back_a[1]),
           (a[0],top_a,a[1]),(b[0],top_b,b[1]),(back_b[0],top_b,back_b[1]),(back_a[0],top_a,back_a[1])]
    ob=patch_mesh(name,verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],mat)
    return length,yaw,mid

def roof_quad(name,points,mat,thickness=.115):
    """Actual closed descending soffit surface, expressed in native metres."""
    n=len(points);verts=points+[(x,y+thickness,z) for x,y,z in points]
    faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
    faces.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
    ob=patch_mesh(name,verts,faces,mat)
    bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(ob.data);bm.free()
    return ob

# The front crown really turns ninety degrees in plan. Its concave joint is
# mitered through the whole 1.70m volume; it is not two near-coplanar signs.
# No roof/opaque wall is placed behind the upper clear wing: the hall truss
# remains visible through its separate front, rear and closed end sheets.
CROWN_A=(-10.70,7.70);CROWN_B=(.10,-3.10);CROWN_C=(10.70,7.50)
CROWN_DEPTH=1.70;CROWN_BOTTOM=10.12;BAY_TOP=7.695
edge=CROWN_DEPTH/math.sqrt(2)
CROWN_IN_A=(CROWN_A[0]-edge,CROWN_A[1]-edge)
CROWN_IN_B=(CROWN_B[0],CROWN_B[1]-2*edge)
CROWN_IN_C=(CROWN_C[0]+edge,CROWN_C[1]-edge)
shell_start=set(bpy.context.scene.objects)
before=set(bpy.context.scene.objects)
box('Technical grand 24m x16m finished mineral platform',(0,F/2,0),(24,F,16),FLOOR,.018)
record('platform',before)
before=set(bpy.context.scene.objects)
box('Technical rear service boundary behind occupied faceted bays',(0,(F+BAY_TOP)/2,-7.85),(23.40,BAY_TOP-F,.30),PANEL,.018)
record('rear-boundary',before)
for side in(-1,1):
    before=set(bpy.context.scene.objects)
    box('Technical short rear side service return',(side*11.79,(F+BAY_TOP)/2,-5.15),(.22,BAY_TOP-F,5.40),PANEL,.016)
    record('side-left' if side<0 else 'side-right',before)

before=set(bpy.context.scene.objects)
solid_plan('Technical mitered opaque corner crown',[CROWN_A,CROWN_B,CROWN_IN_B,CROWN_IN_A],CROWN_BOTTOM,TOP,PANEL)
length,yaw,mid=line_frame(CROWN_A,CROWN_B)
mark_start=set(bpy.context.scene.objects)
wordmark((-length/2+1.0,CROWN_BOTTOM+.99,.025),1.48,word_scale=1.48,icon_scale=.94,gap=.06)
sign('PEOPLE  TECHNOLOGY  EXTRAORDINARY EVENTS',(-length/2+1.02,CROWN_BOTTOM+.36,.045),.49,length-2.0,tracking=1.06)
group('Technical large reference brand lockup',mark_start,(mid[0],0,mid[1]),yaw)
record('fascia-brand',before,True)

before=set(bpy.context.scene.objects)
for label,a,b,thickness in(('front',CROWN_B,CROWN_C,.045),('back',CROWN_IN_B,CROWN_IN_C,.030),('miter',CROWN_B,CROWN_IN_B,.040)):
    panel_on_line('Technical separate transmitted crown '+label+' sheet',a,b,CROWN_BOTTOM+.025,TOP-.025,thickness,ACRYLIC)
    for yy in(CROWN_BOTTOM+.030,TOP-.030):
        rod('Technical clear crown satin closed edge',(a[0],yy,a[1]),(b[0],yy,b[1]),.022,SILVER,12)
        rod('Technical clear crown continuous neutral optical edge',(a[0],yy,a[1]+.025),(b[0],yy,b[1]+.025),.009,NEUTRAL_COVE,10)
for x,z in(CROWN_B,CROWN_C,CROWN_IN_B,CROWN_IN_C):
    rod('Technical acrylic crown solid vertical edge',(x,CROWN_BOTTOM+.025,z),(x,TOP-.025,z),.022,SILVER,12)
    rod('Technical acrylic crown vertical white diffuser',(x,CROWN_BOTTOM+.025,z+.024),(x,TOP-.025,z+.024),.009,NEUTRAL_COVE,10)
length,yaw,mid=line_frame(CROWN_B,CROWN_C)
mark_start=set(bpy.context.scene.objects)
exposed_sign('FROM VISION',(length*.12,CROWN_BOTTOM+1.52,.055),.63,length*.55,tracking=1.13,centered=True)
exposed_sign('TO LIVE',(length*.19,CROWN_BOTTOM+.88,.055),.63,length*.46,tracking=1.13,centered=True)
exposed_sign('—',(length*.32,CROWN_BOTTOM+.40,.055),.26,1.0)
group('Technical lettering on genuinely clear corner wing',mark_start,(mid[0],0,mid[1]),yaw)
record('fascia-clear',before,True)

# Solid short endcaps close the reference crown and remain distinct from its
# transparent central wing. Neither is a 16m long full-height box wall.
for label,a,b in(('left',(-11.70,4.75),CROWN_A),('right',CROWN_C,(11.70,4.55))):
    before=set(bpy.context.scene.objects)
    length,yaw,mid=panel_on_line('Technical '+label+' deep black crown return',a,b,CROWN_BOTTOM,TOP,.27,PANEL)
    record('fascia-return-'+label,before,True)

# The reference's outside short face is exposed opaque black, not lettering
# behind a transmitting end cover. Close the real acrylic volume with this
# solid cap; put its native white glyphs on the outward-facing physical plane.
before=set(bpy.context.scene.objects)
length,yaw,mid=panel_on_line('Technical exposed solid black clear-wing endcap',CROWN_C,CROWN_IN_C,CROWN_BOTTOM,TOP,.27,PANEL)
marks=set(bpy.context.scene.objects)
for i,line in enumerate(('TECHNICAL','CREATIVE','HUMAN')):
    exposed_sign(line,(-length*.43,CROWN_BOTTOM+1.94-i*.53,.035),.57,length*.86,tracking=1.04)
exposed_sign('—',(-length*.43,CROWN_BOTTOM+.30,.035),.25,length*.50)
group('Technical crisp exposed right endcap lettering',marks,(mid[0],0,mid[1]),yaw)
record('fascia-solid-exposed-endcap',before,True)

# A physically descending soffit connects the high crown to the lower native
# landscape-display bay composition. Only its narrow front border is pearl;
# the broad inner overhead surface is dark acoustic metal, matching the sober
# reference ceiling rather than creating a large white wedge above the room.
before=set(bpy.context.scene.objects)
roof_front=[(-11.70,4.75),CROWN_A,(-3.30,.30),CROWN_B,(3.30,.10),CROWN_C,(11.70,4.55)]
roof_back=[(-11.70,-2.50),(-10.30,-2.50),(-3.30,-5.30),(.10,-5.30),(3.30,-5.30),(9.70,-2.50),(11.70,-2.50)]
front_under=CROWN_BOTTOM-.115
def roof_point(front,back,t):
    return (front[0]+(back[0]-front[0])*t,front_under+(BAY_TOP-front_under)*t,front[1]+(back[1]-front[1])*t)
for i in range(len(roof_front)-1):
    fa,fb=roof_front[i:i+2];ba,bb=roof_back[i:i+2]
    for start,end,finish,label in((0,.11,CANOPY_PEARL,'narrow pearl border'),(.11,1,ROOF,'descending dark acoustic return')):
        roof_quad('Technical '+label,[roof_point(fa,ba,start),roof_point(fb,bb,start),roof_point(fb,bb,end),roof_point(fa,ba,end)],finish)
    rod('Technical uninterrupted recessed warm outer soffit channel',(fa[0],front_under-.017,fa[1]),(fb[0],front_under-.017,fb[1]),.018,WHITE_COVE,12)
solid_plan('Technical lower rear acoustic service ceiling',[(-11.7,-2.5),(-10.3,-2.5),(-3.3,-5.3),(3.3,-5.3),(9.7,-2.5),(11.7,-2.5),(11.7,-7.7),(-11.7,-7.7)],BAY_TOP,BAY_TOP+.115,ROOF)
for a,b in((( -10.6,-2.0),(-3.3,-5.5)),((-3.3,-5.5),(3.3,-5.5)),((3.3,-5.5),(10.6,-2.0))):
    rod('Technical rear header soft wall wash channel',(a[0],BAY_TOP-.022,a[1]),(b[0],BAY_TOP-.022,b[1]),.018,WHITE_COVE,12)
for x,z in((-9,-1.3),(-6,-3),(-2,-5.7),(2,-5.7),(6,-3),(9,-1.3)):
    rod('Technical soffit recessed downlight housing',(x,BAY_TOP-.005,z),(x,BAY_TOP-.11,z),.065,EQUIPMENT,12)
    rod('Technical soffit soft warm downlight lens',(x,BAY_TOP-.112,z),(x,BAY_TOP-.116,z),.052,LENS,12)
record('ceiling',before,True)
before=set(bpy.context.scene.objects)
for z in(-7.91,7.91):box('Technical continuous platform recessed toe',(0,.065,z),(23.88,.021,.020),WHITE_COVE,.003)
record('platform-edge',before)
shell=record('shell-export',shell_start) if False else set(bpy.context.scene.objects)-shell_start
batch_export(ASSET_PREFIX+'-shell',shell)

# Actual interior: three matching header grids and independent native-scale
# consoles; the visitor corridor is separated from work areas in real depth.
interior_start=set(bpy.context.scene.objects)
BAYS=[]
for index,(bay_id,a,b,title,subtitle,hint,work_hint) in enumerate((
 ('av',(-10.3,-2.5),(-3.3,-5.3),'AV ENGINEERING','DESIGN | INTEGRATE | DELIVER','tech-engineering','tech-workstation-av'),
 ('show',(-3.3,-5.3),(3.3,-5.3),'SHOW CONTROL','CUES | TIMELINES | AUTOMATION','tech-show-control','tech-workstation-cues'),
 ('live',(3.3,-5.3),(9.7,-2.5),'LIVE PRODUCTION','CAPTURE | SWITCH | STREAM | DELIVER','tech-live-production','tech-workstation-production'))):
    before=set(bpy.context.scene.objects);first=len(SCREENS)
    width,yaw,mid=line_frame(a,b);cx,z=mid;w=width-.16
    box('Technical connected faceted bay graphite panel',(0,(F+BAY_TOP)/2,-.14),(width,BAY_TOP-F,.22),PANEL,.016)
    box('Technical bay aligned header meeting descending soffit',(0,BAY_TOP-.575,.035),(width,1.15,.14),STEEL,.014)
    sign(title,(-w/2+.22,7.15,.125),1.05,w-.44,semibold=True)
    sign(subtitle,(-w/2+.22,6.69,.130),.40,w-.44,tracking=1.03)
    screen_w=w-.04;screen_h=screen_w*9/16;screen_top=6.385
    aperture(('av-drafting','show-cues','live-multiview')[index],(0,screen_top-screen_h/2,.045),screen_w,screen_h,hint,frame=.035)
    box('Technical human scale black workstation',(0,(F+WORKTOP-.07)/2,2.35),(w,WORKTOP-.07-F,1.04),STEEL,.018)
    box('Technical thin brushed workbench',(0,WORKTOP-.035,2.35),(w+.03,.07,1.10),SILVER,.018)
    box('Technical recessed workstation warm toe',(0,.19,2.885),(w-.12,.024,.022),WHITE_COVE,.004)
    for j,dx in enumerate((-2.55,-.90,.85,2.5)):
        monitor(bay_id+'-monitor-'+str(j),dx,1.51,2.30,1.18,.67,work_hint)
        keyboard(dx,WORKTOP+.035,2.67,.74)
    console(0,WORKTOP+.025,2.57)
    seats=set(bpy.context.scene.objects)
    operator_chair(-1.75,3.65,.05);operator_chair(1.75,3.65,-.05)
    lift_native(seats)
    rack(-w/2+.50,1.65)
    group('Technical '+bay_id+' reference canted complete bay',before,(cx,0,z),yaw)
    co,si=math.cos(yaw),math.sin(yaw)
    for screen in SCREENS[first:]:
        xx,yy,zz=screen['p'];p=[cx+co*xx+si*zz,yy,z-si*xx+co*zz]
        screen.update(p=p,position=p,x=p[0],y=p[1],z=p[2]);screen['rotation'][1]+=yaw
    record('bay-'+bay_id,before)
    BAYS.append({'id':bay_id,'center':cx,'z':z,'yaw':yaw,'planEnds':[a,b],'width':w,'headerBaseline':7.15,'subtitleBaseline':6.69,'top':BAY_TOP,'soffitGap':0,'mainScreenAspect':16/9,'worktopY':WORKTOP})

# The selected reference terminates with two narrow occupied returns. The
# right return is a full portrait concert display, not a blank charcoal wall.
before=set(bpy.context.scene.objects)
left_a=(-11.70,4.75);left_b=(-10.30,-2.50)
length,yaw,mid=sloped_panel_on_line('Technical narrow left branding return',left_a,left_b,F,front_under,BAY_TOP,.24,PANEL)
marks=set(bpy.context.scene.objects)
for i,line in enumerate(('BIGGER','BRIGHTER','BOLDER','TOGETHER')):
    sign(line,(-length*.34,6.05-i*.56,.035),.49,length*.72,tracking=1.08)
sign('—',(-length*.34,3.50,.035),.30,1)
group('Technical left occupied branding return lettering',marks,(mid[0],0,mid[1]),yaw)
record('branding-return-left',before)

before=set(bpy.context.scene.objects)
right_a=(9.70,-2.50);right_b=(11.70,4.55)
length,yaw,mid=sloped_panel_on_line('Technical portrait concert return architecture',right_a,right_b,F,BAY_TOP,front_under,.25,PANEL)
marks=set(bpy.context.scene.objects);first=len(SCREENS)
portrait_width=3.20
aperture('end-concert',(.72,5.21,.045),portrait_width,4.40,'tech-concert',frame=.045)
for i,line in enumerate(('EXTRAORDINARY','EVENTS','REAL RESULTS')):
    sign(line,(.72-portrait_width/2,2.72-i*.54,.065),.46,portrait_width,tracking=1.02)
sign('—',(.72-portrait_width/2,.80,.065),.30,1)
group('Technical portrait concert and results copy',marks,(mid[0],0,mid[1]),yaw)
co,si=math.cos(yaw),math.sin(yaw)
for screen in SCREENS[first:]:
    xx,yy,zz=screen['p'];p=[mid[0]+co*xx+si*zz,yy,mid[1]-si*xx+co*zz]
    screen.update(p=p,position=p,x=p[0],y=p[1],z=p[2]);screen['rotation'][1]+=yaw
record('portrait-return-right',before)

# Human-scale reception sits forward-right of an unobstructed 2m route.
before=set(bpy.context.scene.objects)
cx,cz=2.25,5.35
soft_box('Technical grand reception fitted dark carcass',(cx,.61,cz),(6.0,.98,1.12),COUNTER_FACE,.055)
soft_box('Technical grand reception brushed countertop',(cx,1.126,cz),(6.06,.052,1.18),SILVER,.022)
box('Technical reception floating black kick',(cx,.17,cz),(5.74,.10,.91),STEEL,.014)
box('Technical reception continuous soft underlight',(cx,.147,cz+.56),(5.86,.025,.020),WHITE_COVE,.004)
patch_mesh('Technical diagonal stainless front insert',[(cx-2.96,.22,cz+.57),(cx-2.96,1.10,cz+.57),(cx-.70,1.10,cz+.57),(cx-1.68,.22,cz+.57)],[(0,1,2,3)],COUNTER_SILVER)
wordmark((cx-.55,.63,cz+.585),.46,icon_scale=.9)
sign('EVENT TECHNOLOGY',(cx-.04,.43,cz+.59),.14,2.8,tracking=1.12)
sign('FOR A BRIGHTER TOMORROW',(cx-.04,.23,cz+.59),.12,3.0,tracking=1.08)
for xx in(.45,3.85):
    laptop('reception-laptop-'+str(xx),xx,1.16,cz-.03)
    SCREENS[-1]['mediaHint']='tech-workstation-cues'
flowers(2.05,1.16,cz,.34)
for xx in(1.0,4.75):drinking_glass(xx,1.16,cz+.20,mat=CLEAR_GLASS)
record('reception',before)
before=set(bpy.context.scene.objects)
acrylic_pylon((6.0,F,5.85),1.15,1.88,['CONSULT','DESIGN','ENGINEER','DEPLOY','SUPPORT'])
record('acrylic-guide-right',before)
before=set(bpy.context.scene.objects)
acrylic_pylon((-10.55,F,5.55),1.12,1.98,['IDEAS','SYSTEMS','PEOPLE','EVENTS','THAT MOVE','THE WORLD'])
record('acrylic-guide-left',before)
before=set(bpy.context.scene.objects)
sofa(-8.4,4.85,2.45,180)
chair(-10.1,3.10,-90);chair(-6.9,3.20,90)
cocktail_table(-8.5,3.1)
lift_native(before)
record('lounge',before)
for i,(x,z) in enumerate(((-10.7,6.8),(-10.7,-6.1),(10.7,6.8),(10.7,-6.1),(-5.65,5.55),(7.7,5.1))):
    before=set(bpy.context.scene.objects);fern(x,z,91+i,.86 if i>3 else 1.18);lift_native(before);record('planting',before)
interior=set(bpy.context.scene.objects)-interior_start
batch_export(ASSET_PREFIX+'-interior',interior)

people_start=set(bpy.context.scene.objects)
for i,(x,z,turn,female,pose) in enumerate(((-7.5,-.85,153,False,0),(-4.7,-1.95,153,False,0),(-1.4,-1.65,175,False,0),(1.4,-1.65,175,False,0),(3.8,-1.95,198,False,0),(6.55,-.75,198,True,0),(1.0,4.45,0,True,1),(4.1,4.45,0,False,0),(3.5,6.5,170,False,1),(-7.2,1.5,-35,True,1))):
    person_before=set(bpy.context.scene.objects)
    human(x,z,1+(i%3-1)*.025,turn,female,NAVY,i%3,pose,root_y=F)
    HUMAN_PLACEMENTS[-1]['bounds']=bounds(set(bpy.context.scene.objects)-person_before)
record('visitors',people_start);people=set(bpy.context.scene.objects)-people_start
batch_export(ASSET_PREFIX+'-visitors',people)

def world(p):
    co,si=math.cos(ROOT_YAW),math.sin(ROOT_YAW)
    return [ROOT_ANCHOR[0]+co*p[0]+si*p[2],p[1],ROOT_ANCHOR[2]-si*p[0]+co*p[2]]
views={'entry':{'position':[-3,1.77,10.5],'look':[-3,1.65,-2.0]},
       'interior':{'position':[-3,1.77,.1],'look':[2.5,2.0,-6.0]},
       'out':{'position':[-3,1.77,-.8],'look':[-3,1.6,10.0]}}
for v in views.values():v.update(worldPosition=world(v['position']),worldLook=world(v['look']))
clear_underside=min(r['bounds']['min'][1] for r in ROLE_BOUNDS if r['overhead'] and r['bounds'])
layout={'version':'grand-technical-shape-v2-20261018','assetNames':list(EXPORTS),'assets':EXPORTS,'root':ROOT_ANCHOR,'rootRotation':[0,ROOT_YAW,0],
 'units':'metres','bounds':{'min':[-12,0,-8],'max':[12,TOP,8]},'architecturalDimensions':{'width':24,'depth':16,'height':TOP-F,'floor':F,'fasciaTop':TOP,'lowestOverheadUnderside':clear_underside,'clearHeight':clear_underside-F},
 'crown':{'frontPlan':[CROWN_A,CROWN_B,CROWN_C],'backMiterPlan':[CROWN_IN_A,CROWN_IN_B,CROWN_IN_C],'turnDegrees':90,'depth':CROWN_DEPTH,'underside':CROWN_BOTTOM,'baySoffitUnderside':BAY_TOP,'soffit':'Descending dark acoustic surface with narrow11percent pearl perimeter; native lower bay headers physically meet its rear underside','opaqueWing':'left','transmittedWing':'right','visibleClearBackground':'Unobstructed above the descending lower soffit; shared hall truss remains visible'},
 'apertures':SCREENS,'screens':SCREENS,'bays':BAYS,'typography':TYPOGRAPHY,'humans':HUMAN_PLACEMENTS,'roles':ROLE_BOUNDS,
 'routes':[{'id':'main-interior-entry','width':2,'centerline':[[-3,F,8],[-3,F,-.8]],'clearEnvelopeXZ':[-4,-2,-.8,8],
 'measurement':'2m clear between reception left edge x=-.78 and lounge/planting right extent at or below x=-5.3; ends before native workstation envelopes'}],
 'views':views,'provenance':{'architecture':'Original bespoke Blender geometry based on selected reference; old assets preserved','humans':'Microsoft Rocketbox MIT; technical-humans-LICENSE.txt'},
 'fallbacks':['Runtime acrylic treatment documented separately; geometry retains real45/30/40mm front/back/miter sheets. The outer end is exposed solid black with native white lettering; main-front raised copy uses a separate runtime draw-order finish to avoid transmission prepass ghosting.','The explicit shared12.701m envelope is taller relative to native people than the selected reference. Main live displays retain native16:9 landscape aspect. A descending overhead canopy reconciles the high crown with lower native occupied bays; that canopy transition remains larger than in the selected reference. Shape-v2 corrects geometry and occupied-wall relations without claiming pixel identity.']}
(OUTDIR/(ASSET_PREFIX+'-layout.json')).write_text(json.dumps(layout,indent=2),encoding='utf-8')
print('GRAND_TECHNICAL '+json.dumps({'assets':EXPORTS,'screens':len(SCREENS),'roles':len(ROLE_BOUNDS),'humans':len(HUMAN_PLACEMENTS)}),flush=True)
