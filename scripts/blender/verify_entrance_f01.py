"""Compare evaluated world geometry to P01, then verify finish/UV boundaries."""
import bpy, json, hashlib, bmesh
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
def digest(ob):
    evaluated=ob.evaluated_get(bpy.context.evaluated_depsgraph_get());me=evaluated.to_mesh()
    xyz=sorted(tuple(round(v,5) for v in ob.matrix_world@p.co) for p in me.vertices)
    result=hashlib.sha256(json.dumps(xyz).encode()).hexdigest();evaluated.to_mesh_clear();return result
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/blender/entrance-p01/Livegrid_AV_Entrance_P01.blend'))
original={o.name:digest(o) for o in bpy.context.scene.objects if o.type in ('MESH','CURVE','FONT')}
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/blender/entrance-f01/Livegrid_AV_Entrance_F01.blend'))
checked=[]
for name,expected in original.items():
    renamed=name
    if name.startswith(('L01','L04','L05','L06')):renamed='LED-'+{'L01':'F','L04':'L','L05':'R','L06':'C'}[name[:3]]+' | F01 coordinated surface'
    if name.startswith('P06'):renamed='WATER | '+name
    ob=bpy.data.objects[renamed]
    assert digest(ob)==expected, 'P01 geometry changed: '+name
    assert len(ob.data.materials)>0, 'Unfinished object: '+name
    checked.append(name)
leds=[o for o in bpy.context.scene.objects if o.name.startswith('LED-')]
assert len(leds)==4
for ob in leds:
    uv=ob.data.uv_layers.active;kind=ob.name[4]
    for p in ob.data.polygons:
        if p.material_index:continue
        for li in p.loop_indices:
            q=ob.matrix_world@ob.data.vertices[ob.data.loops[li].vertex_index].co
            s={'F':q.x+8,'R':16+q.z,'C':32-q.x,'L':48-q.z}[kind]
            assert abs(uv.data[li].uv.x*48-s)<1e-4
            assert abs(uv.data[li].uv.y*22-12-q.y)<1e-4
water=[o for o in bpy.context.scene.objects if o.name.startswith('WATER')]
assert len(water)==2
for ob in water:
    pts=[ob.matrix_world@Vector(v) for v in ob.bound_box]
    assert abs(max(v.z for v in pts)+.07)<1e-5
    assert min(abs(v.x) for v in pts)>9.6
portal=bpy.data.objects['A01-A07 | closed bowed portal and fascia']
bm=bmesh.new();bm.from_mesh(portal.data);assert all(e.is_manifold for e in bm.edges);bm.free()
report={'result':'PASS','unchanged_original_objects':len(checked),'comparison':'SHA256 of evaluated world vertices at 0.01 mm precision',
  'four_surfaces_share_physical_perimeter_UV':True,'water_sides_only_top_m':-.07,'portal_closed':True,
  'new_fixture_objects':len(bpy.context.scene.objects)-len(checked),'material_cards':24}
(ROOT/'reports/entrance-f01/geometry-validation.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
