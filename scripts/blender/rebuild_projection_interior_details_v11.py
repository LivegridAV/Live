"""Reference four-view hospitality props with two small mixed floral vessels.

Native Three XYZ, front +Z, metres. The shell owns the crescent bar, stools,
laptops and its two miniature bar-top planters. This separate asset owns only
five coordinated floor/stage vessel bodies, supported drinks and two complete
bar-top floral arrangements. All previous V10 poses are preserved. No reference
raster pixels are used; the new flowers are actual closed/thin Blender meshes.
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
OUT=ROOT/'public/models/expo/projection-interior-details-v11.glb'
LAYOUT_OUT=ROOT/'public/models/expo/projection-interior-details-v11-layout.json'
QA=ROOT/'qa/projection-mapping-v11';QA.mkdir(parents=True,exist_ok=True)
PREFIX='Projection Interior V11 | '
for mat in bpy.data.materials:
    if mat.name.startswith('Projection Interior V8 | '):mat.name=PREFIX+mat.name.split(' | ',1)[1]
ITEMS=[];VESSELS=[];FLORAL=[]

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

# Small arrangements sit between the preserved cups and laptop stations. The
# proposed +/-16 degree anchors coincide with the old espresso cups; +/-22
# degrees keeps the same radius and opens real clearance on both sides.
FLOWER_IVORY=material(PREFIX+'soft ivory botanical flower petals',(.78,.75,.65),0,.54)
FLOWER_CENTER=material(PREFIX+'warm ochre botanical flower centers',(.30,.20,.065),0,.68)
FLORAL_LEAF=material(PREFIX+'natural living botanical foliage',(.025,.105,.043),0,.56)
FLORAL_STEM=material(PREFIX+'botanical slender olive stems',(.035,.070,.023),0,.73)


def living_leaf(name,base,tip,width,roll=0):
    direction=(tip-base).normalized()
    side=direction.cross(Vector((0,1,0)))
    if side.length<.1:side=direction.cross(Vector((1,0,0)))
    side.normalize();side=Matrix.Rotation(roll,3,direction)@side
    ridge=side.cross(direction).normalized();vertices=[]
    for layer in(-1,1):
        for j in range(7):
            t=j/6;mid=base.lerp(tip,t)+ridge*(math.sin(t*math.pi)*.004+layer*.00035)
            half=math.sin(math.pi*t)**.80*width/2
            vertices.extend((mid-side*half-ridge*half*.20,mid+ridge*half*.16,mid+side*half-ridge*half*.20))
    faces=[];span=21
    for layer in range(2):
        off=layer*span
        for j in range(6):
            for col in range(2):
                a=off+j*3+col;f=(a,a+1,a+4,a+3)
                faces.append(f if layer==0 else tuple(reversed(f)))
    for col in(0,2):
        for j in range(6):a=j*3+col;b=a+3;faces.append((a,b,b+span,a+span))
    faces.extend(((0,1,2,23,22,21),(18,39,40,41,20,19)))
    return patch_mesh(name,vertices,faces,FLORAL_LEAF)


def ivory_blossom(name,center,angle,scale=1):
    vertices=[];faces=[]
    # Slightly irregular cupped petals have real edge thickness and curved
    # silhouettes; they are not intersecting white cards or billboard sprites.
    for petal in range(5):
        a=angle+petal*math.tau/5;radial=Vector((math.cos(a),.24,math.sin(a))).normalized()
        side=Vector((-math.sin(a),0,math.cos(a)))
        start=len(vertices);length=(.016+.002*math.sin(a*2.3))*scale;width=.012*scale
        for layer in(-1,1):
            for j in range(5):
                t=j/4;mid=center+radial*(length*t)+Vector((0,.006*math.sin(t*math.pi)*scale+layer*.00045,0))
                half=math.sin(math.pi*t)**.65*width/2
                vertices.extend((mid-side*half,mid+side*half))
        for layer in range(2):
            off=start+layer*10
            for j in range(4):
                f=(off+j*2,off+j*2+1,off+j*2+3,off+j*2+2)
                faces.append(f if layer==0 else tuple(reversed(f)))
        for col in(0,1):
            for j in range(4):
                q=start+j*2+col;faces.append((q,q+2,q+12,q+10))
    ob=patch_mesh(name,vertices,faces,FLOWER_IVORY)
    disk(name+' tiny ochre center',center.x,center.z,.0032*scale,center.y-.001,center.y+.002,FLOWER_CENTER)
    return ob


def mixed_flower_vessel(name,degrees,seed):
    x,z=polar(3.30,degrees);soil=1.055;target=1.42
    vessel(name,[x,BAR_TOP,z],.062,.12,True,target,soilGap=.015)
    before=set(bpy.context.scene.objects);rng=random.Random(seed)
    for branch in range(6):
        a=branch*2.399+rng.uniform(-.22,.22);height=.215+.038*(branch%4)
        start=Vector((x+math.cos(a)*.012,soil-.013,z+math.sin(a)*.012))
        tip=Vector((x+math.cos(a)*(.045+.006*(branch%3)),soil+height,z+math.sin(a)*(.045+.006*(branch%3))))
        mid=start.lerp(tip,.48)+Vector((math.sin(a)*.012,.012,-math.cos(a)*.012))
        path=[start,start.lerp(mid,.6),mid,mid.lerp(tip,.62),tip]
        for j,(p,q)in enumerate(zip(path,path[1:])):rod(PREFIX+name+' curved floral stem',p,q,.0014-j*.00016,FLORAL_STEM,6)
        for j in range(3):
            t=.25+j*.17;base=start.lerp(tip,t);leaf_a=a+(-1 if j%2 else 1)*1.05
            length=.045+.009*((branch+j)%3)
            leaf_tip=base+Vector((math.cos(leaf_a)*length,.014+.007*(j%2),math.sin(leaf_a)*length))
            living_leaf(PREFIX+name+' folded live leaf',base,leaf_tip,.015+.003*(j%2),rng.uniform(-.35,.35))
        for j in range(3):
            bloom=tip+Vector((math.cos(a+j*1.8)*.019,-j*.026,math.sin(a+j*1.8)*.019))
            fork=tip.lerp(start,.12+j*.08);rod(PREFIX+name+' fine blossom pedicel',fork,bloom,.0008,FLORAL_STEM,5)
            ivory_blossom(PREFIX+name+' small cupped ivory flower',bloom,a+j*.8,.82+.1*(j%2))
    objects=[ob for ob in set(bpy.context.scene.objects)-before if ob.type=='MESH']
    for ob in objects:ob['interior_component']=name+'-floral'
    b=bounds(objects)
    points=[ob.matrix_world@vertex.co for ob in objects for vertex in ob.data.vertices]
    FLORAL.append({'id':name,'kind':'complete mixed ivory flowers with small folded living leaves','position':[x,BAR_TOP,z],
        'radiusFromStageCenter':3.30,'angleDegrees':degrees,'vesselRadius':.062,'rimY':1.07,'soilY':soil,
        'foliageBounds':b,'plantTop':b['max'][1],'maximumPlanRadius':max(math.hypot(v.x-x,-v.y-z) for v in points),
        'support':'vessel soil, with stems inserted13mm into soil; vessel stands on the real crescent quartz top atY.95'})


mixed_flower_vessel('bar-mixed-flowers-left',-22,202610171)
mixed_flower_vessel('bar-mixed-flowers-right',22,202610172)

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
layout={'version':11,'asset':OUT.name,'authoringAxes':'native Three XYZ front +Z','placement':{'position':[0,0,0],'rotation':[0,0,0],'scale':1,'parentRoot':[10.2,0,-189],'parentRotation':[0,-math.pi/2,0],'parentScale':3},
    'items':ITEMS,'vessels':VESSELS,'materialRoles':[ob.data.materials[0].name for ob in batched],
    'floralArrangements':FLORAL,'preservedV10Components':[i['id']for i in ITEMS if not i['id'].startswith('bar-mixed-flowers-')],
    'removedV8Components':['central-cafe-chair-left','central-cafe-chair-right','central-cafe-table','cafe-bud-pot','cafe-espresso','cafe-napkin-and-spoon','bar-right-black'],
    'supportContract':{'floorY':.10,'stage':{'centerXZ':[0,-1.45],'radius':2.90,'topY':1.25},'bar':{'centerXZ':[0,-1.45],'innerRadius':BAR_INNER,'outerRadius':BAR_OUTER,'topY':BAR_TOP,'sectorDegrees':[-65,65]},'reception':{'center':[-4.30,.10,3.10],'width':3.60,'depth':.82,'topY':1.20}},
    'ambientOcclusion':ao,'stats':stats,'bytes':stats['bytes'],'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),
    'provenance':'Original bespoke Blender vessels, porcelain/glass drink props and two complete cupped ivory floral arrangements with folded leaves. Every V10 pose is preserved. Proposed16degree floral anchors conflicted with preserved cups;22degree anchors occupy the clear interval toward the outer laptops. No reference image pixels or downloaded models.'}
LAYOUT_OUT.write_text(json.dumps(layout,indent=2),encoding='utf-8')
print('V11_INTERIOR_READY '+json.dumps({'sha256':layout['sha256'],**stats}),flush=True)

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
    except Exception as error:print('V11_GPU_FALLBACK '+str(error),flush=True)
    scene.render.resolution_x=1600;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
    scene.view_settings.view_transform='AgX';scene.view_settings.exposure=-.15
    scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.08,.10,.13,1)
    scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.40
    for name,p,target,energy,size,color in(('hospitality warm key',(-3,6,6),(0,.8,1),1000,4,(1,.87,.69)),('hospitality cool fill',(4,5,4),(0,.8,1),650,3,(.76,.86,1))):
        data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.size=size;data.color=color
        ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);ob.location=xyz(p);ob.rotation_euler=(Vector(xyz(target))-ob.location).to_track_quat('-Z','Y').to_euler()
    data=bpy.data.cameras.new('V11 hospitality evidence');cam=bpy.data.objects.new(data.name,data);bpy.context.collection.objects.link(cam)
    cam.location=xyz((-.5,8,8));cam.rotation_euler=(Vector(xyz((-.5,.7,.6)))-cam.location).to_track_quat('-Z','Y').to_euler();data.lens=43;scene.camera=cam
    scene.render.filepath=str(QA/'interior-details-context.png');bpy.ops.render.render(write_still=True)
    print('V11_INTERIOR_PREVIEW_READY '+scene.render.filepath,flush=True)
