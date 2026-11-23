"""Native-scale LED Rental finishing and interior for the October reference.

This module only constructs objects. It never deletes another collection, runs
an old pavilion generator, or exports over a retained asset. The driver owns
the architectural shell, runtime emitting display faces, and visitors.
"""
from pathlib import Path
import math
import random
import bpy
import bmesh
from mathutils import Vector, Matrix


def build_rental_finish_v2_interior(ctx):
    root = Path(__file__).resolve().parents[2]
    here = Path(__file__).resolve().parent
    before_all = set(bpy.context.scene.objects)
    # Reuse the mature furniture and UV-mapped curved-leaf builders without
    # executing their import chain: that chain resets the Blender scene.
    ns = dict(ctx)
    ns.update(bpy=bpy, bmesh=bmesh, math=math, random=random, Vector=Vector,
              Matrix=Matrix, Path=Path, ROOT=root, HERE=here,
              __file__=str(here / 'rebuild_led_rental_2026_interior.py'))
    if 'soft_box' not in ns:
        technical = (here / 'rebuild_technical_showcase.py').read_text(encoding='utf-8')
        exec(compile(technical[technical.index('def soft_box('):technical.index('def technical_armchair(')],
                     'rental-rounded-cuboid-helper', 'exec'), ns)
    ns['SEMIBOLD'] = bpy.data.fonts.load('C:/Windows/Fonts/seguisb.ttf')
    interior_source = (here / 'rebuild_led_rental_2026_interior.py').read_text(encoding='utf-8')
    helper_source = interior_source.split('# Left low display/garden')[0]
    helper_source = 'QA=ROOT/' + helper_source.split('QA=ROOT/', 1)[1]
    exec(compile(helper_source, 'rental-native-interior-helpers', 'exec'), ns)
    ns['PREFIX'] = 'Grand Rental Finish V2 | '
    floor = float(ctx.get('F', .12))
    ns['FLOOR_Y'] = floor
    soft, box = ns['soft_box'], ns['box']
    material, xyz = ns['material'], ns['xyz']
    prefix = ns['PREFIX']
    # Warm brushed metal belongs on the returns and vessels; only selected
    # active logos and reveal diffusers carry the reference teal accent.
    champagne = material(prefix + 'brushed champagne reception and planter metal',
                         (.38, .325, .245), .88, .31)
    ns['SILVER26'] = champagne
    black, cream = ns['BLACK26'], ns['CREAM26']
    bs = cream.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (.53, .51, .455, 1)
    furniture, seats, lights, screens = [], [], [], []

    def record(role, start, **extra):
        owned = set(bpy.context.scene.objects) - start
        for ob in owned:
            if ob.type == 'MESH':
                ob['grandRole'] = 'interior'
                ob['rentalInteriorRole'] = role
        item = {'id': role, 'bounds': ns['bounds26'](owned), **extra}
        furniture.append(item)
        return owned

    def translate(objects, x=0, y=0, z=0):
        delta = Vector(xyz((x, y, z)))
        for ob in objects:
            if ob.parent is None:
                ob.location += delta

    def chair(name, x, z, yaw=0, width=1.0):
        start = set(bpy.context.scene.objects)
        ns['chair26'](name, x, z, yaw, width, base=floor)
        record(name, start, kind='ivory lounge armchair', position=[x, floor, z], yaw=yaw)
        seats.append({'id': name, 'kind': 'armchair', 'position': [x, floor, z],
                      'yaw': yaw, 'seatTopY': floor + .484})

    def sofa(name, x, z, yaw=0, width=2.75):
        start = set(bpy.context.scene.objects)
        ns['sofa26'](name, x, z, yaw, width)
        record(name, start, kind='tailored three-seat sofa', position=[x, floor, z], yaw=yaw)
        seats.append({'id': name, 'kind': 'sofa', 'position': [x, floor, z],
                      'yaw': yaw, 'seatTopY': floor + .484, 'width': width})

    def table(name, x, z, radius=.55):
        start = set(bpy.context.scene.objects)
        ns['coffee26'](name, x, z, radius, base=floor)
        ns['flowers26'](name + ' fresh ivory flowers', x - .10, .65, z)
        ns['water26'](name + ' guest glass', x + .20, .65, z + .08)
        soft(prefix + name + ' printed brochure', (x + .09, .659, z - .16),
             (.20, .014, .145), ns['TOP26'], .004)
        record(name, start, kind='black circular hospitality table', topY=.65,
               position=[x, floor, z], radius=radius)

    def plant(name, x, z, total=1.7, pot_h=.55, radius=.28,
              kind='broadleaf', metal=False, base=floor, seed=1, square=False):
        # Build around the origin, then translate the entire petiole and UV
        # blade meshes. Older helpers' local bounds must not clip live crowns
        # merely because this deeper pavilion uses a rear Z of -6.95 metres.
        start = set(bpy.context.scene.objects)
        batch_starts = {key: len(value['v']) for key, value in ns['BATCH'].items()}
        ns['plant26'](name, 0, 0, total, pot_h, radius, kind,
                      base=base, metal=metal, seed=seed)
        owned = set(bpy.context.scene.objects) - start
        if square:
            for ob in list(owned):
                if 'open planter' in ob.name or 'inset natural soil' in ob.name:
                    owned.remove(ob)
                    bpy.data.objects.remove(ob, do_unlink=True)
            vessel = soft(prefix + name + ' softly radiused square vessel',
                          (0, base + pot_h / 2, 0), (radius * 2.12, pot_h, radius * 2.12),
                          champagne if metal else ns['POT26'], .018)
            soil = box(prefix + name + ' inset square granular soil',
                       (0, base + pot_h - .025, 0), (radius * 1.90, .012, radius * 1.90),
                       ns['SOIL26'], .002)
            owned.update((vessel, soil))
        translate(owned, x=x, z=z)
        for key, batch in ns['BATCH'].items():
            for index in range(batch_starts.get(key, 0), len(batch['v'])):
                p = Vector(batch['v'][index])
                batch['v'][index] = (p.x + x, p.y, p.z + z)
        meta = ns['PLANTS'][-1]
        meta.update(position=[x, base, z], potShape='square' if square else 'round',
                    finish='brushed champagne metal' if metal else 'satin black ceramic',
                    translationSafeFoliage=True)
        for ob in owned:
            ob['grandRole'] = 'interior'
            ob['rentalInteriorRole'] = 'living planting'

    # Left display zone: a low grounded planter plinth and two continuous
    # illuminated channels, with their optics physically above floor Y=.12.
    start = set(bpy.context.scene.objects)
    soft(prefix + 'front-left satin black garden plinth', (-7.5, .27, 6.1),
         (7.8, .30, 1.70), black, .065)
    soft(prefix + 'garden plinth recessed aluminium light channel', (-7.5, .144, 6.947),
         (7.66, .040, .030), ns['FRAME26'], .007)
    soft(prefix + 'garden visible continuous teal rope diffuser', (-7.5, .143, 6.965),
         (7.63, .024, .012), ns['TEAL26'], .005)
    soft(prefix + 'garden fine pearl upper reveal', (-7.5, .413, 6.953),
         (7.63, .017, .017), ns['WARM26'], .004)
    ns['label26']('SMALL MODULES. BIG POSSIBILITIES.', (-7.5, .245, 6.965),
                  .125, 7.15, tracking=1.20, premium=True, slogan=True)
    record('front-left-product-garden', start, position=[-7.5, floor, 6.1],
           size=[7.8, .30, 1.7], topY=.42)
    lights.extend([{'id': 'garden teal rope', 'position': [-7.5, .143, 6.965],
                    'length': 7.63, 'opticalHeight': .024, 'colour': 'teal'},
                   {'id': 'garden upper pearl edge', 'position': [-7.5, .413, 6.953],
                    'length': 7.63, 'opticalHeight': .017, 'colour': 'warm white'}])
    for i, x in enumerate((-10.80, -9.85, -8.90, -7.95, -7.00, -6.05, -5.10, -4.15)):
        plant('front display garden specimen ' + str(i), x, 6.03 + (i % 2) * .14,
              .83 + (i % 3) * .07, .29, .23, 'bush' if i % 3 else 'fern',
              base=.42, metal=i in (1, 4, 7), seed=640 + i, square=i % 2 == 0)

    # Front-right reception: the fascia, raised worktop, independent physical
    # letters, rounded ribbed champagne returns, and fully supported props.
    cx, cz, width, depth, counter_y = 7.8, 5.8, 5.6, 1.25, 1.24
    start = set(bpy.context.scene.objects)
    soft(prefix + 'reception rounded black carcass', (cx, .66, cz),
         (width, 1.04, depth), black, .16)
    soft(prefix + 'reception recessed grounded kick', (cx, .152, cz),
         (width - .20, .064, depth - .18), ns['FRAME26'], .030)
    soft(prefix + 'reception honed pale stone worktop', (cx, counter_y - .018, cz),
         (width + .025, .036, depth + .025), ns['TOP26'], .045)
    front_z = cz + depth / 2 + .006
    soft(prefix + 'reception visible continuous warm toe rope', (cx, .146, front_z),
         (width - .12, .026, .022), ns['WARM26'], .006)
    soft(prefix + 'reception fine warm countertop reveal', (cx, counter_y - .047, front_z),
         (width - .19, .014, .017), ns['WARM26'], .004)
    for side in (-1, 1):
        end_x = cx + side * (width / 2 - .08)
        for i in range(18):
            zz = cz - depth / 2 + .08 + i * (depth - .16) / 17
            ns['rod'](prefix + 'individual champagne reception return rib',
                      (end_x, .17, zz), (end_x, counter_y - .035, zz), .012, champagne, 8)
        ns['tube26']('continuous warm reception end diffuser',
                     [(end_x, .146, cz - depth / 2 + .06),
                      (end_x, .146, cz), (end_x, .146, cz + depth / 2 - .06)],
                     .011, ns['WARM26'], 8)
    # Desk sign: the signal-grid logo (0.80 x the old .52 emblem, its cell
    # backs on the old emblem's back plane, front_z + .014 - .01) and the
    # livegridAV wordmark in today's ink box. No halo: the stall's one halo is
    # on the main fascia.
    ns['premium_signage']().premium_emblem((cx - 1.75, .46, front_z + .004), .52)
    ns['label26']('livegridAV', (cx + .25, .51, front_z + .022), .34,
                  3.4, tracking=.99, premium=True)
    reception_geometry = record('front-right-reception', start,
                                position=[cx, floor, cz], size=[width, counter_y - floor, depth],
                                countertopY=counter_y)
    start = set(bpy.context.scene.objects)
    for name, xx in (('left receptionist laptop', 6.65), ('right receptionist laptop', 8.90)):
        old = set(bpy.context.scene.objects)
        ns['laptop26'](name, xx, cz - .12)
        translate(set(bpy.context.scene.objects) - old, y=counter_y - 1.244)
    ns['flowers26']('reception supported fresh floral vase', 5.48, counter_y, cz + .02)
    for i, xx in enumerate((7.45, 9.82)):
        ns['water26']('reception supported glass ' + str(i), xx, counter_y, cz + .22)
    soft(prefix + 'reception tablet and brochure rest', (8.0, counter_y + .012, cz + .24),
         (.31, .023, .22), ns['FRAME26'], .014)
    for xx in (7.95, 9.45):
        ns['lathe26']('reception glazed espresso cup', xx, cz + .10,
                      [(0, counter_y), (.038, counter_y), (.043, counter_y + .063),
                       (.038, counter_y + .068), (.032, counter_y + .064),
                       (.028, counter_y + .012)], ns['WHITE26'], 24)
    record('reception-supported-props', start, supportY=counter_y)
    lights.append({'id': 'reception warm toe rope', 'position': [cx, .146, front_z],
                   'length': width - .12, 'opticalHeight': .026, 'colour': 'warm white'})

    # Native chairs, sofas and armrests do not inherit the architecture scale.
    # The center lounge is pushed right of the 2.4m-wide open principal route.
    sofa('main rear left sofa', .80, -4.7, 0, 2.75)
    sofa('main rear right sofa', 4.20, -4.7, 0, 2.75)
    chair('main left inward lounge armchair', 1.00, -1.30, math.pi, 1.00)
    chair('main right inward lounge armchair', 4.70, -1.30, math.pi, 1.00)
    table('main left black circular consultation table', .90, -3.0, .55)
    table('main right black circular consultation table', 4.20, -3.0, .55)
    sofa('left private consultation sofa', -8.0, -.80, math.pi / 2, 2.40)
    chair('left consultation facing adviser', -4.70, -.80, -math.pi / 2, 1.00)
    table('left black circular consultation table', -6.35, -.80, .54)
    chair('right application cafe left chair', 7.95, -3.2, math.pi / 2, .94)
    chair('right application cafe right chair', 10.25, -3.2, -math.pi / 2, .94)
    table('right black circular hospitality table', 9.10, -3.2, .45)
    # One extra compact conversation island prevents the deep center/right
    # foreground from becoming a bare void in the reference's aerial view.
    chair('middle hospitality rear chair', 7.15, -.10, .12, 1.00)
    chair('middle hospitality front chair', 7.15, 2.40, math.pi, 1.00)
    table('middle black circular hospitality table', 7.15, 1.15, .44)

    feature_plants = [
        (-10.95, 6.15, 2.75, 'bush', True, False),
        (10.95, 6.90, 2.80, 'broadleaf', False, True),
        (-10.80, -4.50, 2.60, 'palm', False, True),
        (-3.35, -6.30, 3.00, 'broadleaf', True, False),
        (7.45, -6.30, 3.15, 'broadleaf', False, True),
        (10.95, -5.75, 2.60, 'bush', True, False),
        (10.70, .35, 2.60, 'palm', False, True),
        (-3.00, .75, 1.45, 'bush', False, True),
        (5.85, .05, 1.65, 'broadleaf', False, True),
        (2.50, -5.65, 1.20, 'bush', False, True),
        (6.05, -4.25, 1.70, 'palm', False, True),
        (-9.60, .55, 1.70, 'bush', True, False),
        (5.15, 3.00, 1.40, 'broadleaf', False, True),
        (10.65, 3.25, 1.65, 'bush', False, True),
        (-10.50, -6.15, 1.95, 'bush', True, False),
        (-9.80, -2.45, 1.85, 'palm', False, True),
        (-2.50, 5.45, 1.65, 'broadleaf', False, True),
        (2.65, 1.45, 1.20, 'bush', False, True),
        (4.45, 5.45, 1.70, 'bush', True, False),
        (4.90, -5.95, 1.45, 'broadleaf', False, True),
    ]
    for i, (x, z, total, kind, metal, square) in enumerate(feature_plants):
        plant('layered living architectural specimen ' + str(i), x, z, total,
              .70 if total > 2.4 else .52, .34 if total > 2.4 else .28,
              kind, metal=metal, base=.42 if i == 0 else floor,
              seed=800 + i, square=square)

    # Join each UV foliage batch only after all plants have been translated.
    for key, finish in (('leaves', ns['LEAF26']), ('broad-leaves', ns['TROPICAL_LEAF26'])):
        if key not in ns['BATCH']:
            continue
        batch = ns['BATCH'][key]
        ob = ns['mesh26']('curved living botanical atlas blades ' + key,
                          batch['v'], batch['f'], finish, batch['uv'])
        ob['grandRole'] = 'interior'
        ob['rentalInteriorRole'] = 'living planting'
        for polygon in ob.data.polygons:
            polygon.use_smooth = True
    objects = set(bpy.context.scene.objects) - before_all
    for ob in objects:
        if ob.type == 'MESH' and 'grandRole' not in ob:
            ob['grandRole'] = 'interior'
    return {
        'objects': objects, 'furniture': furniture, 'seats': seats, 'screens': screens,
        'plants': ns['PLANTS'], 'leafCount': ns['LEAVES'], 'lights': lights,
        'reception': {'position': [cx, floor, cz], 'width': width, 'depth': depth,
                      'countertopY': counter_y, 'frontZ': front_z,
                      'staff': [{'position': [6.65, floor, 4.64], 'yaw': 0},
                                {'position': [8.90, floor, 4.64], 'yaw': 0}]},
        'routes': [{'id': 'principal', 'clearWidth': 2.4,
                    'polygonXZ': [[-1.2, 8.5], [1.2, 8.5], [1.2, .7], [-1.2, .7]],
                    'centerline': [[0, 8.5], [0, .7]]}],
        'notes': ['Native-metre upholstered furniture and seated-contact metadata.',
                  'Botanical atlas on individually curved leaves with complete petioles.',
                  'Warm reception rope optics and teal garden edge remain above Y=.12.',
                  'Reference front-right reception with champagne rib returns and supported props.'],
    }
