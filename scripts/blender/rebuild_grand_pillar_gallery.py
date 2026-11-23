"""Retained pillar gallery joinery with native licensed people and living leaves.
Pillar display bodies remain procedural at their approved dimensions/locations.
"""
from pathlib import Path
import bpy,json,hashlib,math
from mathutils import Vector,Matrix
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[1]
f=HERE/'rebuild_pillar_gallery.py'
source=f.read_text(encoding='utf-8').split('# Exhibition roof:')[0]
source=source.replace('# Reception: a continuous','def tailored_guest(*args,**kwargs): pass\ndef olive(*args,**kwargs): pass\n\n# Reception: a continuous')
# Terminate the gallery backdrop before the continuous central venue route.
# The old full-width wall crossed X=0 and the normal camera dolly passed through it.
source=source.replace('(0, 3.62, -9.05), (22.3, 7.24, .36)','(-2.2, 3.62, -9.05), (17.9, 7.24, .36)')
source=source.replace('(0, 1.22, -8.84), (22.1, 2.38, .14)','(-2.2, 1.22, -8.84), (17.7, 2.38, .14)')
source=source.replace('(0, 2.43, -8.78), (22.0, .038, .075)','(-2.2, 2.43, -8.78), (17.6, .038, .075)')
source=source.replace('(0, 6.97, -8.58), (22.3, .37, .9)','(-2.2, 6.97, -8.58), (17.9, .37, .9)')
source=source.replace('(0, 6.75, -8.93), (22.0, .028, .05)','(-2.2, 6.75, -8.93), (17.6, .028, .05)')
source=source.replace('(-8.2, -5.45, -2.7, .05, 2.8, 5.55, 8.3)','(-8.2, -5.45, -2.7, .05, 2.8, 5.55)')
source=source.replace('(8.00, 5.10 - i * .45, -8.807)','(4.70, 5.10 - i * .45, -8.807)')
ns={'__file__':str(f)};exec(compile(source,str(f),'exec'),ns)
# Premium signs built above. Copied now: later helper files share this Blender session's sign log.
signage=[dict(sign) for sign in ns['premium_signage']().SIGN_LOG]
old=list(bpy.context.scene.objects)
for ob in old:bpy.context.collection.objects.unlink(ob)
furn=HERE/'rebuild_led_rental_2026_interior.py';fn={'__file__':str(furn)}
exec(compile(furn.read_text(encoding='utf-8').split('# Left low display/garden')[0],str(furn),'exec'),fn)
for ob in old:bpy.context.collection.objects.link(ob)
for i,(x,z,h) in enumerate(((-9.4,-6.6,3.1),(5.5,-6.5,3.0),(-9,3.0,.8),(6.2,3,.8))):fn['plant26']('pillar gallery botanical '+str(i),x,z,h,.48,.28,'bush',base=.009,metal=True,seed=791+i)
for key,mat in (('leaves',fn['LEAF26']),('broad-leaves',fn['TROPICAL_LEAF26'])):
    if key not in fn['BATCH']:continue
    g=fn['BATCH'][key];ob=fn['mesh26']('pillar gallery curved individual leaves',g['v'],g['f'],mat,g['uv'])
    for p in ob.data.polygons:p.use_smooth=True

def export(file,objects):
    bpy.context.view_layer.update();groups={};result=[]
    for ob in objects:
        if ob.type!='MESH':continue
        matrix=ob.matrix_world.copy();ob.parent=None;ob.data.transform(matrix);ob.matrix_world=Matrix.Identity(4)
        groups.setdefault(ob.data.materials[0].name,[]).append(ob)
    for name,obs in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for ob in obs:ob.select_set(True)
        bpy.context.view_layer.objects.active=obs[0]
        if len(obs)>1:bpy.ops.object.join()
        ob=bpy.context.object;ob.name=name;result.append(ob)
    bpy.ops.object.select_all(action='DESELECT')
    for ob in result:ob.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_materials='EXPORT',export_cameras=False,export_lights=False,export_animations=False)
    return {'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'bytes':file.stat().st_size,'triangles':sum(sum(len(p.vertices)-2 for p in ob.data.polygons) for ob in result)}

gallery=export(ROOT/'public/models/expo/grand-pillar-gallery.glb',list(bpy.context.scene.objects))
for ob in list(bpy.context.scene.objects):bpy.data.objects.remove(ob,do_unlink=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/models/expo/projection-visitors-v10.glb'))
original=list(bpy.context.scene.objects);templates={ob.get('visitor_role'):ob for ob in original if ob.get('visitor_role')}
created=[];placements=[]
for role,key,x,z,yaw in [('foreground observer','conversation-left',-3.2,4.2,2.8),('left group','conversation-right',-8.8,-.5,-.5),('companion guest','crystal-observer',-7.0,-3.5,1),('reception visitor','deep-right-gallery',3.3,-5.1,2.5),('reception host','reception-host',-1.6,-7.93,0),('reception colleague','reception-colleague',3.55,-7.94,0),('reception adviser','interior-left-conversation',6.15,-7.95,0)]:
    source=templates[key];root=bpy.data.objects.new('Pillar gallery '+role,None);bpy.context.collection.objects.link(root)
    root.location=ns['xyz']((x,.009,z));root.rotation_euler[2]=yaw;sc=source.get('normal_human_scale',1);root.scale=(sc,)*3
    for child in source.children_recursive:
        if child.type!='MESH':continue
        ob=bpy.data.objects.new(root.name+' mesh',child.data.copy());bpy.context.collection.objects.link(ob);ob.parent=root;ob.matrix_parent_inverse=Matrix.Identity(4);ob.matrix_basis=source.matrix_world.inverted()@child.matrix_world;created.append(ob)
    placements.append({'role':role,'galleryPosition':[x,.009,z],'scale':sc})
for ob in original:
    if ob.name in bpy.data.objects:bpy.data.objects.remove(ob,do_unlink=True)
people=export(ROOT/'public/models/expo/grand-pillar-visitors.glb',created)
layout={'geometry':gallery,'people':people,'placements':placements,'signage':signage,'provenance':'Original retained gallery joinery; original textured curved-leaf botany; Microsoft Rocketbox Avatar Library MIT Copyright (c) 2020 Microsoft. Gallery raises .111m with common .12m finished floor. Main central route world X[-1,1] kept clear of planters/avatars.'}
(ROOT/'public/models/expo/grand-pillar-layout.json').write_text(json.dumps(layout,indent=2),encoding='utf-8')
print('GRAND_PILLARS '+json.dumps(layout),flush=True)
