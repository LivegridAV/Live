"""Create a user-editable pavilion with left/right gallery transform handles."""
import bpy, bmesh, json
from pathlib import Path
from mathutils import Quaternion
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/blender/projection-gallery-editor'
MODELS=ROOT/'public/models/expo'
layout=json.loads((MODELS/'projection-finish-v2-gallery-layout.json').read_text())
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.unit_settings.system='METRIC'
controllers={}
for g in layout['architecture']['galleries']:
    side=g['side'];name='LEFT GALLERY - select me to move' if side<0 else 'RIGHT GALLERY - select me to move'
    ob=bpy.data.objects.new(name,None);scene.collection.objects.link(ob)
    x,y,z=g['center'];ob.location=(x,-z,5.4);ob.empty_display_type='CUBE';ob.empty_display_size=2.8;ob.show_in_front=True
    ob['instructions']='G to move; X or Y to constrain; R then Z to rotate. Ctrl+S saves. Website export is a separate step.'
    controllers[side]=ob
def attach(ob,side):
    world=ob.matrix_world.copy();ob.parent=controllers[side];ob.matrix_world=world;ob.hide_select=True
for kind in ('shell','interior'):
    before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(OUT/(kind+'.glb')))
    for ob in set(bpy.data.objects)-before:
        if ob.type=='MESH':
            # glTF accessors retain unused vertices when primitives are split.
            bm=bmesh.new();bm.from_mesh(ob.data)
            bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS')
            bm.to_mesh(ob.data);bm.free()
        side=ob.get('editableGallerySide',0)
        if side:attach(ob,side)
        else:ob.hide_select=True
        if ob.get('grandOverhead') or ob.get('grandRole')=='overhead':ob.hide_set(True)
for kind in ('crystals','visitors'):
    before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(MODELS/('projection-finish-v2-'+kind+'.glb')))
    for ob in set(bpy.data.objects)-before:
        if kind=='crystals' and ob.parent is None:ob.location+=(__import__('mathutils').Vector((0,2.8,.915)))
        ob.hide_select=True
# Live website screen surfaces are separate from the GLBs: keep them attached here too.
mat=bpy.data.materials.new('Gallery screen preview');mat.diffuse_color=(.025,.16,.22,1)
for a in layout['apertures']:
    if not a['id'].startswith('projection-application-'):continue
    bpy.ops.mesh.primitive_plane_add(size=1,location=(a['x'],-a['z'],a['y']),rotation=(1.5707963267948966,0,a['rotation'][1]))
    ob=bpy.context.object;ob.name=a['id']+' - website screen';ob.scale=(a['w'],a['h'],1);ob.data.materials.append(mat)
    bpy.context.view_layer.update();attach(ob,-1 if a['x']<0 else 1)
bpy.ops.object.select_all(action='DESELECT')
controllers[-1].select_set(True);bpy.context.view_layer.objects.active=controllers[-1]
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            space=area.spaces.active;space.shading.type='SOLID';space.shading.color_type='MATERIAL'
            space.clip_end=500;space.region_3d.view_rotation=Quaternion((1,0,0,0));space.region_3d.view_perspective='ORTHO'
            space.region_3d.view_location=(0,0,0);space.region_3d.view_distance=32
            space.overlay.show_floor=False
text=bpy.data.texts.new('START HERE - Moving the galleries')
text.write('Select LEFT GALLERY or RIGHT GALLERY in the Outliner.\nG = move, then X or Y to constrain to floor axes.\nR then Z = rotate on the floor.\nCtrl+S = save this Blender file.\nThe pavilion is locked for selection and the roof hidden for clarity.\nScreen planes are placeholders; live website media remains in the app.\nSaving this file does not automatically update the website.\n')
scene['website_sync']='Manual export required; this file is the visual editing workspace.'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'LivegridAV-Projection-Editable.blend'))
print('EDITOR_READY',str(OUT/'LivegridAV-Projection-Editable.blend'),flush=True)
