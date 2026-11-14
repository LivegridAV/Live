"""Reference four-view hospitality props around the actual circular stage.

Native Three XYZ, front +Z, metres. The shell owns the crescent bar, stools,
laptops and its two miniature bar-top planters. This separate asset owns only
five coordinated vessel bodies and supported drink props; planting is exported
by rebuild_projection_botanical_v10.py. No reference raster pixels are used.
"""
from pathlib import Path
import sys, hashlib

# Reuse the established bespoke vessel/drink constructors without running the
# old freestanding cafe scene, its export, or its evidence render.
PREVIOUS=Path(__file__).with_name('rebuild_projection_interior_details_v8.py')
PREVIOUS_SOURCE=PREVIOUS.read_text(encoding='utf-8')
UTILITY_PREFIX=PREVIOUS_SOURCE.split("\nchair('central-cafe-chair-left'")[0]
if UTILITY_PREFIX==PREVIOUS_SOURCE:raise RuntimeError('V8 constructor boundary changed')
exec(compile(UTILITY_PREFIX,str(PREVIOUS),'exec'))
OUT=ROOT/'public/models/expo/projection-interior-details-v10.glb'
LAYOUT_OUT=ROOT/'public/models/expo/projection-interior-details-v10-layout.json'
QA=ROOT/'qa/projection-mapping-v10';QA.mkdir(parents=True,exist_ok=True)
PREFIX='Projection Interior V10 | '
for mat in bpy.data.materials:
    if mat.name.startswith('Projection Interior V8 | '):mat.name=PREFIX+mat.name.split(' | ',1)[1]
ITEMS=[];VESSELS=[]

# Side clusters replace the old central forecourt pots. Their roots are clear
# of both crescent bar and stools; botanical export supplies foliage above soil.
vessel('central-forecourt-champagne',[-3.85,.10,-.05],.21,.56,True,1.30)
vessel('central-forecourt-black',[3.85,.10,-.05],.22,.65,False,1.45)
for index,angle in enumerate((-35,0,35)):
    theta=math.radians(angle);x=2.45*math.sin(theta);z=-1.45+2.45*math.cos(theta)
    vessel('stage-mini-conifer-'+str(index),[x,1.25,z],.075,.14,index==1,1.85+index*.05)

BAR_CENTER=(0,-1.45);BAR_INNER=3.05;BAR_OUTER=3.55;BAR_TOP=.95
def polar(radius,degrees):
    theta=math.radians(degrees)
    return radius*math.sin(theta),BAR_CENTER[1]+radius*math.cos(theta)

for name,angle in(('bar-espresso-left',-16),('bar-espresso-right',16)):
    x,z=polar(3.34,angle);cup(name,x,BAR_TOP,z)
x,z=polar(3.34,47);carafe('bar-water-carafe',x,BAR_TOP,z)
# The old water carafe was on the right edge of the narrowed reception. These
# poses leave at least20cm of top beyond the glass and preserve the reference.
carafe('reception-water-carafe',-2.80,1.20,3.04)
cup('reception-espresso',-3.15,1.20,3.13)

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
layout={'version':10,'asset':OUT.name,'authoringAxes':'native Three XYZ front +Z','placement':{'position':[0,0,0],'rotation':[0,0,0],'scale':1,'parentRoot':[10.2,0,-189],'parentRotation':[0,-math.pi/2,0],'parentScale':3},
    'items':ITEMS,'vessels':VESSELS,'materialRoles':[ob.data.materials[0].name for ob in batched],
    'removedV8Components':['central-cafe-chair-left','central-cafe-chair-right','central-cafe-table','cafe-bud-pot','cafe-espresso','cafe-napkin-and-spoon','bar-right-black'],
    'supportContract':{'floorY':.10,'stage':{'centerXZ':[0,-1.45],'radius':2.90,'topY':1.25},'bar':{'centerXZ':[0,-1.45],'innerRadius':BAR_INNER,'outerRadius':BAR_OUTER,'topY':BAR_TOP,'sectorDegrees':[-65,65]},'reception':{'center':[-4.30,.10,3.10],'width':3.60,'depth':.82,'topY':1.20}},
    'ambientOcclusion':ao,'stats':stats,'bytes':stats['bytes'],'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),
    'provenance':'Original bespoke Blender vessels and porcelain/glass drink props. Established V8 constructors reused; obsolete cafe geometry is not constructed. No reference image pixels or downloaded models.'}
LAYOUT_OUT.write_text(json.dumps(layout,indent=2),encoding='utf-8')
print('V10_INTERIOR_READY '+json.dumps({'sha256':layout['sha256'],**stats}),flush=True)

if '--preview' in sys.argv:
    # Evidence uses the actual new shell geometry, if it is ready. It does not
    # export or alter any shell/model file.
    shell=ROOT/'public/models/expo/projection-mapping-stall-v10.glb'
    if shell.exists():bpy.ops.import_scene.gltf(filepath=str(shell))
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
    try:
        pref=bpy.context.preferences.addons['cycles'].preferences;pref.compute_device_type='OPTIX';pref.get_devices();gpu=False
        for device in pref.devices:device.use=device.type=='OPTIX';gpu=gpu or device.use
        if gpu:scene.cycles.device='GPU'
    except Exception as error:print('V10_GPU_FALLBACK '+str(error),flush=True)
    scene.render.resolution_x=1600;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
    scene.view_settings.view_transform='AgX';scene.view_settings.exposure=-.15
    scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.08,.10,.13,1)
    scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.40
    for name,p,target,energy,size,color in(('hospitality warm key',(-3,6,6),(0,.8,1),1000,4,(1,.87,.69)),('hospitality cool fill',(4,5,4),(0,.8,1),650,3,(.76,.86,1))):
        data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.size=size;data.color=color
        ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);ob.location=xyz(p);ob.rotation_euler=(Vector(xyz(target))-ob.location).to_track_quat('-Z','Y').to_euler()
    data=bpy.data.cameras.new('V10 hospitality evidence');cam=bpy.data.objects.new(data.name,data);bpy.context.collection.objects.link(cam)
    cam.location=xyz((-.5,8,8));cam.rotation_euler=(Vector(xyz((-.5,.7,.6)))-cam.location).to_track_quat('-Z','Y').to_euler();data.lens=43;scene.camera=cam
    scene.render.filepath=str(QA/'interior-details-context.png');bpy.ops.render.render(write_still=True)
    print('V10_INTERIOR_PREVIEW_READY '+scene.render.filepath,flush=True)
