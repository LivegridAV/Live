"""Normal-sized visitors for the taller, deeper V5 projection pavilion.

The architecture grows to 14.4 x 8 x 7.2 metres. People retain their original
human dimensions and the three validated .584m chair-contact poses; this file
changes their spatial staging rather than scaling them with the building.
"""
from pathlib import Path
import json, math, hashlib
import bpy

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]

# Reuse the corrected, textured Rocketbox preparation and placement helpers.
# Stop before V4 placements/export: rebuilding V5 never overwrites V4 assets.
shared=HERE/'rebuild_projection_visitors_v4.py'
exec(compile(shared.read_text(encoding='utf-8').split('placements=[')[0],str(shared),'exec'))

CHAIRS=[
    {'role':'cafe-left','position':[4.25,.10,2.15],'yaw':1.25},
    {'role':'cafe-right','position':[6.40,.10,.90],'yaw':-1.25},
    {'role':'cafe-rear','position':[5.10,.10,.95],'yaw':0},
]

# role, avatar, pose, native X/Z, helper turn, unmodified human scale, appearance.
# Standing helper turn is the negative of the native Three Y yaw; seated helper
# turn has the same sign, matching the actual chair's authored native yaw.
PLACEMENTS=[
    ('reception-host','Business_Female_01','operator',-4.65,1.41,0,.94,None),
    ('reception-colleague','Business_Male_01','operator',-3.38,1.25,-.25,.98,None),
    ('left-gallery-browser','Business_Male_02','idle',-5.70,.70,-2.78,.96,None),
    ('conversation-left','Business_Male_02','talk',-1.90,1.68,-1.20,.98,None),
    ('conversation-right','Business_Male_01','idle',-1.13,1.85,1.84,.99,None),
    ('crystal-observer','Business_Female_04','idle',1.25,1.55,2.72,.94,'white-blouse'),
    ('kiosk-guest','Business_Male_02','operator',2.85,3.05,2.14,.98,'black-backpack'),
    ('deep-right-gallery','Business_Female_01','talk',3.85,-1.50,-1.15,.93,None),
    # Small lateral perch clears the cafe table's low pedestal with both shoes
    # while preserving the original cushion height and leg articulation.
    ('cafe-left','Business_Male_01','projection-seated',4.225,2.24,1.25,1,None),
    ('cafe-right','Business_Male_02','projection-seated',6.40,.90,-1.25,1,None),
    ('cafe-rear','Business_Female_01','projection-seated',5.10,.95,0,1,None),
]

records=[]
for role,avatar,pose,x,z,turn,scale,appearance in PLACEMENTS:
    root=visitor(avatar,pose,x,z,turn,scale,appearance)
    root.name='Projection V5 visitor | '+role+' | '+avatar+' | '+pose
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
        'height':height,'bounds':bounds})

meshes=[ob for ob in bpy.context.scene.objects if ob.type=='MESH']
for ob in meshes:
    for poly in ob.data.polygons:poly.use_smooth=True
    for mat in ob.data.materials:
        if 'opacity' in mat.name:continue
        bsdf=mat.node_tree.nodes.get('Principled BSDF')
        if bsdf:bsdf.inputs['Roughness'].default_value=.85 if 'body' in mat.name else .65

out=ROOT/'public/models/expo/projection-visitors-v5.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_yup=True,
    export_apply=True,export_materials='EXPORT',export_cameras=False,export_lights=False,
    export_animations=False,export_extras=True,export_image_format='AUTO')
layout={'version':5,'source':'Microsoft Rocketbox, MIT; see technical-humans-LICENSE.txt',
    'authoringAxes':'native Three XYZ, front +Z','count':len(records),'placements':records,
    'architectureEnvelope':[14.4,7.2,8],'stage':{'center':[0,1.10,-1.25],'width':5.70,'depth':2.70},
    'crystal':{'asset':'projection-crystals.glb','position':[0,1.10,-1.20],'scale':[1.22,1.34,1.22]},
    'seatedChairAnchors':CHAIRS,'seatTopY':SEAT_TOP,'seatedContactRevision':SEATED_REVISION,
    'seatedGuestOffsets':{'cafe-left':[-.025,0,.09],'cafe-right':[0,0,0],'cafe-rear':[0,0,0]},
    'seatedContacts':SEATED_CONTACTS,'bytes':out.stat().st_size,
    'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),
    'staging':{'receptionCenter':[-4.65,.10,2.17],'kioskCenter':[1.65,.10,2.90],
        'cafeTableCenter':[5.10,.10,2.15],'cafeTableRadius':.43,'cafeTableTopY':.748,
        'openFrontEntry':{'center':[.15,.10,3.30],'width':2.4},
        'normalHumanDimensionsPreserved':True}}
(ROOT/'public/models/expo/projection-visitors-v5-layout.json').write_text(json.dumps(layout,indent=2))
print('PROJECTION_VISITORS_V5 '+json.dumps(layout),flush=True)
