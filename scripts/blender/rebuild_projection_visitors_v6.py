"""Normal-sized visitors restaged for the fresh V6 projection pavilion.

The architecture grows to 14.4 x 8 x 7.8 metres. People retain their original
human dimensions and the three validated .584m chair-contact poses; this file
changes their spatial staging rather than scaling them with the building.
"""
from pathlib import Path
import json, math, hashlib
import bpy

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]

# Reuse the corrected, textured Rocketbox preparation and placement helpers.
# Stop before V4 placements/export: rebuilding V6 never overwrites earlier assets.
shared=HERE/'rebuild_projection_visitors_v4.py'
exec(compile(shared.read_text(encoding='utf-8').split('placements=[')[0],str(shared),'exec'))

CHAIRS=[
    {'role':'cafe-left','position':[4.30,.10,3.05],'yaw':1.15},
    {'role':'cafe-right','position':[5.832,.10,2.401],'yaw':-.60},
    {'role':'cafe-rear','position':[5.072,.10,1.882],'yaw':-.60},
]

# Normal human proportions and validated cushion contact remain unchanged.
PLACEMENTS=[
    ('reception-host','Business_Female_01','operator',-4.10,2.34,0,.94,None),
    ('reception-colleague','Business_Male_01','operator',-2.83,2.18,-.25,.98,None),
    ('left-gallery-browser','Business_Male_02','idle',-5.60,1.70,-2.60,.96,None),
    ('conversation-left','Business_Male_02','talk',-1.90,2.15,-1.20,.98,None),
    ('conversation-right','Business_Male_01','idle',-1.23,2.32,1.84,.99,None),
    ('crystal-observer','Business_Female_04','idle',1.25,2.05,2.72,.94,'black-top-ivory-trousers'),
    ('kiosk-guest','Business_Male_02','operator',3.05,3.65,2.14,.98,'black-backpack'),
    ('deep-right-gallery','Business_Female_01','talk',3.90,-1.75,-1.15,.93,None),
    ('interior-left-conversation','Business_Female_04','talk',-3.50,-1.65,.72,.94,None),
    ('interior-right-browser','Business_Male_01','idle',3.45,.50,-1.40,.98,None),
    ('cafe-left','Business_Female_01','projection-seated',4.275,3.11,1.15,1,None),
    ('cafe-right','Business_Male_02','projection-seated',5.952,2.401,-.60,1,None),
    ('cafe-rear','Business_Male_01','projection-seated',5.072,1.882,-.60,1,None),
]

def observer_garments(root):
    """Copy garment faces only; preserve source skin, hair, shoes and UV normals."""
    assigned={'charcoalTopFaces':0,'ivoryTrouserFaces':0,'preservedSkinFaces':0}
    for ob in root.children:
        if ob.type!='MESH':continue
        body_slots=[i for i,m in enumerate(ob.data.materials) if re.sub(r'\.\d{3,}$','',m.name).endswith(' | body')]
        if not body_slots:continue
        ob.data=ob.data.copy();uv=ob.data.uv_layers.active
        for slot in body_slots:
            source=ob.data.materials[slot]
            texture=next(node.image for node in source.node_tree.nodes if node.type=='TEX_IMAGE' and node.image and node.image.colorspace_settings.name=='sRGB')
            colors=list(texture.pixels[:]);w,h=texture.size
            garment_slots=[]
            for name,color in [('charcoal top',(.006,.008,.012,1)),('ivory trousers',(.59,.555,.46,1))]:
                mat=source.copy();mat.name='Rocketbox V6 observer only | '+name+' body'
                shader=mat.node_tree.nodes.get('Principled BSDF')
                for link in list(shader.inputs['Base Color'].links):mat.node_tree.links.remove(link)
                shader.inputs['Base Color'].default_value=color
                shader.inputs['Roughness'].default_value=.88
                # The original normal-map connection retains sewn fabric detail.
                garment_slots.append(len(ob.data.materials));ob.data.materials.append(mat)
            for face in ob.data.polygons:
                if face.material_index!=slot:continue
                height=sum(ob.data.vertices[i].co.z for i in face.vertices)/len(face.vertices)
                if not(.03<height<1.59):continue
                uv_center=sum((uv.data[i].uv for i in face.loop_indices),Vector((0,0)))/len(face.loop_indices)
                px=max(0,min(w-1,int(uv_center.x*w)));py=max(0,min(h-1,int(uv_center.y*h)))
                r,g,b=colors[(py*w+px)*4:(py*w+px)*4+3]
                # The original atlas has two complete lower-leg UV islands in
                # the outer bottom corners. Use those sewn garment islands,
                # not a height cutoff that would turn cuffs or jacket hems ivory.
                trousers=(uv_center.x<.337 or uv_center.x>.663) and uv_center.y<.365
                if trousers:
                    face.material_index=garment_slots[1];assigned['ivoryTrouserFaces']+=1;continue
                if height<.30:continue # preserve original photographic shoes
                if r>g*1.16 and g>b*1.08 and r>.10:
                    assigned['preservedSkinFaces']+=1;continue
                face.material_index=garment_slots[0];assigned['charcoalTopFaces']+=1
    root['signature_wardrobe']=json.dumps(assigned)
    print('V6_OBSERVER_GARMENTS '+json.dumps(assigned),flush=True)
    return assigned

records=[]
for role,avatar,pose,x,z,turn,scale,appearance in PLACEMENTS:
    root=visitor(avatar,pose,x,z,turn,scale,appearance)
    wardrobe=observer_garments(root) if role=='crystal-observer' else None
    root.name='Projection V6 visitor | '+role+' | '+avatar+' | '+pose
    root['visitor_role']=role
    root['normal_human_scale']=scale
    root['native_three_position']=[x,.10,z]
    root['native_three_yaw']=turn if pose=='projection-seated' else -turn
    bpy.context.view_layer.update()
    points=[ob.matrix_world@v.co for ob in root.children if ob.type=='MESH' for v in ob.data.vertices]
    lo=[min(p[i] for p in points) for i in range(3)]
    hi=[max(p[i] for p in points) for i in range(3)]
    # Blender Z is native Y, and Blender -Y is native Z.
    bounds={'min':[lo[0],lo[2],-hi[1]],'max':[hi[0],hi[2],-lo[1]]}
    height=hi[2]-lo[2]
    if abs(lo[2]-.10)>.001 or not (1.25<height<1.85):
        raise RuntimeError('Invalid normal human bounds for '+role+': '+str(bounds))
    records.append({'role':role,'avatar':avatar,'pose':pose,'position':[x,.10,z],
        'nativeThreeYaw':root['native_three_yaw'],'scale':scale,'appearance':appearance,
        'height':height,'bounds':bounds,**({'wardrobeFaces':wardrobe} if wardrobe else {})})

meshes=[ob for ob in bpy.context.scene.objects if ob.type=='MESH']
for ob in meshes:
    for poly in ob.data.polygons:poly.use_smooth=True
    for mat in ob.data.materials:
        if 'opacity' in mat.name:continue
        bsdf=mat.node_tree.nodes.get('Principled BSDF')
        if bsdf:bsdf.inputs['Roughness'].default_value=.85 if 'body' in mat.name else .65

out=ROOT/'public/models/expo/projection-visitors-v6.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_yup=True,
    export_apply=True,export_materials='EXPORT',export_cameras=False,export_lights=False,
    export_animations=False,export_extras=True,export_image_format='AUTO')
layout={'version':6,'source':'Microsoft Rocketbox, MIT; see technical-humans-LICENSE.txt',
    'authoringAxes':'native Three XYZ, front +Z','count':len(records),'placements':records,
    'architectureEnvelope':[14.4,7.8,8],'nativeFloorZDomain':[-3,5],'stage':{'center':[0,1.10,-.25],'width':5.70,'depth':2.70},
    'crystal':{'asset':'projection-crystals.glb','position':[0,1.10,-.20],'scale':[1.22,1.34,1.22]},
    'seatedChairAnchors':CHAIRS,'seatTopY':SEAT_TOP,'seatedContactRevision':SEATED_REVISION,
    'seatedGuestOffsets':{'cafe-left':[-.025,0,.06],'cafe-right':[.12,0,0],'cafe-rear':[0,0,0]},
    'seatingFurniture':{'cafe-left':'single rounded armchair','cafe-right':'two-seat sofa right','cafe-rear':'two-seat sofa left'},
    'seatedContacts':SEATED_CONTACTS,'bytes':out.stat().st_size,
    'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),
    'staging':{'receptionCenter':[-4.10,.10,3.10],'kioskCenter':[1.85,.10,3.25],
        'cafeTableCenter':[5.15,.10,3.05],'cafeTableRadius':.43,'cafeTableTopY':.748,
        'openFrontEntry':{'center':[.15,.10,4.00],'width':2.4},
        'normalHumanDimensionsPreserved':True}}
(ROOT/'public/models/expo/projection-visitors-v6-layout.json').write_text(json.dumps(layout,indent=2))
print('PROJECTION_VISITORS_V6 '+json.dumps(layout),flush=True)
