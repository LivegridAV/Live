"""Textured, posed Microsoft Rocketbox people for Technical Showcase only.

Loaded into rebuild_technical_showcase.py's helper namespace.  Original models
and textures: Microsoft Rocketbox, Copyright (c) 2020 Microsoft, MIT License.
See assets/humans/rocketbox/LICENSE.md and provenance.json.
"""
import re
from pathlib import Path
import bpy
from mathutils import Matrix,Vector

_HUMAN_ASSET_DIR=Path(__file__).resolve().parents[2]/".next/cache/rocketbox-prepared"
_HUMAN_TEMPLATES={}
_HUMAN_MATERIALS={}
_HUMAN_CLOTHING={}
HUMAN_PLACEMENTS=[]


def _human_template(avatar,pose):
    key=(avatar,pose)
    if key in _HUMAN_TEMPLATES:return _HUMAN_TEMPLATES[key]
    before=set(bpy.context.scene.objects)
    source=_HUMAN_ASSET_DIR/(avatar+"_"+pose+".glb")
    if not source.exists():raise FileNotFoundError("Prepare textured Rocketbox people first: "+str(source))
    bpy.ops.import_scene.gltf(filepath=str(source))
    created=set(bpy.context.scene.objects)-before
    templates=[]
    bpy.context.view_layer.update()
    for obj in created:
        if obj.type!="MESH":continue
        mesh=obj.data.copy()
        mesh.transform(obj.matrix_world)
        # Reuse the same photographic texture materials across poses/instances.
        for i,mat in enumerate(mesh.materials):
            canonical=re.sub(r"\.\d{3,}$","",mat.name)
            if canonical in _HUMAN_MATERIALS:
                mesh.materials[i]=_HUMAN_MATERIALS[canonical]
            else:
                mat.name=canonical
                _HUMAN_MATERIALS[canonical]=mat
        for attribute in list(mesh.color_attributes):mesh.color_attributes.remove(attribute)
        templates.append(mesh)
    for obj in created:bpy.data.objects.remove(obj,do_unlink=True)
    _HUMAN_TEMPLATES[key]=templates
    return templates


def _clothing_material(material,avatar,appearance):
    key=(avatar,appearance)
    if key in _HUMAN_CLOTHING:return _HUMAN_CLOTHING[key]
    copy=material.copy()
    copy.name="Rocketbox | "+avatar+" | "+appearance+" body"
    filename="body-white-blouse.jpg" if appearance=="white-blouse" else "body-black-top.jpg"
    path=Path(__file__).with_name("assets")/"humans/rocketbox"/avatar/filename
    image=bpy.data.images.load(str(path),check_existing=True)
    shader=copy.node_tree.nodes.get("Principled BSDF")
    color=next(node for node in copy.node_tree.nodes if node.type=="TEX_IMAGE"
        and node.image and node.image.colorspace_settings.name=="sRGB")
    color.image=image
    shader.inputs["Roughness"].default_value=.86
    _HUMAN_CLOTHING[key]=copy
    return copy


def _backpack(root):
    """Fitted real volume and shoulder straps, in the normalized body space."""
    before=set(bpy.context.scene.objects)
    fabric=material("Rocketbox accessory | matte black woven backpack",(.009,.011,.014),0,.87)
    trim=material("Rocketbox accessory | graphite backpack seams",(.026,.030,.034),0,.73)
    soft_box("Rocketbox fitted black backpack main body",(0,1.13,-.205),(.335,.47,.17),fabric,.07)
    soft_box("Rocketbox backpack exterior zip pocket",(0,1.075,-.302),(.285,.265,.040),fabric,.025)
    for side in (-1,1):
        points=[(Vector((side*.10,1.34,-.18)),.014),
            (Vector((side*.145,1.40,-.09)),.014),
            (Vector((side*.175,1.33,.015)),.014),
            (Vector((side*.17,1.04,.105)),.014),
            (Vector((side*.14,.965,-.10)),.014)]
        sweep("Rocketbox backpack padded shoulder strap",points,fabric,8)
    rod("Rocketbox backpack pocket fine zipper",(-.12,1.18,-.325),(.12,1.18,-.325),.004,trim,8)
    for ob in set(bpy.context.scene.objects)-before:ob.parent=root


def human(x,z,scale=1,turn=0,female=False,coat=None,tone=0,pose=0,seated=False,worktop=None,root_y=0,appearance=None):
    """Drop-in placement contract with detailed textured anatomy and clothing."""
    if seated:raise ValueError("Technical Showcase uses standing textured people only")
    if female:
        avatar="Business_Female_04" if tone==2 and pose==0 or tone==1 else "Business_Female_01"
    else:
        avatar="Business_Male_02" if tone in (0,2) else "Business_Male_01"
    kind="operator" if abs(turn)>=150 else "talk" if pose==1 or female and z>7 else "idle"
    root=bpy.data.objects.new("Rocketbox | "+avatar+" | "+kind+" placement",None)
    bpy.context.collection.objects.link(root)
    root.location=(x,-z,root_y)
    root.rotation_euler[2]=-math.radians(turn)
    root.scale=(scale,scale,scale)
    for i,mesh in enumerate(_human_template(avatar,kind)):
        if appearance and any(mat.name.endswith(" | body") for mat in mesh.materials):
            mesh=mesh.copy()
            for j,mat in enumerate(mesh.materials):
                if mat.name.endswith(" | body"):
                    mesh.materials[j]=_clothing_material(mat,avatar,appearance)
        obj=bpy.data.objects.new("Rocketbox | "+avatar+" | "+kind+" mesh "+str(i),mesh)
        bpy.context.collection.objects.link(obj)
        obj.parent=root
    if appearance=="black-backpack":_backpack(root)
    HUMAN_PLACEMENTS.append({"asset":avatar,"pose":kind,"position":[x,root_y,z],
        "height":1.793*scale,"yaw":-math.radians(turn),"textured":True,
        **({"clothing":appearance} if appearance else {})})
    return root
