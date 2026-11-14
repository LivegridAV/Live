"""Actual fractured crystal maquette for the common grand pavilion.

Primitive geometry is authored in metres. No image silhouettes/cards are used.
The composition keeps the selected reference's off-centre tall fracture and
stepped low radial rocks, with blue, silver, ivory and selected amber facets.
"""
from pathlib import Path
import json,math,hashlib,sys
HERE=Path(__file__).resolve().parent
PREVIOUS=HERE/'rebuild_projection_crystals_v12.py'
exec(compile(PREVIOUS.read_text(encoding='utf-8').split('def construct_v12():')[0],str(PREVIOUS),'exec'))
# The earlier needle constructor alternated material on every triangulated
# patch. The selected grand reference uses broad continuous physical facets;
# retain the geometric folds, but give each full side a coherent material.
blade_source=BASE_SOURCE[BASE_SOURCE.index('def blade('):BASE_SOURCE.index('def plate(')]
blade_source=blade_source.replace('role=ICE if (side*2+part+level+seed)%5 in(0,1) else FACE','role=FACE if side==0 else ICE')
blade_source=blade_source.replace('role=GOLD if gold and part in(0,3) else ICE if part%2 else SILVER','role=GOLD if gold else SILVER')
blade_source=blade_source.replace('role=SILVER if (part+level)%3 else JOINT','role=SILVER')
blade_source=blade_source.replace('role=RETURN if (part+level)%3==0 else SILVER','role=RETURN')
blade_source=blade_source.replace('role=ICE if part%3 else FACE','role=FACE')
exec(compile(blade_source,'grand-crystal-continuous-facets','exec'))
OUT=ROOT/'public/models/expo/projection-grand-crystals-v1.glb'
LAYOUT_OUT=ROOT/'public/models/expo/projection-grand-crystals-v1-layout.json'
DETAILS=[]
# Keep broad, closed cut faces rather than disconnected rods. Dimensions
# below are miniature/object dimensions, independent of human and shell scale.
specs=[
 ('highest off centre crystal',-.48,-.35,1.00,1.15,8.50,(-.12,-.04),-.10,False,1),
 ('central luminous blue fork',.50,.10,1.22,1.15,7.65,(.40,-.16),-.15,False,2),
 ('rear narrow silver spear',1.00,-1.20,.60,.85,6.95,(-.08,.05),.13,False,3),
 ('left broken champagne tower',-1.90,-.25,1.08,1.10,6.00,(.18,-.10),.10,True,4),
 ('left layered rear fracture',-2.55,-1.0,.62,.76,5.30,(.12,.02),-.14,False,5),
 ('left leaning fractured mass',-2.85,.60,.82,.95,4.60,(-.22,-.10),-.24,False,6),
 ('outer left rock spear',-3.45,.45,.62,.85,3.05,(.08,-.05),.18,False,7),
 ('right high silver spire',1.85,-.72,1.02,1.12,6.40,(-.12,-.04),.20,False,8),
 ('right warm stepped crystal',2.65,.23,1.00,1.00,4.85,(-.24,-.05),-.10,True,9),
 ('right outer low crystal',3.36,.50,.72,.88,3.10,(-.05,.03),.12,False,10),
 ('left inner low split',-1.14,1.20,.92,.96,3.20,(-.15,.10),.12,False,11),
 ('right inner low split',1.43,1.28,1.10,1.00,3.45,(.20,-.07),-.12,True,12),
 ('front low blue lamella',-.20,2.05,1.10,1.00,1.95,(.10,.04),-.15,False,13),
 ('rear radial crystal',-.30,-2.1,1.20,1.10,3.25,(.0,.0),.22,True,14),
]
for args in specs:blade(*args)
for i,(x,z,w,d,h,warm)in enumerate([(-2.5,1.40,1.3,.95,1.65,True),(-.95,1.9,1.2,1.0,1.60,False),
    (1.05,1.9,1.30,1.1,1.85,True),(2.85,1.05,.95,1.0,1.70,False),(-1.4,-2.1,1.2,1.0,2.10,False),(1.6,-2.0,1.2,1.05,2.25,True)]):
    compact_rock('interlocking radial foot '+str(i),x,z,w,d,h,.13*i,warm)
folded_plane('large left diagonal ice fold',[(-3.40,2.45,1.0),(-2.60,1.90,1.4),(-1.30,.45,2.0),(-1.65,.15,2.05),(-3.25,1.55,1.5)],.18,(FACE,ICE,RETURN,AMBER),.12)
folded_plane('large right descending ivory fold',[(.65,3.1,1.2),(1.4,2.7,1.45),(3.3,.55,1.3),(3.5,.12,1.4),(2.1,.65,1.9)],.17,(ICE,FACE,RETURN,SILVER),.13)
objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
# Keep a small closedsolid bevel; bakeall final posesbeforematerial batching.
bpy.context.view_layer.update()
for ob in objects:
    matrix=ob.matrix_world.copy();ob.parent=None
    for vertex in ob.data.vertices:vertex.co=matrix@vertex.co
    ob.matrix_world=Matrix.Identity(4);ob['grandRole']='sculpture'
groups={}
for ob in objects:
    # Split polygons by material with Blender's native operation so preserved
    # shader roles remain independent after batching.
    bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.separate(type='MATERIAL');bpy.ops.object.mode_set(mode='OBJECT')
for ob in [o for o in bpy.context.scene.objects if o.type=='MESH']:
    material=ob.data.materials[ob.data.polygons[0].material_index] if ob.data.polygons else FACE
    groups.setdefault(material.name,[]).append(ob)
batched=[]
for name,items in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for ob in items:ob.select_set(True)
    bpy.context.view_layer.objects.active=items[0]
    if len(items)>1:bpy.ops.object.join()
    ob=bpy.context.object;ob.name=name;ob['grandRole']='sculpture';batched.append(ob)
bpy.ops.object.select_all(action='DESELECT')
for ob in batched:ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,
    export_materials='EXPORT',export_cameras=False,export_lights=False,export_animations=False,export_extras=True)
pts=[o.matrix_world@v.co for o in batched for v in o.data.vertices]
bounds={'min':[min(p.x for p in pts),min(p.z for p in pts),min(-p.y for p in pts)],'max':[max(p.x for p in pts),max(p.z for p in pts),max(-p.y for p in pts)]}
layout={'version':'grand-v1','asset':OUT.name,'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),'units':'metres','bounds':bounds,
    'projectionDomain':{'min':[-4.0,0],'max':[4.0,8.55]},'placement':{'position':[0,.915,-2.8],'scale':[1,1,1]},
    'crystals':DETAILS,'provenance':'Original closed fractured maquette meshes; reused original authored solid/facet constructors. No reference-image pixels or external model.'}
LAYOUT_OUT.write_text(json.dumps(layout,indent=2),encoding='utf-8');print('PROJECTION_GRAND_CRYSTALS_READY '+json.dumps(layout['bounds']),flush=True)
