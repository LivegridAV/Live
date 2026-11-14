"""Prepare MIT-licensed Microsoft Rocketbox business people for the booth.

Source: https://github.com/microsoft/Microsoft-Rocketbox
Original copyright and MIT permission: assets/humans/rocketbox/LICENSE.md.
This helper imports data assets only; no downloaded code is executed.
"""
import bpy
import json
import sys
import math
import shutil
import struct
from pathlib import Path
from mathutils import Matrix,Vector

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/".next/cache/rocketbox-source"
OUT=Path(__file__).with_name("assets")/"humans/rocketbox"
POSE_OUT=ROOT/".next/cache/rocketbox-prepared"
AVATARS=["Business_Male_01","Business_Male_02","Business_Female_01","Business_Female_04"]


def texture(src,dst,limit=2048):
    if not dst.exists():
        image=bpy.data.images.load(str(src),check_existing=False)
        ratio=min(1,limit/max(image.size))
        if ratio<1:image.scale(round(image.size[0]*ratio),round(image.size[1]*ratio))
        image.filepath_raw=str(dst)
        image.file_format="JPEG" if dst.suffix==".jpg" else "PNG"
        image.save()
        bpy.data.images.remove(image)
    return bpy.data.images.load(str(dst),check_existing=True)


def materials(avatar,meshes):
    source=SOURCE/avatar
    target=OUT/avatar
    target.mkdir(parents=True,exist_ok=True)
    original=source/(avatar+".fbx")
    if original.exists() and original.resolve()!=(target/(avatar+".fbx")).resolve():
        shutil.copy2(original,target/(avatar+".fbx"))
    for mat in {m for ob in meshes for m in ob.data.materials}:
        oldname=mat.name.split(".")[0]
        part="opacity" if "opacity" in oldname else "head" if "head" in oldname else "body"
        mat.name="Rocketbox | "+avatar+" | "+part
        mat.use_nodes=True
        mat.node_tree.nodes.clear()
        shader=mat.node_tree.nodes.new("ShaderNodeBsdfPrincipled")
        shader.inputs["Roughness"].default_value=.83 if part!="head" else .62
        shader.inputs["Metallic"].default_value=0
        shader.inputs["Specular IOR Level"].default_value=.26 if part=="head" else .20
        output=mat.node_tree.nodes.new("ShaderNodeOutputMaterial")
        mat.node_tree.links.new(shader.outputs["BSDF"],output.inputs["Surface"])
        color=next(source.glob("*_"+part+"_color.tga"),target/(part+"-color.png"))
        image=texture(color,target/(part+"-color"+(".png" if part=="opacity" else ".jpg")),1024 if part=="opacity" else 2048)
        node=mat.node_tree.nodes.new("ShaderNodeTexImage")
        node.image=image
        mat.node_tree.links.new(node.outputs["Color"],shader.inputs["Base Color"])
        if part=="opacity":
            mat.node_tree.links.new(node.outputs["Alpha"],shader.inputs["Alpha"])
            mat.surface_render_method="DITHERED"
        else:
            normal_file=next(source.glob("*_"+part+"_normal.tga"),target/(part+"-normal.png"))
            normal_image=texture(normal_file,target/(part+"-normal.png"),1024)
            normal_image.colorspace_settings.name="Non-Color"
            normal_tex=mat.node_tree.nodes.new("ShaderNodeTexImage")
            normal_tex.image=normal_image
            normal=mat.node_tree.nodes.new("ShaderNodeNormalMap")
            normal.inputs["Strength"].default_value=.68
            mat.node_tree.links.new(normal_tex.outputs["Color"],normal.inputs["Color"])
            mat.node_tree.links.new(normal.outputs["Normal"],shader.inputs["Normal"])


def aim_joint(arm,name,child,direction):
    """Aim using actual child joint positions, not Max's arbitrary bone tails."""
    bpy.context.view_layer.update()
    bone=arm.pose.bones[name]
    child_bone=arm.pose.bones[child]
    head=arm.matrix_world@bone.head
    child_head=arm.matrix_world@child_bone.head
    delta=(child_head-head).normalized().rotation_difference(Vector(direction).normalized())
    orientation=arm.matrix_world.to_quaternion()
    rotation=orientation.inverted()@delta@orientation
    pivot=bone.head.copy()
    bone.matrix=Matrix.Translation(pivot)@rotation.to_matrix().to_4x4()@Matrix.Translation(-pivot)@bone.matrix
    bpy.context.view_layer.update()


def natural_pose(arm,pose):
    arm.animation_data_clear()
    for side,sign in (("L",1),("R",-1)):
        prefix="Bip01 "+side
        aim_joint(arm,prefix+" UpperArm",prefix+" Forearm",(sign*.15,-.035,-.988))
        if pose=="talk" and side=="R":
            aim_joint(arm,prefix+" Forearm",prefix+" Hand",(sign*.12,-.86,.49))
        elif pose=="operator":
            aim_joint(arm,prefix+" Forearm",prefix+" Hand",(sign*.055,-.96,-.28))
        else:
            aim_joint(arm,prefix+" Forearm",prefix+" Hand",(sign*.025,-.09,-.996))


def prepare_one(avatar,pose):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (bpy.data.materials,bpy.data.images,bpy.data.meshes,bpy.data.armatures,bpy.data.actions):
        for item in list(collection):
            if item.users==0:collection.remove(item)
    fbx=SOURCE/avatar/(avatar+".fbx")
    if not fbx.exists():fbx=OUT/avatar/(avatar+".fbx")
    bpy.ops.import_scene.fbx(filepath=str(fbx))
    arm=next(ob for ob in bpy.context.scene.objects if ob.type=="ARMATURE")
    meshes=[ob for ob in bpy.context.scene.objects if ob.type=="MESH"]
    materials(avatar,meshes)
    natural_pose(arm,pose)
    depsgraph=bpy.context.evaluated_depsgraph_get()
    baked=[]
    for ob in meshes:
        evaluated=ob.evaluated_get(depsgraph)
        mesh=bpy.data.meshes.new_from_object(evaluated,preserve_all_data_layers=True,depsgraph=depsgraph)
        out=bpy.data.objects.new("Rocketbox "+avatar+" "+pose,mesh)
        bpy.context.collection.objects.link(out)
        transform=ob.matrix_world.copy()
        for v in mesh.vertices:v.co=transform@v.co
        baked.append(out)
    # Rocketbox's facial front is Blender -Y, which is Three +Z. The posed
    # geometry is normalized once to the procedural helper's 1.793m contract.
    points=[v.co for ob in baked for v in ob.data.vertices]
    floor=min(p.z for p in points)
    top=max(p.z for p in points)
    pelvis=arm.matrix_world@arm.pose.bones["Bip01 Pelvis"].head
    factor=1.793/(top-floor)
    for ob in baked:
        for v in ob.data.vertices:
            v.co=Vector(((v.co.x-pelvis.x)*factor,(v.co.y-pelvis.y)*factor,(v.co.z-floor)*factor))
        for poly in ob.data.polygons:poly.use_smooth=True
    for ob in list(bpy.context.scene.objects):
        if ob not in baked:bpy.data.objects.remove(ob,do_unlink=True)
    POSE_OUT.mkdir(parents=True,exist_ok=True)
    out_file=POSE_OUT/(avatar+"_"+pose+".glb")
    bpy.ops.export_scene.gltf(filepath=str(out_file),export_format="GLB",export_yup=True,
        export_apply=True,export_materials="EXPORT",export_cameras=False,export_lights=False,
        export_animations=False,export_image_format="AUTO")
    # Hair cards use alpha-tested strands, avoiding transparency sorting and
    # specular glass-like hair in the real-time renderer.
    data=out_file.read_bytes()
    json_length=struct.unpack_from("<I",data,12)[0]
    document=json.loads(data[20:20+json_length])
    for material in document.get("materials",[]):
        if "opacity" in material.get("name",""):
            material["alphaMode"]="MASK"
            material["alphaCutoff"]=.33
    encoded=json.dumps(document,separators=(",",":")).encode("utf-8")
    encoded+=b" "*((-len(encoded))%4)
    remainder=data[20+json_length:]
    out_file.write_bytes(struct.pack("<III",0x46546c67,2,20+len(encoded)+len(remainder))+struct.pack("<II",len(encoded),0x4e4f534a)+encoded+remainder)
    print("ROCKETBOX_PREPARED "+json.dumps({"avatar":avatar,"pose":pose,"vertices":sum(len(ob.data.vertices) for ob in baked),
        "height":1.793,"file":str(out_file),"bytes":out_file.stat().st_size}),flush=True)
    return baked


def preview(avatar,pose):
    meshes=prepare_one(avatar,pose)
    world=bpy.context.scene.world
    world.color=(.08,.08,.08)
    for p,energy,size in (((2,-3,3),350,4),((-3,-1,2.5),170,3),((0,2,3),250,3)):
        data=bpy.data.lights.new("Character neutral softbox","AREA")
        data.energy,data.shape,data.size=energy,"DISK",size
        ob=bpy.data.objects.new(data.name,data)
        bpy.context.collection.objects.link(ob)
        ob.location=p
        ob.rotation_euler=(Vector((0,0,1))-ob.location).to_track_quat("-Z","Y").to_euler()
    bpy.ops.object.camera_add(location=(2.3,-4.7,1.75))
    camera=bpy.context.object
    camera.rotation_euler=(Vector((0,0,.98))-camera.location).to_track_quat("-Z","Y").to_euler()
    camera.data.lens=72
    scene=bpy.context.scene
    scene.camera=camera
    scene.render.engine="CYCLES"
    scene.cycles.samples=16
    scene.cycles.use_denoising=True
    scene.render.resolution_x,scene.render.resolution_y=700,900
    scene.render.resolution_percentage=100
    scene.view_settings.view_transform="AgX"
    scene.render.filepath=str(ROOT/(".next/cache/"+avatar+"_"+pose+"-qa.png"))
    bpy.ops.render.render(write_still=True)

def inspect():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.fbx(filepath=str(SOURCE/"Business_Female_01/Business_Female_01.fbx"))
    for ob in bpy.context.scene.objects:
        if ob.type=="MESH":
            print("RBMESH "+json.dumps({"name":ob.name,"vertices":len(ob.data.vertices),"bounds":list(ob.dimensions),"materials":[m.name for m in ob.data.materials],"modifiers":[m.type for m in ob.modifiers]}))
        elif ob.type=="ARMATURE":
            print("RBARMATURE "+json.dumps({"name":ob.name,"scale":list(ob.scale),"rotation":list(ob.rotation_euler),"bones":[b.name for b in ob.data.bones]}))
            for name in ("Bip01 Head","Bip01 REye","Bip01 LEye","Bip01 L UpperArm","Bip01 L Forearm","Bip01 L Hand"):
                bone=ob.data.bones[name]
                print("RBBONE "+json.dumps({"name":name,"head":list(ob.matrix_world@bone.head_local),"tail":list(ob.matrix_world@bone.tail_local)}))
    for mat in bpy.data.materials:
        print("RBMAT "+json.dumps({"name":mat.name,"textures":[n.image.filepath for n in mat.node_tree.nodes if n.type=="TEX_IMAGE" and n.image]}))
    clip=SOURCE/"f_idle_breathe_01.fbx"
    if clip.exists():
        before=set(bpy.context.scene.objects)
        bpy.ops.import_scene.fbx(filepath=str(clip))
        for ob in set(bpy.context.scene.objects)-before:
            if ob.type=="ARMATURE":print("RBCLIP "+json.dumps({"name":ob.name,"bones":[b.name for b in ob.data.bones][:15],"action":ob.animation_data.action.name if ob.animation_data and ob.animation_data.action else None,"frames":list(ob.animation_data.action.frame_range) if ob.animation_data and ob.animation_data.action else None}))

if __name__=="__main__":
    if "--inspect" in sys.argv:inspect()
    elif "--preview" in sys.argv:preview("Business_Female_01","idle")
    else:
        for avatar in AVATARS:
            for pose in ("idle","talk","operator"):prepare_one(avatar,pose)
