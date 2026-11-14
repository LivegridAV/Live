"""Export the new reference-led projection pavilion without replacing assets.

The attached photographs guide this native metre reconstruction. They are not
used as backdrop plates or complete booth textures. Previous versions remain
byte-for-byte available. Run with Blender 5.2 background/factory-startup.
"""
from pathlib import Path
import importlib.util
import bpy
import math
import json
import hashlib
from mathutils import Vector, Matrix

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
F = .12
PROJECTION_CFG = {'floor': F, 'fasciaTop': 12.821}
helper = HERE/'rebuild_projection_mapping_stall_v12.py'
exec(compile(helper.read_text(encoding='utf-8').split('# Native eight-metre island')[0], str(helper), 'exec'))
OUT = ROOT/'public/models/expo'
STEM = 'projection-finish-v2-'


def load_module(name):
    spec = importlib.util.spec_from_file_location(name, HERE/(name+'.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def bounds_xyz(objects):
    bpy.context.view_layer.update()
    pts = [ob.matrix_world@v.co for ob in objects if ob.type == 'MESH' for v in ob.data.vertices]
    return {'min': [min(p.x for p in pts), min(p.z for p in pts), min(-p.y for p in pts)],
            'max': [max(p.x for p in pts), max(p.z for p in pts), max(-p.y for p in pts)]} if pts else None


def export_asset(suffix, objects):
    """Bake each world transform once, preserve UVs/materials and cutaway roles."""
    bpy.context.view_layer.update()
    before_bounds, groups = bounds_xyz(objects), {}
    # Snapshot every world matrix before detaching any mesh-parent hierarchy.
    worlds = [(ob, ob.matrix_world.copy()) for ob in objects if ob.type == 'MESH']
    for ob, world in worlds:
        ob.data = ob.data.copy()
        ob.data.transform(world)
        ob.parent = None
        ob.matrix_world = Matrix.Identity(4)
        key = (ob.data.materials[0].name if ob.data.materials else 'unassigned',
               ob.get('grandRole', 'architecture'), ob.get('projectionFinishRole', ''),
               bool(ob.get('grandSharedFloor', False)), bool(ob.get('projectionOverhead', False)),
               bool(ob.get('grandOverhead', False)), ob.get('visitor_role', ''))
        groups.setdefault(key, []).append(ob)
    result = []
    for key, obs in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for ob in obs:
            ob.select_set(True)
        bpy.context.view_layer.objects.active = obs[0]
        if len(obs) > 1:
            bpy.ops.object.join()
        ob = bpy.context.object
        ob.name = key[0]+' | '+(key[2] or key[1])
        ob['grandRole'] = key[1]
        if key[2]: ob['projectionFinishRole'] = key[2]
        if key[3]: ob['grandSharedFloor'] = True
        if key[4]: ob['projectionOverhead'] = True
        if key[5]: ob['grandOverhead'] = True
        if key[6]: ob['visitor_role'] = key[6]
        result.append(ob)
    bpy.ops.object.select_all(action='DESELECT')
    for ob in result:
        ob.select_set(True)
    path = OUT/(STEM+suffix+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True,
        export_yup=True, export_apply=True, export_materials='EXPORT', export_extras=True,
        export_cameras=False, export_lights=False, export_animations=False,
        export_tangents=True, export_image_format='AUTO')
    result_bounds = bounds_xyz(result)
    assert all(abs(before_bounds[key][i]-result_bounds[key][i]) < 1e-4 for key in ('min', 'max') for i in range(3))
    return {'file': path.name, 'bytes': path.stat().st_size,
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'meshes': len(result),
            'triangles': sum(sum(len(p.vertices)-2 for p in ob.data.polygons) for ob in result),
            'bounds': before_bounds}


shell = load_module('projection_finish_v2_shell').build_projection_finish_v2_shell(globals())
interior = load_module('projection_finish_v2_interior').build_projection_finish_v2_interior(globals())
stats = {'shell': export_asset('shell', shell['objects']),
         'interior': export_asset('interior', interior['objects'])}

# Native hall steel sits above the pavilion crown. This contextual grid is a
# separate asset/role and never contributes to the stall's measured height.
before = set(bpy.context.scene.objects)
hall_steel = material('Projection Finish V2 | venue black production truss', (.035, .041, .047), .68, .44)
hall_housing = material('Projection Finish V2 | venue dark spotlight housing', (.009, .012, .016), .24, .54)
hall_warm = material('Projection Finish V2 | warm neutral venue optic', (1., .82, .62), 0, .32, 2.0)
hall_cool = material('Projection Finish V2 | cool neutral venue optic', (.68, .80, 1.), 0, .32, 1.65)
for z in (-10, -5, 0, 5, 10):
    for y in (16.0, 16.36):
        for dz in (-.17, .17):
            rod('Projection Finish V2 | surrounding venue four-chord truss', (-18, y, z+dz), (18, y, z+dz), .025, hall_steel, 8)
    for i in range(36):
        rod('Projection Finish V2 | surrounding venue diagonal web', (-18+i, 16, z-.17), (-17+i, 16.36, z+.17), .009, hall_steel, 6)
for x in (-17, -12, -7, -2, 3, 8, 13, 18):
    for dx in (-.17, .17):
        rod('Projection Finish V2 | surrounding cross grid chord', (x+dx, 16.50, -11), (x+dx, 16.50, 12), .023, hall_steel, 8)
for i, x in enumerate((-15, -10, -5, 0, 5, 10, 15)):
    for j, z in enumerate((-9, -4, 1, 6, 11)):
        box('Projection Finish V2 | venue physical spotlight body', (x, 15.84, z), (.22, .26, .26), hall_housing, .025)
        box('Projection Finish V2 | venue focused spotlight optic', (x, 15.70, z), (.135, .014, .15), hall_cool if (i+j)%4 == 0 else hall_warm, .005)
hall = [ob for ob in set(bpy.context.scene.objects)-before if ob.type == 'MESH']
for ob in hall:
    ob['grandRole'] = 'hall-context'
    ob['projectionOverhead'] = True
    ob['grandOverhead'] = True
stats['hall'] = export_asset('hall', hall)

# Original licensed textured Rocketbox people. The lounge cache preserves
# native limb lengths; whole-body grounding corrects the baked foot datum.
human_ns = {'__file__': str(HERE/'technical_humans.py'), 'bpy': bpy, 'material': material}
exec(compile((HERE/'technical_humans.py').read_text(encoding='utf-8'), str(HERE/'technical_humans.py'), 'exec'), human_ns)
visitor_objects, visitors = [], []


def visitor(name, avatar, pose, p, yaw, seat=None):
    templates = human_ns['_human_template'](avatar, pose)
    root = bpy.data.objects.new('Projection Finish V2 | visitor '+name, None)
    bpy.context.collection.objects.link(root)
    grounded = list(p)
    # All three native body axes retain scale1. No scaling to the booth roof.
    minimum_foot_y = min(v.co.z for mesh in templates for v in mesh.vertices)
    grounded[1] -= minimum_foot_y
    root.location = xyz(grounded)
    root.rotation_euler[2] = yaw
    owned = []
    for index, mesh in enumerate(templates):
        ob = bpy.data.objects.new(root.name+' mesh '+str(index), mesh.copy())
        bpy.context.collection.objects.link(ob)
        ob.parent = root
        ob['grandRole'] = 'visitor'
        ob['visitor_role'] = name
        ob['license'] = 'MIT Microsoft Rocketbox'
        visitor_objects.append(ob)
        owned.append(ob)
    bpy.context.view_layer.update()
    visitors.append({'id': name, 'asset': avatar, 'pose': pose,
        'position': grounded, 'yaw': yaw, 'nativeScale': 1, 'bounds': bounds_xyz(owned),
        **({'seat': seat} if seat else {})})


standing = [
    ('reception host', 'Business_Female_01', 'idle', [-7.70, F, 5.10], 0),
    ('reception colleague', 'Business_Male_01', 'idle', [-5.85, F, 5.10], .12),
    ('reception visitor', 'Business_Male_02', 'talk', [-6.90, F, 7.25], math.pi),
    ('entrance conversation left', 'Business_Male_01', 'talk', [-2.80, F, 6.20], 1.2),
    ('entrance conversation right', 'Business_Male_02', 'idle', [-1.65, F, 6.15], -1.6),
    ('kiosk guest', 'Business_Male_02', 'idle', [4.50, F, 7.00], math.pi),
    ('left gallery visitor', 'Business_Female_01', 'idle', [-10.00, F, 2.25], math.pi),
    ('left lounge adviser', 'Business_Male_01', 'talk', [-9.65, F, 3.20], 1.0),
    ('right gallery viewer', 'Business_Male_01', 'idle', [9.90, F, 2.50], math.pi),
    ('crystal observer', 'Business_Female_01', 'idle', [4.00, F, 3.30], -2.7),
    ('front arrival guest', 'Business_Male_01', 'idle', [2.85, F, 7.30], -2.6),
]
for args in standing:
    visitor(*args)
seats = {s['id']: s for s in interior['seats']}
seated = [('crescent consultation chair 0', 'Business_Male_01'),
          ('crescent consultation chair 2', 'Business_Female_01'),
          ('crescent consultation chair 3', 'Business_Male_02'),
          ('crescent consultation chair 5', 'Business_Female_01'),
          ('right lounge rear chair', 'Business_Male_01'),
          ('right lounge front chair', 'Business_Male_02'),
          ('right lounge inward chair', 'Business_Female_01'),
          ('left lounge rear chair', 'Business_Male_02')]
for index, (seat_id, avatar) in enumerate(seated):
    seat = seats[seat_id]
    visitor('seated consultation guest '+str(index), avatar, 'lounge-v2', seat['position'], seat['yaw'], seat_id)


def intersects(a, b):
    return all(a['min'][i] < b['max'][i] and a['max'][i] > b['min'][i] for i in range(3))


visitor_route_hits = []
for route_id, route in interior['routeBoundsAudit']['boxes'].items():
    for person in visitors:
        if intersects(person['bounds'], route):
            visitor_route_hits.append({'route': route_id, 'visitor': person['id']})
if visitor_route_hits:
    raise RuntimeError('Native visitors intersect camera circulation: '+str(visitor_route_hits))
stats['visitors'] = export_asset('visitors', visitor_objects)

for key in ('shell', 'interior'):
    bound = stats[key]['bounds']
    assert bound['min'][0] >= -12.01 and bound['max'][0] <= 12.01
    assert bound['min'][2] >= -8.01 and bound['max'][2] <= 8.01
assert abs(stats['shell']['bounds']['max'][1]-12.821) < .001
assert all(abs(p['bounds']['min'][1]-F) < 1e-4 for p in visitors)

layout = {
    'version': 'projection-reference-finish-v2-20261019',
    'units': 'metres', 'runtimeScale': 1,
    'root': [18, 0, -205], 'rootRotation': [0, -math.pi/2, 0], 'floorTop': F,
    'dimensions': {'width': 24, 'depth': 16, 'height': 12.701, 'floor': F, 'fasciaTop': 12.821},
    'architecture': {**shell['architecture'], 'reception': interior['reception'],
                     'seating': interior['seats'], 'stage': shell['pedestal']},
    'shellBounds': stats['shell']['bounds'], 'deckPolygonXZ': shell['deckPolygonXZ'],
    'modelPlacement': {'position': [0, .915, -2.8], 'scale': [1, 1, 1],
                       'asset': 'projection-finish-v2-crystals.glb'},
    'apertures': shell['apertures']+interior['screens'], 'projectors': shell['projectors'],
    'fixtures': shell['fixtures'], 'opticalPaths': shell['opticalPaths'],
    'interiorLights': interior['lights'], 'typography': shell['typography'],
    'furniture': interior['furniture'], 'seats': interior['seats'], 'plants': interior['plants'],
    'leafCount': interior['leafCount'], 'reception': interior['reception'], 'kiosks': interior['kiosks'],
    'supportedProps': interior['supportedProps'], 'routes': interior['routes'],
    'routeBoundsAudit': {**interior['routeBoundsAudit'], 'visitorIntersections': visitor_route_hits},
    'visitorPlacements': visitors,
    'interaction': {'position': [-7, .70, 6.55], 'rotation': [0, 0, 0], 'w': 5.8, 'h': 1.0},
    'navigation': {'entrance': [0, 1.77, 9.4], 'interior': [6.4, 1.77, 3.6],
        'interiorLook': [0, 4.0, -2.0], 'exitLook': [0, 1.77, 11],
        'route': [[0, 1.77, 9.4], [0, 1.77, 7.7], [0, 1.77, 4.6], [6.4, 1.77, 4.6], [6.4, 1.77, 3.6]]},
    'cutaway': {'overhead': 'grandRole=overhead', 'sectionWall': 'grandRole=section-wall'},
    'assets': {STEM+k: v for k, v in stats.items()}, 'stats': stats,
    'provenance': {'references': ['ChatGPT Image Oct 16, 2026, 09_32_18 PM-1.png',
                               'ChatGPT Image Oct 17, 2026, 05_54_19 PM-1.png'],
        'geometry': 'Native original Blender reconstruction. No complete booth image planes or reference raster on the architecture.',
        'humans': 'Microsoft Rocketbox, Copyright (c)2020 Microsoft, MIT; original photographic materials and native limb lengths.',
        'limits': 'Image-based visual reconstruction. Original source CAD, surface materials and photometric lighting were unavailable.'},
    'notes': interior['notes'],
}
path = OUT/'projection-finish-v2-layout.json'
path.write_text(json.dumps(layout, indent=2), encoding='utf-8')
print('PROJECTION_FINISH_V2_READY '+json.dumps({'stats': stats, 'visitors': len(visitors),
    'leaves': interior['leafCount'], 'seats': len(interior['seats']), 'apertures': len(layout['apertures']),
    'visitorRouteIntersections': visitor_route_hits}), flush=True)
