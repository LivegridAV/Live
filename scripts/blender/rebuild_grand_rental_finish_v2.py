"""Reference-led Rental rebuild; native geometry, no reference-photo overlays.

The photos determine the silhouette and composition. Dimensions are a visual
reconstruction within the existing 24x16m reservation, not fabrication CAD.
Only new versioned outputs are written; all previously selected assets survive.
"""
from pathlib import Path
import bpy, math, json, hashlib, importlib.util
from mathutils import Vector, Matrix

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
helper=HERE/'rebuild_led_rental_2026_shell.py'
exec(compile(helper.read_text(encoding='utf-8').split('# Three real architectural volumes')[0],str(helper),'exec'))
F=.12
RENTAL_CFG={'floor':F,'fasciaTop':10.5,'fasciaBottom':8.95,'wallTop':8.9}
APERTURES=[];PRODUCTS=[];FIXTURES=[];SIGNAGE=[]
OUT=ROOT/'public/models/expo'
STEM='grand-rental-finish-v2-'

def load_module(name):
    spec=importlib.util.spec_from_file_location(name,HERE/(name+'.py'))
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    return module

def actual_bounds(objects):
    bpy.context.view_layer.update()
    pts=[ob.matrix_world@v.co for ob in objects if ob.type=='MESH' for v in ob.data.vertices]
    return {'min':[min(p[i] for p in pts) for i in (0,2,1)],
            'max':[max(p[i] for p in pts) for i in (0,2,1)]} if pts else None

def bounds_xyz(objects):
    b=actual_bounds(objects)
    if b:
        b={'min':[b['min'][0],b['min'][1],-b['max'][2]],'max':[b['max'][0],b['max'][1],-b['min'][2]]}
    return b

def export_asset(suffix,objects):
    """Bake world transforms once, retain role flags and every material slot."""
    bpy.context.view_layer.update();groups={};before_bounds=bounds_xyz(objects)
    for ob in objects:
        if ob.type!='MESH':continue
        world=ob.matrix_world.copy();ob.data=ob.data.copy();ob.data.transform(world)
        ob.parent=None;ob.matrix_world=Matrix.Identity(4)
        key=(ob.data.materials[0].name if ob.data.materials else 'unassigned',
             ob.get('grandRole','architecture'),ob.get('rentalInteriorRole',''),
             bool(ob.get('grandSharedFloor',False)),bool(ob.get('ledRentalOverhead',False)),
             ob.get('visitor_role',''))
        groups.setdefault(key,[]).append(ob)
    result=[]
    for key,obs in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for ob in obs:ob.select_set(True)
        bpy.context.view_layer.objects.active=obs[0]
        if len(obs)>1:bpy.ops.object.join()
        ob=bpy.context.object;ob.name=key[0]+' | '+(key[2] or key[1])
        ob['grandRole']=key[1]
        if key[2]:ob['rentalInteriorRole']=key[2]
        if key[3]:ob['grandSharedFloor']=True
        if key[4]:ob['ledRentalOverhead']=True
        if key[5]:ob['visitor_role']=key[5]
        result.append(ob)
    bpy.ops.object.select_all(action='DESELECT')
    for ob in result:ob.select_set(True)
    path=OUT/(STEM+suffix+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,
        export_yup=True,export_apply=True,export_materials='EXPORT',export_extras=True,
        export_cameras=False,export_lights=False,export_animations=False)
    return {'file':path.name,'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
            'meshes':len(result),'triangles':sum(sum(len(p.vertices)-2 for p in ob.data.polygons) for ob in result),
            'bounds':before_bounds}

shell=load_module('rental_finish_v2_shell').build_shell_v2(globals())
interior=load_module('rental_finish_v2_interior').build_rental_finish_v2_interior(globals())
stats={'shell':export_asset('shell',shell['objects']),
       'interior':export_asset('interior',interior['objects'])}

# The surrounding exhibition grid gives the hero a believable roof background.
# It is context, separately tagged and excluded from the booth's own height.
start=set(bpy.context.scene.objects)
for z in (-10,-5,0,5,10):
    for y in (10.5,10.85):
        for dz in (-.16,.16):rod('Rental Finish V2 | venue grid chord',(-16,y,z+dz),(16,y,z+dz),.024,RIG,8)
    for i in range(32):rod('Rental Finish V2 | venue grid web',(-16+i,10.5,z-.16),(-15+i,10.85,z+.16),.009,RIG,6)
for x in (-15,-10,-5,0,5,10,15):
    for dx in (-.16,.16):rod('Rental Finish V2 | venue perpendicular grid',(x+dx,10.94,-11),(x+dx,10.94,12),.022,RIG,8)
for i,x in enumerate((-13,-8,-3,2,7,12)):
    for j,z in enumerate((-9,-4,1,6,11)):
        box('Rental Finish V2 | hall spotlight housing',(x,10.35,z),(.19,.22,.23),BLACK,.02)
        mat=LENS if (i+j)%3 else material('Rental Finish V2 | cool neutral hall optic',(.66,.79,1),0,.3,2.1)
        box('Rental Finish V2 | hall independent optic',(x,10.232,z),(.12,.014,.14),mat,.006)
hall=set(bpy.context.scene.objects)-start
for ob in hall:
    ob.location.z+=1.5
    ob['grandRole']='hall-context';ob['ledRentalOverhead']=True
stats['hall']=export_asset('hall',hall)

# Native textured, individually posed visitors: source rigs retain limb lengths.
# A new low lounge pose is baked from the original MIT Rocketbox FBX rigs.
human_ns={'__file__':str(HERE/'technical_humans.py'),'bpy':bpy,'material':material}
exec(compile((HERE/'technical_humans.py').read_text(encoding='utf-8'),str(HERE/'technical_humans.py'),'exec'),human_ns)
visitor_objects=[];visitors=[]
def visitor(name,avatar,pose,p,yaw,seat=None):
    templates=human_ns['_human_template'](avatar,pose)
    root=bpy.data.objects.new('Rental Finish V2 visitor '+name,None);bpy.context.collection.objects.link(root)
    grounded=list(p)
    if pose=='lounge-v2':grounded[1]-=min(v.co.z for mesh in templates for v in mesh.vertices)
    root.location=xyz(grounded);root.rotation_euler[2]=yaw
    owned=[]
    for i,mesh in enumerate(templates):
        ob=bpy.data.objects.new(root.name+' mesh '+str(i),mesh.copy());bpy.context.collection.objects.link(ob)
        ob.parent=root;ob['grandRole']='visitor';ob['visitor_role']=name;ob['license']='MIT Microsoft Rocketbox'
        visitor_objects.append(ob);owned.append(ob)
    bpy.context.view_layer.update()
    b=bounds_xyz(owned)
    visitors.append({'id':name,'asset':avatar,'pose':pose,'position':grounded,'yaw':yaw,
        'nativeScale':1,'bounds':b,**({'seat':seat} if seat else {})})

standing=[
 ('reception host','Business_Female_01','idle',[6.65,F,4.64],0),
 ('reception colleague','Business_Male_01','idle',[8.9,F,4.64],0),
 ('reception visitor','Business_Male_02','talk',[8.9,F,7.30],math.pi),
 ('product adviser','Business_Male_01','talk',[-7.9,F,7.45],-.55),
 ('product visitor','Business_Female_01','idle',[-6.4,F,7.55],.7),
 ('product companion','Business_Male_02','idle',[-10.1,F,7.55],.5),
 ('left gallery guest','Business_Male_01','idle',[-2.0,F,3.1],-1.2),
 ('lounge host','Business_Female_01','talk',[5.7,F,-1.8],-.8),
 ('application observer','Business_Male_02','idle',[10.0,F,-.8],2.7),
 ('entrance guest','Business_Male_01','idle',[2.9,F,7.4],-2.6),
 ('entrance companion','Business_Female_01','talk',[4.0,F,7.3],2.5),
]
for args in standing:visitor(*args)
seats={s['id']:s for s in interior['seats']}
seated=[('main rear left sofa',-.5,'Business_Male_01'),('main rear right sofa',.45,'Business_Female_01'),
        ('main right inward lounge armchair',0,'Business_Male_02'),
        ('left private consultation sofa',.30,'Business_Female_01'),
        ('left consultation facing adviser',0,'Business_Male_01'),
        ('right application cafe left chair',0,'Business_Male_02'),
        ('middle hospitality rear chair',0,'Business_Female_01'),
        ('middle hospitality front chair',0,'Business_Male_01')]
for i,(seat_id,offset,avatar) in enumerate(seated):
    seat=seats[seat_id];p=seat['position'];yaw=seat['yaw']
    # Hip centered on seat; lateral seating offset follows the actual sofa axis.
    v=[p[0]+offset*math.cos(yaw),F,p[2]-offset*math.sin(yaw)]
    visitor('seated guest '+str(i),avatar,'lounge-v2',v,yaw,seat_id)
stats['visitors']=export_asset('visitors',visitor_objects)
layout={
 'version':'rental-reference-finish-v2-20261019',
 'dimensions':{'width':24,'depth':16,'height':10.38,'floor':F,'fasciaTop':10.5,'reservedMaximumHeight':12.821},
 'architecturalDimensions':{'fasciaTop':10.5,'clearHeight':8.293,'height':10.38},
 'architecture':shell['architecture'],'clearOverhead':8.293,
 'shellBounds':stats['shell']['bounds'],'apertures':shell['apertures'],'products':shell['products'],
 'fixtures':shell['fixtures'],'typography':shell['signage'],
 'furniture':interior['furniture'],'seats':interior['seats'],'plants':interior['plants'],
 'leafCount':interior['leafCount'],'reception':interior['reception'],'routes':interior['routes'],
 'visitorPlacements':visitors,'stats':stats,
 'assets':{STEM+k:v for k,v in stats.items()},
 'floor':'single shared world-mapped venue surface atY0.12, hidden below-floor support',
 'views':{'entrance':{'position':[0,1.77,8.8],'look':[2.1,4.5,-6.95]},
          'interior':{'position':[0,1.77,.7],'look':[2.1,4.5,-6.95]}},
 'provenance':{'references':['Livegrid AV Booth.png','Livegrid AV Booth Views.png'],
   'geometry':'Native Blender reconstruction from reference images; no photo planes or full-stall textures.',
   'humans':'Microsoft Rocketbox, Copyright (c)2020 Microsoft, MIT; native limb lengths.',
   'limits':'Image-based visual reconstruction; original CAD, materials and lighting data were unavailable.'},
 'notes':interior['notes']}
path=OUT/(STEM+'layout.json');path.write_text(json.dumps(layout,indent=2),encoding='utf-8')
print('RENTAL_FINISH_V2 '+json.dumps({'stats':stats,'visitors':len(visitors),'leafCount':interior['leafCount'],
    'seatedBounds':[v['bounds'] for v in visitors if v.get('seat')]}),flush=True)
