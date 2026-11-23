"""Reference-specific working interior for the third technical pavilion.

The driver supplies the established Blender mesh helpers and material objects.
All coordinates are native metres in the website's X/right, Y/up, Z/front frame.
This module deliberately owns neither the shell nor the visitor asset export.
"""


def build_interior_v3(ctx: dict):
    globals().update(ctx)
    global BAYS
    BAYS = []
    start = set(bpy.context.scene.objects)
    operator_seats, furniture, reception_staff = [], [], []
    wall_top = float(ctx.get('BAY_TOP', 5.25))
    worktop = 1.10
    leaf_finishes = [material('Technical | V3 broad emerald leaf', (.075, .135, .018), 0, .76),
                     material('Technical | V3 broad yellow green leaf', (.12, .19, .028), 0, .74),
                     material('Technical | V3 broad deep green leaf', (.028, .070, .009), 0, .81)]
    reception_wing = material('Technical | V3 pearl frosted reception metal', (.52, .56, .59), .25, .32)

    def describe(role, before, **metadata):
        owned = record(role, before)
        entry = {'role': role, 'bounds': bounds(owned), **metadata}
        furniture.append(entry)
        return owned

    def positioned_apertures(first, cx, cz, yaw):
        co, si = math.cos(yaw), math.sin(yaw)
        for screen in SCREENS[first:]:
            xx, yy, zz = screen['p']
            p = [cx + co * xx + si * zz, yy, cz - si * xx + co * zz]
            screen.update(p=p, position=p, x=p[0], y=p[1], z=p[2])
            screen['rotation'][1] += yaw

    def in_bay(x, z, cx, cz, yaw):
        co, si = math.cos(yaw), math.sin(yaw)
        return [cx + co * x + si * z, F, cz - si * x + co * z]

    def plant(x, z, seed, size=1, base_y=F, pot='round', spread=1):
        """Spun metal pot and individually folded, non-identical broad leaves."""
        rng = random.Random(seed)
        tall = base_y <= F + .001
        pot_top = .84 if tall else .60
        pot_radius = .36 if tall else .315
        if pot == 'square':
            soft_box('Technical square black satin planter',
                     (x, base_y + pot_top * size / 2, z),
                     ((.76 if tall else .62) * size, pot_top * size, (.76 if tall else .62) * size), STEEL, .025)
            box('Technical planter open soil surface',
                (x, base_y + (pot_top - .018) * size, z),
                ((.68 if tall else .54) * size, .014, (.68 if tall else .54) * size), TIMBER, .012)
        else:
            lathe('Technical spun black metal open-rim planter', x, z,
                  [((pot_radius - .065) * size, base_y + .018),
                   ((pot_radius - .018) * size, base_y + .05 * size),
                   (pot_radius * size, base_y + (pot_top - .03) * size),
                   ((pot_radius - .005) * size, base_y + pot_top * size),
                   ((pot_radius - .030) * size, base_y + pot_top * size),
                   ((pot_radius - .035) * size, base_y + (pot_top - .04) * size),
                   ((pot_radius - .050) * size, base_y + .10 * size)], STEEL, 32)
            disk('Technical planter recessed dark soil', x, z, (pot_radius - .040) * size,
                 base_y + (pot_top - .055) * size, base_y + (pot_top - .045) * size, TIMBER)
        vertices, faces, finish_indices = [], [], []
        for leaf_index in range(48 if tall else 32):
            angle = leaf_index * 2.39996 + rng.uniform(-.20, .20)
            reach = rng.uniform(.50 if tall else .41, .80 if tall else .70) * size * spread
            rise = rng.uniform(.70 if tall else .46, 1.60 if tall else 1.18) * size
            base = Vector((x + rng.uniform(-.08, .08) * size,
                           base_y + (.73 if tall else .50) * size, z + rng.uniform(-.08, .08) * size))
            elbow = base + Vector((math.cos(angle) * reach * .35, rise * (.82 if tall else .76),
                                   math.sin(angle) * reach * .35))
            tip = base + Vector((math.cos(angle) * reach, rise * (.72 if tall else .69),
                                 math.sin(angle) * reach))
            leaf_start = base.lerp(elbow, .40)
            sweep('Technical natural bent green petiole',
                  [(base, .007 * size), (elbow, .0045 * size), (tip, .0015 * size)], leaf_finishes[2], 5)
            transverse = Vector((-math.sin(angle), .12, math.cos(angle)))
            begin = len(vertices)
            steps = 8
            for j in range(steps + 1):
                t = j / steps
                center = ((1 - t) ** 2 * leaf_start + 2 * (1 - t) * t * elbow + t * t * tip)
                half_width = math.sin(math.pi * t) ** .75 * rng.uniform(.11 if tall else .080, .18 if tall else .125) * size
                ridge = center + Vector((0, .022 * size * math.sin(math.pi * t), 0))
                vertices.extend((tuple(center - transverse * half_width), tuple(ridge),
                                 tuple(center + transverse * half_width)))
            for j in range(steps):
                a = begin + j * 3
                faces.extend(((a, a + 3, a + 4, a + 1), (a + 1, a + 4, a + 5, a + 2)))
                finish_indices.extend((rng.randrange(3), rng.randrange(3)))
        leaves = patch_mesh('Technical lush individually folded broad green leaves', vertices, faces, leaf_finishes[0])
        for mat in leaf_finishes[1:]:
            leaves.data.materials.append(mat)
        for polygon, index in zip(leaves.data.polygons, finish_indices):
            polygon.material_index = index
        return leaves

    # A shallow three-facet working wall, seen clearly in the supplied plan.
    # Each console is a human-height desk with actual open knee spaces.
    bay_specs = (
        ('av', (-9.8, -4.4), (-3.2, -5.8), 'AV ENGINEERING',
         'DESIGN | INTEGRATE | DELIVER', 'tech-engineering', 'tech-workstation-av'),
        ('show', (-3.2, -5.8), (3.2, -5.8), 'SHOW CONTROL',
         'CUES | TIMELINES | AUTOMATION', 'tech-show-control', 'tech-workstation-cues'),
        ('live', (3.2, -5.8), (9.8, -4.4), 'LIVE PRODUCTION',
         'CAPTURE | SWITCH | STREAM | DELIVER', 'tech-live-production', 'tech-workstation-production'),
    )
    for index, (bay_id, a, b, title, subtitle, hint, work_hint) in enumerate(bay_specs):
        before = set(bpy.context.scene.objects)
        first = len(SCREENS)
        width, yaw, mid = line_frame(a, b)
        cx, cz = mid
        desk_width = width - .18
        box('Technical ' + bay_id + ' full faceted charcoal panel',
            (0, (F + wall_top) / 2, -.15), (width, wall_top - F, .27), PANEL, .014)
        box('Technical ' + bay_id + ' precisely aligned black header',
            (0, wall_top - .355, .020), (width - .09, .71, .13), STEEL, .014)
        header_y = wall_top - .45
        subtitle_y = wall_top - .66
        sign(title, (-width / 2 + .25, header_y, .102), .90, width - .50, slogan=False)
        sign(subtitle, (-width / 2 + .25, subtitle_y, .107), .30, width - .50, tracking=1.035)
        screen_w = min(5.80 if index != 1 else 5.60, width - .68)
        screen_h = screen_w * 9 / 16
        # Keep the full cabinet/frame below the physical header, not only the
        # emitting face: its outer top sits 45 mm above this aperture edge.
        screen_top = min(6.40, wall_top - .78)
        aperture(('av-drafting', 'show-cues', 'live-multiview')[index],
                 (0, screen_top - screen_h / 2, .035), screen_w, screen_h, hint, frame=.027)

        desk_z = 1.60
        box('Technical ' + bay_id + ' continuous champagne worktop',
            (0, worktop - .032, desk_z), (desk_width, .064, 1.16), SILVER, .015)
        box('Technical ' + bay_id + ' recessed rear cable duct',
            (0, worktop - .16, desk_z - .39), (desk_width - .10, .22, .16), EQUIPMENT, .010)
        for px in (-desk_width / 2 + .17, -1.0, 1.0, desk_width / 2 - .17):
            box('Technical workstation narrow storage pedestal',
                (px, F + .45, desk_z), (.31, .90, .94), COUNTER_SILVER, .018)
            box('Technical pedestal fine black pull',
                (px, F + .77, desk_z + .478), (.18, .016, .016), EQUIPMENT, .003)
            box('Technical separate storage plinth',
                (px, F + .055, desk_z), (.27, .11, .86), EQUIPMENT, .010)
        box('Technical ' + bay_id + ' continuous warm console underlight',
            (0, F + .037, desk_z + .47), (desk_width - .08, .015, .016), WHITE_COVE, .003)
        # Six real monitor heads in AV/live; the cue desk uses three wider heads.
        monitor_xs = (-1.95, 0, 1.95) if bay_id == 'show' else (-2.50, -1.50, -.50, .50, 1.50, 2.50)
        for j, dx in enumerate(monitor_xs):
            mw = 1.28 if bay_id == 'show' else .88
            monitor(bay_id + '-monitor-' + str(j), dx, 1.51, desk_z - .21,
                    mw, mw * 9 / 16, work_hint)
        for j, dx in enumerate((-2.0, 0, 2.0)):
            if bay_id != 'show' or j != 1:
                keyboard(dx, worktop + .025, desk_z + .36, .72)
            # Recessed oval cable entry and a separate illuminated port legend.
            disk('Technical workstation inset cable entry', dx + .40, desk_z - .39,
                 .042, worktop + .001, worktop + .006, EQUIPMENT)
            box('Technical individual cable port silver collar',
                (dx + .40, worktop + .004, desk_z - .39), (.10, .006, .07), SILVER, .008)
            box('Technical cable pass-through dark slot',
                (dx + .40, worktop + .009, desk_z - .39), (.078, .005, .032), EQUIPMENT, .007)
        if bay_id == 'show':
            console(0, worktop + .012, desk_z + .29)
        elif bay_id == 'live':
            console(-1.15, worktop + .012, desk_z + .29)
            console(1.15, worktop + .012, desk_z + .29)
        else:
            box('Engineering compact tactile CAD control tablet',
                (0, worktop + .035, desk_z + .34), (.49, .05, .32), EQUIPMENT, .018)
            for dx in (-.17, -.055, .055, .17):
                rod('Engineering CAD tablet individual rotary control',
                    (dx, worktop + .056, desk_z + .34),
                    (dx, worktop + .080, desk_z + .34), .025, SILVER, 12)
        # Service rack lies beside the last occupied knee bay, behind the front.
        rack_before = set(bpy.context.scene.objects)
        rack(-desk_width / 2 + .37, desk_z - .67)
        lift_native(rack_before)
        seat_z = 3.03
        for j, dx in enumerate((-2.0, 0, 2.0)):
            seat_before = set(bpy.context.scene.objects)
            operator_chair(dx, seat_z, math.pi)
            lift_native(seat_before)
            p = in_bay(dx, seat_z, cx, cz, yaw)
            operator_seats.append({'id': bay_id + '-operator-' + str(j), 'bay': bay_id,
                                   'position': p, 'yaw': yaw + math.pi,
                                   'seatHeight': F + .74, 'frontDirection': [math.sin(yaw + math.pi), 0, math.cos(yaw + math.pi)]})
        group('Technical ' + bay_id + ' complete native working bay', before, (cx, 0, cz), yaw)
        positioned_apertures(first, cx, cz, yaw)
        describe('bay-' + bay_id, before, worktopY=worktop, operatorCount=3)
        BAYS.append({'id': bay_id, 'center': cx, 'z': cz, 'yaw': yaw, 'planEnds': [list(a), list(b)],
                     'width': width, 'top': wall_top, 'headerBaseline': header_y,
                     'subtitleBaseline': subtitle_y, 'mainScreenAspect': 16 / 9,
                     'screenWidth': screen_w, 'screenHeight': screen_h,
                     'screenTop': screen_top, 'screenBottom': screen_top - screen_h,
                     'worktopY': worktop, 'operatorCount': 3, 'monitorCount': len(monitor_xs),
                     'soffitGap': 0})

    # Short angled returns frame the rear working bays. Their screen faces
    # remain visible from the front; the foreground lounges stay openly exposed
    # to the hall rather than being enclosed by long, nearly edge-on side walls.
    for side in (-1, 1):
        before = set(bpy.context.scene.objects)
        first = len(SCREENS)
        a, b = ((-11.20, -2.10), (-9.80, -4.40)) if side < 0 else ((9.80, -4.40), (11.20, -2.10))
        length, yaw, mid = line_frame(a, b)
        box('Technical inner return occupied display wall',
            (0, (F + wall_top) / 2, -.10), (length, wall_top - F, .20), PANEL, .012)
        first_u = 0
        for row in range(4):
            yy = 4.49 - row * .99
            aperture(('left' if side < 0 else 'right') + '-return-multiview-' + str(row),
                     (first_u, yy, .055), 1.56, .878, 'tech-concert', frame=.023)
        for yy in (F + .03, wall_top - .04):
            rod('Technical occupied return warm narrow reveal',
                (-length / 2, yy, .035), (length / 2, yy, .035), .008, WHITE_COVE, 8)
        group('Technical ' + ('left' if side < 0 else 'right') + ' inset screen return',
              before, (mid[0], 0, mid[1]), yaw)
        positioned_apertures(first, mid[0], mid[1], yaw)
        describe('display-return-' + ('left' if side < 0 else 'right'), before,
                 planEnds=[list(a), list(b)], length=length, yaw=yaw,
                 screenCount=4, screenWidth=1.56, screenHeight=.878)

    # The central front counter is an actual metal/frosted assembly. Its black
    # trapezoid meets the pale wings along illuminated diagonal miter lines.
    before = set(bpy.context.scene.objects)
    cz, half_w = 5.60, 3.20
    face_z = cz + .566
    soft_box('Technical centered reception satin dark carcass',
             (0, F + .49, cz), (6.40, .98, 1.12), COUNTER_SILVER, .035)
    soft_box('Technical reception continuous pearl worktop',
             (0, 1.142, cz), (6.44, .054, 1.18), SILVER, .018)
    box('Technical reception recessed black base',
        (0, F + .045, cz), (6.14, .090, .99), EQUIPMENT, .010)
    low, high, inner = F + .12, 1.105, 1.91
    patch_mesh('Technical central black trapezoid reception face',
               [(-half_w + .06, low, face_z), (-inner, high, face_z),
                (inner, high, face_z), (half_w - .06, low, face_z)], [(3, 2, 1, 0)], COUNTER_FACE)
    for side in (-1, 1):
        patch_mesh('Technical frosted metal triangular reception wing',
                   [(side * (half_w - .04), low, face_z + .008),
                    (side * inner, high, face_z + .008),
                    (side * (half_w - .04), high, face_z + .008)],
                   [(2, 1, 0)] if side > 0 else [(0, 1, 2)], reception_wing)
        rod('Technical reception diagonal warm knife-edge detail',
            (side * (half_w - .04), low, face_z + .018),
            (side * inner, high, face_z + .018), .019, WHITE_COVE, 10)
        rod('Technical reception vertical frosted white edge',
            (side * half_w, F + .11, face_z + .004),
            (side * half_w, 1.105, face_z + .004), .015, NEUTRAL_COVE, 10)
    box('Technical reception uninterrupted warm floating toe',
        (0, F + .075, face_z + .008), (6.34, .031, .028), WHITE_COVE, .003)
    box('Technical reception white thin upper fascia seam',
        (0, 1.117, face_z + .008), (6.34, .020, .021), NEUTRAL_COVE, .002)
    brand_before = set(bpy.context.scene.objects)
    brand_root = wordmark((0, .734, face_z + .025), .46, icon_scale=.88, gap=.035)
    # A premium lockup keeps today's centring: its root carries today's bounds
    # (wordmark frame; the root's x is 0, so x is unchanged).
    brand_bounds = brand_root.get('flat_bounds') or bounds(set(bpy.context.scene.objects) - brand_before)
    brand_root.location.x -= (brand_bounds['min'][0] + brand_bounds['max'][0]) / 2
    sign('EVENT TECHNOLOGY', (0, .465, face_z + .025), .30, 3.25, tracking=1.08, centered=True)
    sign('FOR A BRIGHTER TOMORROW', (0, .282, face_z + .025), .29, 3.65, tracking=1.04, centered=True)
    for j, x in enumerate((-1.46, 1.45)):
        laptop('technical-reception-laptop-' + str(j), x, 1.177, cz - .02)
        SCREENS[-1]['mediaHint'] = 'tech-workstation-cues'
    for j, x in enumerate((-2.61, 2.61)):
        plant(x, cz, 1200 + j, .52, 1.17)
    for x in (-.65, .65):
        drinking_glass(x, 1.177, cz + .22, mat=CLEAR_GLASS)
    box('Technical reception neatly stacked ivory brochures',
        (.26, 1.182, cz + .10), (.28, .023, .19), SMALL_LABEL, .004)
    describe('reception', before, width=6.40, depth=1.12, top=1.169, centered=True,
             frontDesign='Black trapezoid with real silver triangular wings and warm miter edges')
    reception_staff.extend(({'position': [-1.40, F, 4.62], 'turn': 0, 'female': True},
                            {'position': [1.40, F, 4.62], 'turn': 0, 'female': False}))

    # Bilateral lounge islands: native-size loose upholstery, circular dark
    # rugs, low black tables, small plant vessels and glasses.
    for side in (-1, 1):
        before = set(bpy.context.scene.objects)
        cx, rug_z = side * 7.77, 4.12
        disk('Technical circular charcoal woven lounge rug', cx, rug_z, 2.05, F + .004, F + .014, RUG)
        seats = set(bpy.context.scene.objects)
        sofa(cx, 3.70, 2.55, 0)
        arm = technical_armchair(cx + side * 1.20, 5.00)
        # Armchair's open face turns toward the center of its conversation rug.
        arm.rotation_euler[2] = -side * math.pi / 2
        lift_native(seats)
        table_x, table_z = cx - side * .30, 5.10
        disk('Technical low dark circular coffee tabletop', table_x, table_z,
             .62, F + .465, F + .510, STEEL)
        disk('Technical recessed round coffee table foot', table_x, table_z,
             .36, F + .025, F + .070, EQUIPMENT)
        rod('Technical coffee table brushed central support',
            (table_x, F + .065, table_z), (table_x, F + .47, table_z), .055, SILVER, 16)
        plant(table_x - .12, table_z - .10, 1500 + side, .24, F + .516)
        drinking_glass(table_x + .26, F + .516, table_z + .12, mat=CLEAR_GLASS)
        soft_box('Technical lounge closed premium brochure',
                 (table_x + .18, F + .528, table_z - .24), (.25, .023, .18), SMALL_LABEL, .004)
        # Low front tablet plaques visible in the supplied plan and side views.
        plaque_x, plaque_z = cx, 6.30
        soft_box('Technical low lounge brand tablet',
                 (plaque_x, F + .22, plaque_z), (2.40, .44, .10), PANEL, .014)
        wordmark((plaque_x - .76, F + .20, plaque_z + .06), .23, icon_scale=.88)
        box('Technical lounge tablet warm grounded edge',
            (plaque_x, F + .015, plaque_z + .065), (2.36, .014, .012), WHITE_COVE, .002)
        describe('lounge-left' if side < 0 else 'lounge-right', before,
                 rugCenter=[cx, F, rug_z], rugRadius=2.05, sofaWidth=2.55,
                 nativeSeatY=F + .495, armchairs=1)

    # Plants occupy both front ends and the service-bay breaks. They are real
    # folded foliage meshes with natural green variation and open metal pots.
    planting_positions = ((-8.55, 2.40, 1.12), (8.55, 2.40, 1.12),
                          (-8.70, -1.08, .98), (8.70, -1.08, .98),
                          (-3.34, -5.15, .88), (3.34, -5.15, .88))
    for i, (x, z, scale) in enumerate(planting_positions):
        before = set(bpy.context.scene.objects)
        plant(x, z, 1700 + i, scale, F, 'square' if i < 2 else 'round', spread=.75 if i > 3 else 1)
        describe('planting', before, position=[x, F, z], naturalLeafCount=48)

    return {'objects': set(bpy.context.scene.objects) - start, 'bays': BAYS,
            'furniture': furniture, 'operatorSeats': operator_seats,
            'receptionStaff': reception_staff,
            'reception': {'center': [0, F, 5.60], 'width': 6.40, 'depth': 1.12,
                          'top': 1.169, 'frontZ': 6.166},
            'route': {'width': 2, 'centerline': [[-4.65, F, 8], [-4.65, F, 3], [-3.0, F, 0]],
                      'counterLeft': -3.20, 'loungeInnerExtent': -6.0},
            'notes': ['All furniture and equipment remain native human scale.',
                      'Nine real operator stools, fifteen physical monitor heads and three independent control bays.',
                      'Visitors are exported independently by the driver using operator-seat and staff placement metadata.']}
