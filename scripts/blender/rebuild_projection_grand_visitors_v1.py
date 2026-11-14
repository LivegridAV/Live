"""Restage the existing licensed Rocketbox visitors at native metre scale.

Reuses the already posed/textured V10 meshes and documented MIT provenance.
Only world pose/anchor changes; textures, proportions and existing poses stay.
"""
from pathlib import Path
import bpy,json,math,hashlib
from mathutils import Matrix,Vector
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'public/models/expo/projection-visitors-v10.glb'
OUT=ROOT/'public/models/expo/projection-grand-visitors-v1.glb'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
placements={
 'reception-host':([-7.70,.12,5.10],0),
 'reception-colleague':([-5.85,.12,5.05],.10),
 'left-gallery-browser':([-8.75,.12,1.30],2.8),
 'conversation-left':([-3.10,.12,4.50],1.2),
 'conversation-right':([-2.35,.12,4.65],-1.84),
 'crystal-observer':([2.70,.12,3.50],-2.72),
 'kiosk-guest':([4.60,.12,6.85],-2.94),
 'deep-right-gallery':([7.55,.12,-2.75],1.15),
 'interior-left-conversation':([-6.90,.12,-2.15],-.72),
 'interior-right-browser':([6.80,.12,-1.75],1.4),
 'cafe-left':([9.225,.12,2.56],-1.50),
 'cafe-right':([9.37,.12,5.20],-1.70),
 'cafe-rear':([7.65,.12,4.50],.30),
}
basis=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))
records=[];meshes=[]
bpy.context.view_layer.update()
for root in [o for o in bpy.context.scene.objects if 'visitor_role' in o]:
    role=root['visitor_role'];destination,yaw=placements[role]
    old=Vector(root['native_three_position']);oldyaw=root['native_three_yaw']
    native=Matrix.Translation(Vector(destination))@Matrix.Rotation(yaw-oldyaw,4,'Y')@Matrix.Translation(-old)
    transform=basis@native@basis.inverted()
    children=[o for o in root.children_recursive if o.type=='MESH']
    # Store all matrices before detaching any parent; this preserves hair and
    # bag accessory positions rather than applying a translation twice.
    poses=[(o,transform@o.matrix_world.copy())for o in children]
    for ob,matrix in poses:
        ob.parent=None
        for vertex in ob.data.vertices:vertex.co=matrix@vertex.co
        ob.matrix_world=Matrix.Identity(4);ob['grandRole']='people';ob['visitor_role']=role;meshes.append(ob)
    pts=[v.co for ob in children for v in ob.data.vertices]
    bounds={'min':[min(p.x for p in pts),min(p.z for p in pts),min(-p.y for p in pts)],'max':[max(p.x for p in pts),max(p.z for p in pts),max(-p.y for p in pts)]}
    records.append({'role':role,'position':destination,'yaw':yaw,'height':bounds['max'][1]-bounds['min'][1],'bounds':bounds,'seated':role.startswith('cafe')})
bpy.ops.object.select_all(action='DESELECT')
for ob in meshes:ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,
    export_materials='EXPORT',export_cameras=False,export_lights=False,export_animations=False,export_extras=True,export_image_format='AUTO',
    export_vertex_color='NAME',export_vertex_color_name='Col',export_all_vertex_colors=False)
layout={'version':'grand-v1','asset':OUT.name,'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),'bytes':OUT.stat().st_size,
    'count':len(records),'placements':records,'floorY':.12,'seatTopY':.604,'runtimeScale':1,
    'source':str(SOURCE.relative_to(ROOT)),'sourceSHA256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
    'license':'Microsoft Rocketbox, MIT; see public/models/expo/technical-humans-LICENSE.txt and technical-humans-provenance.json',
    'provenance':'Existing project Rocketbox poses and photographic texture atlases. Native human proportions, alpha-tested hair and supported seated poses preserved; no purchases/downloads.'}
(OUT.with_name('projection-grand-visitors-v1-layout.json')).write_text(json.dumps(layout,indent=2),encoding='utf-8')
print('PROJECTION_GRAND_VISITORS_READY '+json.dumps({'count':len(records),'bytes':OUT.stat().st_size,'standingHeights':[round(p['height'],4)for p in records if not p['seated']]}),flush=True)
