"""Reference-led projection pavilion shell, constructed without exporting.

The caller supplies the constructor namespace from the safe prefix of
rebuild_projection_mapping_stall_v12.py. All authoring coordinates are native
Three XYZ metres, +Z toward the visitor. Earlier assets are never imported or
overwritten here. Dimensions are a reconstruction from the supplied images,
not recovered fabrication/CAD measurements.
"""
import math


def build_projection_finish_v2_shell(ctx):
    bpy = ctx['bpy']
    Vector, Matrix = ctx['Vector'], ctx['Matrix']
    material = ctx['material']
    floor = ctx.get('PROJECTION_CFG', {}).get('floor', .12)
    top = ctx.get('PROJECTION_CFG', {}).get('fasciaTop', 12.821)
    prefix = 'Projection Finish V2 | '
    start = set(bpy.context.scene.objects)
    screens, projectors, typography, glyph_objects, fixtures, optical_paths = [], [], [], [], [], []
    # Existing reusable constructor functions deliberately share this isolated
    # namespace. Reset only their output metadata, never the Blender scene.
    ctx.update(PREFIX=prefix, FLOOR_TOP=floor, SCREENS=screens,
               PROJECTORS=projectors, SIGNAGE=typography,
               SIGNAGE_OBJECTS=glyph_objects, LIGHT_POINTS=fixtures)
    mats = {
        'black': material(prefix+'satin black curved fascia', (.006, .008, .010), .28, .36),
        'wall': material(prefix+'matte black architectural wall', (.004, .0055, .007), .04, .74),
        'gallery': material(prefix+'matte black gallery backing', (.005, .0065, .008), .07, .66),
        'gold': material(prefix+'satin champagne metal returns', (.39, .31, .215), .82, .29),
        'arch_face': material(prefix+'milled champagne tapered arch front edge', (.37, .285, .175), .87, .28),
        'arch_depth': material(prefix+'smoked bronze recessed arch soffit', (.105, .078, .046), .82, .35),
        'structure': material(prefix+'charcoal structural arch depth', (.004, .0055, .007), .20, .47),
        'green': material(prefix+'sculpted deep green metallic accent', (.003, .105, .065), .58, .29),
        'flute': material(prefix+'fluted charcoal anodized wall field', (.008, .010, .012), .36, .43),
        'rib': material(prefix+'satin graphite raised flute edge', (.014, .017, .020), .40, .37),
        'channel': material(prefix+'dark recessed optical channel', (.0015, .002, .0025), .14, .52),
        'warm': material(prefix+'warm pearl concealed LED', (1., .80, .59), 0, .35, 2.0),
        'teal': material(prefix+'concealed thin teal LED reveal', (.004, .47, .33), 0, .35, 1.65),
        'mint': material(prefix+'mint cyan illuminated emblem', (.003, .42, .28), .06, .35, 1.1),
        'brand': material(prefix+'clean ivory brand lettering', (.86, .90, .91), 0, .60, .10),
        'optic': material(prefix+'warm recessed downlight optic', (1., .85, .68), 0, .28, 2.4),
    }
    ctx.update(FASCIA=mats['black'], REAR_BLACK=mats['wall'],
               GALLERY_CASE=mats['gallery'], CHAMPAGNE=mats['gold'],
               ARCH_FACE=mats['arch_face'], ARCH_REVEAL=mats['arch_depth'],
               ARCH_STRUCTURE=mats['structure'], DEEP_GREEN=mats['green'],
               FLUTED=mats['flute'], CHANNEL=mats['channel'], WHITE=mats['warm'],
               TEAL=mats['teal'], MINT=mats['mint'], BRAND=mats['brand'],
               SIGN_FACE=mats['black'])
    box, rod, sweep, uv_mesh = (ctx[n] for n in ('box', 'rod', 'sweep', 'uv_mesh'))
    catmull, rect_sweep = ctx['catmull'], ctx['rect_sweep']
    ellipse, ellipse_annulus = ctx['ellipse'], ctx['ellipse_annulus']
    outline_tube, extruded_outline = ctx['outline_tube'], ctx['extruded_outline']
    label, place, aperture, disk = (ctx[n] for n in ('label', 'place', 'aperture', 'disk'))

    def mark(objects, role='architecture'):
        for ob in objects:
            if ob.type != 'MESH':
                continue
            ob['grandRole'] = role
            ob['projectionOverhead'] = role == 'overhead'
            ob['grandOverhead'] = role == 'overhead'

    def tagged_box(name, p, size, mat=None, bevel=.012, role='architecture'):
        ob = box(prefix+name, p, size, mat or mats['wall'], bevel)
        mark([ob], role)
        return ob

    def section(before, role='architecture'):
        mark(set(bpy.context.scene.objects)-before, role)

    def channel(name, points, radius=.009, mat=None, normal=(0, 0, 1), role='architecture', carrier_inset=.009, vertical_scale=1):
        """The lens is the authored path; its black carrier is behind the face.

        In particular a horizontal floor lens is never pushed sideways or
        buried by the generic +Z offset used by the retired utility.
        """
        pts = [Vector(p) for p in points]
        normal = Vector(normal).normalized()
        before = set(bpy.context.scene.objects)
        sweep(prefix+name+' | recessed carrier', [(p-normal*carrier_inset, radius*1.75) for p in pts], mats['channel'], 8)
        lens = sweep(prefix+name+' | continuous opal diffuser', [(p, radius) for p in pts], mat or mats['warm'], 8)
        if vertical_scale != 1:
            # Keep the full horizontal optical width. Only its world-native Y
            # section is compressed into a flush flat opal strip, not a tube
            # standing proud of the shared walking surface.
            bpy.context.view_layer.update()
            world, inverse = lens.matrix_world.copy(), lens.matrix_world.inverted()
            center_y = sum(p.y for p in pts)/len(pts)
            for vertex in lens.data.vertices:
                p = world@vertex.co
                p.z = center_y+(p.z-center_y)*vertical_scale
                vertex.co = inverse@p
            lens.data.update()
        section(before, role)
        finish = mat or mats['warm']
        optical_paths.append({'name': name, 'path': [list(p) for p in pts], 'radius': radius,
            'color': '#38d9b6' if finish == mats['teal'] else '#ffe3bd', 'role': role,
            'finish': finish.name, 'spillEligible': finish in (mats['warm'], mats['teal']),
            'verticalScale': vertical_scale})

    def bounds(objects):
        bpy.context.view_layer.update()
        pts = [o.matrix_world@v.co for o in objects if o.type == 'MESH' for v in o.data.vertices]
        return {'min': [min(p.x for p in pts), min(p.z for p in pts), min(-p.y for p in pts)],
                'max': [max(p.x for p in pts), max(p.z for p in pts), max(-p.y for p in pts)]}

    # The pavilion and venue share exactly one visible polished stone floor.
    # The support is hidden at runtime; only independent recessed optics rise
    # above the .12 m datum, without a raised luminous entrance threshold.
    deck = [(-12, -8), (12, -8), (12, 7.25), (11.25, 8), (-11.25, 8), (-12, 7.25)]
    support = extruded_outline(prefix+'support below single continuous venue floor', deck, .025, .110, mats['wall'])
    support['grandSharedFloor'] = True
    mark([support], 'floor')
    edge = [(x*.996, .122, z*.996) for x, z in deck]
    channel('warm perimeter floor rope', edge+[edge[0]], .018, normal=(0, 1, 0), role='architecture', carrier_inset=.036, vertical_scale=.1)
    optical_paths[-1]['role'] = 'floor-optic'

    tagged_box('rear full height architectural lightwell', (0, 5.59, -7.88), (24, 10.94, .24))
    tagged_box('left solid full depth service return', (-11.88, 5.59, -.25), (.24, 10.94, 15.5), mats['black'])
    tagged_box('right solid full depth service return', (11.88, 5.59, -.25), (.24, 10.94, 15.5), mats['black'], role='section-wall')
    for side in (-1, 1):
        for z in (-6.8, -4.8, -2.8, -.8, 1.2, 3.2, 5.2):
            tagged_box('side panel fine vertical shadow reveal', (side*11.748, 5.5, z), (.008, 10.5, .012), mats['channel'], .001)

    # A genuinely continuous rounded fascia, not a stack of billboard boxes.
    fascia_path = catmull([(-11.5, 0, -7.8), (-11.5, 0, 5.0), (-11.2, 0, 6.25), (-9.5, 0, 7.15),
        (-6.2, 0, 7.34), (0, 0, 7.40), (6.3, 0, 7.34), (9.7, 0, 7.16),
        (11.2, 0, 6.6), (11.5, 0, 5.25), (11.5, 0, -7.8)], 14)
    vertices, faces = [], []
    for i, p in enumerate(fascia_path):
        tangent = fascia_path[min(i+1, len(fascia_path)-1)]-fascia_path[max(i-1, 0)]
        n = Vector((-tangent.z, 0, tangent.x)).normalized()
        p.x = max(-11.55, min(11.55, p.x)); p.z = min(7.42, p.z)
        inner = p-n*.50
        vertices.extend(((p.x, 11.25, p.z), (p.x, top, p.z),
                         (inner.x, top, inner.z), (inner.x, 11.25, inner.z)))
    for j in range(len(fascia_path)-1):
        for q in range(4):
            faces.append((j*4+q, (j+1)*4+q, (j+1)*4+(q+1)%4, j*4+(q+1)%4))
    faces.extend(((3, 2, 1, 0), tuple(range(len(vertices)-4, len(vertices)))))
    mark([uv_mesh('continuous satin black curved fascia and returns', vertices, faces, mats['black'])], 'overhead')
    channel('fascia recessed teal underside', [(p.x, 11.247, p.z+.007) for p in fascia_path],
            .011, mats['teal'], normal=(0, -1, 0), role='overhead')

    # The left blade leans throughout its full height, matching the hero.
    controls = [(-10.25, .12, 6.28), (-9.7, 3.2, 6.36), (-9.7, 6.7, 6.66),
        (-9.5, 9.35, 7.04), (-9.0, 10.65, 7.25), (-4.5, 10.92, 7.35),
        (0, 10.90, 7.40), (4.8, 10.82, 7.35), (8.3, 10.35, 7.19),
        (10.7, 8.7, 6.90), (10.28, 4.2, 6.64), (10.45, .12, 6.45)]
    arch = catmull(controls, 20)
    widths = [.58+.20*math.sin(i/(len(arch)-1)*math.pi)**2 for i in range(len(arch))]
    before = set(bpy.context.scene.objects)
    rect_sweep('continuous tapered champagne entrance arch', arch, widths, [.64]*len(arch),
               mats['arch_depth'], mats['arch_face'], mats['gold'])
    rect_sweep('charcoal entrance arch structural rear', [p-Vector((0, 0, .66)) for p in arch],
               [w+.055 for w in widths], [.35]*len(arch), mats['structure'])
    section(before, 'overhead')
    gold_edge = []
    for j, p in enumerate(arch):
        tangent = arch[min(j+1, len(arch)-1)]-arch[max(0, j-1)]
        n = Vector((-tangent.y, tangent.x, 0)).normalized()
        gold_edge.append(p+n*widths[j]/2+Vector((0, 0, .012)))
    channel('entrance arch fine warm inset optical edge', gold_edge, .011, role='overhead')
    for side in (-1, 1):
        rows = []
        for j, p in enumerate(arch):
            if side*p.x <= 7.1:
                continue
            tangent = arch[min(j+1, len(arch)-1)]-arch[max(0, j-1)]
            n = Vector((-tangent.y, tangent.x, 0)).normalized()
            inner = p+n*widths[j]/2-Vector((0, 0, .10))
            blend = max(0, min(1, (p.y-8.15)/2.65))
            outer = Vector((side*11.54, max(.12, p.y+(11.25-p.y)*blend), p.z-.63))
            crease = inner.lerp(outer, .50)+Vector((0, 0, .12))
            rows.append((inner, crease, outer))
        for col in (0, 1):
            vs, fs = [], []
            for row in rows:
                vs.extend((row[col], row[col+1]))
            for j in range(len(rows)-1):
                fs.append((j*2, j*2+2, j*2+3, j*2+1))
            mark([uv_mesh('visible folded emerald shoulder '+str(side)+str(col), vs, fs, mats['green'])], 'overhead')
        channel('outer emerald shoulder reveal '+str(side), [r[2]+Vector((0, 0, .015)) for r in rows],
                .009, mats['teal'], role='overhead')

    # Measured physical lettering retains native font proportions.
    before = set(bpy.context.scene.objects)
    for side in (-1, 1):
        x, z = side*11.0, 7.05
        tagged_box('connected service guide face '+str(side), (x, 5.43, z), (1.72, 10.62, .25), mats['black'], .016)
        tagged_box('guide face folded side connector '+str(side), (side*11.72, 5.43, 6.35), (.25, 10.62, 1.65), mats['black'])
        copies = ((('SPACES', 'PEOPLE', 'BRANDS', 'EMOTIONS'), ('RENTAL', 'SOLUTIONS', 'EXPERIENCES')) if side < 0 else
                  (('IDEAS', 'MAPPED', 'BIGGER'), ('BUILDINGS', 'STAGES', 'PRODUCTS', 'INTERIORS', 'EXPERIENCES')))
        for group_index, lines in enumerate(copies):
            y = 8.10 if group_index == 0 else 4.9
            for index, copy in enumerate(lines):
                label(copy, (x-.68, y-index*.46, z+.142), .24, 1.40, tracking=1.04)
        channel('guide emerald grounded edge '+str(side), [(x-side*.83, .15, z+.144), (x-side*.83, 10.70, z+.144)], .007, mats['teal'])
    section(before)
    before = set(bpy.context.scene.objects)
    emblem_before = set(bpy.context.scene.objects)
    ctx['triangle_emblem']((-5.2, 11.32, 7.46), 1.06)
    for ob in set(bpy.context.scene.objects)-emblem_before:
        if ob.type == 'MESH':
            for slot in ob.material_slots:
                slot.material = mats['mint']
    label('livegrid AV', (-3.95, 11.31, 7.46), .76, 5.5, semibold=True, tracking=1)
    channel('header brand divider', [(1.95, 11.15, 7.46), (1.95, 12.25, 7.46)], .007, mats['brand'], role='overhead')
    label('PROJECTION MAPPING', (2.50, 11.92, 7.46), .30, 5.7, tracking=1.28)
    label('TRANSFORM SPACES INTO STORIES', (2.52, 11.44, 7.46), .18, 5.65, mat=mats['mint'], tracking=1.16)
    for i, copy in enumerate(('ANY', 'SURFACE', 'A CANVAS')):
        label(copy, (9.30, 12.24-i*.31, 7.26), .19, 1.40, tracking=1.08)
    section(before, 'overhead')

    # The eight independent application screens sit in a deep matte-black
    # gallery, forward enough to remain visible beyond the crystal sculpture.
    captions = ['ARCHITECTURAL MAPPING', 'STAGE EXPERIENCES', 'PRODUCT MAPPING', 'INTERACTIVE SPACES',
                'LANDMARKS', 'BRAND EXPERIENCES', 'INTERIORS', 'EVENTS & EXHIBITIONS']
    galleries, flute_fields = [], []
    for side in (-1, 1):
        x, z, yaw, w = side*8.72, .80, -side*.25, 4.05
        gb = set(bpy.context.scene.objects)
        caption_start = len(typography)
        tagged_box('matte black application gallery backing', (0, 5.36, -.16), (4.63, 10.25, .34), mats['gallery'])
        for row in range(4):
            idx = row+(0 if side < 0 else 4); y = 9.22-row*2.33
            aperture('projection-application-'+str(idx), (0, y, .022), w, 1.80, 'projection-application-'+str(idx))
            label(captions[idx], (0, y-1.16, .05), .19, w, centered=True, tracking=1.06)
        tagged_box('gallery recessed dark top soffit', (0, 10.70, .02), (4.76, .24, .92), mats['gallery'])
        channel('gallery top warm inner cove', [(-2.24, 10.56, .36), (2.24, 10.56, .36)], .010, normal=(0, -1, 0))
        for lx in (-1.82, -.91, 0, .91, 1.82):
            disk(prefix+'gallery warm focused downlight optic', lx, .34, .052, 10.552, 10.568, mats['optic'])
            p = Matrix.Rotation(yaw, 4, 'Y')@Vector((lx, 10.55, .34))+Vector((x, 0, z))
            fixtures.append({'kind': 'gallery-downlight', 'position': list(p), 'direction': [0, -1, 0], 'color': '#ffe2bb'})
        gallery_objects = set(bpy.context.scene.objects)-gb
        place(gallery_objects, (x, 0, z), yaw); mark(gallery_objects)
        for record in screens[-4:]:
            p = Matrix.Rotation(yaw, 4, 'Y')@Vector((record['x'], record['y'], record['z']))+Vector((x, 0, z))
            record.update(x=p.x, y=p.y, z=p.z, rotation=[0, yaw, 0])
        for record in typography[caption_start:]:
            p = Matrix.Rotation(yaw, 4, 'Y')@Vector(record['position'])+Vector((x, 0, z))
            record.update(position=list(p), yaw=yaw)
        galleries.append({'side': side, 'center': [x, 0, z], 'yaw': yaw, 'width': 4.63,
                          'screenWidth': 4.05, 'screenHeight': 1.80, 'clearInnerEdge': 6.43})
        for kind, fx, fz, width in (('inboard', side*6.05, .25, .90), ('outboard', side*11.10, 1.40, .80)):
            tagged_box(kind+' full height charcoal fluted substrate', (fx, 5.32, fz), (width, 10.38, .18), mats['flute'], .005)
            count = round(width/.060)
            for k in range(count):
                px = fx-width/2+(k+.5)*width/count
                tagged_box(kind+' physical anodized vertical flute '+str(k), (px, 5.32, fz+.115),
                           (.026, 10.34, .058), mats['rib'], .004)
            inside = fx-side*(width/2+.034)
            tagged_box(kind+' champagne full height jamb', (inside, 5.32, fz+.10), (.044, 10.40, .14), mats['gold'], .005)
            channel(kind+' warm wall panel reveal', [(inside-side*.028, .145, fz+.178),
                    (inside-side*.028, 10.51, fz+.178)], .009)
            flute_fields.append({'side': side, 'kind': kind, 'center': [fx, 5.32, fz], 'width': width,
                                 'height': 10.38, 'ribCount': count, 'ribPitch': width/count, 'ribDepth': .058})

    radius, height, center = 17.0, 7.90, Vector((0, 6.40, 9.33))
    arc = 2*math.asin(9.2/radius)
    v, f, uv = [], [], []
    for j in range(193):
        angle = -arc/2+arc*j/192
        for r, dy in ((radius+.012, -height/2), (radius+.012, height/2), (radius+.12, height/2), (radius+.12, -height/2)):
            v.append(center+Vector((-r*math.sin(angle), dy, -r*math.cos(angle)))); uv.append((j/192, 1 if dy > 0 else 0))
    for j in range(192):
        for face in range(4):
            f.append((j*4+face, (j+1)*4+face, (j+1)*4+(face+1)%4, j*4+(face+1)%4))
    mark([uv_mesh('wide uninterrupted concave rear LED cabinet', v, f, ctx['BACK'], uv)])
    screens.append({'id': 'projection-backdrop', 'type': 'curved', 'x': 0, 'y': center.y, 'z': center.z,
        'w': radius*arc, 'h': height, 'radius': radius, 'arc': arc, 'rotation': [0, math.pi, 0],
        'flipU': True, 'chordWidth': 18.4, 'mediaHint': 'projection-backdrop'})
    for y in (2.435, 10.365):
        channel('rear curved LED thin inset edge', [(center.x-radius*math.sin(-arc/2+arc*j/192), y,
                center.z-radius*math.cos(-arc/2+arc*j/192)) for j in range(193)], .007)

    # Broad champagne ring undersides and restrained recessed lenses. Cosmic
    # media surfaces remain separate apertures, not photographs on geometry.
    before = set(bpy.context.scene.objects)
    # The black room soffit surrounds a real elliptical canopy opening. It
    # does not seal the entire pavilion with an opaque billboard-like slab.
    # Each outer sample meets the rectangular architectural boundary exactly.
    rv, rf = [], []
    for i in range(192):
        angle = math.tau*i/192
        dx, dz = math.cos(angle), math.sin(angle)
        tx = 11.74/max(abs(dx), 1e-9)
        tz = (7.70 if dz >= 0 else 6.90)/max(abs(dz), 1e-9)
        t = min(tx, tz)
        inner = (8.9*dx, -.7+5.7*dz)
        outer = (t*dx, -.7+t*dz)
        rv.extend(((outer[0], 10.97, outer[1]), (outer[0], 11.19, outer[1]),
                   (inner[0], 11.19, inner[1]), (inner[0], 10.97, inner[1])))
    for i in range(192):
        j = (i+1)%192
        for q in range(4):
            rf.append((i*4+q, j*4+q, j*4+(q+1)%4, i*4+(q+1)%4))
    mark([uv_mesh('architectural charcoal soffit around real oval opening', rv, rf, mats['wall'], smooth=False)], 'overhead')
    for z in (-6.95, 5.50):
        channel('room continuous ceiling cove', [(-10.9, 10.94, z), (10.9, 10.94, z)], .012, normal=(0, -1, 0), role='overhead')
        for x in (-10, -8, -6, -4, -2, 0, 2, 4, 6, 8, 10):
            disk(prefix+'room warm recessed downlight optic', x, z, .060, 10.93, 10.945, mats['optic'])
            fixtures.append({'position': [x, 10.92, z], 'kind': 'recessed', 'direction': [0, -1, 0]})
    for side in (-1, 1):
        channel('side ceiling continuous warm cove', [(side*11.25, 10.95, -7), (side*11.25, 10.95, 6)],
                .011, normal=(0, -1, 0), role='overhead')
        for z in (-5, -2, 1, 4):
            disk(prefix+'side warm recessed optic', side*10.9, z, .055, 10.93, 10.945, mats['optic'])
            fixtures.append({'position': [side*10.9, 10.92, z], 'kind': 'side-recessed', 'direction': [0, -1, 0]})
    ellipse_annulus(prefix+'cosmic outer canopy annular substrate', (8.7, 5.5), (3.3, 2.2), 0, -.7, 10.75, 10.88, ctx['BACK'], 192)
    screens.append({'id': 'projection-ceiling-outer', 'type': 'ellipse', 'x': 0, 'y': 10.735, 'z': -.7,
        'w': 17.4, 'h': 11, 'radiusX': 8.7, 'radiusZ': 5.5, 'innerFraction': .38,
        'rotation': [math.pi/2, 0, 0], 'mediaHint': 'projection-ceiling'})
    rings = []
    for name, rx, rz, y, band, depth, media in (('outer', 6.8, 4.6, 10.30, .43, .24, False),
                                              ('inner', 4.45, 3.25, 10.48, .36, .20, True)):
        ellipse_annulus(prefix+name+' physical satin champagne ring', (rx, rz), (rx-band, rz-band),
                        0, -.7, y, y+depth, mats['gold'], 192)
        ring_path = [(x, y-.016, z-.7) for x, z in ellipse(rx-band+.026, rz-band+.026)]
        channel(name+' recessed warm ring cove', ring_path+[ring_path[0]], .011,
                normal=(0, -1, 0), role='overhead')
        if media:
            screens.append({'id': 'projection-ceiling-inner', 'type': 'ellipse', 'x': 0, 'y': y+.008,
                'z': -.7, 'w': (rx-band)*2, 'h': (rz-band)*2, 'radiusX': rx-band, 'radiusZ': rz-band,
                'innerFraction': .01, 'rotation': [math.pi/2, 0, 0], 'mediaHint': 'projection-ceiling'})
        for angle in (.35, 2.3, 3.6, 5.4):
            x, z = math.cos(angle)*(rx-.12), -.7+math.sin(angle)*(rz-.12)
            rod(prefix+'rigid ring ceiling drop', (x, y+depth, z), (x, 10.95, z), .018, ctx['BRUSHED'], 8)
        rings.append({'center': [0, y, -.7], 'outerRadiusX': rx, 'outerRadiusZ': rz,
                      'radialBand': band, 'depth': depth})
    section(before, 'overhead')

    before = set(bpy.context.scene.objects)
    utility = ctx['UTILITY_SOURCE']
    source = utility[utility.index('def projector('):utility.index('def kiosk(')].replace('10.16', '10.93')
    exec(compile(source, 'projection-finish-v2-native-projector', 'exec'), ctx)
    projector_bounds = []
    for name, lens, target, size, radius in (('central', (0, 10.02, 2.1), (0, 7., -2.8), .48, 1.55),
            ('left', (-4.6, 9.82, 1.), (-2.7, 4.6, -2.6), .43, 1.25),
            ('right', (4.6, 9.82, 1.), (2.7, 4.6, -2.6), .43, 1.25)):
        pb = set(bpy.context.scene.objects)
        ctx['projector'](prefix+name+' projector', lens, target, size)
        projectors[-1].update(radius=radius, opacity=.042)
        projector_bounds.append({'id': name, 'bounds': bounds(set(bpy.context.scene.objects)-pb)})
    section(before, 'overhead')

    # A low wide circular model dais is the only floor-height furniture here.
    # Reception, hospitality, kiosks and plants are owned by the interior module.
    before = set(bpy.context.scene.objects)
    stage_radius, stage_center = 3.9, [0, .95, -2.8]
    stage = [(x, z-2.8) for x, z in ellipse(stage_radius, stage_radius)]
    extruded_outline(prefix+'crystal circular exhibition dais', stage, floor, .95, ctx['COUNTER'])
    channel('model dais low teal toe', [(x, .17, z) for x, z in stage]+[(stage[0][0], .17, stage[0][1])], .010, mats['teal'])
    channel('model dais champagne top reveal', [(x, .95, z) for x, z in stage]+[(stage[0][0], .95, stage[0][1])], .010, mats['gold'])
    section(before, 'model-plinth')

    objects = [o for o in set(bpy.context.scene.objects)-start if o.type == 'MESH']
    lowest_projector = min(p['bounds']['min'][1] for p in projector_bounds)
    for ob, record in glyph_objects:
        record['bounds'] = bounds([ob]); record['fontAspectRatioPreserved'] = True
    return {'objects': objects, 'apertures': screens, 'projectors': projectors,
        'fixtures': fixtures, 'typography': typography, 'opticalPaths': optical_paths,
        'pedestal': {'center': stage_center, 'radius': stage_radius, 'top': .95},
        'deckPolygonXZ': deck,
        'architecture': {'width': 24, 'depth': 16, 'top': top, 'height': top-floor,
            'hClear': lowest_projector-floor, 'floorY': floor,
            'clearHeightMeasurement': {'lowestProjectorVertexY': lowest_projector, 'floorY': floor, 'projectors': projector_bounds},
            'facade': {'archControlPoints': controls, 'minBandWidth': .58, 'maxBandWidth': .78, 'bandDepth': .64,
                       'top': top, 'sharedArchAndTrimCurve': True},
            'galleries': galleries, 'flutedFields': flute_fields, 'ceilingRings': rings,
            'vineAnchors': [{'side': s, 'kind': k, 'position': [s*x, .30, z], 'width': w, 'top': h}
                for s in (-1, 1) for k, x, z, w, h in (('inboard', 6.43, .48, .32, 10.35), ('outboard', 11.12, 1.68, .34, 10.45))]}}
