"""Additive hospitality details for the annotated projection pavilion.

Native Three XYZ, front +Z, metres. This asset contains no shell, crystal,
people or screen overlays. Existing fitted furniture and visitors stay fixed.
"""
from pathlib import Path
import sys, hashlib

HELPERS=Path(__file__).with_name('rebuild_projection_mapping_stall.py')
SOURCE=HELPERS.read_text(encoding='utf-8')
exec(compile(SOURCE.split('# A broad island')[0],str(HELPERS),'exec'))
OUT=ROOT/'public/models/expo/projection-interior-details-v8.glb'
LAYOUT_OUT=ROOT/'public/models/expo/projection-interior-details-v8-layout.json'
QA=ROOT/'qa/projection-mapping-v8';QA.mkdir(parents=True,exist_ok=True)
PREFIX='Projection Interior V8 | '
CREAM=material(PREFIX+'ivory woven upholstery',(.72,.67,.56),0,.79)
SEAM=material(PREFIX+'ivory upholstery tailored seam',(.60,.55,.45),0,.88)
GOLD=material(PREFIX+'soft satin champagne metal details',(.48,.36,.20),.88,.29)
FRAME=material(PREFIX+'matte black architectural slender seating frame',(.015,.019,.022),.40,.34)
POT_BLACK=material(PREFIX+'black satin ceramic planter body',(.012,.016,.016),.12,.34)
STONE_TOP=material(PREFIX+'polished black stone tabletop',(.020,.024,.027),.08,.29)
SOIL=material(PREFIX+'dark granular planting soil',(.012,.008,.005),0,.94)
PORCELAIN=material(PREFIX+'warm ivory porcelain cups',(.80,.76,.67),0,.23)
COFFEE=material(PREFIX+'dark coffee liquid',(.025,.012,.006),0,.20)
PAPER=material(PREFIX+'soft ivory paper napkins',(.71,.69,.62),0,.92)
GLASS=material(PREFIX+'clear glass drinking vessels',(.63,.76,.79),0,.13)
bsdf=GLASS.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Alpha'].default_value=.28
bsdf.inputs['IOR'].default_value=1.45;GLASS.diffuse_color=(.63,.76,.79,.28);GLASS.surface_render_method='DITHERED'
ITEMS=[];VESSELS=[]


def bake_pose(objects,p=(0,0,0),yaw=0):
    basis=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))
    pose=basis@(Matrix.Translation(Vector(p))@Matrix.Rotation(yaw,4,'Y'))@basis.inverted()
    bpy.context.view_layer.update()
    for ob in objects:
        if ob.type!='MESH':continue
        transform=pose@ob.matrix_world.copy();ob.parent=None
        for v in ob.data.vertices:v.co=transform@v.co
        ob.matrix_world=Matrix.Identity(4)


def bounds(objects):
    bpy.context.view_layer.update()
    points=[ob.matrix_world@v.co for ob in objects if ob.type=='MESH' for v in ob.data.vertices]
    lo=[min(p[i] for p in points) for i in range(3)];hi=[max(p[i] for p in points) for i in range(3)]
    return {'min':[lo[0],lo[2],-hi[1]],'max':[hi[0],hi[2],-lo[1]]}


def component(name,before,meta):
    objects=[ob for ob in set(bpy.context.scene.objects)-before if ob.type=='MESH']
    for ob in objects:ob['interior_component']=name
    ITEMS.append({'id':name,**meta,'bounds':bounds(objects)})
    return objects


def padded_back():
    points=[];faces=[];cols=18;rows=6
    for side in(-1,1):
        for row in range(rows):
            t=row/(rows-1)
            for col in range(cols):
                angle=-.50+col/(cols-1)
                r=.55+side*.036
                x=math.sin(angle)*r;z=math.cos(angle)*r-.34+.028*t
                y=.675+t*.37-.018*(abs(angle)/.5)**8
                points.append((x,y,z))
    count=cols*rows
    for side in range(2):
        off=side*count
        for row in range(rows-1):
            for col in range(cols-1):
                a=off+row*cols+col;face=(a,a+1,a+1+cols,a+cols)
                faces.append(face if side==0 else tuple(reversed(face)))
    perimeter=list(range(cols))+[j*cols+cols-1 for j in range(1,rows)]+list(range(count-2,count-cols-1,-1))+[j*cols for j in range(rows-2,0,-1)]
    for a,b in zip(perimeter,perimeter[1:]+perimeter[:1]):faces.append((a,b,b+count,a+count))
    ob=patch_mesh(PREFIX+'curved fully upholstered high chair back',points,faces,CREAM)
    bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(ob.data);bm.free()
    # A real fine welt follows the padded upper edge.
    path=[]
    for j in range(33):
        angle=-.5+j/32;r=.588
        path.append((math.sin(angle)*r,1.041-.018*(abs(angle)/.5)**8,math.cos(angle)*r-.312))
    for a,b in zip(path,path[1:]):rod(PREFIX+'high chair back upper tailored welt',a,b,.0018,SEAM,6)


def chair(name,x,z,yaw):
    before=set(bpy.context.scene.objects)
    soft_box(PREFIX+'tailored cream high chair seat',(0,.605,0),(.49,.11,.46),CREAM,.045)
    padded_back()
    for sx in(-1,1):
        for sz in(-1,1):
            rod(PREFIX+'slender splayed satin black chair leg',(sx*.213,0,sz*.195),(sx*.183,.565,sz*.166),.014,FRAME,12)
            rod(PREFIX+'champagne chair foot ferrule',(sx*.213,.003,sz*.195),(sx*.211,.052,sz*.192),.0147,GOLD,12)
        rod(PREFIX+'high chair rear support',(sx*.18,.49,.17),(sx*.23,.91,.18),.012,FRAME,10)
    rod(PREFIX+'high chair front foot rail',(-.19,.235,-.175),(.19,.235,-.175),.0105,GOLD,12)
    for sx in(-1,1):rod(PREFIX+'high chair side foot rail',(sx*.20,.235,-.175),(sx*.20,.235,.18),.009,FRAME,10)
    bake_pose(set(bpy.context.scene.objects)-before,(x,.10,z),yaw)
    component(name,before,{'kind':'cream upholstered high cafe chair','position':[x,.10,z],'yaw':yaw,'seatTop':.76,'height':1.045})


def table():
    before=set(bpy.context.scene.objects);x,z=0,1.52
    lathe(PREFIX+'small round black stone cafe top',x,z,[(0,1.072),(.315,1.072),(.33,1.080),(.33,1.093),(.32,1.10),(0,1.10)],STONE_TOP,64)
    lathe(PREFIX+'fine champagne tabletop lip',x,z,[(.329,1.078),(.332,1.080),(.332,1.092),(.329,1.095)],GOLD,64)
    lathe(PREFIX+'round table black tulip foot',x,z,[(0,.10),(.235,.10),(.245,.112),(.224,.135),(.055,.225),(.032,.27)],FRAME,56)
    rod(PREFIX+'slender champagne cafe table pedestal',(x,.22,z),(x,1.075,z),.026,GOLD,28)
    component('central-cafe-table',before,{'kind':'small round cafe table','position':[x,.10,z],'radius':.33,'topY':1.10})


def vessel(name,p,radius,height,champagne=False,plantTop=None,soilGap=.020):
    x,y,z=p;before=set(bpy.context.scene.objects);outer=GOLD if champagne else POT_BLACK
    lathe(PREFIX+name+' closed cylindrical vessel',x,z,[(0,y),(radius*.88,y),(radius*.98,y+.014),(radius,y+.045),(radius,y+height-.018),(radius*.985,y+height),(radius*.91,y+height),(radius*.90,y+height-.035)],outer,56 if radius>.12 else 32)
    # Champagne lip and narrow foot are actual concentric metal components.
    lathe(PREFIX+name+' fine champagne rim',x,z,[(radius*.985,y+height-.012),(radius*1.008,y+height-.010),(radius*1.008,y+height-.003),(radius*.984,y+height)],GOLD,56 if radius>.12 else 32)
    lathe(PREFIX+name+' fine champagne foot',x,z,[(radius*.88,y+.006),(radius*.985,y+.009),(radius*.985,y+.025),(radius*.96,y+.028)],GOLD,56 if radius>.12 else 32)
    soilY=y+height-soilGap
    disk(PREFIX+name+' inset planting soil',x,z,radius*.90,soilY-.010,soilY,SOIL)
    record={'id':name,'position':list(p),'radius':radius,'height':height,'rimY':y+height,'soilY':soilY,'plantTopTarget':plantTop,'finish':'champagne' if champagne else 'black ceramic with champagne lip'}
    VESSELS.append(record);component(name,before,{'kind':'plant vessel',**record})


def cup(name,x,y,z):
    before=set(bpy.context.scene.objects)
    lathe(PREFIX+name+' porcelain saucer',x,z,[(0,y),(.052,y),(.057,y+.006),(.052,y+.012),(0,y+.012)],PORCELAIN,32)
    lathe(PREFIX+name+' porcelain espresso cup',x,z,[(0,y+.011),(.024,y+.011),(.033,y+.024),(.035,y+.070),(.031,y+.073),(.029,y+.066)],PORCELAIN,32)
    disk(PREFIX+name+' dark espresso surface',x,z,.028,y+.063,y+.066,COFFEE)
    ring=[]
    for j in range(25):
        a=j/24*math.tau;ring.append((x+.043+math.cos(a)*.016,y+.045+math.sin(a)*.019,z))
    for a,b in zip(ring,ring[1:]):rod(PREFIX+name+' actual porcelain cup handle',a,b,.004,PORCELAIN,6)
    component(name,before,{'kind':'porcelain espresso cup and saucer','position':[x,y,z]})


def carafe(name,x,y,z):
    before=set(bpy.context.scene.objects)
    lathe(PREFIX+name+' closed glass carafe',x,z,[(0,y),(.043,y),(.048,y+.016),(.046,y+.17),(.024,y+.205),(.022,y+.26),(.019,y+.265),(.017,y+.258)],GLASS,40)
    lathe(PREFIX+name+' brushed champagne carafe cap',x,z,[(.022,y+.259),(.023,y+.269),(.022,y+.279),(0,y+.279)],GOLD,32)
    component(name,before,{'kind':'clear glass water carafe','position':[x,y,z]})


chair('central-cafe-chair-left',-.70,1.52,-math.pi/2)
chair('central-cafe-chair-right',.70,1.52,math.pi/2)
table()
vessel('central-forecourt-champagne',[-.48,.10,2.65],.21,.56,True,1.30)
vessel('central-forecourt-black',[.52,.10,2.48],.22,.65,False,1.45)
vessel('bar-right-black',[2.32,.10,1.48],.18,.54,False,1.18)
for i,x in enumerate((-.95,.50,1.80)):vessel('stage-mini-conifer-'+str(i),[x,1.25,-.04],.075,.14,i==1,1.85+i*.05)
vessel('cafe-bud-pot',[0,1.10,1.52],.045,.12,True,1.42,soilGap=.010)
for name,x,y,z in(('cafe-espresso',-.18,1.10,1.65),('bar-espresso-left',-.78,.95,.62),('bar-espresso-right',.78,.95,.61)):
    cup(name,x,y,z)
carafe('bar-water-carafe',2.10,.95,.51)
carafe('reception-water-carafe',-2.50,1.20,3.04)
cup('reception-espresso',-3.00,1.20,3.13)
before=set(bpy.context.scene.objects)
soft_box(PREFIX+'cafe neatly folded ivory napkin',(.15,1.107,1.57),(.115,.010,.16),PAPER,.005)
rod(PREFIX+'cafe fine champagne teaspoon',(.17,1.115,1.54),(.17,1.115,1.64),.0035,GOLD,8)
component('cafe-napkin-and-spoon',before,{'kind':'tabletop service props'})

# Bake every coordinate, retain semantic finishes, then material-batch for R3F.
objects=[ob for ob in bpy.context.scene.objects if ob.type=='MESH'];bake_pose(objects)
groups={}
for ob in objects:groups.setdefault(ob.data.materials[0].name,[]).append(ob)
batched=[]
for name,items in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for ob in items:ob.select_set(True)
    bpy.context.view_layer.objects.active=items[0]
    if len(items)>1:bpy.ops.object.join()
    ob=bpy.context.view_layer.objects.active;ob.name=name
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);batched.append(ob)
aoFile=Path(__file__).with_name('bake_technical_ao.py')
exec(compile(aoFile.read_text(encoding='utf-8'),str(aoFile),'exec'),globals())
ao=bake_technical_ao(batched,samples=32,max_distance=.10,min_factor=.60,max_seconds=80)
bpy.ops.object.select_all(action='DESELECT')
for ob in batched:ob.select_set(True)
OUT.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(OUT),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_materials='EXPORT',export_cameras=False,export_lights=False,export_animations=False,export_vertex_color='NAME',export_vertex_color_name='Col',export_all_vertex_colors=False)
stats={'bytes':OUT.stat().st_size,'meshes':len(batched),'vertices':sum(len(ob.data.vertices) for ob in batched),'triangles':sum(sum(len(p.vertices)-2 for p in ob.data.polygons) for ob in batched),'bounds':bounds(batched)}
layout={'version':8,'asset':OUT.name,'authoringAxes':'native Three XYZ front +Z','placement':{'position':[0,0,0],'rotation':[0,0,0],'scale':1,'parentRoot':[10.2,0,-189],'parentRotation':[0,-math.pi/2,0],'parentScale':3},'items':ITEMS,'vessels':VESSELS,'materialRoles':[ob.data.materials[0].name for ob in batched],'ambientOcclusion':ao,'stats':stats,'bytes':stats['bytes'],'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),'provenance':'Original bespoke Blender hospitality geometry; no attached image pixels or downloaded furniture models.'}
LAYOUT_OUT.write_text(json.dumps(layout,indent=2),encoding='utf-8')
print('V8_INTERIOR_READY '+json.dumps({'sha256':layout['sha256'],**stats}),flush=True)

if '--geometry-only' not in sys.argv:
    # A real-model evidence render, with the existing shell as fixed context.
    bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/models/expo/projection-mapping-stall-v7.glb'))
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
    try:
        pref=bpy.context.preferences.addons['cycles'].preferences;pref.compute_device_type='OPTIX';pref.get_devices();gpu=False
        for device in pref.devices:device.use=device.type=='OPTIX';gpu=gpu or device.use
        if gpu:scene.cycles.device='GPU'
    except Exception as error:print('V8_GPU_FALLBACK '+str(error),flush=True)
    scene.render.resolution_x=1600;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
    scene.view_settings.view_transform='AgX';scene.view_settings.exposure=-.15
    scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.08,.10,.13,1)
    scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.40
    for name,p,target,energy,size,color in(('soft warm hospitality key',(-3,5,6),(0,.8,1.8),950,4,(1,.87,.69)),('soft cool hospitality fill',(4,4,4),(0,.8,1.5),650,3,(.76,.86,1))):
        data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.size=size;data.color=color
        ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);ob.location=xyz(p);ob.rotation_euler=(Vector(xyz(target))-ob.location).to_track_quat('-Z','Y').to_euler()
    data=bpy.data.cameras.new('V8 hospitality evidence');cam=bpy.data.objects.new(data.name,data);bpy.context.collection.objects.link(cam)
    cam.location=xyz((-3.6,2.6,7.5));cam.rotation_euler=(Vector(xyz((0,.95,1.3)))-cam.location).to_track_quat('-Z','Y').to_euler();data.lens=46;scene.camera=cam
    scene.render.filepath=str(QA/'interior-details-context.png');bpy.ops.render.render(write_still=True)
    print('V8_INTERIOR_PREVIEW_READY '+scene.render.filepath,flush=True)
