"""Posed, textured business visitors for the October 16 crystal pavilion.

Reuses the project's MIT-licensed Microsoft Rocketbox source models.  Assets
are fully three dimensional; poses and placement are authored in metres.
"""
from pathlib import Path
import math, json
import bpy
from mathutils import Vector, Matrix

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
prepare_path = HERE / 'prepare_rocketbox_humans.py'
prepare_source = prepare_path.read_text(encoding='utf-8').split('def preview(')[0]
exec(compile(prepare_source, str(prepare_path), 'exec'))
original_pose = natural_pose
SEATED_REVISION = 'chair-contact-ik-v5'
SEAT_TOP, FLOOR_Y, PERCH = .584, .10, .36

def seated_pose(arm, pose):
    original_pose(arm, 'operator' if pose == 'projection-seated' else pose)
    if pose != 'projection-seated': return
    for side, sign in (('L',1),('R',-1)):
        prefix = 'Bip01 ' + side
        aim_joint(arm, prefix+' Thigh', prefix+' Calf', (sign*.12,-1,-.06))
        aim_joint(arm, prefix+' Calf', prefix+' Foot', (sign*.03,.08,-1))
        aim_joint(arm, prefix+' UpperArm', prefix+' Forearm', (sign*.12,-.12,-1))
        aim_joint(arm, prefix+' Forearm', prefix+' Hand', (sign*.12,-1,-.08))

def evaluated_points(meshes, body_only=False):
    deps=bpy.context.evaluated_depsgraph_get();points=[]
    for ob in meshes:
        if body_only and not any('body' in m.name for m in ob.data.materials):continue
        ev=ob.evaluated_get(deps);data=ev.to_mesh()
        points.extend(ob.matrix_world@v.co for v in data.vertices)
        ev.to_mesh_clear()
    return points


def prepare_fitted_seated(avatar):
    """Chair-fit the rig while keeping the original ankles and limb lengths.

    A whole-pose height normalization previously buried the hips in the .584m
    cushion. Preserve that body's initial scale, lift its pelvis, and solve
    each two-bone leg back to its grounded ankle instead of floating the shoes.
    """
    target=POSE_OUT/(avatar+'_projection-seated.glb')
    meta_path=POSE_OUT/(avatar+'_projection-seated-contact.json')
    if target.exists() and meta_path.exists() and '--repose' not in __import__('sys').argv:
        cached=json.loads(meta_path.read_text())
        if cached.get('revision')==SEATED_REVISION:return cached
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    fbx=SOURCE/avatar/(avatar+'.fbx')
    if not fbx.exists():fbx=OUT/avatar/(avatar+'.fbx')
    bpy.ops.import_scene.fbx(filepath=str(fbx))
    arm=next(ob for ob in bpy.context.scene.objects if ob.type=='ARMATURE')
    meshes=[ob for ob in bpy.context.scene.objects if ob.type=='MESH']
    materials(avatar,meshes);seated_pose(arm,'projection-seated')
    if avatar=='Business_Male_02':
        # This chair faces across the rear guest. Keep his gestures above the
        # neighbouring armrest rather than pushing a hand through its side.
        for side,sign in (('L',1),('R',-1)):
            aim_joint(arm,'Bip01 '+side+' Forearm','Bip01 '+side+' Hand',(sign*.10,-.85,.50))
    initial=evaluated_points(meshes)
    floor=min(p.z for p in initial);top=max(p.z for p in initial)
    factor=1.25/(top-floor)
    pelvis=arm.matrix_world@arm.pose.bones['Bip01 Pelvis'].head
    # Restore local pose channels as one dependency-graph transaction. Restoring
    # evaluated matrices parent-by-parent feeds stale parent transforms into
    # the children of this FBX rig and can accumulate unintended bone scale.
    baseline={bone.name:bone.matrix_basis.copy() for bone in arm.pose.bones}
    foot_matrices={s:arm.pose.bones['Bip01 '+s+' Foot'].matrix.copy() for s in('L','R')}
    feet={side:arm.matrix_world@arm.pose.bones['Bip01 '+side+' Foot'].head
          for side in('L','R')}
    initial_lengths={}
    for side in('L','R'):
        a,b,c=(arm.matrix_world@arm.pose.bones['Bip01 '+side+' '+part].head
               for part in('Thigh','Calf','Foot'))
        initial_lengths[side]=((b-a).length,(c-b).length)
    def apply_fit(lift):
        for name,matrix in baseline.items():arm.pose.bones[name].matrix_basis=matrix.copy()
        bpy.context.view_layer.update()
        delta=arm.matrix_world.inverted().to_3x3()@Vector((0,0,lift/factor))
        pb=arm.pose.bones['Bip01 Pelvis'];pb.matrix=Matrix.Translation(delta)@pb.matrix
        bpy.context.view_layer.update()
        for side in('L','R'):
            prefix='Bip01 '+side
            hip=arm.matrix_world@arm.pose.bones[prefix+' Thigh'].head
            ankle=feet[side];l1,l2=initial_lengths[side]
            direction=(ankle-hip).normalized();distance=(ankle-hip).length
            along=(l1*l1-l2*l2+distance*distance)/(2*distance)
            across=math.sqrt(max(0,l1*l1-along*along))
            pole=Vector((0,-1,0));pole=(pole-direction*pole.dot(direction)).normalized()
            knee=hip+direction*along+pole*across
            aim_joint(arm,prefix+' Thigh',prefix+' Calf',knee-hip)
            aim_joint(arm,prefix+' Calf',prefix+' Foot',ankle-knee)
            # The solved endpoint already matches; preserve the flat shoe's
            # original orientation rather than inheriting the shin rotation.
            arm.pose.bones[prefix+' Foot'].matrix=foot_matrices[side].copy()
            bpy.context.view_layer.update()
    def rear_contact():
        hip=.5*sum((arm.matrix_world@arm.pose.bones['Bip01 '+s+' Thigh'].head).z
                   for s in('L','R'))
        sample=[p for p in evaluated_points(meshes,True)
                if abs((p.x-pelvis.x)*factor)<.23
                and -.25<-(p.y-pelvis.y)*factor<.02
                and hip-.20/factor<p.z<hip+.07/factor]
        return (min(p.z for p in sample)-floor)*factor
    desired=SEAT_TOP-FLOOR_Y+.003
    lift=desired-rear_contact()
    for iteration in range(5):
        apply_fit(lift)
        error=desired-rear_contact()
        if abs(error)<.0005:break
        lift+=error
    deps=bpy.context.evaluated_depsgraph_get();baked=[]
    for ob in meshes:
        ev=ob.evaluated_get(deps)
        data=bpy.data.meshes.new_from_object(ev,preserve_all_data_layers=True,depsgraph=deps)
        output=bpy.data.objects.new('Rocketbox '+avatar+' projection-seated chair-fit',data)
        bpy.context.collection.objects.link(output)
        for v in data.vertices:
            p=ob.matrix_world@v.co
            v.co=Vector(((p.x-pelvis.x)*factor,(p.y-pelvis.y)*factor-PERCH,(p.z-floor)*factor))
        for poly in data.polygons:poly.use_smooth=True
        baked.append(output)
    points=[v.co for ob in baked for v in ob.data.vertices]
    cushion=[p for p in points if abs(p.x)<.245 and -.22<-p.y<.326 and .30<p.z<.56]
    foot_floor=min(p.z for p in points)
    hip_world=.5*sum((arm.matrix_world@arm.pose.bones['Bip01 '+s+' Thigh'].head).z
                    for s in('L','R'))
    final_lengths={}
    for side in('L','R'):
        a,b,c=(arm.matrix_world@arm.pose.bones['Bip01 '+side+' '+part].head
               for part in('Thigh','Calf','Foot'))
        final_lengths[side]=[(b-a).length*factor,(c-b).length*factor]
    contact={'revision':SEATED_REVISION,'avatar':avatar,'pose':'projection-seated',
        'seatTopY':SEAT_TOP,'floorY':FLOOR_Y,'bodyScalePreserved':factor,'pelvisLift':lift,
        'hipCenterY':FLOOR_Y+(hip_world-floor)*factor,'rearContactY':FLOOR_Y+rear_contact(),
        'shoeFloorY':FLOOR_Y+foot_floor,'headTopY':FLOOR_Y+max(p.z for p in points),
        'forwardPerch':PERCH,'minimumSurfaceYWithinFlatCushion':FLOOR_Y+min(p.z for p in cushion) if cushion else None,
        'limbLengthsBefore':{s:[v*factor for v in initial_lengths[s]] for s in('L','R')},
        'limbLengthsAfter':final_lengths}
    if not (1.2<contact['headTopY']<1.8 and abs(contact['shoeFloorY']-FLOOR_Y)<.001
            and SEAT_TOP<=contact['rearContactY']<=SEAT_TOP+.005
            and all(abs(a-b)<.00001 for s in('L','R')
                    for a,b in zip(contact['limbLengthsBefore'][s],final_lengths[s]))):
        raise RuntimeError('Seated rig failed dimensional contact checks: '+json.dumps(contact))
    for ob in list(bpy.context.scene.objects):
        if ob not in baked:bpy.data.objects.remove(ob,do_unlink=True)
    POSE_OUT.mkdir(parents=True,exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',export_yup=True,
        export_apply=True,export_materials='EXPORT',export_cameras=False,export_lights=False,
        export_animations=False,export_image_format='AUTO')
    # Preserve the established alpha-tested photographic hair strands.
    data=target.read_bytes();length=struct.unpack_from('<I',data,12)[0]
    document=json.loads(data[20:20+length])
    for mat in document.get('materials',[]):
        if 'opacity' in mat.get('name',''):mat.update(alphaMode='MASK',alphaCutoff=.33)
    encoded=json.dumps(document,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4)
    remainder=data[20+length:]
    target.write_bytes(struct.pack('<III',0x46546c67,2,20+len(encoded)+len(remainder))+
        struct.pack('<II',len(encoded),0x4e4f534a)+encoded+remainder)
    meta_path.write_text(json.dumps(contact,indent=2))
    print('SEATED_CHAIR_FIT '+json.dumps(contact),flush=True)
    return contact


SEATED_CONTACTS=[prepare_fitted_seated(avatar) for avatar in
                ('Business_Male_01','Business_Male_02','Business_Female_01')]

# Load geometry construction helpers without building any of the other stalls.
helper = HERE/'rebuild_projection_mapping_stall.py'
exec(compile(helper.read_text(encoding='utf-8').split('# A broad island')[0],str(helper),'exec'))
people_helper = HERE/'technical_humans.py'
exec(compile(people_helper.read_text(encoding='utf-8'),str(people_helper),'exec'))

def visitor(avatar,pose,x,z,turn=0,scale=.94,appearance=None):
    root=bpy.data.objects.new('Projection visitor | '+avatar+' | '+pose,None)
    bpy.context.collection.objects.link(root)
    root.location=(x,-z,.10)
    # Native ThreeY yaw maps to BlenderZ with the same sign. The old seated
    # minus sign faced both male visitors away from their actual chairs.
    root.rotation_euler[2]=turn if pose=='projection-seated' else -turn
    root.scale=(scale,scale,scale)
    for i,mesh in enumerate(_human_template(avatar,pose)):
        if appearance in ('white-blouse','black-top') and any(re.sub(r'\.\d{3,}$','',mat.name).endswith(' | body') for mat in mesh.materials):
            mesh=mesh.copy()
            for j,mat in enumerate(mesh.materials):
                if re.sub(r'\.\d{3,}$','',mat.name).endswith(' | body'):
                    mesh.materials[j]=_clothing_material(mat,avatar,appearance)
        obj=bpy.data.objects.new(root.name+' part '+str(i),mesh)
        bpy.context.collection.objects.link(obj);obj.parent=root
    if appearance=='black-backpack':_backpack(root)
    return root

placements=[
    ('Business_Female_01','operator',-3.95,1.25,.1,.92,None),
    ('Business_Male_02','talk',-1.30,1.61,2.70,.96,None),
    ('Business_Male_01','idle',-.60,1.50,3.48,.96,None),
    ('Business_Female_04','idle',.82,1.60,3.14,.91,'white-blouse'),
    ('Business_Male_02','operator',3.05,2.42,3.68,.95,'black-backpack'),
    ('Business_Male_01','talk',-2.3,.36,.5,.92,None),
    ('Business_Male_01','projection-seated',3.25,1.15,1.25,1,None),
    # Nine centimetres toward the open side of this chair clears the adjacent
    # rear armrest; the physical chair remains anchored at [4.95,.10,.40].
    ('Business_Male_02','projection-seated',4.975,.49,-1.25,1,None),
    ('Business_Female_01','projection-seated',4.15,.08,0,1,None),
]
for placement in placements:visitor(*placement)
bpy.context.view_layer.update()
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
for ob in meshes:
    for poly in ob.data.polygons:poly.use_smooth=True
    for mat in ob.data.materials:
        if 'opacity' in mat.name:continue
        bsdf=mat.node_tree.nodes.get('Principled BSDF')
        if bsdf:
            bsdf.inputs['Roughness'].default_value=.85 if 'body' in mat.name else .65

out=ROOT/'public/models/expo/projection-visitors-v4.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_yup=True,
    export_apply=True,export_materials='EXPORT',export_cameras=False,
    export_lights=False,export_animations=False,export_image_format='AUTO')
layout={'source':'Microsoft Rocketbox, MIT; see technical-humans-LICENSE.txt',
    'count':len(placements),'placements':[{'avatar':p[0],'pose':p[1],
    'position':[p[2],.1,p[3]],'yaw':p[4],'scale':p[5]} for p in placements],
    'bytes':out.stat().st_size,'seatedContactRevision':SEATED_REVISION,'seatedContacts':SEATED_CONTACTS,
    'seatedChairAnchors':[[3.25,.10,1.15],[4.95,.10,.40],[4.15,.10,.08]],
    'rightGuestOffsetFromChair':[.025,0,.09]}
(ROOT/'public/models/expo/projection-visitors-v4-layout.json').write_text(json.dumps(layout,indent=2))
print('PROJECTION_VISITORS_V4 '+json.dumps(layout),flush=True)
