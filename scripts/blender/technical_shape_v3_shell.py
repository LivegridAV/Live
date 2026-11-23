"""Technical V3 reference shell, in native Three-space metres.

The driver supplies the established Blender mesh/export helpers in ``ctx``.
This module authors only the pavilion shell; the working bays, inner display
returns, reception, furniture, planting and people belong to the interior.
The new four-view reference has a straight central beam, two genuinely clear
box wings, and independent full-height outer display/branding towers.
"""


def crown_halo(mark_before, face_z, bottom, top):
    """The stall's one halo, behind the crown's grid logo and wordmark.
    Task 6's wash around the wordmark (h = its ink height): from 1.25 h
    before it to .30 h after it, from .30 h below its ink to 1.30 h above.
    It is widened to clear the logo, kept within the crown face, and laid
    4 mm off that face, behind the logo cells (about 5 cm proud of it)."""
    signs = premium_signage()
    new = [ob for ob in set(bpy.context.scene.objects) - mark_before if ob.type == 'MESH']
    word = bounds([ob for ob in new if ob.name.startswith('Premium Sign | wordmark')])
    logo = bounds([ob for ob in new if 'signal cell' in ob.name])
    h = word['max'][1] - word['min'][1]
    x0 = min(word['min'][0] - 1.25 * h, logo['min'][0] - .30 * h)
    x1 = word['max'][0] + .30 * h
    y0 = max(word['min'][1] - .30 * h, bottom + .03)
    y1 = min(word['min'][1] + 1.30 * h, top - .03)
    return signs.premium_halo((x0, y0, face_z + .004 + signs.HALO_OFFSET), x1 - x0, y1 - y0)


def build_shell_v3(ctx):
    globals().update(ctx)
    floor = float(ctx.get('F', .12))
    top = float(ctx.get('TOP', 7.50))
    beam_bottom = float(ctx.get('BEAM_BOTTOM', 5.60))
    bay_top = float(ctx.get('BAY_TOP', 5.25))
    beam_front = 6.30
    tower_front = 6.80
    tower_back = 5.30
    beam_half = 5.60
    tower_inner = 9.45
    tower_outer = 12.00
    wing_depth = 1.50
    shell_start = set(bpy.context.scene.objects)
    screen_start = len(SCREENS)

    # A restrained grey stone finish continues through the open interior.
    # The shallow plinth is the existing 24 x16 reservation, not an enlarged
    # furniture scene. Small real joints stay legible in the top reference.
    before = set(bpy.context.scene.objects)
    # The thin full-size stone cap preserves the actual 24 x16 reservation.
    # Its supporting body retreats 40mm at each edge, exposing the optical
    # strip in a real shadow reveal rather than burying it in a solid slab.
    cap_thickness = .025
    box('Technical V3 recessed mineral platform supporting body',
        (0, (floor - cap_thickness) / 2, 0),
        (23.92, floor - cap_thickness, 15.92), FLOOR, .005)
    box('Technical V3 native 24m x16m stone platform top cap',
        (0, floor - cap_thickness / 2, 0),
        (24, cap_thickness, 16), FLOOR, .003)
    grout = material('Technical | V3 neutral grey stone fine joint',
                     (.026, .029, .031), .02, .62)
    for x in range(-10, 12, 2):
        box('Technical V3 physical floor fine longitudinal joint',
            (x, floor + .001, 0), (.006, .002, 15.96), grout, 0)
    for z in range(-6, 8, 2):
        box('Technical V3 physical floor fine transverse joint',
            (0, floor + .001, z), (23.96, .002, .006), grout, 0)
    for ob in set(bpy.context.scene.objects)-before:
        if ob.type=='MESH':ob['grandSharedFloor']=True
    record('platform', before)

    before = set(bpy.context.scene.objects)
    # Low optical channels remain above the hall's shared .12m datum. The
    # authored support is hidden at runtime so its cap cannot z-fight it.
    floor_optic = material('Technical | V3 warm floor edge LED light',
                           (1.0, .79, .50), 0, .28, 4.5)
    for z in (-7.972, 7.972):
        box('Technical V3 floor continuous warm perimeter diffuser',
            (0, floor + .006, z), (23.93, .010, .040), floor_optic, .002)
        box('Technical V3 floor brushed metal shallow channel',
            (0, floor + .012, z - (.012 if z > 0 else -.012)),
            (23.95, .010, .026), SILVER, .001)
    for x in (-11.972, 11.972):
        box('Technical V3 floor continuous side perimeter diffuser',
            (x, floor + .006, 0), (.040, .010, 15.93), floor_optic, .002)
    record('platform-edge', before)

    # Only short outside returns frame the occupied open U-shaped pavilion.
    # The former continuous 11.2m side skins read as a warehouse in oblique
    # views; the open middle now reveals the room and its real depth.
    before = set(bpy.context.scene.objects)
    box('Technical V3 independent rear service boundary',
        (0, (floor + bay_top) / 2, -7.86),
        (23.70, bay_top - floor, .24), PANEL, .010)
    record('rear-boundary', before)
    for side in (-1, 1):
        before = set(bpy.context.scene.objects)
        box('Technical V3 short front exterior black return',
            (side * 11.87, (floor + beam_bottom) / 2, 4.45),
            (.24, beam_bottom - floor, 1.70), PANEL, .012)
        box('Technical V3 short rear service side cap',
            (side * 11.87, (floor + bay_top) / 2, -6.55),
            (.24, bay_top - floor, 2.50), PANEL, .012)
        # Copy belongs to the outside face of the 1.7m front return, with
        # its physical baseline centered along that actual short surface.
        yaw = side * math.pi / 2
        for i, body in enumerate(('TECHNICAL', 'CREATIVE', 'HUMAN')):
            exposed_sign(body, (side * 11.995, 4.85 - i * .48, 4.45),
                         .41, 1.50, yaw=yaw, tracking=1.04, centered=True)
        record('side-left' if side < 0 else 'side-right', before)

    # Straight, front-parallel central fascia: the prior ninety-degree
    # V/chevron is intentionally absent from this new reference shell.
    before = set(bpy.context.scene.objects)
    box('Technical V3 straight black central reference crown',
        (0, (beam_bottom + top) / 2, beam_front - wing_depth / 2),
        (beam_half * 2, top - beam_bottom, wing_depth), PANEL, .015)
    for y in (beam_bottom + .012, top - .012):
        box('Technical V3 straight central crown fine silver edge',
            (0, y, beam_front + .009), (beam_half * 2, .018, .022), SILVER, .002)
    mark_before = set(bpy.context.scene.objects)
    # The font run and emblem have independent native proportions. The
    # rejected first pass made the emblem dominate a small wordmark; the
    # reference has a broad headline and a nearly matching emblem height.
    mark = wordmark((0, 0, 0), 1.12, word_scale=1.50,
                    icon_scale=1.05, gap=.045)
    # A premium lockup stands where today's did: centre on today's bounds.
    mark_bounds = mark.get('flat_bounds') or bounds(set(bpy.context.scene.objects) - mark_before)
    mark_mid_x = (mark_bounds['min'][0] + mark_bounds['max'][0]) / 2
    mark_mid_y = (mark_bounds['min'][1] + mark_bounds['max'][1]) / 2
    mark.location = xyz((-mark_mid_x, beam_bottom + 1.25 - mark_mid_y,
                         beam_front + .065))
    if mark.get('flat_bounds'):
        crown_halo(mark_before, beam_front, beam_bottom, top)
    exposed_sign('PEOPLE  TECHNOLOGY  EXTRAORDINARY EVENTS',
                 (0, beam_bottom + .27, beam_front + .075), .45,
                 9.80, centered=True, tracking=1.07)
    record('fascia-brand', before, True)

    # Each wing is a real closed 40mm-sheet box with front, back, top,
    # bottom and end sheets. The room/hall remains visible through it.
    # Delicate rods describe the internal joinery seen in all four views.
    for side in (-1, 1):
        before = set(bpy.context.scene.objects)
        x0, x1 = (beam_half, tower_inner) if side > 0 else (-tower_inner, -beam_half)
        cx = (x0 + x1) / 2
        width = x1 - x0
        front, back = beam_front, beam_front - wing_depth
        h = top - beam_bottom
        sheet = .035
        for z in (front, back):
            box('Technical V3 clear acrylic wing upright sheet',
                (cx, (beam_bottom + top) / 2, z - sheet / 2),
                (width, h, sheet), ACRYLIC, .002)
        for y in (beam_bottom, top - sheet):
            box('Technical V3 clear acrylic wing horizontal sheet',
                (cx, y + sheet / 2, (front + back) / 2),
                (width, sheet, wing_depth), ACRYLIC, .002)
        for x in (x0 + sheet / 2, x1 - sheet / 2):
            box('Technical V3 clear acrylic wing closed end sheet',
                (x, (beam_bottom + top) / 2, (front + back) / 2),
                (sheet, h, wing_depth), ACRYLIC, .002)
        for z in (front + .008, back):
            for y in (beam_bottom + .015, top - .015):
                rod('Technical V3 acrylic wing continuous satin edge',
                    (x0 + .015, y, z), (x1 - .015, y, z), .014, SILVER, 10)
                rod('Technical V3 acrylic wing optical edge light',
                    (x0 + .025, y, z + .018), (x1 - .025, y, z + .018),
                    .0075, NEUTRAL_COVE, 10)
            for x in (x0 + .015, x1 - .015):
                rod('Technical V3 clear wing upright silver edge',
                    (x, beam_bottom + .015, z), (x, top - .015, z),
                    .014, SILVER, 10)
                rod('Technical V3 clear wing upright optical edge',
                    (x, beam_bottom + .025, z + .018), (x, top - .025, z + .018),
                    .0075, NEUTRAL_COVE, 10)
            # Reference joinery: a restrained rectilinear grid and two
            # diagonal struts. These are structural rods, not opaque decals.
            for t in (1 / 3, 2 / 3):
                x = x0 + width * t
                rod('Technical V3 clear wing fine vertical grid',
                    (x, beam_bottom + .025, z - .018),
                    (x, top - .025, z - .018), .0065, SILVER, 8)
            y = beam_bottom + h * .50
            rod('Technical V3 clear wing fine horizontal grid',
                (x0 + .025, y, z - .018), (x1 - .025, y, z - .018),
                .0065, SILVER, 8)
            rod('Technical V3 clear wing slender diagonal one',
                (x0 + .025, top - .025, z - .024),
                (x1 - .025, beam_bottom + .025, z - .024), .006, SILVER, 8)
        for x in (x0 + .015, x1 - .015):
            for y in (beam_bottom + .015, top - .015):
                rod('Technical V3 clear wing real depth rail',
                    (x, y, back), (x, y, front), .012, SILVER, 10)
        record('fascia-clear-left' if side < 0 else 'fascia-clear-right',
               before, True)

    # Towers are independent architectural columns, not hanging pillars.
    # Continuous ribbon media has a separate dark upper branding blade,
    # matching the reference's gold/silver lower field and legible top copy.
    tower_meta = []
    for side in (-1, 1):
        before = set(bpy.context.scene.objects)
        label = 'left' if side < 0 else 'right'
        cx = side * (tower_inner + tower_outer) / 2
        tw = tower_outer - tower_inner
        box('Technical V3 ' + label + ' full-height architectural LED tower',
            (cx-side*.025, (floor + top) / 2, (tower_front + tower_back) / 2),
            (tw-.05, top - floor, tower_front - tower_back), PANEL, .010)
        aperture('tech-tower-' + label + '-front',
                 (cx, (floor + top) / 2, tower_front + .008),
                 tw - .10, top - floor - .10, 'tech-tower-ribbon', frame=.018)
        # The reference's ribbon also returns around each outside corner.
        # Recess the structural skin to keep the complete emitting side and
        # its cabinet within the original 24 m platform reservation.
        aperture('tech-tower-' + label + '-outer-return',
                 (side*11.96, (floor+top)/2, (tower_front+tower_back)/2),
                 tower_front-tower_back-.10, top-floor-.10,
                 'tech-tower-ribbon', yaw=side*math.pi/2, frame=.018)
        # The black inset sits physically in front of the emitter, with its
        # inner side aligned to the tower's inside jamb. Full bottom ribbon
        # width remains visible, just as on the new four-view board.
        blade_w = 1.60
        blade_x = side * (tower_inner + blade_w / 2 + .035)
        blade_bottom = floor + (top - floor) * .43
        blade_z = tower_front + .052
        box('Technical V3 ' + label + ' raised black upper branding inset',
            (blade_x, (blade_bottom + top - .045) / 2, blade_z),
            (blade_w, top - .045 - blade_bottom, .058), STEEL, .006)
        # Fit the physical lockup to the narrow blade without distorting
        # glyphs or the separate blue faceted emblem.
        # The fit comes from today's flat lockup, and the (premium) wordmark
        # is built at that fit, so its depth follows its final letter height.
        wb = measure_flat_wordmark(.285, False, 1.18, 1.05)[2]
        fit = min(1.50, (blade_w - .10) / (wb['max'][0] - wb['min'][0]))
        wm = wordmark((0, 0, 0), .285, word_scale=1.18,
                      icon_scale=1.05, with_emblem=False, scale=fit)
        wm.location = xyz((blade_x - fit * (wb['min'][0] + wb['max'][0]) / 2,
                           top - 1.25, blade_z + .042))
        emblem((blade_x, top - .65, blade_z + .042), .25)
        bodies = ('BIGGER', 'BRIGHTER', 'BOLDER', 'TOGETHER') if side < 0 else ('FROM', 'VISION', 'TO LIVE')
        for i, body in enumerate(bodies):
            exposed_sign(body, (blade_x - blade_w * .44,
                                top - 1.78 - i * .46, blade_z + .044),
                         .37, blade_w * .92, tracking=1.025)
        exposed_sign('—', (blade_x - blade_w * .37,
                           top - 1.78 - len(bodies) * .46 - .07, blade_z + .044),
                     .23, blade_w * .50)
        # Solid side and back skins close the cabinet in oblique views.
        # A slim cool light belongs to the inset joint, warm light to foot.
        for x in (cx - tw / 2 + .016, cx + tw / 2 - .016):
            rod('Technical V3 tower full-height champagne optical seam',
                (x, floor + .025, tower_front + .021),
                (x, top - .025, tower_front + .021), .008, WHITE_COVE, 10)
        box('Technical V3 tower warm bottom diffuser',
            (cx, floor + .022, tower_front + .018),
            (tw - .04, .018, .024), WHITE_COVE, .002)
        record('tower-' + label, before)
        tower_meta.append({'id': label, 'center': [cx, (floor + top) / 2, (tower_front + tower_back) / 2],
                           'width': tw, 'height': top - floor, 'depth': tower_front - tower_back,
                           'frontZ': tower_front, 'brandingInset': {'x': blade_x, 'width': blade_w,
                           'bottom': blade_bottom, 'top': top - .045}})

    # A shallow glazed/ribbed canopy replaces the rejected airport-like
    # full white slab. The main field is dark acoustic metal, with real
    # clear perimeter cassettes, slender reflective ribs and warm reveals.
    before = set(bpy.context.scene.objects)
    canopy_front_y = beam_bottom - .055
    canopy_back_y = bay_top + .085
    canopy_front_z = beam_front - .04
    canopy_back_z = -5.85
    def soffit_y(z):
        t = (canopy_front_z - z) / (canopy_front_z - canopy_back_z)
        return canopy_front_y + (canopy_back_y - canopy_front_y) * t
    def cassette(name, xa, xb, za, zb, finish, thickness=.04, lift=0):
        return roof_quad(name,
                         [(xa, soffit_y(za) + lift, za),
                          (xb, soffit_y(za) + lift, za),
                          (xb, soffit_y(zb) + lift, zb),
                          (xa, soffit_y(zb) + lift, zb)],
                         finish, thickness=thickness)

    # Opaque central service cassette: charcoal rather than emissive white.
    # Its narrow polished borders articulate the reference's layered roof.
    cassette('Technical V3 central dark acoustic ceiling field',
             -5.60, 5.60, canopy_front_z, canopy_back_z, ROOF, .085)
    for side in (-1, 1):
        xa, xb = (5.60, tower_inner) if side > 0 else (-tower_inner, -5.60)
        # Glazed bays below each transmitted crown wing continue in depth,
        # with real dark cassettes between them rather than a milky slab.
        for za, zb, finish, name in (
            (canopy_front_z, 4.85, ACRYLIC, 'front clear underside cassette'),
            (4.85, 2.75, ROOF, 'dark ceiling open inset'),
            (2.75, .40, ACRYLIC, 'middle clear ceiling cassette'),
            (.40, -1.85, ROOF, 'dark ceiling open inset'),
            (-1.85, -4.10, ACRYLIC, 'rear clear ceiling cassette'),
            (-4.10, canopy_back_z, ROOF, 'rear dark acoustic inset'),
        ):
            cassette('Technical V3 ' + name, xa, xb, za, zb,
                     finish, .035 if finish == ACRYLIC else .085)

    # Slim pale borders remain reflective joinery. There is no continuous
    # bright white surface beyond these measured 8–12cm ribs.
    for x in (-9.40, -5.60, -3.20, 3.20, 5.60, 9.40):
        cassette('Technical V3 slender silver longitudinal roof rib',
                 x - .045, x + .045, canopy_front_z, canopy_back_z,
                 SILVER, .045, -.020)
    for z in (canopy_front_z - .045, 4.85, 2.75, .40, -1.85, -4.10,
              canopy_back_z + .045):
        cassette('Technical V3 slender pearl transverse roof rib',
                 -tower_inner, tower_inner, z + .045, z - .045,
                 CANOPY_PEARL, .045, -.022)
    # Two reflective champagne strips frame the center opening. Their
    # warm fine diffusers are recessed alongside the actual rib surfaces.
    for x in (-5.53, 5.53):
        rod('Technical V3 central opening warm recessed reveal',
            (x, canopy_front_y - .032, canopy_front_z),
            (x, canopy_back_y - .032, canopy_back_z), .009, WHITE_COVE, 10)
    # Warm channels frame all ceiling edges and wash the rear headers.
    for x in (-tower_inner + .05, tower_inner - .05):
        rod('Technical V3 concealed ceiling side channel',
            (x, canopy_front_y - .022, canopy_front_z),
            (x, canopy_back_y - .022, canopy_back_z), .014, WHITE_COVE, 12)
    for z in (canopy_front_z, canopy_back_z + .035):
        rod('Technical V3 concealed ceiling transverse warm strip',
            (-tower_inner + .04, soffit_y(z) - .022, z),
            (tower_inner - .04, soffit_y(z) - .022, z), .014, WHITE_COVE, 12)
    for z in (4.7, 1.5, -1.7, -4.6):
        for x in (-8.3, -5.0, -1.65, 1.65, 5.0, 8.3):
            y = soffit_y(z)
            rod('Technical V3 flush recessed charcoal downlight housing',
                (x, y + .018, z), (x, y - .027, z), .060, EQUIPMENT, 16)
            rod('Technical V3 warm downlight recessed optical lens',
                (x, y - .030, z), (x, y - .034, z), .044, LENS, 16)
    record('ceiling', before, True)

    # The reference's AV glyph run is cyan while the geometric emblem keeps
    # its separate ice-blue/silver facets. Use a semantic material only on
    # glyph meshes authored by this module; never recolour all BLUE_LIGHT
    # users, since that shared material also belongs to emblem facets.
    cyan_av = material('Technical | V3 cyan AV letters',
                       (.006, .42, .70), .10, .34, .20)
    # A premium wordmark's AV keeps its aqua lit face.
    shell_objects = set(bpy.context.scene.objects) - shell_start
    for ob in shell_objects:
        if ob.type == 'MESH' and ob.get('signage_body') == 'AV' and not keep_premium_av(ob):
            if ob.data.materials:
                ob.data.materials[0] = cyan_av
            else:
                ob.data.materials.append(cyan_av)

    return {
        'objects': shell_objects,
        'architecture': {
            'reference': 'LivegridAV Exhibition Booth Views.png',
            'nativeFootprint': {'width': 24, 'depth': 16},
            'actualFasciaTop': top, 'actualArchitectureHeight': top - floor,
            'floor': floor, 'frontZ': beam_front, 'towerFrontZ': tower_front,
            'platformReveal': {'fullSizeTop': [24, 16], 'capThickness': cap_thickness,
                               'bodySize': [23.92, 15.92], 'edgeRetreat': .04,
                               'stripCenterY': floor + .006, 'stripCenterXZ': [11.972, 7.972]},
            'outsideSideReturns': {'frontZ': [3.60, 5.30], 'rearZ': [-7.80, -5.30],
                                   'openMiddleZ': [-5.30, 3.60], 'wallX': [-11.87, 11.87]},
            'centerFascia': {'planEnds': [[-beam_half, beam_front], [beam_half, beam_front]],
                             'bottom': beam_bottom, 'top': top, 'depth': wing_depth,
                             'straight': True},
            'clearWings': {'left': [-tower_inner, -beam_half],
                           'right': [beam_half, tower_inner], 'depth': wing_depth,
                           'bottom': beam_bottom, 'top': top, 'sheetThickness': .035},
            'towers': tower_meta,
            'canopy': {'frontUnderside': canopy_front_y, 'rearUnderside': canopy_back_y,
                       'frontZ': canopy_front_z, 'rearZ': canopy_back_z,
                       'downlightCount': 24, 'thickness': .085},
            'shellApertures': [s['id'] for s in SCREENS[screen_start:]],
            'rearBayTop': bay_top,
        },
    }
