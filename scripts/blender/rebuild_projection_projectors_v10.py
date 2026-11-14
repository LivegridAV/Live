"""The existing three projector heads, retained in the roof-cutaway view.

Native identity export. Exact optical poses match the full V10 pavilion;
long ceiling drops/safety wires alone are omitted from this cutaway asset.
"""
from pathlib import Path
import hashlib

HELPER=Path(__file__).with_name("rebuild_projection_mapping_stall.py")
SOURCE=HELPER.read_text(encoding="utf-8")
exec(compile(SOURCE.split("# A broad island")[0],str(HELPER),"exec"))
OUT=ROOT/"public/models/expo/projection-projectors-v10.glb"
PROJECTORS=[]
constructor=SOURCE[SOURCE.index("def projector("):SOURCE.index("def kiosk(")]
exec(compile(constructor,"exact-v10-projector-constructor","exec"))
for name,lens,target,size,radius in(("Projection central projector",(0,5.92,1.30),(-.2,4.0,-1.10),.29,.92),
    ("Projection left projector",(-2.10,5.65,1.15),(-1.4,3.4,-.80),.27,.71),
    ("Projection right projector",(2.10,5.65,1.15),(1.4,3.4,-.80),.27,.71)):
    projector(name,lens,target,size);PROJECTORS[-1].update(radius=radius,height=4.42,opacity=.075)
for ob in list(bpy.context.scene.objects):
    if "real hanging ceiling drop" in ob.name or "additional safety suspension wire" in ob.name:
        bpy.data.objects.remove(ob,do_unlink=True)
bpy.context.view_layer.update();groups={}
for ob in list(bpy.context.scene.objects):
    if ob.type!="MESH":continue
    matrix=ob.matrix_world.copy();ob.parent=None;ob.data.transform(matrix);ob.matrix_world=Matrix.Identity(4)
    groups.setdefault(ob.data.materials[0].name,[]).append(ob)
objects=[]
for name,items in groups.items():
    bpy.ops.object.select_all(action="DESELECT")
    for ob in items:ob.select_set(True)
    bpy.context.view_layer.objects.active=items[0]
    if len(items)>1:bpy.ops.object.join()
    ob=bpy.context.view_layer.objects.active;ob.name=name+" | cutaway projector heads";ob["projectionCutawayProjector"]=True
    if not ob.data.uv_layers:
        uv=ob.data.uv_layers.new(name="UVMap")
        for loop in ob.data.loops:
            p=ob.data.vertices[loop.vertex_index].co;uv.data[loop.index].uv=(p.x,p.z-p.y*.15)
    objects.append(ob)
ao=Path(__file__).with_name("bake_technical_ao.py")
exec(compile(ao.read_text(encoding="utf-8"),str(ao),"exec"))
ao_stats=bake_technical_ao(objects,samples=16,max_distance=.16,max_seconds=25)
exporter=SOURCE[SOURCE.index("def export("):SOURCE.index("main_meshes = material_batch(")]
exporter=exporter.replace("export_apply=True, export_materials=","export_apply=True, export_extras=True, export_materials=")
exec(compile(exporter,"cutaway-projector-export","exec"));stats=export(OUT,objects)
report={"file":OUT.name,"sha256":hashlib.sha256(OUT.read_bytes()).hexdigest(),"nativeIdentity":True,"topCutawayOnly":True,"projectors":PROJECTORS,"ambientOcclusion":ao_stats,"stats":stats}
(ROOT/"public/models/expo/projection-projectors-v10-layout.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
print("PROJECTION_PROJECTORS_V10 "+json.dumps(report),flush=True)
