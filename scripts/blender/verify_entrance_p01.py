"""Validate exported study dimensions and its closed primary envelope."""
import bpy, bmesh, json
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[2]
bpy.ops.wm.open_mainfile(filepath=str(root/'assets/blender/entrance-p01/Livegrid_AV_Entrance_P01.blend'))
def bounds(ob):
    pts=[ob.matrix_world@Vector(v) for v in ob.bound_box]
    return [[min(p[i] for p in pts),max(p[i] for p in pts)] for i in range(3)]
floor=bounds(bpy.data.objects['L01 | LED FLOOR 16 x 22'])
assert abs(floor[0][1]-floor[0][0]-16)<1e-5
assert abs(floor[1][1]-floor[1][0]-22)<1e-5
assert abs(floor[2][1])<1e-5
portal=bpy.data.objects['A01-A07 | closed bowed portal and fascia']
bm=bmesh.new();bm.from_mesh(portal.data)
assert all(e.is_manifold for e in bm.edges),'Portal has open/nonmanifold edges'
bm.free()
assert abs(bounds(portal)[2][1]-12)<1e-5
landing=bounds(bpy.data.objects['F02 | open rear landing'])
assert abs(landing[1][1]-14)<1e-5
assert not any('rear screen' in o.name.lower() for o in bpy.data.objects)
led=[o for o in bpy.data.objects if o.name.startswith(('L01','L04','L05','L06'))]
assert len(led)==4
report={'result':'PASS','floor_bounds_local':floor,'portal_bounds_local':bounds(portal),'portal_closed_manifold':True,'rear_landing_local':landing,'rear_connection_world_z':-14.4-landing[1][1],'independent_LED_meshes':[o.name for o in led],'objects':len(bpy.data.objects)}
(root/'reports/entrance-p01/geometry-validation.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
