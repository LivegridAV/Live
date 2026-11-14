"""Real exhibition truss context above the enlarged projection pavilion."""
from pathlib import Path

HELPERS = Path(__file__).with_name("rebuild_projection_mapping_stall.py")
source = HELPERS.read_text(encoding="utf-8")
exec(compile(source.split("# A broad island")[0], str(HELPERS), "exec"))
RIG = material("Projection Hall | graphite steel box truss", (.065, .082, .099), .68, .40)
CASE = material("Projection Hall | suspended black spotlight housing", (.009, .012, .016), .38, .48)
OPTIC = material("Projection Hall | warm integrated light lens", (.95, .80, .58), 0, .24, 3.2)

before=set(bpy.context.scene.objects)
for z in (-7.0,-4.6,-2.2,.2,2.6,5.0,7.4,9.8):
    truss((-13,6.86,z),(13,6.86,z),.18)
for x in (-12,-9.6,-7.2,-4.8,-2.4,0,2.4,4.8,7.2,9.6,12):
    truss((x,7.06,-8),(x,7.06,10),.18)
for ob in set(bpy.context.scene.objects)-before:
    if ob.type=="MESH":ob.data.materials[0]=RIG
for row,z in enumerate((-4.6,.2,5.0,9.8)):
    for x in (-10.5,-6.5,-2.5,1.5,5.5,9.5):
        x+=.7*(row%2)
        rod("Projection Hall | hanging pendant housing",(x,6.80,z),(x,6.59,z),.055,CASE,12)
        disk("Projection Hall | actual recessed warm optical lens",x,z,.044,6.574,6.588,OPTIC)
        rod("Projection Hall | pendant suspension",(x,7.0,z),(x,6.80,z),.010,CASE,6)
export_source=Path(__file__).with_name("rebuild_projection_mapping_stall.py").read_text(encoding="utf-8")
batch=export_source[export_source.index("def material_batch("):export_source.index("main_meshes = material_batch(")]
exec(compile(batch,"hall-rig-export","exec"))
objects=material_batch(list(bpy.context.scene.objects))
stats=export(ROOT/"public/models/expo/projection-hall-rig.glb",objects)
print(stats)
