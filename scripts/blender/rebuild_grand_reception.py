"""Selected curved reception, reflowed inside the shared open-feature reservation.
Preserves cylinder, elliptical halo, concave LED and exact curved counter joinery.
Only architecture is fitted. Licensed humans and detailed botany use metre units.
"""
from pathlib import Path
import bpy, json, math, hashlib
from mathutils import Vector, Matrix
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[1]
cfg=json.loads((ROOT/'public/models/expo/grand-dimensions.json').read_text())
srcfile=HERE/'rebuild_reception_gallery.py'
source=srcfile.read_text(encoding='utf-8').split('# Bake all guests and chairs')[0]
source=source.replace('[2.35446, 10.11994, -4.43058]','[2.2, 10.11994, -3.5]').replace('[8.08472 / 4.9, 2, 4.06681 / 4.9]','[7.6 / 4.9, 2, 3.85 / 4.9]')
source=source.replace('[-1.499, 4.2015, 1.498]','[.7, 4.45, 4.0]').replace('[13.594 / 9, 7.903 / 6.6, 13.594 / 9]','[11.6 / 9, 8.4 / 6.6, 11.6 / 9]').replace('-.66665','-.5')
source=source.replace('[12, 0, 1]','[10.65, 0, -.5]').replace('[10.3866, 0, 1.8982]','[10, 0, 1.3]').replace('[-16.4, 0, -5.75]','[-10.8, 0, -5.75]')
source=source.replace('# The hero cylinder rises','def human(*args,**kwargs): pass\ndef leafy_tree(*args,**kwargs): pass\n\n# The hero cylinder rises')
ns={'__file__':str(srcfile)};exec(compile(source,str(srcfile),'exec'),ns)
xyz=ns['xyz'];F=.12
keep=set()
for objects in ns['ASSEMBLIES'].values():keep.update(objects)
for ob in list(bpy.context.scene.objects):
    if ob not in keep:bpy.data.objects.remove(ob,do_unlink=True)
bpy.context.view_layer.update()
for name,objects in ns['ASSEMBLIES'].items():
    for ob in objects:
        try: exists=ob.name in bpy.data.objects
        except ReferenceError: continue
        if not exists:continue
        if name=='halo':ob['grandRole']='overhead'
        if ob.parent not in objects:ob.location.z+=F
for ob in list(bpy.context.scene.objects):
    if 'staff concealed black working platform' in ob.name:bpy.data.objects.remove(ob,do_unlink=True)
# Premium signs built above (every one sits in a raised assembly, so its anchor rises by F too).
# Copied now: later helper files share this Blender session's sign log.
signage=[dict(sign,position=[sign['position'][0],round(sign['position'][1]+F,4),sign['position'][2]]) for sign in ns['premium_signage']().SIGN_LOG]
# Detailed multi-branch foliage uses the existing original botanical atlas.
furn=HERE/'rebuild_led_rental_2026_interior.py'
# Its helpers clear the scene, so preserve the reception objects temporarily.
old=list(bpy.context.scene.objects)
for ob in old:bpy.context.collection.objects.unlink(ob)
fn={'__file__':str(furn)}
exec(compile(furn.read_text(encoding='utf-8').split('# Left low display/garden')[0],str(furn),'exec'),fn)
for ob in old:bpy.context.collection.objects.link(ob)
for i,(x,z,h) in enumerate(((-10.9,-.7,3.1),(-5.2,-5.4,2.4),(10.2,1.7,3.5),(-2.2,-5.2,1.0),(7.8,-4.0,1.3))):fn['plant26']('Reception original botanical '+str(i),x,z,h,.48,.26,'bush' if i%2 else 'palm',metal=True,seed=701+i)
for k,mat in (('leaves',fn['LEAF26']),('broad-leaves',fn['TROPICAL_LEAF26'])):
    if k in fn['BATCH']:
        g=fn['BATCH'][k];ob=fn['mesh26']('reception individually curved foliage',g['v'],g['f'],mat,g['uv'])
        for p in ob.data.polygons:p.use_smooth=True

def export(file,objects):
    bpy.context.view_layer.update();groups={};meshes=[]
    for ob in objects:
        if ob.type!='MESH':continue
        matrix=ob.matrix_world.copy();ob.parent=None;ob.data.transform(matrix);ob.matrix_world=Matrix.Identity(4)
        groups.setdefault((ob.data.materials[0].name,ob.get('grandRole','interior')),[]).append(ob)
    for (name,role),obs in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for ob in obs:ob.select_set(True)
        bpy.context.view_layer.objects.active=obs[0]
        if len(obs)>1:bpy.ops.object.join()
        ob=bpy.context.object;ob.name=name+' | '+role;ob['grandRole']=role;meshes.append(ob)
    bpy.ops.object.select_all(action='DESELECT')
    for ob in meshes:ob.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_materials='EXPORT',export_extras=True,export_cameras=False,export_lights=False,export_animations=False)
    points=[ob.matrix_world@Vector(c) for ob in meshes for c in ob.bound_box]
    lo=[min(p[i] for p in points) for i in range(3)];hi=[max(p[i] for p in points) for i in range(3)]
    return {'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'bounds':{'min':[lo[0],lo[2],-hi[1]],'max':[hi[0],hi[2],-lo[1]]},'triangles':sum(sum(len(p.vertices)-2 for p in ob.data.polygons) for ob in meshes)}

stats=export(ROOT/'public/models/expo/grand-reception.glb',list(bpy.context.scene.objects))
for ob in list(bpy.context.scene.objects):bpy.data.objects.remove(ob,do_unlink=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/models/expo/projection-visitors-v10.glb'))
original=list(bpy.context.scene.objects);templates={ob.get('visitor_role'):ob for ob in original if ob.get('visitor_role')};created=[];placements=[]
for role,key,x,z,yaw in [('host','reception-host',3.5,4.65,-.1),('bar adviser','reception-colleague',5.3,4.6,-.1),('visitor','conversation-left',-3.95,5.65,2.7),('guest','conversation-right',-4.3,4.8,-.6),('rear seated','cafe-left',-3.7,-5.2,0),('left consultation','cafe-rear',-5.2,-3.8,.6),('lounge guest','cafe-right',-2.1,-2.25,-2.6)]:
    source=templates[key];root=bpy.data.objects.new('Reception '+role,None);bpy.context.collection.objects.link(root);root.location=xyz((x,F,z));root.rotation_euler[2]=yaw;scale=source.get('normal_human_scale',1);root.scale=(scale,)*3
    for child in source.children_recursive:
        if child.type!='MESH':continue
        ob=bpy.data.objects.new(root.name+' mesh',child.data.copy());bpy.context.collection.objects.link(ob);ob.parent=root;ob.matrix_parent_inverse=Matrix.Identity(4);ob.matrix_basis=source.matrix_world.inverted()@child.matrix_world;created.append(ob)
    placements.append({'role':role,'position':[x,F,z],'nativeScale':scale})
for ob in original:
    if ob.name in bpy.data.objects:bpy.data.objects.remove(ob,do_unlink=True)
people=export(ROOT/'public/models/expo/grand-reception-visitors.glb',created)
layout={'version':'grand-20261018','openFeatureReservation':cfg['master'],'geometry':stats,'people':people,'placements':placements,'assemblies':ns['LAYOUT'],'signage':signage,'route':{'width':2,'xMin':-3.4,'xMax':-1.4,'zMin':1.8,'zMax':8},'provenance':'Original selected reception joinery reused and reflowed; original botanical helper/atlas; Microsoft Rocketbox MIT textured people. No full-assembly scaling.'}
(ROOT/'public/models/expo/grand-reception-layout.json').write_text(json.dumps(layout,indent=2),encoding='utf-8')
print('GRAND_RECEPTION '+json.dumps({'geometry':stats,'people':people}),flush=True)
