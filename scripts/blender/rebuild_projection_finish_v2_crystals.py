"""Closed faceted projection model reconstructed from the October 16/17 views.

The native metre envelope and placement remain independent of visitors and
furniture.  The reference supplies visual landmarks, not CAD measurements.
No reference pixels, cards, billboards, or inherited needle skyline are used.
This script writes only versioned v2 crystal assets.
"""
from pathlib import Path
import hashlib
import json
import math

HELPER=Path(__file__).with_name('rebuild_projection_crystals_v12.py')
exec(compile(HELPER.read_text(encoding='utf-8').split('def construct_v12():')[0],str(HELPER),'exec'))

OUT=ROOT/'public/models/expo/projection-finish-v2-crystals.glb'
LAYOUT_OUT=ROOT/'public/models/expo/projection-finish-v2-crystals-layout.json'
DETAILS=[]
FRONT_SECTIONS={}


def construct_finish_v2():
    """Five dominant oblique monoliths, interlocked with low radial folds.

    Three full-width pentagonal cross-sections preserve a substantial cut top
    rather than converging to thin needles.  Front and return faces remain
    distinct physical surfaces with the existing projection material-role API.
    """
    closed_mass('v2 highest off centre silver and ivory fracture',-.50,-.38,1.30,1.35,
        (8.50,8.08,7.10,7.32,8.10),lean=(-.15,-.07),spin=-.075,
        front_roles=(RETURN,ICE),lower_front_roles=(FACE,ICE),side_role=RETURN,
        hinge=.54,fold=.055)
    closed_mass('v2 central notched blue folded monolith',.64,.05,1.36,1.31,
        (6.80,7.67,7.18,7.36,6.96),lean=(.22,-.13),spin=-.10,
        front_roles=(ICE,FACE),lower_front_roles=(FACE,ICE),side_role=RETURN,
        hinge=.52,fold=.065)
    closed_mass('v2 left champagne split broad tower',-1.92,-.34,1.28,1.30,
        (5.42,6.10,5.60,5.47,5.84),lean=(.13,-.10),spin=.085,
        front_roles=(AMBER,FACE),lower_front_roles=(FACE,AMBER),side_role=RETURN,
        hinge=.55,fold=.045)
    closed_mass('v2 right rear rising ivory oblique tower',1.80,-.76,1.20,1.30,
        (5.96,6.45,5.70,5.94,6.17),lean=(-.10,-.08),spin=.13,
        front_roles=(FACE,RETURN),lower_front_roles=(ICE,FACE),side_role=RETURN,
        hinge=.53,fold=.045)
    closed_mass('v2 right foreground champagne cut mass',2.58,.25,1.20,1.20,
        (4.17,4.98,4.43,4.19,4.72),lean=(-.14,-.06),spin=-.10,
        front_roles=(AMBER,ICE),lower_front_roles=(FACE,AMBER),side_role=RETURN,
        hinge=.57,fold=.050)

    # Outer and foreground returns interlock with the five landmarks.  They
    # retain real front/back depth in the supplied top view.
    closed_mass('v2 outer left descending white shard',-2.93,.30,.90,1.10,
        (3.58,4.42,3.90,3.75,4.12),lean=(-.12,-.04),spin=-.16,
        front_roles=(FACE,ICE),side_role=RETURN,hinge=.56,fold=.025)
    closed_mass('v2 leftmost low broken ivory block',-3.31,.45,.65,.98,
        (2.34,3.02,2.62,2.49,2.80),lean=(.06,-.03),spin=.12,
        front_roles=(RETURN,FACE),side_role=RETURN,hinge=.58,fold=.025)
    closed_mass('v2 rightmost low folded return',3.33,.53,.68,.98,
        (2.32,3.04,2.62,2.55,2.83),lean=(-.05,.02),spin=.10,
        front_roles=(FACE,RETURN),side_role=RETURN,hinge=.56,fold=.025)
    closed_mass('v2 left inner broad diagonal face',-1.19,1.07,1.18,1.10,
        (2.40,3.38,2.83,2.60,3.05),lean=(-.10,.02),spin=.075,
        front_roles=(FACE,ICE),lower_front_roles=(RETURN,FACE),side_role=RETURN,
        hinge=.57,fold=.035)
    closed_mass('v2 right inner stepped amber cleft',1.42,1.21,1.20,1.12,
        (2.47,3.64,3.00,2.72,3.22),lean=(.12,-.02),spin=-.10,
        front_roles=(AMBER,RETURN),lower_front_roles=(FACE,AMBER),side_role=RETURN,
        hinge=.54,fold=.035)
    closed_mass('v2 foremost low folded white crystal',-.13,1.93,1.23,1.10,
        (1.34,2.11,1.63,1.42,1.84),lean=(.06,.0),spin=-.11,
        front_roles=(RETURN,FACE),side_role=RETURN,hinge=.55,fold=.020)

    for i,(x,z,w,d,h,warm) in enumerate([
        (-2.42,1.37,1.28,.98,1.80,True),
        (-.95,1.87,1.18,.98,1.70,False),
        (1.03,1.89,1.26,1.08,1.90,True),
        (2.82,1.06,.98,1.02,1.73,False),
        (-1.38,-2.08,1.24,1.04,2.26,False),
        (1.57,-2.00,1.22,1.08,2.35,True),
        (-.25,-1.99,1.28,1.10,3.12,False),
    ]):
        compact_rock('v2 radial interlocking foot %02d'%i,x,z,w,d,h,.12*i,warm)

    folded_plane('v2 left descending diagonal ivory fold',[
        (-3.36,3.02,.98),(-2.66,2.53,1.44),(-1.12,.39,2.03),
        (-1.47,.15,2.10),(-3.22,1.88,1.52)],.16,(RETURN,FACE,ICE,RETURN),.075)
    folded_plane('v2 central broken oblique white shield',[
        (-1.23,.12,1.80),(-1.25,3.55,.78),(-.83,4.10,.56),
        (-.45,3.57,.91),(.35,.48,2.12),(.13,.12,2.23)],.18,
        (RETURN,FACE,ICE,RETURN,FACE,RETURN),.080)
    folded_plane('v2 right diagonal ascending ivory fold',[
        (.70,3.11,1.20),(1.41,2.76,1.46),(3.31,.56,1.35),
        (3.49,.12,1.45),(2.11,.66,1.95)],.17,(RETURN,FACE,RETURN,ICE),.080)

    # Shallow dimensional arrises are integral to the native solids.  They
    # catch warm grazing light without a glowing wireframe around every edge.
    integral_section_folds('v2 highest integral ivory hinge',
        FRONT_SECTIONS['v2 highest off centre silver and ivory fracture'][1],.070,.036)
    box('v2 narrow dark shadow cleft behind champagne reeds',
        (1.78,1.10,1.45),(.64,1.92,.025),JOINT,.001)
    for i in range(12):
        box('v2 dimensional champagne flute %02d'%i,
            (1.48+i*.052,1.10,1.48),(.017,1.92,.035),GOLD,.0015)


def export_finish_v2():
    bpy.context.view_layer.update()
    original=[o for o in bpy.context.scene.objects if o.type=='MESH']
    closed_audit=[]
    for ob in original:
        matrix=ob.matrix_world.copy()
        ob.parent=None
        for vertex in ob.data.vertices:vertex.co=matrix@vertex.co
        ob.matrix_world=Matrix.Identity(4)
        ob['grandRole']='sculpture'
        bm=bmesh.new();bm.from_mesh(ob.data)
        nonmanifold=sum(not edge.is_manifold for edge in bm.edges)
        closed_audit.append({'name':ob.name,'closed':nonmanifold==0,'nonManifoldEdges':nonmanifold})
        bm.free()
    if any(not entry['closed'] for entry in closed_audit):
        raise RuntimeError('Crystal construction produced an open native solid: '+json.dumps(closed_audit))
    # Separate role surfaces before joining: the runtime shader keys on these
    # exact suffixes and preserves material-normal boundaries after batching.
    for ob in original:
        bpy.ops.object.select_all(action='DESELECT')
        ob.select_set(True);bpy.context.view_layer.objects.active=ob
        bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.separate(type='MATERIAL');bpy.ops.object.mode_set(mode='OBJECT')
    groups={}
    for ob in [o for o in bpy.context.scene.objects if o.type=='MESH']:
        if not ob.data.polygons:continue
        material=ob.data.materials[ob.data.polygons[0].material_index]
        groups.setdefault(material.name,[]).append(ob)
    batched=[]
    for name,items in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for ob in items:ob.select_set(True)
        bpy.context.view_layer.objects.active=items[0]
        if len(items)>1:bpy.ops.object.join()
        ob=bpy.context.object;ob.name=name;ob['grandRole']='sculpture'
        batched.append(ob)
    bpy.ops.object.select_all(action='DESELECT')
    for ob in batched:ob.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(OUT),export_format='GLB',use_selection=True,
        export_yup=True,export_apply=True,export_materials='EXPORT',export_cameras=False,
        export_lights=False,export_animations=False,export_extras=True)
    pts=[o.matrix_world@v.co for o in batched for v in o.data.vertices]
    bounds={'min':[min(p.x for p in pts),min(p.z for p in pts),min(-p.y for p in pts)],
        'max':[max(p.x for p in pts),max(p.z for p in pts),max(-p.y for p in pts)]}
    role_counts={o.name:{'vertices':len(o.data.vertices),'triangles':sum(len(p.vertices)-2 for p in o.data.polygons)} for o in batched}
    max_radius=max(math.hypot(p.x,-p.y) for p in pts)
    stats={'file':OUT.name,'bytes':OUT.stat().st_size,'meshes':len(batched),
        'vertices':sum(len(o.data.vertices) for o in batched),
        'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in batched),
        'bounds':bounds,'stageRadius':3.9,'maximumRadius':max_radius}
    layout={'version':'projection-finish-v2','asset':OUT.name,
        'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),'units':'metres',
        'bounds':bounds,'stats':stats,'projectionDomain':{'min':[-4.0,0],'max':[4.0,8.55]},
        'placement':{'position':[0,.915,-2.8],'scale':[1,1,1]},
        'reservedEnvelope':{'width':7.44,'height':8.46,'depth':5.21},
        'majorLandmarks':5,'crystals':DETAILS,'materialRoles':role_counts,
        'closedSolidAudit':closed_audit,
        'provenance':'Original native closed oblique pentagonal prisms, compact radial solids, closed folded plates and dimensional metal reeds. The broad cut tops and physical face normals are geometry. Existing projection role suffixes retained; no image pixels or external model.',
        'reference':'October 16 hero and October 17 four angle reference images; reconstructed visual proportions, not recovered CAD dimensions.'}
    LAYOUT_OUT.write_text(json.dumps(layout,indent=2),encoding='utf-8')
    print('PROJECTION_FINISH_V2_CRYSTALS_READY '+json.dumps({'sha256':layout['sha256'],**stats}),flush=True)


def inspect_finish_v2():
    """Native model inspection only; this does not substitute for page QA."""
    qa=ROOT/'qa/projection-finish-v2-crystals'
    qa.mkdir(parents=True,exist_ok=True)
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
    scene.cycles.use_denoising=True
    try:
        preference=bpy.context.preferences.addons['cycles'].preferences
        preference.compute_device_type='OPTIX';preference.get_devices()
        for device in preference.devices:device.use=device.type=='OPTIX'
        if any(d.use for d in preference.devices):scene.cycles.device='GPU'
    except Exception:pass
    scene.render.resolution_x=1200;scene.render.resolution_y=1000
    scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX'
    scene.world.use_nodes=True
    bg=scene.world.node_tree.nodes.get('Background')
    bg.inputs['Color'].default_value=(.018,.026,.041,1);bg.inputs['Strength'].default_value=.30
    # Neutral clay distinguishes real cut faces without mapped-light masking.
    clay=role('v2 QA neutral ivory clay',(.65,.68,.72),.08,.42)
    for ob in scene.objects:
        if ob.type=='MESH':
            for i in range(len(ob.data.materials)):ob.data.materials[i]=clay
    def area(name,p,power,color,size,target):
        data=bpy.data.lights.new(name,'AREA');data.energy=power;data.color=color
        data.shape='DISK';data.size=size
        ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob)
        ob.location=xyz(p)
        ob.rotation_euler=(Vector(xyz(target))-ob.location).to_track_quat('-Z','Y').to_euler()
    area('v2 QA broad warm key',(-6,11,10),1800,(1,.90,.73),7,(0,4,0))
    area('v2 QA broad cool fill',(6,6,7),1050,(.65,.80,1),6,(0,4,0))
    area('v2 QA restrained rear rim',(-2,10,-6),1650,(1,.77,.48),5,(0,5,0))
    camera=bpy.data.cameras.new('v2 actual crystal QA camera')
    cam=bpy.data.objects.new(camera.name,camera);bpy.context.collection.objects.link(cam)
    camera.type='ORTHO';camera.ortho_scale=11.4;scene.camera=cam
    for name,position,target in [
        ('front',(-3.0,3.8,21),(0,4.1,0)),
        ('right',(12,6,16),(0,4.1,0)),
        ('top',(0,18,.01),(0,0,0)),
    ]:
        cam.location=xyz(position)
        cam.rotation_euler=(Vector(xyz(target))-cam.location).to_track_quat('-Z','Y').to_euler()
        scene.render.filepath=str(qa/('native-clay-'+name+'.png'))
        bpy.ops.render.render(write_still=True)


construct_finish_v2()
export_finish_v2()
if '--preview' in sys.argv:inspect_finish_v2()
