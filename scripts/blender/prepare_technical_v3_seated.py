"""Pose existing MIT Rocketbox source rigs for the reference's seated operators.

Writes new cache assets only. Standing avatars and their original exports stay
unchanged; limb lengths are preserved and the hips meet the native stool seat.
"""
from pathlib import Path
import bpy, math, json, struct
from mathutils import Vector, Matrix

ROOT=Path(__file__).resolve().parents[2]
HELPER=Path(__file__).with_name('prepare_rocketbox_humans.py')
scope={'__file__':str(HELPER),'__name__':'technical_seated_helpers'}
exec(compile(HELPER.read_text(encoding='utf-8').split('if __name__==')[0],str(HELPER),'exec'),scope)
aim_joint=scope['aim_joint'];natural_pose=scope['natural_pose']
OUT=ROOT/'.next/cache/rocketbox-prepared'
for avatar in ['Business_Male_01','Business_Male_02','Business_Female_01']:
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    source=ROOT/'scripts/blender/assets/humans/rocketbox'/avatar
    bpy.ops.import_scene.fbx(filepath=str(source/(avatar+'.fbx')))
    arm=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    bpy.context.view_layer.update()
    points=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]
    factor=1.793/(max(p.z for p in points)-min(p.z for p in points))
    pelvis=arm.matrix_world@arm.pose.bones['Bip01 Pelvis'].head
    for mat in {m for o in meshes for m in o.data.materials}:
        part='opacity' if 'opacity' in mat.name else 'head' if 'head' in mat.name else 'body'
        mat.name='Rocketbox | '+avatar+' | '+part;mat.use_nodes=True
        mat.node_tree.nodes.clear();bs=mat.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
        bs.inputs['Roughness'].default_value=.65 if part=='head' else .85
        bs.inputs['Specular IOR Level'].default_value=.25
        output=mat.node_tree.nodes.new('ShaderNodeOutputMaterial');mat.node_tree.links.new(bs.outputs['BSDF'],output.inputs['Surface'])
        tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(source/(part+'-color'+('.png' if part=='opacity' else '.jpg'))),check_existing=True);tex.image.pack()
        mat.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
        if part=='opacity':mat.node_tree.links.new(tex.outputs['Alpha'],bs.inputs['Alpha']);mat.surface_render_method='DITHERED'
        else:
            texn=mat.node_tree.nodes.new('ShaderNodeTexImage');texn.image=bpy.data.images.load(str(source/(part+'-normal.png')),check_existing=True);texn.image.colorspace_settings.name='Non-Color';texn.image.pack()
            normal=mat.node_tree.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.55
            mat.node_tree.links.new(texn.outputs['Color'],normal.inputs['Color']);mat.node_tree.links.new(normal.outputs['Normal'],bs.inputs['Normal'])
    natural_pose(arm,'operator')
    for side,sign in [('L',1),('R',-1)]:
        prefix='Bip01 '+side
        aim_joint(arm,prefix+' Thigh',prefix+' Calf',(sign*.035,-.999,.015))
        aim_joint(arm,prefix+' Calf',prefix+' Foot',(0,0,-1))
        if prefix+' Toe0' in arm.pose.bones:aim_joint(arm,prefix+' Foot',prefix+' Toe0',(0,-1,-.08))
    bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();baked=[]
    for original in meshes:
        mesh=bpy.data.meshes.new_from_object(original.evaluated_get(deps),preserve_all_data_layers=True,depsgraph=deps)
        for v in mesh.vertices:
            p=original.matrix_world@v.co
            v.co=Vector(((p.x-pelvis.x)*factor,(p.y-pelvis.y)*factor,(p.z-pelvis.z)*factor+.84))
        for p in mesh.polygons:p.use_smooth=True
        ob=bpy.data.objects.new('Rocketbox '+avatar+' native seated operator',mesh);bpy.context.collection.objects.link(ob);baked.append(ob)
    for ob in list(bpy.context.scene.objects):
        if ob not in baked:bpy.data.objects.remove(ob,do_unlink=True)
    OUT.mkdir(parents=True,exist_ok=True);path=OUT/(avatar+'_seated-v3.glb')
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_yup=True,export_apply=True,export_materials='EXPORT',export_animations=False,export_lights=False,export_cameras=False)
    data=path.read_bytes();n=struct.unpack_from('<I',data,12)[0];document=json.loads(data[20:20+n])
    for mat in document.get('materials',[]):
        if 'opacity' in mat.get('name',''):mat.update(alphaMode='MASK',alphaCutoff=.33)
    encoded=json.dumps(document,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4);tail=data[20+n:]
    path.write_bytes(struct.pack('<III',0x46546c67,2,20+len(encoded)+len(tail))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+tail)
    print('SEATED_V3 '+json.dumps({'avatar':avatar,'file':str(path),'hipHeight':.84,'height':max(v.co.z for ob in baked for v in ob.data.vertices)}),flush=True)
