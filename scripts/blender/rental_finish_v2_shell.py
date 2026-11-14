"""Native LED Rental shell for the Booth / Booth Views reference.

This module only constructs objects. The versioned driver owns exporting and
metadata, so none of the retired rental assets are replaced by importing it.
All dimensions are website metres: X right, Y up, Z toward the visitor.
"""
import math


def build_shell_v2(ctx):
    globals().update(ctx)
    before = set(bpy.context.scene.objects)
    cfg = ctx['RENTAL_CFG']
    floor = cfg['floor']
    top = cfg['fasciaTop']
    bottom = cfg['fasciaBottom']
    wall_top = cfg['wallTop']
    prefix = 'Rental Finish V2 | '
    apertures = ctx['APERTURES']
    products = ctx['PRODUCTS']
    fixtures = ctx['FIXTURES']
    finish = {
        'black': material(prefix + 'matte black powdercoat', (.0065, .0085, .011), .25, .43),
        'wall': material(prefix + 'soft charcoal architectural panel', (.009, .012, .016), .10, .64),
        'trim': material(prefix + 'brushed graphite aluminium', (.046, .056, .063), .76, .32),
        'gold': material(prefix + 'satin champagne metal', (.38, .31, .215), .82, .30),
        'teal': material(prefix + 'teal opal rope light', (.009, .57, .44), .03, .28, 1.7),
        'warm': material(prefix + 'warm neutral rope light 3000K', (1.0, .77, .53), .02, .26, 2.3),
        'rig': material(prefix + 'black ceiling production truss', (.037, .044, .053), .65, .43),
        'lens': material(prefix + 'warm focused ceiling optic', (1.0, .83, .65), .02, .20, 3.0),
    }
    black, wall, trim, gold, teal, warm, rig, lens = (finish[k] for k in
        ('black', 'wall', 'trim', 'gold', 'teal', 'warm', 'rig', 'lens'))

    def tagged(ob, role='architecture', overhead=False):
        ob['grandRole'] = role
        if overhead:
            ob['ledRentalOverhead'] = True
        return ob

    def cuboid(name, p, size, mat=BLACK, bevel=.012, overhead=False, role='architecture'):
        return tagged(box(prefix + name, p, size, mat, bevel), role, overhead)

    def pipe(name, a, b, radius, mat, overhead=False):
        return tagged(rod(prefix + name, a, b, radius, mat, 8), 'overhead' if overhead else 'architecture', overhead)

    def strip(name, a, b, finish, radius=.010, overhead=False):
        """A recessed black channel with an independent round opal diffuser."""
        aa = (a[0], a[1] + .004, a[2] - .006)
        bb = (b[0], b[1] + .004, b[2] - .006)
        pipe(name + ' black recessed carrier', aa, bb, radius * 1.7, BLACK, overhead)
        return pipe(name + ' opal rope lens', a, b, radius, finish, overhead)

    def physical_label(body, p, height, width=None, centered=False, yaw=0,
                       tracking=1.06, semibold=False, mat=WHITE, font=None, overhead=False):
        start = set(bpy.context.scene.objects)
        ob = label(body, p, height, width, centered, yaw, tracking, semibold, mat, font)
        for item in set(bpy.context.scene.objects) - start:
            tagged(item, 'overhead' if overhead else 'architecture', overhead)
        return ob

    def physical_emblem(p, height, yaw=0, overhead=False):
        start = set(bpy.context.scene.objects)
        emblem(p, height, yaw)
        for item in set(bpy.context.scene.objects) - start:
            tagged(item, 'overhead' if overhead else 'architecture', overhead)

    # A hidden support remains below the venue's single continuous floor. Only
    # millimetre-sized independent diffuser optics project above it.
    support = cuboid('flush support below continuous venue stone', (0, .055, 0), (24, .11, 16), black, .016)
    support['grandSharedFloor'] = True
    perimeter = [(-11.90, .129, -7.90), (-11.90, .129, 7.86),
                 (11.90, .129, 7.86), (11.90, .129, -7.90), (-11.90, .129, -7.90)]
    for a, b in zip(perimeter, perimeter[1:]):
        strip('continuous warm flush perimeter', a, b, warm, .007)

    # Back and short outer returns establish a deep, open U. The two outer
    # mid-side openings intentionally remain open, as in the four-view plan.
    cuboid('rear matte charcoal service boundary', (0, (wall_top + floor) / 2, -7.74),
           (24, wall_top - floor, .28), wall, .016)
    for side in (-1, 1):
        x = side * 11.76
        front_start, front_end = ((4.80, 6.42) if side < 0 else (3.80, 6.52))
        cuboid(('left' if side < 0 else 'right') + ' short front branding return',
               (x, (bottom + floor) / 2, (front_start + front_end) / 2),
               (.28, bottom - floor, front_end - front_start), black, .014)
        cuboid(('left' if side < 0 else 'right') + ' short rear service return',
               (x, (wall_top + floor) / 2, -5.92), (.28, wall_top - floor, 3.64), black, .014)
        # Warm metal reveal and teal lens are distinct physical pieces.
        strip('outer return warm vertical corner', (x - side * .155, floor + .10, front_end - .05),
              (x - side * .155, bottom - .02, front_end - .05), warm, .009)

    fascia_plan = [(-11.8, 6.4), (-10.8, 7.3), (5.6, 3.8), (11.6, 6.5)]
    fascia_segments = []
    for i, (a, b) in enumerate(zip(fascia_plan, fascia_plan[1:])):
        ob = segment_box('Rental Finish V2 | solid folded fascia section ' + str(i), a, b,
                         bottom, top, .34, black, True)
        tagged(ob, 'overhead', True)
        yaw = -math.atan2(b[1] - a[1], b[0] - a[0])
        nx, nz = math.sin(yaw), math.cos(yaw)
        for name, y, m, r in (('teal underside', bottom - .012, teal, .012),
                              ('warm fine crown', top - .018, warm, .008)):
            strip('folded fascia ' + name,
                  (a[0] + nx * .012, y, a[1] + nz * .012),
                  (b[0] + nx * .012, y, b[1] + nz * .012), m, r, True)
        fascia_segments.append({'a': list(a), 'b': list(b), 'yaw': yaw, 'frontDepth': .34})
    for side, start in ((-1, fascia_plan[0]), (1, fascia_plan[-1])):
        end = (start[0], -7.60)
        # Order both side segments so the visible face remains outside.
        a, b = (end, start) if side < 0 else (start, end)
        ob = segment_box('Rental Finish V2 | fascia side return ' + str(side), a, b, bottom, top, .30, black, True)
        tagged(ob, 'overhead', True)
        strip('continuous teal side crown', (start[0] - side * .01, bottom - .012, start[1]),
              (end[0] - side * .01, bottom - .012, end[1]), teal, .012, True)
        strip('warm side crown reveal', (start[0] - side * .01, top - .018, start[1]),
              (end[0] - side * .01, top - .018, end[1]), warm, .008, True)

    # Branding is authored on the true oblique plane. There is no stretched
    # rectangular text texture or floating, front-parallel replacement sign.
    a, b = fascia_plan[1], fascia_plan[2]
    main_yaw = fascia_segments[1]['yaw']
    main_n = (math.sin(main_yaw), math.cos(main_yaw))

    def fascia_point(x, y, advance=.035):
        z = a[1] + (x - a[0]) / (b[0] - a[0]) * (b[1] - a[1])
        return (x + main_n[0] * advance, y, z + main_n[1] * advance)

    physical_emblem(fascia_point(-9.30, bottom + .18), 1.12, main_yaw, True)
    physical_label('livegrid AV', fascia_point(-8.08, bottom + .245), .99, 6.30,
                   yaw=main_yaw, tracking=1, semibold=True, overhead=True)
    physical_label('LED RENTAL SOLUTIONS', fascia_point(.30, bottom + .89), .205, 4.60,
                   yaw=main_yaw, tracking=1.34, overhead=True)
    physical_label('FOR EVERY VISION', fascia_point(.30, bottom + .48), .205, 4.60,
                   yaw=main_yaw, tracking=1.34, overhead=True)

    ra, rb = fascia_plan[2], fascia_plan[3]
    right_yaw = fascia_segments[2]['yaw']
    rx = 8.42
    rz = ra[1] + (rx - ra[0]) / (rb[0] - ra[0]) * (rb[1] - ra[1])
    rn = (math.sin(right_yaw), math.cos(right_yaw))
    for i, body in enumerate(('STAGES', 'EVENTS', 'EXHIBITIONS', 'BRANDS', 'FIXED INSTALLATIONS', 'AND MORE')):
        physical_label(body, (rx + rn[0] * .038, top - .28 - i * .183, rz + rn[1] * .038),
                       .135, 2.36, yaw=right_yaw, tracking=1.06, overhead=True)
    dividerx = rx - .28
    dividerz = ra[1] + (dividerx - ra[0]) / (rb[0] - ra[0]) * (rb[1] - ra[1])
    strip('service list fine teal divider', (dividerx + rn[0] * .04, bottom + .23, dividerz + rn[1] * .04),
          (dividerx + rn[0] * .04, top - .16, dividerz + rn[1] * .04), teal, .008, True)

    # The outside return carries a second full physical emblem and calm copy.
    physical_emblem((11.914, 5.64, 5.80), .93, math.pi / 2)
    for i, body in enumerate(('IDEAS', 'IN', 'MOTION')):
        physical_label(body, (11.916, 4.44 - i * .31, 5.69), .19, 1.62,
                       yaw=math.pi / 2, tracking=1.16)
    for i, body in enumerate(('TECHNOLOGY', 'PEOPLE', 'BIGGER', 'POSSIBILITIES')):
        physical_label(body, (11.916, 2.75 - i * .22, 5.71), .13, 1.62,
                       yaw=math.pi / 2, tracking=1.04)

    # The left display wall is a genuine diagonal in plan. Black steel piers
    # support its end, and floor/canopy reveals follow the same shared line.
    board_a, board_b = (-11.35, 4.8), (-3.4, 3.1)
    board_yaw = -math.atan2(board_b[1] - board_a[1], board_b[0] - board_a[0])
    bn = (math.sin(board_yaw), math.cos(board_yaw))
    board = segment_box('Rental Finish V2 | oblique floating product graphite board', board_a, board_b,
                        floor, 8.85, .24, wall, False)
    tagged(board)
    strip('product wall upper teal cove', (board_a[0] + bn[0] * .015, 8.82, board_a[1] + bn[1] * .015),
          (board_b[0] + bn[0] * .015, 8.82, board_b[1] + bn[1] * .015), teal, .009)
    for t in (0, .333, .667, 1):
        x = board_a[0] + (board_b[0] - board_a[0]) * t + bn[0] * .008
        z = board_a[1] + (board_b[1] - board_a[1]) * t + bn[1] * .008
        pipe('product board precision joint', (x, floor + .02, z), (x, 8.78, z), .006, black)
    for x, z, w, d in ((-3.0, 2.40, .40, .58), (-11.64, 6.03, .32, .45),
                       (11.61, 6.20, .32, .42), (-3.25, -7.30, .28, .45), (7.65, -7.30, .28, .45)):
        cuboid('native black structural portal pier', (x, (bottom + floor) / 2, z),
               (w, bottom - floor, d), black, .014)
        cuboid('pier graphite shadow shoe', (x, floor + .055, z), (w + .06, .11, d + .06), trim, .008)

    # Pixel-perfect registered screen openings: the runtime draws only emitting
    # display faces. The graphite cabinets, seams and fins remain actual 3D.
    cabinet_before = set(bpy.context.scene.objects)
    screen_cabinet('main-backdrop', (2.10, 5.15, -6.95), 10.60, 7.50,
                   'rental2026-backdrop', .18, .026)
    for i, y in enumerate((7.75, 5.75, 3.75, 1.75)):
        screen_cabinet('application-' + str(i), (9.0, y, -6.90), 2.50, 1.40625,
                       'rental2026-application-' + str(i), .15, .020)
        physical_label(('CORPORATE EVENTS', 'LIVE EXPERIENCES', 'BRAND ACTIVATIONS', 'RETAIL & SHOWROOMS')[i],
                       (10.40, y - .065, -6.88), .19, 1.30, tracking=1.02, font=CONDENSED_FONT)
    for ob in set(bpy.context.scene.objects) - cabinet_before:
        tagged(ob)
    for centre, count in ((-3.36, 9), (7.60, 14)):
        for i in range(count):
            x = centre + (i - (count - 1) / 2) * .058
            cuboid('individual champagne acoustic fin', (x, (floor + wall_top) / 2, -7.37),
                   (.021, wall_top - floor - .07, .20), gold, .003)
        strip('fin bank warm crown', (centre - count * .029, wall_top - .025, -7.24),
              (centre + count * .029, wall_top - .025, -7.24), warm, .010)
    for y in (floor + 1.09, floor + 2.69, floor + 4.29, floor + 5.89):
        cuboid('application bank horizontal recessed joint', (9.50, y, -7.586), (4.49, .012, .010), black, 0)

    specs = [
        {'id': 'flat', 'type': 'flat', 'x': -10.3, 'y': 7.05, 'width': 1.75, 'height': 1.60, 'label': ['FLAT LED']},
        {'id': 'curved', 'type': 'curved', 'x': -7.5, 'y': 7.05, 'width': 2.22, 'height': 1.60,
         'radius': 1.30, 'arc': 2.04, 'label': ['CURVED LED']},
        {'id': 'cylinder', 'type': 'cylinder', 'x': -4.8, 'y': 7.05, 'radius': .67, 'height': 1.80, 'label': ['CYLINDRICAL LED']},
        {'id': 'corner', 'type': 'corner', 'x': -10.4, 'y': 4.25, 'side': 1.20, 'height': 1.45, 'label': ['SEAMLESS', 'CORNER LED']},
        {'id': 'transparent', 'type': 'transparent', 'x': -8.0, 'y': 4.25, 'width': 1.40, 'height': 1.70, 'label': ['TRANSPARENT LED']},
        {'id': 'dna', 'type': 'dna', 'x': -6.1, 'y': 4.25, 'width': 1.00, 'height': 2.30, 'label': ['DNA LED']},
        {'id': 'sphere', 'type': 'sphere', 'x': -4.1, 'y': 4.25, 'radius': .72, 'label': ['SPHERE LED']},
    ]
    for item in specs:
        x, y = item.pop('x'), item.pop('y')
        z = board_a[1] + (x - board_a[0]) / (board_b[0] - board_a[0]) * (board_b[1] - board_a[1])
        stand_off = {'flat': .38, 'transparent': .30, 'curved': .22,
                     'cylinder': .90, 'sphere': .90, 'corner': 1.15, 'dna': .85}[item['id']]
        item['boardStandOff'] = stand_off
        item['position'] = [x + bn[0] * stand_off, y, z + bn[1] * stand_off]
        item['baseYaw'] = board_yaw
        item['rotation'] = [0, board_yaw, 0]
        item['suspensionTop'] = 8.69
        h = item.get('height', item.get('radius', .5) * 2)
        w = item.get('width', item.get('radius', item.get('side', .5)) * 2)
        # Captions belong to one architectural plane beneath the products;
        # variable model stand-off must not give the type a different parallax.
        item['labelPosition'] = [x + bn[0] * .15, y - h / 2 - .30, z + bn[1] * .15]
        for i, body in enumerate(item['label']):
            physical_label(body, (item['labelPosition'][0], item['labelPosition'][1] - i * .24,
                                  item['labelPosition'][2]), .20, 2.15, centered=True,
                           yaw=board_yaw, tracking=1.03)
        if item['id'] in ('flat', 'curved', 'cylinder'):
            tx, tz = math.cos(board_yaw), -math.sin(board_yaw)
            for side in (-1, 1):
                sx = item['position'][0] + side * w * .33 * tx
                sz = item['position'][2] + side * w * .33 * tz - .02
                pipe('taut stainless product suspension', (sx, y + h / 2, sz), (sx, 8.69, sz), .0045, CABLE)
                cuboid('product suspension ceiling fixing', (sx, 8.72, sz), (.065, .04, .065), trim, .004)
        elif item['id'] == 'sphere':
            pipe('sphere fine suspension wire', (item['position'][0], y + h / 2, item['position'][2]),
                 (item['position'][0], 8.69, item['position'][2]), .0045, CABLE)
        products.append(item)

    # Four-chord rectangular production truss, not a solid ceiling slab. Its
    # black webs and independent warm lenses stay visible from all three sides.
    for z in (-6.95, -3.40, .15, 3.20):
        for y in (8.88, 9.19):
            for dz in (-.16, .16):
                pipe('four chord ceiling truss rail', (-11.47, y, z + dz), (11.40, y, z + dz), .022, rig, True)
        span = 22.87 / 29
        for i in range(29):
            x = -11.47 + i * span
            for side in (-1, 1):
                pipe('ceiling truss web diagonal', (x, 8.88, z + side * .16),
                     (x + span, 9.19, z - side * .16), .010, rig, True)
    for x in (-10.50, -6.55, -2.60, 1.35, 5.30, 9.25):
        # Stop at the actual folded frontage, so a cross-truss never punches
        # through the facade's lettering plane as it did in the first render.
        fascia_z = (7.3 + (x + 10.8) / 16.4 * -3.5 if x <= 5.6
                    else 3.8 + (x - 5.6) / 6.0 * 2.7)
        front_z = min(6.35, fascia_z - .23)
        for dx in (-.12, .12):
            pipe('transverse open ceiling truss chord', (x + dx, 9.30, -7.35), (x + dx, 9.30, front_z), .020, rig, True)
        for i in range(18):
            span = (front_z + 7.35) / 18
            z = -7.35 + i * span
            pipe('transverse truss web', (x - .12, 9.30, z), (x + .12, 9.30, z + span), .009, rig, True)
    for row, z in enumerate((-6.45, -3.05, .40, 3.25, 5.50)):
        for col, x in enumerate((-10.35, -7.75, -5.15, -2.55, .05, 2.65, 5.25, 7.85, 10.45)):
            # The forward right beam is lower in plan; retain only optical
            # fixtures that sit behind the folded fascia, avoiding collisions.
            if z > 3.8 and x > 4.3:
                continue
            if z > 4.2 and -2.8 < x < 4.3:
                continue
            cuboid('ceiling fixture hanging yoke', (x, 8.745, z), (.080, .23, .080), rig, .005, True, 'overhead')
            cuboid('warm black gimbal spotlight body', (x, 8.54, z), (.19, .21, .25), black, .024, True, 'overhead')
            cuboid('independent warm recessed optical lens', (x, 8.425, z + .012), (.135, .016, .152), lens, .010, True, 'overhead')
            fixtures.append({'id': 'rental-v2-spot-%s-%s' % (row, col), 'position': [x, 8.413, z + .012],
                             'target': [x, floor, z - .45], 'color': '#ffe3c3', 'type': 'spot',
                             'lensArea': [.135, .152], 'physical': True})

    # The driver supplies the measured layout once, shared by shell, furniture,
    # visitors and runtime product animation. No shell dimension scales a chair.
    return {
        'objects': set(bpy.context.scene.objects) - before,
        'architecture': {'floor': floor, 'fasciaTop': top,
                         'fasciaBottom': bottom, 'wallTop': wall_top,
                         'width': 24, 'depth': 16, 'actualHeight': top - floor,
                         'frontage': fascia_segments, 'productBoard': {
                             'a': list(board_a), 'b': list(board_b), 'yaw': board_yaw,
                             'top': 8.85, 'perProductStandOff': True},
                         'mainScreen': {'position': [2.1, 5.15, -6.95], 'width': 10.6, 'height': 7.50},
                         'clearOverhead': 8.413, 'floorOpticsBottom': .122, 'floorOpticsTop': .136,
                         'sideOpeningsZ': [-4.0, 3.80], 'roof': 'actual open four-chord production truss'},
        'apertures': apertures, 'products': products, 'fixtures': fixtures,
        'signage': ctx['SIGNAGE'],
    }

