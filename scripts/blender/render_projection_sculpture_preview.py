"""Render the exported maquette without modifying or rebuilding its GLB."""
from pathlib import Path
author=Path(__file__).with_name('rebuild_projection_sculpture.py')
preview_source=author.read_text(encoding='utf-8')
helpers=preview_source.split('# A fine neutral model foot')[0]
exec(compile(helpers,str(author),'exec'))
bpy.ops.import_scene.gltf(filepath=str(OUT))
for ob in bpy.context.scene.objects:
    if ob.type!='MESH':continue
    for mat in ob.data.materials:
        if 'white projected sculpted facade' in mat.name:FACE=mat
        elif 'dark shallow alcove receiver' in mat.name:RECESS=mat
        elif 'porcelain moon sphere' in mat.name:MOON=mat
        elif 'ivory sculpted return' in mat.name:RETURN=mat
        elif 'warm narrow architectural rib' in mat.name:REED=mat
renders=preview_source[preview_source.index('# Model-only review renders.'):]
exec(compile(renders,str(author),'exec'))
