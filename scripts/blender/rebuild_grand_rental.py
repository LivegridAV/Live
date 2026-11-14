"""Measured, full-depth LED Rental revision. Old generators/assets stay intact.
Blender 5.2, Three XYZ metres. Shared shell envelope 24 x 16 x 12.701m.
Furniture, people and seven independent runtime demonstration models are not scaled.
"""
from pathlib import Path
import bpy, math, json, hashlib
from mathutils import Vector, Matrix
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
# Reuse proven vector signage and cabinet/joinery primitives, without executing
# the old stall construction or exporting over the selected baseline assets.
helper=HERE/'rebuild_led_rental_2026_shell.py'
exec(compile(helper.read_text(encoding='utf-8').split('# Three real architectural volumes')[0],str(helper),'exec'))
cfg=json.loads((ROOT/'public/models/expo/grand-dimensions.json').read_text())
W,D,H,F,T=[cfg['master'][k] for k in ('width','depth','height','floor','fasciaTop')]
OUT=ROOT/'public/models/expo/grand-rental-shell.glb'
LAYOUT_OUT=ROOT/'public/models/expo/grand-rental-layout.json'
PREFIX='Grand Rental | '
OBJECTS=[]

def role(obj,value='architecture'):
    obj['grandRole']=value
    return obj

def b(name,p,size,mat=BLACK,bevel=.012,value='architecture'):
    return role(box(PREFIX+name,p,size,mat,bevel),value)

def rail(name,points,radius,mat,overhead=False):
    for i in range(len(points)-1):
        ob=line(name,points[i],points[i+1],radius,mat,overhead)
        role(ob,'overhead' if overhead else 'architecture')

# Floors remain the single world-mapped venue finish. A below-floor edge and
# recessed perimeter diffuser articulate the reserved footprint without overlap.
b('flush platform edge',(0,.055,0),(W,.11,D),BLACK,.018)
rail('warm platform perimeter',[(-11.991,.125,-7.991),(-11.991,.125,7.991),(11.991,.125,7.991),(11.991,.125,-7.991),(-11.991,.125,-7.991)],.009,WARM)
b('rear boundary',(0,5.49,-7.86),(W,10.74,.28),WALL)
for side in (-1,1):
    b('thick side return',(side*11.86,5.49,0),(.28,10.74,16),BLACK,value='section-wall' if side==1 else 'architecture')
    b('front corner pier',(side*11.65,5.49,7.6),(.70,10.74,.80),BLACK)
    rail('recessed side cove',[(side*11.65,10.78,-7.75),(side*11.65,10.78,7.65)],.012,TEAL,True)
    for z in (-6,-2,2,6): b('side precision vertical panel reveal',(side*11.705,5.35,z),(.01,10.4,.014),TRIM)

# One continuous folded frontage, with common vertices for black fascia,
# champagne cap and teal diffuser. Side returns join these same vertices.
plan=[(-11.85,-7.85),(-11.85,6.30),(-10.80,7.78),(5.90,7.78),(10.85,7.08),(11.85,6.25),(11.85,-7.85)]
for i,(a,c) in enumerate(zip(plan,plan[1:])):
    role(segment_box('solid folded fascia',a,c,10.85,T,.30,BLACK,True),'overhead')
    rail('continuous teal fascia underside',[(a[0],10.83,a[1]),(c[0],10.83,c[1])],.012,TEAL,True)
    rail('champagne upper fine reveal',[(a[0],T-.025,a[1]),(c[0],T-.025,c[1])],.010,GOLD,True)
before=set(bpy.context.scene.objects)
emblem((-9.60,11.18,7.803),1.22)
label('livegrid AV',(-8.40,11.30,7.807),.91,6.5,tracking=1,semibold=True)
label('LED RENTAL SOLUTIONS',(.20,11.75,7.807),.24,4.9,tracking=1.25)
label('FOR EVERY VISION',(.20,11.30,7.807),.22,4.9,tracking=1.30)
for i,body in enumerate(('STAGES','EVENTS','EXHIBITIONS','BRANDS','FIXED INSTALLATIONS','AND MORE')):
    label(body,(8.05,12.31-i*.205,7.50),.14,2.55,yaw=.14,tracking=1.1)
for ob in set(bpy.context.scene.objects)-before: role(ob,'overhead')
emblem((11.997,8.50,5.7),1.05,math.pi/2)
for i,body in enumerate(('IDEAS','IN','MOTION')): label(body,(11.999,6.55-i*.38,5.45),.24,2.4,yaw=math.pi/2,tracking=1.1)

# Distinct visible programme depths: rear media at -7.6, lounge -3..0,
# demonstrations -5.65, visitor route centre, reception +5.8.
screen_cabinet('main-backdrop',(2.0,5.45,-7.60),10.2,7.8,'rental2026-backdrop',.18,.025)
for i,y in enumerate((9.45,7.45,5.45,3.45)):
    screen_cabinet('application-'+str(i),(8.95,y,-7.60),2.45,1.48,'rental2026-application-'+str(i),.16,.022)
    label(('CORPORATE EVENTS','LIVE EXPERIENCES','BRAND ACTIVATIONS','RETAIL & SHOWROOMS')[i],(10.31,y-.08,-7.55),.17,1.25,tracking=1.04,font=CONDENSED_FONT)
for x in (-3.22,7.27):
    for j in range(10): b('individual champagne vertical fin',(x+(j-4.5)*.055,5.42,-7.48),(.020,10.45,.17),GOLD,.003)

PRODUCTS=[
 {'id':'flat','type':'flat','position':[-10.15,8.55,-5.65],'width':1.75,'height':1.60},
 {'id':'curved','type':'curved','position':[-7.30,8.55,-5.65],'width':2.22,'height':1.60,'radius':1.30,'arc':2.04},
 {'id':'cylinder','type':'cylinder','position':[-4.65,8.55,-5.65],'radius':.67,'height':1.80},
 {'id':'corner','type':'corner','position':[-10.15,5.0,-5.65],'side':1.20,'height':1.45},
 {'id':'transparent','type':'transparent','position':[-7.82,5.0,-5.65],'width':1.40,'height':1.90},
 {'id':'dna','type':'dna','position':[-5.90,5.0,-5.65],'width':1,'height':2.50},
 {'id':'sphere','type':'sphere','position':[-3.96,5.0,-5.65],'radius':.72}
]
for p in PRODUCTS:
    h=p.get('height',p.get('radius',.5)*2)
    for j,body in enumerate({'flat':['FLAT LED'],'curved':['CURVED LED'],'cylinder':['CYLINDRICAL LED'],'corner':['SEAMLESS','CORNER LED'],'transparent':['TRANSPARENT LED'],'dna':['DNA LED'],'sphere':['SPHERE LED']}[p['id']]):
        label(body,(p['position'][0],p['position'][1]-h/2-.36-j*.24,p['position'][2]+.04),.18,2.12,centered=True,tracking=1.04)

# Fully constructed open-truss ceiling at a measured, usable underside.
for z in (-6.9,-3.0,1.0,5.5):
    for y in (10.80,11.11): rail('ceiling truss chord',[(-11.5,y,z-.16),(11.5,y,z-.16)],.020,RIG,True)
    for j in range(28):
        x=-11.5+j*23/28
        rail('alternating truss diagonal',[(x,10.80,z-.16),(x+23/28,11.11,z-.16)],.009,RIG,True)
for x in (-10,-7,-4,0,4,7,10):
    for z in (-6.5,-2,3.7,6.7):
        b('black gimbal spotlight',(x,10.60,z),(.18,.24,.25),BLACK,.025,'overhead')
        b('recessed spotlight diffuser',(x,10.472,z),(.12,.016,.15),LENS,.008,'overhead')
        FIXTURES.append({'position':[x,10.46,z],'target':[x,F,z-.8]})

def export_meshes(file,objects):
    bpy.context.view_layer.update()
    groups={}
    for ob in objects:
        if ob.type!='MESH': continue
        ob.data.transform(ob.matrix_world);ob.matrix_world=Matrix.Identity(4)
        groups.setdefault((ob.data.materials[0].name,ob.get('grandRole','interior')),[]).append(ob)
    result=[]
    for (name,r),obs in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for ob in obs:ob.select_set(True)
        bpy.context.view_layer.objects.active=obs[0]
        if len(obs)>1:bpy.ops.object.join()
        ob=bpy.context.object;ob.name=name+' | '+r;ob['grandRole']=r;result.append(ob)
    bpy.ops.object.select_all(action='DESELECT')
    for ob in result:ob.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_materials='EXPORT',export_extras=True,export_cameras=False,export_lights=False,export_animations=False)
    return {'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'meshes':len(result),'triangles':sum(sum(len(p.vertices)-2 for p in ob.data.polygons) for ob in result)}

shellstats=export_meshes(OUT,list(bpy.context.scene.objects))

# Import only reusable furniture/botanical builders from the existing pipeline.
for ob in list(bpy.context.scene.objects):bpy.data.objects.remove(ob,do_unlink=True)
furn=HERE/'rebuild_led_rental_2026_interior.py'
exec(compile(furn.read_text(encoding='utf-8').split('# Left low display/garden')[0],str(furn),'exec'))
PREFIX='Grand Rental | '
# Furniture authored at native metres; no shell transform touches it.
sofa26('rear lounge sofa',3.2,-4.5,0,2.75)
chair26('lounge inward left',1.95,-1.55,math.pi,1)
chair26('lounge inward right',4.35,-1.55,math.pi,1)
coffee26('lounge central low table',3.2,-3.0,.60)
sofa26('left consultation sofa',-7.8,-.4,math.pi/2,2.4)
chair26('left consultation adviser',-4.8,-.3,-math.pi/2,1)
coffee26('left consultation table',-6.25,-.3,.55)
chair26('application cafe left',8.15,-3.5,-math.pi/2,.94)
chair26('application cafe right',10.05,-3.5,math.pi/2,.94)
coffee26('application cafe table',9.1,-3.5,.46)
# Preserve selected rounded reception and its physical branding, at new depth.
oldsrc=furn.read_text(encoding='utf-8')
desk=oldsrc.split('# Reception: actual rounded')[1].split('# Two clear central seating groups')[0]
before=set(bpy.context.scene.objects)
exec(compile('# Reception: actual rounded'+desk,str(furn),'exec'))
for ob in set(bpy.context.scene.objects)-before:
    if ob.type=='MESH':ob.location.y-=2.2
soft_box(PREFIX+'product front planting plinth',(-7.5,.27,6.1),(7.8,.30,1.7),BLACK26,.055)
soft_box(PREFIX+'product plinth fine teal diffuser',(-7.5,.148,6.94),(7.7,.026,.022),TEAL26,.007)
label26('SMALL MODULES. BIG POSSIBILITIES.',(-7.5,.245,6.956),.14,7.15,tracking=1.28)
for i,(x,z,h) in enumerate(((-11,6.7,2.7),(-11,-3.5,2.5),(-2.8,-6.5,2.3),(7.1,-6.5,2.4),(11,-5.8,2.6),(11,2.2,2.7),(11,6.6,2.6),(-2.5,1.8,1.3),(6.0,2.0,1.4))):
    plant26('architectural planting '+str(i),x,z,h,.48,.26,'palm' if i%3 else 'bush',metal=i%2==0,seed=480+i)
for i in range(8):plant26('product garden '+str(i),-10.6+i*.88,6.15,.8+(i%3)*.045,.28,.18,'fern' if i%2 else 'bush',base=.42,seed=530+i)
for i,(x,z) in enumerate(((3.2,-3),(-6.25,-.3),(9.1,-3.5))):
    flowers26('consultation flowers '+str(i),x,.65,z);water26('water '+str(i),x+.20,.65,z+.05)
for key,finish in (('leaves',LEAF26),('broad-leaves',TROPICAL_LEAF26)):
    if key not in BATCH:continue
    g=BATCH[key];ob=mesh26('individually curved living foliage '+key,g['v'],g['f'],finish,g['uv'])
    for p in ob.data.polygons:p.use_smooth=True
interiorstats=export_meshes(ROOT/'public/models/expo/grand-rental-interior.glb',list(bpy.context.scene.objects))

# Provenanced textured Microsoft Rocketbox visitors, reposed by native units.
for ob in list(bpy.context.scene.objects):bpy.data.objects.remove(ob,do_unlink=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/models/expo/projection-visitors-v10.glb'))
original=list(bpy.context.scene.objects);templates={ob.get('visitor_role'):ob for ob in original if ob.get('visitor_role')}
placements=[('reception host','reception-host',8.0,4.50,0),('reception colleague','reception-colleague',6.35,4.50,0),('reception guest','conversation-left',9.25,7.15,math.pi),('product observer','kiosk-guest',-9.5,3.8,2.8),('product discussion','crystal-observer',-8.1,3.65,-1.0),('lounge adviser','cafe-left',3.2,-4.5,0),('lounge guest','cafe-right',4.35,-1.55,math.pi),('left consultation guest','cafe-rear',-4.8,-.3,-math.pi/2),('application visitor','deep-right-gallery',7.3,-1.0,-.8)]
created=[];records=[]
for name,key,x,z,yaw in placements:
    source=templates[key];root=bpy.data.objects.new('Grand Rental visitor '+name,None);bpy.context.collection.objects.link(root)
    root.location=xyz((x,F,z));root.rotation_euler[2]=yaw;sc=source.get('normal_human_scale',1);root.scale=(sc,)*3
    for child in source.children_recursive:
        if child.type!='MESH':continue
        ob=bpy.data.objects.new(root.name+' mesh',child.data.copy());bpy.context.collection.objects.link(ob);ob.parent=root;ob.matrix_parent_inverse=Matrix.Identity(4);ob.matrix_basis=source.matrix_world.inverted()@child.matrix_world;created.append(ob)
    root['visitor_role']=name;root['license']='MIT Microsoft Rocketbox';records.append({'role':name,'source':key,'position':[x,F,z],'yaw':yaw,'nativeHumanScale':sc})
for ob in original:
    if ob.name in bpy.data.objects:bpy.data.objects.remove(ob,do_unlink=True)
bpy.context.view_layer.update()
for ob in created:
    mat=ob.matrix_world.copy();ob.parent=None;ob.matrix_world=mat
peoplestats=export_meshes(ROOT/'public/models/expo/grand-rental-visitors.glb',created)
layout={'version':'grand-20261018','dimensions':cfg['master'],'shellBounds':{'min':[-12,F,-8],'max':[12,T,8]},'clearOverhead':10.344,'apertures':APERTURES,'products':PRODUCTS,'fixtures':FIXTURES,'typography':SIGNAGE,'stats':{'shell':shellstats,'interior':interiorstats,'visitors':peoplestats},'visitorPlacements':records,'floor':'shared-world-venue-finish','routes':[{'id':'principal','polygonXZ':[[-1.2,8],[1.2,8],[1.2,-5.8],[-1.2,-5.8]],'clearWidth':2.4}],'views':{'entrance':{'position':[0,1.8,9.4],'look':[2,3.6,-7.5]},'interior':{'position':[0,1.8,2.5],'look':[2,3.6,-7.5]},'exit':{'position':[0,1.8,2.5],'look':[0,1.8,10]}},'provenance':'Existing original bespoke Blender helpers, selected rental artwork and botanical atlas; native textured Microsoft Rocketbox visitors MIT Copyright (c) 2020 Microsoft. No generated image used as geometry.'}
(ROOT/'public/models/expo/grand-rental-layout.json').write_text(json.dumps(layout,indent=2),encoding='utf-8')
print('GRAND_RENTAL '+json.dumps(layout['stats']),flush=True)
