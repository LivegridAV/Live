"""Projection pavilion native furniture, consultation crescent and botanicals.

Pure constructor: no scene deletion, retained asset overwrite, or export. The
calling driver supplies the shell helper context and owns final GLB batching.
All dimensions are metres in Three XYZ; finished floor remains Y=.12.
"""
from pathlib import Path
import math
import random
import bpy
import bmesh
from mathutils import Vector, Matrix


def build_projection_finish_v2_interior(ctx):
    root = Path(__file__).resolve().parents[2]
    here = Path(__file__).resolve().parent
    initial = set(bpy.context.scene.objects)
    ns = dict(ctx)
    ns.update(bpy=bpy, bmesh=bmesh, math=math, random=random, Vector=Vector,
              Matrix=Matrix, Path=Path, ROOT=root, HERE=here,
              __file__=str(here / 'rebuild_led_rental_2026_interior.py'))
    if 'soft_box' not in ns:
        source = (here / 'rebuild_technical_showcase.py').read_text(encoding='utf-8')
        exec(compile(source[source.index('def soft_box('):source.index('def technical_armchair(')],
                     'projection-rounded-furniture-helper', 'exec'), ns)
    ns['SEMIBOLD'] = bpy.data.fonts.load('C:/Windows/Fonts/seguisb.ttf')
    source = (here / 'rebuild_led_rental_2026_interior.py').read_text(encoding='utf-8')
    source = source.split('# Left low display/garden')[0]
    source = 'QA=ROOT/' + source.split('QA=ROOT/', 1)[1]
    exec(compile(source, 'projection-native-upholstery-and-UV-leaf-helpers', 'exec'), ns)
    # Larger, clustered mature ficus leaves have the reference's layered
    # silhouette at the actual browser review distance. Branch reach shortens
    # before the complete blades grow; crowns are never clipped to fit a box.
    plant_source = source[source.index('def plant26('):source.index('def water26(')]
    plant_source = plant_source.replace('reach=foliage_h*rng.uniform(.25,.38)',
                                        'reach=foliage_h*rng.uniform(.24,.34)')
    plant_source = plant_source.replace('for j in range(12):\n                    t=.10+j*.075',
                                        'for j in range(16):\n                    t=.07+j*.058')
    exec(compile(plant_source, 'projection-layered-native-ficus-crowns', 'exec'), ns)
    prefix = 'Projection Finish V2 | '
    ns['PREFIX'] = prefix
    floor = float(ctx.get('F', ctx.get('FLOOR_TOP', .12)))
    ns['FLOOR_Y'] = floor
    # These new materials are independent of the retained Rental assets.
    for key, value in list(ns.items()):
        if key.endswith('26') and isinstance(value, bpy.types.Material):
            value.name = prefix + value.name.split(' | ', 1)[-1]
    soft, box = ns['soft_box'], ns['box']
    mesh, tube, lathe = ns['mesh26'], ns['tube26'], ns['lathe26']
    black, frame, cream = ns['BLACK26'], ns['FRAME26'], ns['CREAM26']
    material, xyz = ns['material'], ns['xyz']
    champagne = material(prefix + 'brushed champagne metal returns and pots',
                         (.43, .355, .255), .88, .32)
    emerald = material(prefix + 'satin deep emerald folded reception endcap',
                        (.004, .105, .059), .36, .38, .12)
    ns['SILVER26'] = champagne
    ivory = cream.node_tree.nodes.get('Principled BSDF')
    ivory.inputs['Base Color'].default_value = (.54, .515, .455, 1)
    ivory.inputs['Roughness'].default_value = .84
    ns['TOP26'].node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value = (.43, .435, .41, 1)
    # Leaf colour remains its packed veined UV atlas. No yellow/olive viewport
    # colour override is baked over the authored map.
    for key in ('LEAF26', 'TROPICAL_LEAF26'):
        ns[key].node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value = .61 if key == 'LEAF26' else .49
        ns[key].use_backface_culling = False
    furniture, seats, screens, lights, plants, support = [], [], [], [], [], []
    leaf_count = 0

    def visible_leaf(base, direction, length, width, rng, top, tile=None, broad=False):
        """A genuinely curved leaf blade with a readable layered surface.

        The broad front-biased roll is botanically varied, not a camera-facing
        card. There are actual midrib curvature, cupping and UV-veined normals.
        """
        style = ns.get('_PROJECTION_LEAF_STYLE', '')
        if style == 'ficus' and not broad:
            length *= 1.16
            width *= 1.65
        base, axis = Vector(base), Vector(direction).normalized()
        if style in ('vine', 'ficus'):
            normal = Vector((rng.uniform(-.28, .28), rng.uniform(.05, .36), rng.uniform(.72, 1.0)))
        else:
            normal = Vector((rng.uniform(-.5, .5), rng.uniform(.3, .9), rng.uniform(-.5, .5)))
        normal -= axis * normal.dot(axis)
        if normal.length < .05:
            normal = Vector((0, 0, 1)) - axis * axis.z
        normal.normalize()
        normal = Matrix.Rotation(rng.uniform(-.55, .55) if style in ('vine', 'ficus') else rng.uniform(-.9, .9),
                                 3, axis) @ normal
        side = axis.cross(normal).normalized()
        tile = rng.choice((0, 0, 1, 1, 2, 4, 4, 6, 6)) if tile is None else tile
        vertices, faces, uv = [], [], []
        segments = 9 if broad else 6
        curl, sweep = rng.uniform(.12, .24), rng.uniform(-.055, .055)
        for j in range(segments + 1):
            t = j / segments
            mid = base + axis * (length * t) + normal * length * (.14 * math.sin(math.pi * t) - curl * t * t)
            mid += side * length * sweep * math.sin(math.pi * t)
            half = width * .5 * math.sin(math.pi * t) ** (.58 if broad else .66)
            across = Matrix.Rotation(rng.uniform(-.20, .20) * t, 3, axis) @ side
            for sign in (-1, 0, 1):
                vertices.append(mid + across * (sign * half) - normal * abs(sign) * half * .18)
                uv.append(((tile + (sign + 1) * .5) / 8, .02 + .96 * t))
            if j:
                for column in range(2):
                    a, b = (j - 1) * 3 + column, j * 3 + column
                    faces.append((a, a + 1, b + 1, b))
        if any(v.y > top for v in vertices):
            return
        ns['add_leaf'](vertices, faces, uv, broad)

    ns['leaf26'] = visible_leaf

    def bounds(objects):
        return ns['bounds26'](objects)

    def owned_since(start, role, name, **metadata):
        objects = [ob for ob in set(bpy.context.scene.objects) - start if ob.type == 'MESH']
        for ob in objects:
            ob['grandRole'] = role
            ob['projectionFinishRole'] = name
        item = {'id': name, 'bounds': bounds(objects), **metadata}
        if role == 'furniture':
            furniture.append(item)
        return objects, item

    def translate(objects, x=0, y=0, z=0):
        delta = Vector(xyz((x, y, z)))
        for ob in objects:
            if ob.parent is None:
                ob.location += delta

    def lettering(text, p, height, width, finish=None, centered=True, tracking=1.06, slogan=True):
        # Every sign here is a premium sign: livegridAV goes to premium_wordmark
        # in today's ink box, other copy is deepened in place (aqua face for a
        # teal/mint finish). Uniform fit preserves the original glyph shape even
        # on narrow copy, and is applied before the letters are deepened.
        return ns['label26'](text, p, height, width, finish or ns['WHITE26'], centered, tracking,
                             premium=True, slogan=slogan, uniform=True)

    def armchair(name, x, z, yaw=0, width=.97, purpose='lounge'):
        start = set(bpy.context.scene.objects)
        ns['chair26'](name, x, z, yaw, width, base=floor)
        _, item = owned_since(start, 'furniture', name, kind='tailored ivory upholstered armchair',
                             position=[x, floor, z], yaw=yaw, width=width,
                             seatTopY=floor + .484, purpose=purpose)
        seats.append({k: item[k] for k in ('id', 'position', 'yaw', 'seatTopY', 'width', 'bounds', 'purpose')})

    def table(name, x, z, radius=.51):
        start = set(bpy.context.scene.objects)
        ns['coffee26'](name, x, z, radius, base=floor)
        top_y = floor + .53
        ns['flowers26'](name + ' supported ivory flowers', x - .09, top_y, z - .02)
        ns['water26'](name + ' supported guest glass', x + .18, top_y, z + .04)
        soft(prefix + name + ' flat printed brochure', (x + .01, top_y + .007, z - .19),
             (.20, .014, .135), ns['TOP26'], .003)
        owned_since(start, 'furniture', name, kind='low basalt hospitality table',
                    position=[x, floor, z], radius=radius, topY=top_y)
        support.append({'id': name, 'surfaceY': top_y, 'supportedProps': ['floral vase', 'glass', 'brochure']})

    def arc_points(radius, start=-65, end=65, count=112, y=0):
        return [(radius * math.sin(math.radians(start + (end - start) * j / count)),
                 y, -2.8 + radius * math.cos(math.radians(start + (end - start) * j / count)))
                for j in range(count + 1)]

    def arc_solid(name, inner, outer, bottom, top, finish):
        a, b = arc_points(inner, y=bottom), arc_points(outer, y=bottom)
        vertices, faces = [], []
        for index in range(len(a)):
            vertices.extend((a[index], b[index], (b[index][0], top, b[index][2]),
                             (a[index][0], top, a[index][2])))
        for j in range(len(a) - 1):
            for k in range(4):
                faces.append((j * 4 + k, (j + 1) * 4 + k,
                              (j + 1) * 4 + (k + 1) % 4, j * 4 + (k + 1) % 4))
        faces.extend(((3, 2, 1, 0), tuple(range(len(vertices) - 4, len(vertices)))))
        ob = mesh(name, vertices, faces, finish)
        for index, polygon in enumerate(ob.data.polygons):
            polygon.use_smooth = index < (len(a) - 1) * 4 and index % 4 in (1, 3)
        return ob

    # The reference top view contains a curved consultation layer around the
    # model, distinct from the model dais and from loose lounge furniture.
    start = set(bpy.context.scene.objects)
    arc_solid('curved consultation charcoal body', 4.49, 5.12, floor + .04, .794, black)
    arc_solid('curved consultation softly honed pale top', 4.48, 5.15, .794, .83, ns['TOP26'])
    tube('curved consultation warm concealed toe rope', arc_points(5.125, y=floor + .024), .009,
         ns['WARM26'], 8)
    tube('curved consultation champagne counter upper reveal', arc_points(5.153, y=.79), .006,
         champagne, 8)
    for j in range(137):
        angle = math.radians(-65 + 130 * j / 136)
        xx, zz = 5.128 * math.sin(angle), -2.8 + 5.128 * math.cos(angle)
        ns['rod'](prefix + 'individual consultation curved-face dark reed',
                  (xx, floor + .07, zz), (xx, .766, zz), .009, frame, 6)
    owned_since(start, 'furniture', 'model-surrounding-consultation-crescent',
                center=[0, floor, -2.8], innerRadius=4.48, outerRadius=5.15,
                topY=.83, angularExtentDegrees=[-65, 65], nativeFurnitureScale=1)
    lights.append({'id': 'consultation crescent warm toe rope', 'radius': 5.125,
                   'angularExtentDegrees': [-65, 65], 'centerXZ': [0, -2.8],
                   'opticalCenterY': floor + .024, 'colour': 'warm white'})
    for index, degrees in enumerate((-62, -38, -16, 16, 38, 62)):
        angle = math.radians(degrees)
        xx, zz = 5.75 * math.sin(angle), -2.8 + 5.75 * math.cos(angle)
        armchair('crescent consultation chair ' + str(index), xx, zz, math.pi + angle,
                 .93, 'model consultation')
        if index in (0, 2, 3, 5):
            px, pz = 4.79 * math.sin(angle), -2.8 + 4.79 * math.cos(angle)
            start = set(bpy.context.scene.objects)
            ns['water26']('crescent supported water glass ' + str(index), px, .83, pz)
            soft(prefix + 'crescent supported printed brochure ' + str(index),
                 (px + .12, .837, pz), (.18, .014, .13), ns['TOP26'], .003)
            owned_since(start, 'furniture', 'crescent supported hospitality props ' + str(index), supportY=.83)

    # Two compact consultation islands are separated from the visitor paths.
    # Side chairs all face the matching real table, rather than a camera.
    armchair('left lounge rear chair', -8.50, 1.70, .22)
    armchair('left lounge facing chair', -8.15, 3.85, math.pi + .14)
    table('left dark consultation table', -8.33, 2.77, .52)
    armchair('right lounge rear chair', 8.75, 2.25, .17)
    armchair('right lounge front chair', 9.00, 4.80, math.pi + .13)
    armchair('right lounge inward chair', 7.60, 3.57, math.pi / 2)
    table('right dark consultation table', 8.75, 3.57, .55)

    # Reception keeps the accepted footprint and native worktop height. Its
    # folded emerald end, fine fluted champagne returns and supported tabletop
    # props are constructed volumes, not artwork pasted onto a cabinet.
    cx, cz, w, d, top_y = -7.0, 6.0, 6.2, 1.05, 1.22
    start = set(bpy.context.scene.objects)
    soft(prefix + 'reception rounded satin black cabinet', (cx, floor + .5225, cz),
         (w, 1.045, d), black, .085)
    soft(prefix + 'reception honed pale stone worktop', (cx, top_y - .0275, cz),
         (w + .024, .055, d + .024), ns['TOP26'], .045)
    front = cz + d / 2 + .006
    soft(prefix + 'reception concealed warm continuous toe rope', (cx, floor + .023, front),
         (w - .15, .020, .020), ns['WARM26'], .005)
    soft(prefix + 'reception warm fine countertop reveal', (cx, top_y - .062, front),
         (w - .15, .010, .014), ns['WARM26'], .003)
    for side in (-1, 1):
        xx = cx + side * (w / 2 - .065)
        soft(prefix + 'reception champagne end return', (xx, floor + .52, cz),
             (.105, 1.02, d - .07), champagne, .022)
        for j in range(17):
            zz = cz - d / 2 + .06 + j * (d - .12) / 16
            ns['rod'](prefix + 'individual brushed champagne reception end flute',
                      (xx + side * .054, floor + .055, zz),
                      (xx + side * .054, top_y - .07, zz), .009, champagne, 7)
    # Desk sign, no halo: the signal-grid logo in place of emblem26's folded
    # triangle (.80 x its .51 m height, same left edge, cell backs on the
    # triangle's back plane front + .007), then the livegridAV wordmark.
    ns['premium_signage']().premium_emblem((cx - 2.66, floor + .30, front + .007), .51)
    lettering('livegridAV', (cx - .25, floor + .39, front + .024), .37, 3.42)
    lettering('RENTAL  |  SOLUTIONS  |  EXPERIENCES', (cx - .56, floor + .145, front + .026),
              .09, 4.32, tracking=1.09)
    points = [(cx + 3.03, floor + .04, front + .006),
              (cx + 1.90, floor + .53, front + .045),
              (cx + 3.03, floor + 1.03, front + .006),
              (cx + 2.90, floor + .53, front + .090)]
    mesh('reception folded emerald architectural endcap', points,
         [(0, 3, 1), (1, 3, 2)], emerald)
    tube('reception emerald endcap narrow optical boundary', points[:3], .006, ns['TEAL26'], 8)
    _, reception = owned_since(start, 'furniture', 'front-left-reception',
                              center=[cx, floor, cz], width=w, depth=d,
                              topY=top_y, staffAnchors=[[-7.70, floor, 5.10], [-5.85, floor, 5.10]])
    start = set(bpy.context.scene.objects)
    for index, xx in enumerate((-8.55, -6.05)):
        old = set(bpy.context.scene.objects)
        ns['laptop26']('reception native laptop ' + str(index), xx, 5.93)
        translate(set(bpy.context.scene.objects) - old, y=top_y - 1.2455)
    ns['flowers26']('reception supported ivory floral vase', -9.48, top_y, 5.98)
    for index, xx in enumerate((-7.35, -4.70)):
        ns['water26']('reception supported water tumbler ' + str(index), xx, top_y, 6.20)
    for index, xx in enumerate((-7.15, -5.12)):
        soft(prefix + 'reception supported printed brochure ' + str(index),
             (xx, top_y + .009, 6.26), (.25, .018, .17), ns['TOP26'], .004)
    owned_since(start, 'furniture', 'reception-supported-native-tabletop-props', supportY=top_y)
    support.append({'id': 'reception worktop', 'surfaceY': top_y,
                    'supportedProps': ['two native laptops', 'floral vase', 'two glasses', 'two brochures']})
    lights.append({'id': 'reception warm toe rope', 'position': [cx, floor + .023, front],
                   'length': w - .15, 'opticalHeight': .020, 'colour': 'warm white'})

    def kiosk(name, pos, width=1.40, height=1.42, depth=.77,
              screen_id='projection-kiosk', secondary=False):
        start = set(bpy.context.scene.objects)
        x, by, z = pos
        # The actual emitting face is supplied by the runtime using this exact
        # native aperture; a real solid cabinet lies behind the tilted glass.
        rotation = [-.57, 0, 0]
        p = [x, by + 1.31, z + .06]
        display_w, display_h = width - .18, .70 if not secondary else .47
        normal = Vector((0, -math.sin(rotation[0]), math.cos(rotation[0])))
        up = Vector((0, math.cos(rotation[0]), math.sin(rotation[0])))
        low = Vector(p) - up * (display_h / 2) - normal * .058
        high = Vector(p) + up * (display_h / 2) - normal * .058
        # A six-sided wedge follows the inclined screen instead of burying
        # its lower half in the earlier horizontal-topped rectangular body.
        profile = [(by, z - depth / 2), (by, z + depth / 2),
                   (min(low.y - .025, by + .95), z + depth / 2),
                   (low.y, low.z), (high.y, high.z), (high.y, z - depth / 2)]
        vertices = [(xx, yy, zz) for xx in (x - width / 2, x + width / 2)
                    for yy, zz in profile]
        n = len(profile)
        faces = [tuple(range(n - 1, -1, -1)), tuple(range(n, n * 2))]
        faces += [(j, (j + 1) % n, (j + 1) % n + n, j + n) for j in range(n)]
        wedge = mesh(name + ' actual sloped grounded satin black cabinet', vertices, faces, black)
        wedge.data.materials.append(champagne)
        wedge.data.polygons[0].material_index = 1
        back = soft(prefix + name + ' sloped screen aluminium housing', (0, 0, 0),
                    (display_w + .055, display_h + .055, .045), frame, .013)
        back.location = Vector(xyz(Vector(p) - normal * .030))
        # The cuboid is already authored in the Three-to-Blender basis.
        back.rotation_euler = (rotation[0], 0, 0)
        screens.append({'id': screen_id, 'type': 'flat', 'x': p[0], 'y': p[1], 'z': p[2],
                        'w': display_w, 'h': display_h, 'rotation': rotation,
                        'mediaHint': 'projection-kiosk', 'solidHousing': True})
        lettering('EXPLORE', (x, by + .74, z + depth / 2 + .014), .125, width - .15)
        lettering('POSSIBILITIES', (x, by + .49, z + depth / 2 + .014), .103, width - .13)
        owned_since(start, 'furniture', name, position=pos, width=width, depth=depth,
                    topY=p[1] + math.cos(rotation[0]) * display_h / 2,
                    screenApertureId=screen_id, slopedPhysicalCabinet=True)
        return {'position': pos, 'width': width, 'depth': depth, 'screen': screens[-1]}

    main_kiosk = kiosk('right-front interactive kiosk', [4.50, floor, 5.80])
    # Reference has a slim second screen station at the left model approach.
    # Its native .52 m wide body is outside the central entry and reception.
    secondary_kiosk = kiosk('slim secondary interactive pedestal', [-3.80, floor, 4.70],
                            .58, 1.42, .45, 'projection-kiosk-secondary', True)

    def plant(name, x, z, total=2.4, pot_h=.65, radius=.30,
              kind='bush', metal=True, base=floor, seed=1, square=False):
        nonlocal leaf_count
        start = set(bpy.context.scene.objects)
        batch_starts = {key: len(batch['v']) for key, batch in ns['BATCH'].items()}
        leaves_before = ns['LEAVES']
        # Every whole crown is grown at the origin before placement. The old
        # one-shot pavilion's positional masks cannot clip a relocated tree.
        ns['_PROJECTION_LEAF_STYLE'] = 'ficus' if kind == 'bush' else ''
        ns['plant26'](name, 0, 0, total, pot_h, radius, kind,
                      base=base, metal=metal, seed=seed)
        ns['_PROJECTION_LEAF_STYLE'] = ''
        if kind == 'palm':
            # Dense broad tropical understory shares the real palm pot. Its
            # broader cupped blades remain inside the unchanged palm envelope.
            rng = random.Random(seed + 711)
            soil = base + pot_h - .035
            for j in range(11):
                a = j * 2.399 + rng.uniform(-.2, .2)
                end = Vector((math.cos(a) * .24, soil + .45 + (j % 4) * .22,
                              math.sin(a) * .22))
                tube(name + ' real broad understory petiole',
                     [(0, soil, 0), (end.x * .6, soil + (end.y - soil) * .7, end.z * .6), end],
                     [.007, .005, .0025], ns['TROPICAL_STEM26'], 6)
                visible_leaf(end, (math.cos(a) * .67, .64, math.sin(a) * .60),
                             rng.uniform(.47, .64), rng.uniform(.21, .29), rng,
                             base + total, tile=rng.choice((0, 1, 4, 6)), broad=True)
        owned = set(bpy.context.scene.objects) - start
        if square:
            for ob in list(owned):
                if 'open planter' in ob.name or 'inset natural soil' in ob.name:
                    owned.remove(ob)
                    bpy.data.objects.remove(ob, do_unlink=True)
            vessel = soft(prefix + name + ' softly rounded square metal planter',
                          (0, base + pot_h / 2, 0), (radius * 2.12, pot_h, radius * 2.12),
                          champagne if metal else ns['POT26'], .025)
            soil = box(prefix + name + ' inset real square soil',
                       (0, base + pot_h - .030, 0), (radius * 1.90, .015, radius * 1.90),
                       ns['SOIL26'], .002)
            owned.update((vessel, soil))
        local_points = []
        bpy.context.view_layer.update()
        for ob in owned:
            if ob.type == 'MESH':
                local_points.extend(Vector((p.x, p.z, -p.y)) for p in (ob.matrix_world @ v.co for v in ob.data.vertices))
        for key, batch in ns['BATCH'].items():
            added = batch['v'][batch_starts.get(key, 0):]
            local_points.extend(Vector(v) for v in added)
            for index in range(batch_starts.get(key, 0), len(batch['v'])):
                p = Vector(batch['v'][index])
                batch['v'][index] = (p.x + x, p.y, p.z + z)
        translate(owned, x=x, z=z)
        for ob in owned:
            if ob.type == 'MESH':
                ob['grandRole'] = 'planting'
                ob['projectionFinishRole'] = name
        lo = [min(p[i] for p in local_points) for i in range(3)]
        hi = [max(p[i] for p in local_points) for i in range(3)]
        record = {'id': name, 'kind': kind, 'position': [x, base, z],
                  'totalHeight': total, 'potHeight': pot_h, 'potRadius': radius,
                  'potShape': 'square' if square else 'round',
                  'finish': 'brushed champagne metal' if metal else 'satin black ceramic',
                  'leafCount': ns['LEAVES'] - leaves_before,
                  'translationSafeFoliage': True,
                  'bounds': {'min': [lo[0] + x, lo[1], lo[2] + z],
                             'max': [hi[0] + x, hi[1], hi[2] + z]}}
        leaf_count += record['leafCount']
        plants.append(record)

    # Tall feature specimens are kept clear of the gallery apertures, desk
    # station and model. Dark/deep greens dominate with warm young leaf tips.
    features = [
        ('left-front naturally branching ficus', -10.72, 6.27, 3.70, .81, .37, 'bush', True, False),
        ('right-front naturally branching ficus', 10.72, 6.33, 3.55, .78, .35, 'bush', True, False),
        ('left inner layered tropical palm', -5.53, -.45, 3.45, .73, .32, 'palm', True, False),
        ('right inner layered tropical palm', 5.53, -.45, 3.30, .70, .31, 'palm', True, False),
        ('left sidewall layered broad leaves', -10.75, 3.50, 2.75, .63, .30, 'broadleaf', False, True),
        ('right sidewall layered broad leaves', 10.80, 3.65, 2.65, .64, .30, 'broadleaf', True, False),
        ('rear left tropical broadleaf specimen', -9.75, -5.70, 3.30, .73, .32, 'broadleaf', False, True),
        ('rear right tropical broadleaf specimen', 9.75, -5.70, 3.30, .73, .32, 'broadleaf', False, True),
        ('left gallery inner low fern', -6.20, 2.00, 1.30, .44, .25, 'fern', True, False),
        ('right gallery inner low fern', 7.65, 1.00, 1.30, .44, .25, 'fern', True, False),
        ('reception left low tropical planter', -10.45, 5.30, 1.30, .48, .25, 'broadleaf', True, False),
        ('right lounge back low green planter', 10.30, 1.70, 1.45, .48, .24, 'bush', False, True),
        ('left lounge low green planter', -7.10, 2.72, 1.30, .44, .25, 'bush', False, True),
        ('right kiosk low green planter', 6.10, 6.30, 1.50, .50, .28, 'broadleaf', True, False),
    ]
    for i, (name, x, z, total, pot_h, radius, kind, metal, square) in enumerate(features):
        plant(name, x, z, total, pot_h, radius, kind, metal, seed=820 + i * 19, square=square)
    # A natural planting ribbon around the crystal base, seen prominently in
    # the aerial reference; small whole specimens retain their native scale.
    for i, degrees in enumerate((-155, -120, -88, -53, -20, 20, 53, 88, 120, 155)):
        a = math.radians(degrees)
        x, z = 4.13 * math.sin(a), -2.8 + 4.13 * math.cos(a)
        plant('crystal garden small specimen ' + str(i), x, z,
              1.10 + (i % 3) * .14, .31, .19,
              'bush' if i % 3 == 0 else 'fern' if i % 3 == 1 else 'broadleaf',
              i % 2 == 0, seed=1041 + i * 23)

    def climbing_column(name, x, z, bottom=.48, top=10.40, width=.53,
                        depth=.33, seed=200, leaders=7, levels=44):
        nonlocal leaf_count
        rng = random.Random(seed)
        first = ns['LEAVES']
        starts = {key: len(batch['v']) for key, batch in ns['BATCH'].items()}
        start = set(bpy.context.scene.objects)
        all_points = []
        for leader in range(leaders):
            phase = rng.uniform(0, math.tau)
            start_y, end_y = bottom + rng.uniform(0, .20), top - rng.uniform(.06, .38)
            points = [Vector((x + math.sin(j * .37 + phase) * width * .16,
                              start_y + (end_y - start_y) * j / 48,
                              z + math.sin(j * .53 + phase) * depth * .13))
                      for j in range(49)]
            tube(name + ' real woody climbing leader', points,
                 [.007 * (1 - j / 66) for j in range(49)], ns['STEM26'], 5)
            all_points.extend(points)
            for level in range(levels):
                t = (level + rng.uniform(.1, .9)) / levels
                origin = points[min(47, int(t * 48))]
                lobe = .66 + .22 * math.sin(origin.y * 2.31 + phase)
                for sign in (-1, 1):
                    dx, dz = sign * width * rng.uniform(.18, .34) * lobe, depth * rng.uniform(-.35, .45)
                    end = origin + Vector((dx, rng.uniform(.045, .16), dz))
                    twig = [origin, origin.lerp(end, .43) + Vector((0, .03, 0)), end]
                    tube(name + ' curved climbing side twig', twig, [.0025, .0016, .0005], ns['STEM26'], 4)
                    for blade in range(7 + rng.randrange(4)):
                        p = origin.lerp(end, rng.uniform(.20, 1))
                        direction = Vector((sign * rng.uniform(.20, .45), rng.uniform(.30, .90),
                                            rng.uniform(.10, .50)))
                        length = rng.uniform(.110, .155)
                        ns['leaf26'](p, direction, length, length * rng.uniform(.62, .80),
                                     rng, top - .10, tile=rng.choice((0, 0, 1, 1, 2, 4, 4, 6, 6)))
        # The isolated leaf constructor below has no old absolute X mask.
        # Whole blades remain native curved geometry in front of the flutes.
        for key, batch in ns['BATCH'].items():
            all_points.extend(Vector(v) for v in batch['v'][starts.get(key, 0):])
        owned_since(start, 'planting', name, kind='irregular climbing evergreen vine')
        lo = [min(p[i] for p in all_points) for i in range(3)]
        hi = [max(p[i] for p in all_points) for i in range(3)]
        count = ns['LEAVES'] - first
        leaf_count += count
        plants.append({'id': name, 'kind': 'native climbing evergreen vine',
                       'position': [x, floor, z], 'heightRange': [bottom, top],
                       'leafCount': count, 'attachment': 'gallery flute seam',
                       'completeLeaves': True, 'bounds': {'min': lo, 'max': hi}})

    ns['_PROJECTION_LEAF_STYLE'] = 'vine'
    for i, (x, z, width) in enumerate(((-11.22, 1.68, .30), (-6.43, .48, .28),
                                      (6.43, .48, .28), (11.22, 1.68, .30))):
        climbing_column('gallery integrated climbing leaf column ' + str(i), x, z,
                        .30, 10.35 if i in (1, 2) else 10.45,
                        width, .19 if i in (1, 2) else .22, 1379 + i * 31, 5, 36)
    ns['_PROJECTION_LEAF_STYLE'] = ''

    # Three native flowering tabletop pots on the consultation crescent are
    # counted separately from the full-height feature planting.
    for i, angle in enumerate((-47, 0, 47)):
        a = math.radians(angle)
        x, z = 4.79 * math.sin(a), -2.8 + 4.79 * math.cos(a)
        start = set(bpy.context.scene.objects)
        ns['flowers26']('consultation crescent supported floral vase ' + str(i), x, .83, z)
        owned_since(start, 'furniture', 'crescent floral supported prop ' + str(i), supportY=.83)
        plants.append({'id': 'consultation native floral pot ' + str(i), 'kind': 'ivory flower arrangement',
                       'position': [x, .83, z], 'supportedSurfaceY': .83})

    for key, finish in (('leaves', ns['LEAF26']), ('broad-leaves', ns['TROPICAL_LEAF26'])):
        batch = ns['BATCH'].get(key)
        if not batch or not batch['v']:
            continue
        ob = mesh('all complete UV-veined ' + key, batch['v'], batch['f'], finish, batch['uv'])
        ob['grandRole'] = 'planting'
        ob['projectionFinishRole'] = 'native individually curved UV foliage'
        for polygon in ob.data.polygons:
            polygon.use_smooth = True
    objects = [ob for ob in set(bpy.context.scene.objects) - initial if ob.type == 'MESH']
    bpy.context.view_layer.update()
    route_boxes = {
        'mainEntry': {'min': [-1.0, .14, 2.50], 'max': [1.0, 2.20, 8.5]},
        'crossing': {'min': [0, .14, 4.0], 'max': [6.40, 2.20, 5.20]},
        'rightInterior': {'min': [5.80, .14, 1.0], 'max': [7.0, 2.20, 4.60]},
    }
    route_hits = []
    for route_id, route in route_boxes.items():
        for item in furniture + plants:
            b = item.get('bounds')
            if b and all(b['min'][i] < route['max'][i] and b['max'][i] > route['min'][i]
                         for i in range(3)):
                route_hits.append({'route': route_id, 'item': item['id']})
    if route_hits:
        raise RuntimeError('Native furniture/plant bounds intersect route envelopes: ' + str(route_hits))
    return {'objects': objects, 'furniture': furniture, 'seats': seats,
            'screens': screens, 'lights': lights, 'plants': plants, 'leafCount': leaf_count,
            'reception': reception, 'kiosks': [main_kiosk, secondary_kiosk],
            'supportedProps': support,
            'routes': {'mainEntry': {'centerX': 0, 'width': 2.0, 'zRange': [2.50, 8.5]},
                       'crossing': {'z': 4.60, 'xRange': [0, 6.40], 'width': 1.2},
                       'rightInterior': {'centerX': 6.40, 'zRange': [1.0, 4.60], 'width': 1.2}},
            'routeBoundsAudit': {'method': 'Actual native furniture/complete-crown bounds against finite route boxes.',
                                 'boxes': route_boxes, 'intersections': route_hits},
            'notes': ['Native furniture and botanical geometry only; runtimeScale=1.',
                      'Reference images guide reconstruction; no source CAD dimensions available.',
                      'All packed UV leaf maps retained; complete crowns grown around their own anchors.']}


if __name__ == '__main__':
    import json
    base = Path(__file__).with_name('rebuild_projection_grand_v1.py')
    helpers = {'__file__': str(base)}
    exec(compile(base.read_text(encoding='utf-8').split('# A flush common-datum interior.')[0],
                 str(base), 'exec'), helpers)
    result = build_projection_finish_v2_interior(helpers)
    for plant in result['plants']:
        if 'bounds' in plant:
            for axis, limit in ((0, 12), (2, 8)):
                if plant['bounds']['min'][axis] < -limit or plant['bounds']['max'][axis] > limit:
                    raise RuntimeError('Complete plant crown outside reservation: ' + plant['id'])
    print('PROJECTION_FINISH_V2_INTERIOR_SMOKE ' + json.dumps({
        'objects': len(result['objects']), 'furniture': len(result['furniture']),
        'seats': result['seats'], 'plants': result['plants'], 'leaves': result['leafCount'],
        'screens': result['screens'], 'routes': result['routes'],
    }), flush=True)
