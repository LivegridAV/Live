import bpy,json,hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
source=ROOT/'assets/blender/entrance-refinement'
bpy.ops.wm.open_mainfile(filepath=str(source/'Livegrid_AV_Entrance_Refined.blend'))
manifest=json.loads((source/'provenance.json').read_text())
for name,expected in manifest['unchanged_geometry_sha256'].items():
    o=bpy.data.objects[name];actual=hashlib.sha256(json.dumps([list(o.matrix_world@v.co) for v in o.data.vertices]).encode()).hexdigest()
    assert actual==expected,name
leds=[]
for o in bpy.context.scene.objects:
    if not o.name.startswith('LED-'):continue
    kind=o.name[4];uv=o.data.uv_layers.active;points=[];normals=[]
    target={'F':Vector((0,0,1)),'L':Vector((1,0,0)),'R':Vector((-1,0,0)),'C':Vector((0,0,-1))}[kind]
    for p in o.data.polygons:
        if p.material_index!=0:continue
        normal=o.matrix_world.to_3x3()@p.normal;assert normal.dot(target)>.99
        normals.append(list(normal))
        for li in p.loop_indices:
            q=o.matrix_world@o.data.vertices[o.data.loops[li].vertex_index].co
            s={'F':q.x+8,'R':16+q.z,'C':32-q.x,'L':48-q.z}[kind]
            assert abs(uv.data[li].uv.x*48-s)<1e-4
            assert abs(uv.data[li].uv.y*22-12-q.y)<1e-4
            points.append(q)
    leds.append({'face':kind,'name':o.name,'active_material':o.data.materials[0].name,'inward_normals':normals,'active_bounds_metres':[[min(q[i] for q in points),max(q[i] for q in points)] for i in range(3)],'UV':'shared 48m perimeter; 22m longitudinal extent','visible':not o.hide_render})
assert len(leds)==4
hit=bpy.context.scene.ray_cast(bpy.context.evaluated_depsgraph_get(),Vector((0,-12,1.7)),Vector((0,1,0)),distance=26)
assert not hit[0],f'Passage blocked by {hit[4].name}'
report={'status':'PASS','preserved_entrance_meshes':len(manifest['unchanged_geometry_sha256']),'four_LED_faces':leds,'clear_human_height_ray_metres':26,'inactive_throat_local_Y':[0,.9],'rear_exit_local_Y':10,'gray_region_cause':'The former standalone viewer mounted EntranceP01 plus a gray review ground, without Gallery or HallShell. Rays through the legitimate rear aperture saw that ground. Four active LED faces are present, inward facing, mapped and bound. The viewer now mounts the actual Scene with only CameraRig replaced by its orbit camera.'}
(ROOT/'reports/entrance-refinement/geometry-validation.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
