"""Move only the existing right reception branding assembly beside its LED.

Verify the native assembly translation in Blender, then delegate the final
export to the canonical original-GLB POSITION patch. A Blender import/export
round trip can alter unrelated foliage normals even when vertices and UVs
stay unchanged. The previous GLB and manifest are preserved.
"""
from pathlib import Path
import bpy, json, math, hashlib, subprocess
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/models/expo'
SOURCE = OUT / 'grand-reception.glb'
BASE_LAYOUT = OUT / 'grand-reception-layout.json'
TARGET = OUT / 'grand-reception-brand-wall-v2.glb'
MANIFEST = OUT / 'grand-reception-brand-wall-v2-layout.json'
REPORT = ROOT / 'reports/reception-brand-wall-20261019'
REPORT.mkdir(parents=True, exist_ok=True)
layout = json.loads(BASE_LAYOUT.read_text(encoding='utf-8'))
source_sha = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
assert source_sha == layout['geometry']['sha256'], 'Unexpected source reception geometry'

# The right endpoint uses the same centre, rotation, radius and arc as the
# actual CurvedScreen. A 30 mm shadow joint keeps the neighbouring faces clear.
fit = layout['assemblies']['panorama']
theta = math.pi + fit['rotation_y'] - 1.48 / 2
radius = 9 * fit['scale'][0]
endpoint = Vector((fit['position'][0] + math.sin(theta) * radius, 0,
                   fit['position'][2] + math.cos(theta) * radius))
old = layout['assemblies']['right']
yaw = old['rotation_y']
axis = Vector((math.cos(yaw), 0, -math.sin(yaw)))
normal = Vector((math.sin(yaw), 0, math.cos(yaw)))
old_pivot = Vector(old['position'])
new_pivot = endpoint + axis * (1 + .030) - normal * .120
delta = new_pivot - old_pivot
delta.y = 0
delta_blender = Vector((delta.x, -delta.z, delta.y))

for ob in list(bpy.context.scene.objects):
    bpy.data.objects.remove(ob, do_unlink=True)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
bpy.context.view_layer.update()
objects = [ob for ob in bpy.context.scene.objects if ob.type == 'MESH']

def native(ob, vertex):
    p = ob.matrix_world @ vertex.co
    return Vector((p.x, p.z, -p.y))

def bounds(points):
    return {'min': [min(p[i] for p in points) for i in range(3)],
            'max': [max(p[i] for p in points) for i in range(3)]}

before_all, selected_before, selected_after, changes = [], [], [], []
unchanged = moved = triangles = 0
for ob in objects:
    before = [native(ob, vertex) for vertex in ob.data.vertices]
    before_all.extend(before)
    allowed = any(mat and mat.name in ('Reception | matte charcoal panel',
                  'Reception | porcelain brand lettering') for mat in ob.data.materials)
    selected = set()
    if allowed:
        inside = set()
        for i, p in enumerate(before):
            d = p - old_pivot
            # Oriented bounds include the complete original panel bevel,
            # extruded glyphs and underline, not neighbouring plant geometry.
            if (-1.03 <= d.dot(axis) <= 1.03 and -.145 <= d.dot(normal) <= .145
                    and .10 <= p.y <= 11.14):
                inside.add(i)
        # A few vertices of the continuous curved LED cabinet also enter this
        # box. Move complete contained islands only, never a fragment of it.
        parents = list(range(len(before)))
        def find(i):
            while parents[i] != i:
                parents[i] = parents[parents[i]]
                i = parents[i]
            return i
        for face in ob.data.polygons:
            first = find(face.vertices[0])
            for i in face.vertices[1:]:
                parents[find(i)] = first
        components = {}
        for i in range(len(before)):
            components.setdefault(find(i), []).append(i)
        for component in components.values():
            if all(i in inside for i in component):
                selected.update(component)
    for face in ob.data.polygons:
        count = sum(i in selected for i in face.vertices)
        assert count in (0, len(face.vertices)), 'Selection would cut a neighbouring triangle: '+ob.name
    local_delta = ob.matrix_world.inverted().to_3x3() @ delta_blender
    for i in selected:
        ob.data.vertices[i].co += local_delta
    ob.data.update()
    for i, vertex in enumerate(ob.data.vertices):
        p = native(ob, vertex)
        expected = before[i] + delta if i in selected else before[i]
        assert (p - expected).length < .000004, 'Unexpected geometry change: '+ob.name
        if i in selected:
            selected_before.append(before[i]); selected_after.append(p); moved += 1
        else:
            unchanged += 1
    triangles += sum(len(face.vertices)-2 for face in ob.data.polygons)
    if selected:
        changes.append({'mesh': ob.name, 'vertices': len(selected),
                        'faces': sum(all(i in selected for i in face.vertices) for face in ob.data.polygons)})
assert len(changes) == 2 and moved > 100, 'Expected the panel and complete lettering batch only'
assert triangles == layout['geometry']['triangles'], 'Triangle count changed'

# Keep the original NORMAL, UV, index, material and image buffers untouched.
# This is deliberately the only final asset/manifest writer; never overwrite
# its output with bpy.ops.export_scene.gltf afterwards.
assert moved == 7610 and unchanged == 130043, 'Unexpected native assembly selection'
subprocess.run(['node', str(ROOT / 'scripts/reposition-reception-brand-wall-v2.mjs')],
               cwd=str(ROOT), check=True)
audit = json.loads(MANIFEST.read_text(encoding='utf-8'))['brandingWallRelocation']
print('RECEPTION_BRAND_WALL_MOVED '+json.dumps(audit), flush=True)
