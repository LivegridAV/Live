"""Small native floor inlay from the LED Rental 2026 reference.

The lettering lies on the stage floor, facing visitors arriving from native
+Z. It is separate from every architecture/interior export and uses no raster
image plate. Coordinates are native Three XYZ, metres.
"""
from pathlib import Path
import bpy,math,json,hashlib,sys
from mathutils import Matrix,Vector

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/models/expo/led-rental-2026-floor-brand.glb'
LAYOUT=OUT.with_name('led-rental-2026-floor-brand-layout.json')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
FONT=bpy.data.fonts.load('C:/Windows/Fonts/seguisb.ttf')

def material(name,color,emission):
    mat=bpy.data.materials.new(name);mat.use_nodes=True
    shader=mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value=(*color,1)
    shader.inputs['Roughness'].default_value=.72
    shader.inputs['Metallic'].default_value=0
    shader.inputs['Emission Color'].default_value=(*color,1)
    shader.inputs['Emission Strength'].default_value=emission
    return mat

WHITE=material('LED Rental 2026 floor | white inlaid graphic letters',(.78,.85,.88),.12)
TEAL=material('LED Rental 2026 floor | livegrid teal diagonal inlay',(.005,.69,.55),.30)
FLOOR_Y=.126
labels=[]

def text(body,x,z,height,max_width):
    curve=bpy.data.curves.new('Floor inlay '+body,'FONT');curve.body=body;curve.font=FONT
    curve.size=1;curve.space_character=1.30;curve.align_x='LEFT';curve.extrude=.00025
    curve.resolution_u=8;curve.bevel_depth=0
    ob=bpy.data.objects.new('Floor inlay '+body,curve);bpy.context.collection.objects.link(ob)
    # Blender's unrotated text plane is XY, hence native X/-Z: lettering faces
    # upward and its top points into the stall, correctly read from entrance.
    ob.location=(x,-z,FLOOR_Y);ob.data.materials.append(WHITE)
    bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob
    bpy.ops.object.convert(target='MESH');ob=bpy.context.object
    ymin=min(v.co.y for v in ob.data.vertices);ymax=max(v.co.y for v in ob.data.vertices)
    xmin=min(v.co.x for v in ob.data.vertices);xmax=max(v.co.x for v in ob.data.vertices)
    sy=height/(ymax-ymin);sx=min(sy,max_width/(xmax-xmin))
    for v in ob.data.vertices:v.co.x=(v.co.x-xmin)*sx;v.co.y=(v.co.y-ymin)*sy
    labels.append({'text':body,'baseline':[x,FLOOR_Y,z],'height':height,'width':(xmax-xmin)*sx,'tracking':1.30})
    return ob

text('MORE',5.76,5.09,.078,1.61)
text('THAN SCREENS',5.76,5.27,.078,1.61)
text('A BRIGHTER TOMORROW',5.76,5.45,.068,1.61)

# Thin diagonal teal strip, a real flat closed quadrilateral in the floor plane.
a=(5.40,5.51);b=(5.60,4.99);dx=b[0]-a[0];dz=b[1]-a[1];length=math.hypot(dx,dz)
nx,nz=-dz/length*.011,dx/length*.011
corners=[(a[0]+nx,a[1]+nz),(b[0]+nx,b[1]+nz),(b[0]-nx,b[1]-nz),(a[0]-nx,a[1]-nz)]
vertices=[(x,-z,FLOOR_Y+d) for d in(-.0002,.0002) for x,z in corners]
faces=[(3,2,1,0),(4,5,6,7),(1,5,4,0),(2,6,5,1),(3,7,6,2),(0,4,7,3)]
mesh=bpy.data.meshes.new('Floor inlay diagonal teal stroke');mesh.from_pydata(vertices,[],faces);mesh.update()
ob=bpy.data.objects.new('Floor inlay diagonal teal stroke',mesh);bpy.context.collection.objects.link(ob);ob.data.materials.append(TEAL)

groups={}
for ob in bpy.context.scene.objects:
    if ob.type=='MESH':groups.setdefault(ob.data.materials[0].name,[]).append(ob)
for name,objects in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objects:ob.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    if len(objects)>1:bpy.ops.object.join()
    ob=bpy.context.object;ob.name=name
    ob.data.transform(ob.matrix_world);ob.matrix_world=Matrix.Identity(4)
bpy.ops.object.select_all(action='SELECT')
OUT.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(OUT),export_format='GLB',use_selection=True,
    export_yup=True,export_apply=True,export_materials='EXPORT',export_cameras=False,
    export_lights=False,export_animations=False)
points=[ob.matrix_world@v.co for ob in bpy.context.scene.objects if ob.type=='MESH' for v in ob.data.vertices]
lo=[min(p[i] for p in points) for i in range(3)];hi=[max(p[i] for p in points) for i in range(3)]
layout={'asset':OUT.name,'authoringAxes':'native Three XYZ front +Z','position':[6.4,FLOOR_Y,5.25],
    'labels':labels,'diagonalStroke':{'from':[a[0],FLOOR_Y,a[1]],'to':[b[0],FLOOR_Y,b[1]],'width':.022},
    'bounds':{'min':[lo[0],lo[2],-hi[1]],'max':[hi[0],hi[2],-lo[1]]},
    'bytes':OUT.stat().st_size,'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),
    'provenance':'Original native 3D font outlines and flat teal geometric floor inlay; no attached photograph pixels.'}
LAYOUT.write_text(json.dumps(layout,indent=2),encoding='utf-8')
print('LED_RENTAL_2026_FLOOR_BRAND '+json.dumps(layout),flush=True)

if '--preview' in sys.argv:
    floor=material('QA only charcoal floor',(.035,.045,.055),0)
    bpy.ops.mesh.primitive_plane_add(size=1,location=(6.4,-5.25,.122))
    ob=bpy.context.object;ob.scale=(3.0,1.6,1);ob.data.materials.append(floor)
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
    scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs[1].default_value=.45
    bpy.ops.object.light_add(type='AREA',location=(6.4,-5.25,4))
    light=bpy.context.object;light.data.energy=250;light.data.shape='DISK';light.data.size=4
    bpy.ops.object.camera_add(location=(6.4,-8.3,3.7))
    camera=bpy.context.object;camera.rotation_euler=(Vector((6.4,-5.25,.126))-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type='ORTHO';camera.data.ortho_scale=2.75;scene.camera=camera
    scene.render.resolution_x=1000;scene.render.resolution_y=440;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.filepath=str(ROOT/'qa/led-rental-2026/floor-brand-preview.png')
    bpy.ops.render.render(write_still=True)
