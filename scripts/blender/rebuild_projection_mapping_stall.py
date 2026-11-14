"""Actual projection-mapping pavilion from the October 16 reference board.

Run Blender 5.2 --background --factory-startup --python this-file.py.
Only the upper booth photograph defines the architecture. Native Three XYZ,
front +Z, metres; independently authored palace occupies the central plinth.
LED apertures and projector rays remain runtime surfaces, never photo overlays.
"""
from pathlib import Path

HELPERS = Path(__file__).with_name("projection_architecture_helpers.py")
source = HELPERS.read_text(encoding="utf-8").split("# Low open floor.")[0]
exec(compile(source, str(HELPERS), "exec"))
OUT = ROOT / "public/models/expo/projection-mapping-stall.glb"
LAYOUT_OUT = ROOT / "public/models/expo/projection-mapping-layout.json"
ROOT_POSITION = [10.2, 0, -189]
ROOT_ROTATION = [0, -math.pi / 2, 0]
SCREENS = []
PROJECTORS = []
FLOOR_TOP = .22
HERO = {"position": [-2.0, 3.1, 25.0], "look": [0, 5.0, -.4], "verticalFov": 38}
RNG = random.Random(20261027)

# Matching semantic roles let runtime lighting distinguish metal, upholstery,
# architectural black and emissive joinery without adding draw calls.
for mat in bpy.data.materials:
    if mat.name.startswith("LED Rental"):
        mat.name = "Projection Booth | " + mat.name.split(" | ")[-1]
BLACK.name = "Projection Booth | matte black architectural aluminium"
WALL.name = "Projection Booth | satin graphite wall panels"
BRUSHED.name = "Projection Booth | brushed dark aluminium cabinet"
CHAMPAGNE.name = "Projection Booth | brushed champagne metal returns"
DEEP_GREEN.name = "Projection Booth | sculpted deep green metallic accent"
BRAND.name = "Projection Booth | clean ivory brand lettering"
TEAL_BRAND.name = "Projection Booth | livegrid teal folded emblem"
TEAL.name = "Projection Booth | concealed thin teal LED reveal"
WHITE.name = "Projection Booth | warm pearl concealed LED"
IVORY.name = "Projection Booth | ivory woven sofa upholstery"
FLOOR.name = "Projection Booth | glossy charcoal honed pathway stone"
LENS = material("Projection Booth | blue projector optical lens", (.018, .22, .39), .12, .10, .70)
LENS_CLEAR = material("Projection Booth | pale projector central optic", (.22, .58, .82), .10, .08, 1.1)
RUBBER = material("Projection Booth | dark recessed optical baffle", (.0018, .0022, .0030), .01, .88)
technical = Path(__file__).with_name("rebuild_technical_showcase.py").read_text(encoding="utf-8")
rounded_source = technical[technical.index("def soft_box("):technical.index("def technical_armchair(")]
# Seven samples per edge rather than eleven retain two round-corner segments
# and the planar cushion spans, without repeated whole-scene modifier updates.
rounded_source = rounded_source.replace(
    "(-h,-h+radius*.25,-h+radius*.5,-h+radius*.75,\n            -h+radius,0,h-radius,h-radius*.75,h-radius*.5,h-radius*.25,h)",
    "(-h,-h+radius*.5,-h+radius,0,h-radius,h-radius*.5,h)")
exec(compile(rounded_source, "projection-rounded-cuboid-helper", "exec"))


def flowers(x, y, z, scale=.25):
    """Small actual orchid sprigs, without the inherited dense petal meshes."""
    lathe("Projection Booth | champagne narrow flower bud vase", x, z,
        [(.10, y), (.11, y + .035), (.075, y + scale * 1.05), (.056, y + scale * 1.15)], CHAMPAGNE, 20)
    for branch in range(3):
        a = branch * 2.399
        base = Vector((x, y + scale * .8, z))
        tip = base + Vector((math.cos(a) * scale * .46, scale * (1.1 + .18 * branch), math.sin(a) * scale * .46))
        rod("Projection Booth | fine living orchid stem", base, tip, scale * .018, LEAVES[2], 6)
        for q in range(3):
            center = base.lerp(tip, .53 + q * .23)
            verts, faces = [], []
            for petal in range(5):
                angle = petal * math.tau / 5 + q * .8
                radial = Vector((math.cos(angle), .24, math.sin(angle))) * scale * .18
                tangent = Vector((-math.sin(angle), 0, math.cos(angle))) * scale * .085
                index = len(verts)
                verts.extend((center, center + radial * .6 + tangent, center + radial * 1.25,
                    center + radial * .6 - tangent, center + radial * .61 + Vector((0, scale * .045, 0))))
                faces.extend(((index, index + 1, index + 4), (index + 1, index + 2, index + 4),
                    (index + 2, index + 3, index + 4), (index + 3, index, index + 4)))
            patch_mesh("Projection Booth | individual low polygon ivory orchid blossoms", verts, faces, WHITE_FLOWER)


def front_z(x):
    return 3.40 + .40 * math.cos(x / 11.6 * math.pi / 2)


def fascia_bottom(x):
    return 8.48 + .48 * math.exp(-((x + 7.3) / 3.0) ** 2) - .22 * math.exp(-((x - 8.1) / 3.1) ** 2)


def front_warp(objects, offset=.13):
    bpy.context.view_layer.update()
    for ob in objects:
        if ob.type != "MESH":
            continue
        matrix = ob.matrix_world.copy()
        ob.parent = None
        for vertex in ob.data.vertices:
            q = matrix @ vertex.co
            old_z = -q.y
            q.y = -(front_z(q.x) + offset + old_z - 3.20)
            vertex.co = q
        ob.matrix_world = Matrix.Identity(4)


def facade_glyph(body, p, height, **kwargs):
    before = set(bpy.context.scene.objects)
    glyph(body, p, height, **kwargs)
    front_warp(set(bpy.context.scene.objects) - before)


def pose_meshes(objects, position, matrix):
    basis = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
    pose = basis @ (Matrix.Translation(Vector(position)) @ matrix) @ basis.inverted()
    bpy.context.view_layer.update()
    for ob in objects:
        if ob.type == "MESH":
            ob.matrix_world = pose @ ob.matrix_world


def oval_canopy(name, center, rx, rz, pitch, media_id, inner_fraction=.38):
    before = set(bpy.context.scene.objects)
    ellipse_annulus(name + " | structural oval powdercoat ring", (rx + .29, rz + .29), (rx, rz), 0, 0, 0, .29, BLACK, 144)
    ellipse_annulus(name + " | broad champagne inner ceiling return", (rx + .17, rz + .17), (rx + .025, rz + .025), 0, 0, -.064, .035, CHAMPAGNE, 144)
    outline_tube(name + " | uninterrupted warm pearl inner rim", ellipse_points(rx + .025, rz + .025, 0, 0, 144), -.070, .030, WHITE)
    outline_tube(name + " | fine deepgreen upper halo", ellipse_points(rx + .21, rz + .21, 0, 0, 144), .19, .013, TEAL)
    ellipse_annulus(name + " | open annular LED ceiling rear backing", (rx, rz), (rx * inner_fraction, rz * inner_fraction), 0, 0, .045, .085, BACK, 144)
    rotation = Matrix.Rotation(pitch, 4, "X")
    pose_meshes(set(bpy.context.scene.objects) - before, center, rotation)
    for angle in (-2.3, -.7, .9, 2.5):
        p = rotation @ Vector((math.sin(angle) * (rx + .13), .22, math.cos(angle) * (rz + .13))) + Vector(center)
        rod(name + " | actual thin suspension wire", p, (p.x, 10.12, p.z), .007, CABLE, 6)
    normal = Vector((0, -math.cos(pitch), -math.sin(pitch)))
    p = Vector(center) + normal * .079
    SCREENS.append({"id": media_id, "type": "ellipse", "x": p.x, "y": p.y, "z": p.z,
        "w": rx * 2, "h": rz * 2, "radiusX": rx, "radiusZ": rz,
        "rotation": [math.pi / 2 + pitch, 0, 0], "innerFraction": inner_fraction, "mediaHint": "projection-ceiling"})


def projector(name, lens, target, scale=1):
    """Vented three-dimensional cinema projector, with modeled optical stack.

    Author local +Z is lens direction. The whole housing is aimed using the
    same exact vector exported for the live volumetric projection frustum.
    """
    before = set(bpy.context.scene.objects)
    box(name + " | large vented black chassis", (0, 0, -.78), (1.52, .74, 1.20), BRUSHED, .065)
    box(name + " | removable dark top lid", (0, .382, -.79), (1.45, .035, 1.12), BACK, .016)
    box(name + " | recessed front optical baffle", (0, 0, -.168), (1.40, .62, .060), RUBBER, .025)
    # Many individual physical slots remain readable from the wide hero view.
    for side in (-1, 1):
        for j in range(12):
            box(name + " | real machined side cooling vent", (side * .766, .01, -1.25 + j * .083), (.012, .45, .041), RUBBER, .006)
        for j in range(8):
            box(name + " | front ventilation louvre", (side * (.38 + j * .041), .03, -.129), (.017, .42, .012), BLACK, .003)
    for j in range(11):
        box(name + " | top heat exhaust slot", (-.51 + j * .10, .406, -.82), (.035, .014, .71), RUBBER, .003)
    rod(name + " | projecting lens aluminium barrel", (0, -.035, -.19), (0, -.035, -.025), .215, BLACK, 40)
    rod(name + " | outer machined lens ring", (0, -.035, -.034), (0, -.035, -.008), .222, SILVER, 40)
    rod(name + " | recessed optical blue front element", (0, -.035, -.014), (0, -.035, .002), .177, LENS, 40)
    rod(name + " | pale cyan central objective", (0, -.035, .004), (0, -.035, .009), .095, LENS_CLEAR, 32)
    for side in (-1, 1):
        box(name + " | robust steel mounting bracket", (side * .79, .22, -.76), (.055, .77, .12), BLACK, .008)
        rod(name + " | bracket pivot bolt", (side * .77, .19, -.76), (side * .85, .19, -.76), .061, SILVER, 12)
    box(name + " | transverse steel suspension bracket", (0, .59, -.76), (1.66, .07, .12), BLACK, .008)
    objects = set(bpy.context.scene.objects) - before
    direction = (Vector(target) - Vector(lens)).normalized()
    rotation = Vector((0, 0, 1)).rotation_difference(direction).to_matrix().to_4x4()
    if scale != 1:
        rotation = rotation @ Matrix.Diagonal((scale, scale, scale, 1))
    # Lens metadata describes the actual front optical disk, not the body.
    root = Vector(lens) - rotation @ Vector((0, -.035, .009))
    pose_meshes(objects, root, rotation)
    mount = root + rotation @ Vector((0, .63, -.76))
    rod(name + " | real hanging ceiling drop", mount, (mount.x, 10.16, mount.z), .025, BRUSHED, 10)
    rod(name + " | additional safety suspension wire", mount + Vector((.2, 0, 0)), (mount.x + .2, 10.16, mount.z), .006, CABLE, 6)
    PROJECTORS.append({"id": name.lower().replace(" ", "-"), "position": list(lens), "lens": list(lens),
        "target": list(target), "width": 2.8 if scale == 1 else 2.0, "height": 3.4 if scale == 1 else 2.7,
        "radius": 1.7 if scale == 1 else 1.2,
        "color": "#c7e9ff", "opacity": .105 if scale == 1 else .065})


def kiosk(name, x, z, width=2.9, height=3.0, yaw=0, media_id="projection-kiosk"):
    before = set(bpy.context.scene.objects)
    # Solid wedge has a high rear and a lower visitor-facing edge. The screen
    # follows its actual sloped surface, with a wide polished brass surround.
    y0, front_top, rear_top = FLOOR_TOP, height - .81, height
    d = 1.35 if width > 2 else .82
    verts = [(-width / 2, y0, -d / 2), (width / 2, y0, -d / 2), (width / 2, y0, d / 2), (-width / 2, y0, d / 2),
        (-width / 2, rear_top, -d / 2), (width / 2, rear_top, -d / 2), (width / 2, front_top, d / 2), (-width / 2, front_top, d / 2)]
    patch_mesh(name + " | black machined angled kiosk", verts,
        [(0, 3, 2, 1), (0, 1, 5, 4), (1, 2, 6, 5), (3, 7, 6, 2), (0, 4, 7, 3), (4, 5, 6, 7)], COUNTER)
    for side in (-1, 1):
        rod(name + " | champagne sloped screen return", (side * (width / 2 + .01), rear_top, -d / 2), (side * (width / 2 + .01), front_top, d / 2), .034, CHAMPAGNE, 8)
        line((side * width / 2, FLOOR_TOP + .03, d / 2), (side * width / 2, front_top, d / 2), .014, WHITE)
    line((-width / 2, FLOOR_TOP + .03, d / 2), (width / 2, FLOOR_TOP + .03, d / 2), .016, WHITE)
    pitch = -math.atan2(d, rear_top - front_top)
    screen_h = math.hypot(d, rear_top - front_top) - .16
    aperture(media_id, (0, (front_top + rear_top) / 2 + .018, 0), width - .22, screen_h, "projection-kiosk",
        frame=.025, rotation=[pitch, 0, 0])
    if width > 2:
        glyph("EXPLORE", (0, 1.29, d / 2 + .017), .185, centered=True, tracking=1.20)
        glyph("POSSIBILITIES", (0, .96, d / 2 + .017), .185, centered=True, tracking=1.10)
        line((-.25, .68, d / 2 + .019), (.25, .68, d / 2 + .019), .008, CHAMPAGNE)
    group(name + " | complete angled touch console", before, (x, 0, z), yaw)
    # aperture() wrote local data before the kiosk assembly received its pose.
    entry = SCREENS[-1]
    p = Matrix.Rotation(yaw, 4, "Y") @ Vector((entry["x"], entry["y"], entry["z"])) + Vector((x, 0, z))
    # Three's Euler XYZ composes Rx @ Ry @ Rz. The kiosk group physically
    # composes Ry(yaw) @ Rx(pitch), so extract that exact equivalent Euler.
    screen_rotation = [math.atan2(math.sin(pitch), math.cos(yaw) * math.cos(pitch)),
        math.asin(math.sin(yaw) * math.cos(pitch)),
        math.atan2(-math.sin(yaw) * math.sin(pitch), math.cos(yaw))]
    entry.update({"x": p.x, "y": p.y, "z": p.z, "rotation": screen_rotation})


# A broad island remains open around the palace and visitor route. The actual
# runtime reflective floor is 4mm above this authored slab, as in other stalls.
outline = [(-11.50, -6.40), (11.50, -6.40), (11.50, 3.70), (10.65, 4.60),
    (-10.65, 4.60), (-11.50, 3.70)]
extruded_outline("Projection Booth | low chamfered continuous honed stone island", outline, .035, FLOOR_TOP, FLOOR)
outline_tube("Projection Booth | continuous warm pearl island perimeter", outline, .255, .022, WHITE)
outline_tube("Projection Booth | precision champagne floor edge", outline, .236, .012, CHAMPAGNE)
# Physical module seams, just above the shared reflective finish.
for x in (-9, -6, -3, 0, 3, 6, 9):
    box("Projection Booth | fine honed stone longitudinal panel joint", (x, .2245, -.75), (.009, .0015, 9.90), BRUSHED, 0)
for z in (-4.5, -2, .5, 3):
    box("Projection Booth | fine honed stone transverse panel joint", (0, .2245, z), (22.65, .0015, .009), BRUSHED, 0)

# Continuous deep fascia with one restrained wave and broad structural depth.
vertices, faces = [], []
steps = 144
for j in range(steps + 1):
    x = -11.48 + 22.96 * j / steps
    b, z = fascia_bottom(x), front_z(x)
    top = 10.58 + .32 * math.cos(x / 11.5 * math.pi / 2)
    vertices.extend(((x, b, z), (x, top, z - .02), (x, top, z - .85), (x, b, z - .85)))
for j in range(steps):
    for q in range(4):
        faces.append((j * 4 + q, (j + 1) * 4 + q, (j + 1) * 4 + (q + 1) % 4, j * 4 + (q + 1) % 4))
faces.extend([(3, 2, 1, 0), tuple(steps * 4 + q for q in range(4))])
patch_mesh("Projection Booth | heavy continuous swept black fascia", vertices, faces, BLACK)
edge = [Vector((x, fascia_bottom(x) - .015, front_z(x) + .008)) for x in [-8.20 + 16.40 * j / 144 for j in range(145)]]
ribbon("Projection Booth | coherent broad champagne fascia lower return", edge, .20, .20, CHAMPAGNE)
sweep("Projection Booth | concealed thin warm fascia edge", [(p + Vector((0, -.11, .105)), .016) for p in edge], WHITE, 8)

# Bold S-curved legs and folded dark-green canopy wings match the reference's
# asymmetrical front architecture, not the preceding rental pavilion's bays.
for side in (-1, 1):
    path = catmull([(side * 10.55, .26, 3.47), (side * 10.02, 3.48, 3.63),
        (side * 9.48, 6.70, 3.53), (side * 8.99, 7.88, 3.51),
        (side * 8.20, fascia_bottom(side * 8.20) - .015, front_z(side * 8.20))], 14)
    widths, gold_path, gold_depth, black_path, black_depth = [], [], [], [], []
    for j, p in enumerate(path):
        t = j / (len(path) - 1)
        blend = max(0, min(1, (t - .67) / .33))
        blend = blend * blend * (3 - 2 * blend)
        widths.append((1.00 - .47 * t) * (1 - blend) + .20 * blend)
        gold_path.append(p + Vector((0, 0, .40 * (1 - blend) + .012 * blend)))
        gold_depth.append(.075 * (1 - blend) + .20 * blend)
        black_path.append(p + Vector((0, .18 * blend, -.39 * blend)))
        black_depth.append(.74 * (1 - blend) + .76 * blend)
    ribbon("Projection Booth | sculpted black structural arch leg", black_path, 1.3, .74, BLACK,
        widths=[w + .49 for w in widths], depths=black_depth)
    ribbon("Projection Booth | sweeping broad champagne metal arch reveal", gold_path, .8, .075, CHAMPAGNE,
        widths=widths, depths=gold_depth)
    light_path = []
    for j, p in enumerate(path):
        tangent = path[min(j + 1, len(path) - 1)] - path[max(0, j - 1)]
        normal = Vector((-tangent.y, tangent.x, 0)).normalized()
        light_path.append((gold_path[j] + normal * widths[j] / 2 * side + Vector((0, 0, gold_depth[j] / 2 + .008)), .012))
    sweep("Projection Booth | fine pearl light along champagne leg", light_path, WHITE, 8)
    fold = [(side * 11.39, 6.61, 3.38), (side * 11.39, 10.56, 3.38),
        (side * 9.55, 10.70, 3.57), (side * 10.42, 8.02, 3.64)]
    patch_mesh("Projection Booth | deep emerald folded upper architectural wing", fold, [(0, 1, 2, 3)], DEEP_GREEN)
    line(fold[2], fold[3], .018, TEAL)
    line(fold[0], fold[1], .018, TEAL)
    box("Projection Booth | full height outer side return wall", (side * 11.36, 4.70, -1.18), (.28, 8.96, 9.18), BLACK, .018)
    box("Projection Booth | continuous black canopy side depth", (side * 11.33, 9.63, -1.20), (.42, 1.88, 9.20), BLACK, .022)
    line((side * 11.16, 8.65, -5.84), (side * 11.16, 8.65, 3.22), .014, TEAL)

# The front face has real modeled sharp lettering and a folded brand emblem.
before = set(bpy.context.scene.objects)
logo((-6.45, 9.10, 3.20), .95, max_width=5.35)
front_warp(set(bpy.context.scene.objects) - before)
facade_glyph("PROJECTION MAPPING", (1.04, 9.56, 3.20), .35, tracking=1.34, max_width=7.30)
facade_glyph("TRANSFORM SPACES INTO STORIES", (1.08, 9.03, 3.20), .225, tracking=1.28, max_width=7.12, mat=TEAL_BRAND)

# Solid ends carry the outer copy; clear open center remains the palace stage.
for x0, width, z in ((-10.36, 1.46, 4.20), (10.32, 1.43, 4.20)):
    box("Projection Booth | front return service brand blade", (x0, 4.42, z), (width, 8.40, .36), BLACK, .014)
for j, copy in enumerate(("BUILDINGS", "STAGES", "PRODUCTS", "INTERIORS", "EXPERIENCES")):
    glyph(copy, (-10.93, 6.64 - j * .43, 4.405), .225, max_width=1.20)
line((-10.91, 4.20, 4.407), (-10.35, 4.20, 4.407), .010, CHAMPAGNE)
for j, copy in enumerate(("REAL SPACES", "REAL EMOTIONS")):
    glyph(copy, (-10.93, 3.46 - j * .40, 4.406), .195, max_width=1.20)
for j, copy in enumerate(("ANY", "SURFACE", "A CANVAS")):
    glyph(copy, (9.79, 8.15 - j * .43, 4.406), .25, max_width=1.18)

# Coherent inner walls and ceiling returns, all matte black under warm optics.
for x0, x1 in ((-10.45, -6.20), (6.20, 10.45)):
    for j in range(3):
        x = x0 + (x1 - x0) * (j + .5) / 3
        box("Projection Booth | satin graphite rear architectural panel", (x, 4.52, -4.67), ((x1 - x0) / 3 - .012, 8.60, .20), WALL, .008)
box("Projection Booth | dark recessed central rear enclosure", (0, 4.49, -6.18), (12.66, 8.54, .20), BLACK, .008)
for side in (-1, 1):
    x = side * 10.77
    extruded_outline("Projection Booth | side black soffit with concealed practicals", [(x - .55, -5.90), (x + .55, -5.90), (x + .55, 3.20), (x - .55, 3.20)], 8.61, 8.77, ROOF)
for z in (-5.9, -3.7, -.3, 2.7):
    rod("Projection Booth | overhead black steel cross rail", (-10.70, 9.12, z), (10.70, 9.12, z), .038, BRUSHED, 10)
for x in (-9.9, -7.6, -5.3, -3.0, -.7, 1.6, 3.9, 6.2, 8.5, 10.1):
    rod("Projection Booth | front practical track rail", (x, 8.71, -5.80), (x, 8.71, 3.02), .025, BRUSHED, 8)
    for z in (-4.38, 2.80):
        rod("Projection Booth | warm practical black spotlight", (x, 8.69, z), (x, 8.42, z), .084, BLACK, 14)
        disk("Projection Booth | warm pearl practical spotlight optic", x, z, .056, 8.406, 8.42, WHITE)

# The two ceilings are genuine double-height suspended ellipses, with the
# planet/forest projection artwork on their underside and open truss above.
oval_canopy("Projection Booth | outer immersive ceiling", (0, 9.02, -.48), 6.75, 3.87, -.06, "projection-ceiling-outer", .60)
oval_canopy("Projection Booth | inner suspended ceiling", (0, 8.73, -.34), 3.72, 2.42, -.08, "projection-ceiling-inner", .80)

# Backdrop images are abstraction/forest only; no picture of a palace is used
# as a substitute for the separately built physically projecting model.
for side in (-1, 1):
    aperture("projection-backdrop-" + ("left" if side == -1 else "right"), (side * 4.25, 4.36, -5.98), 4.05, 5.60, "projection-backdrop", frame=.035)

# Four sharp application panels at left plus native typographic captions.
for j, (y, caption) in enumerate(((6.66, "ARCHITECTURAL MAPPING"), (5.00, "STAGE MAPPING"),
        (3.34, "PRODUCT MAPPING"), (1.68, "INTERACTIVE SPACES"))):
    aperture("projection-application-" + str(j), (-8.30, y, -3.13), 3.40, 1.28, "projection-application-" + str(j), yaw=.10, frame=.035)
    glyph(caption, (-8.30, y - .91, -3.075), .14, centered=True, max_width=3.34, semibold=True)

# Right-hand hero branding wall and tall slatted architectural side feature.
for j, copy in enumerate(("MAPPING", "PEOPLE", "EMOTIONS")):
    glyph(copy, (7.00, 7.03 - j * .43, -2.85), .27, max_width=2.85, tracking=1.12)
aperture("projection-hero", (8.43, 4.62, -2.77), 4.38, 2.46, "projection-hero", yaw=-.08, frame=.040)
glyph("FROM IMAGINATION", (8.43, 2.99, -2.725), .19, centered=True, tracking=1.10, max_width=3.80)
glyph("TO IMMERSION", (8.43, 2.61, -2.725), .19, centered=True, tracking=1.10, max_width=3.80)
for j in range(17):
    x = 10.08 + j * .071
    box("Projection Booth | separate fluted champagne timber vertical fin", (x, 4.42, -3.35), (.037, 8.39, .27), CHAMPAGNE if j % 3 == 0 else WOOD, .006)
for x in (10.01, 11.28):
    line((x, .29, -3.16), (x, 8.63, -3.16), .013, TEAL)

# Palace plinth: enough depth for the white maquette's genuine entry stairs.
stage_outline = [(x, z - 1.15) for x, z in round_outline(12.4, 4.8, .18, 12)]
extruded_outline("Projection Booth | palace grounded black demonstration pedestal", stage_outline, FLOOR_TOP, 1.65, COUNTER)
outline_tube("Projection Booth | palace fine champagne top return", stage_outline, 1.645, .016, CHAMPAGNE)
outline_tube("Projection Booth | palace soft teal lower cove", stage_outline, .46, .022, TEAL)
for j in range(38):
    x = 1.90 + j * .104
    box("Projection Booth | fine gold display plinth front fluting", (x, .92, 1.257), (.027, .82, .022), CHAMPAGNE, .003)

# Actual central ceiling-mounted projector and two separate side optics.
projector("Projection central projector", (0, 8.49, 1.45), (0, 4.55, -.62), 1.0)
projector("Projection left projector", (-4.65, 7.73, .46), (-3.06, 3.90, -.85), .74)
projector("Projection right projector", (4.65, 7.73, .46), (3.06, 3.90, -.85), .74)

# Slender real stanchions and charcoal ropes, with open access at both sides.
for x in (-3.40, -1.70, 0, 1.70, 3.40):
    disk("Projection Booth | low steel visitor rail foot", x, 2.20, .14, FLOOR_TOP, FLOOR_TOP + .035, BRUSHED)
    rod("Projection Booth | slim visitor barrier post", (x, FLOOR_TOP + .035, 2.20), (x, 1.38, 2.20), .029, BLACK, 12)
    disk("Projection Booth | stanchion champagne cap", x, 2.20, .044, 1.377, 1.40, CHAMPAGNE)
for j in range(4):
    x = -3.4 + j * 1.7
    sweep("Projection Booth | gently hanging charcoal visitor rope", [(Vector((x + 1.7 * k / 16, 1.35 - .115 * math.sin(math.pi * k / 16), 2.20)), .021) for k in range(17)], BLACK, 7)

# Foreground left reception is a genuinely rounded body, with wide sharp
# branding and a laptop/worktop rather than a flat image of a counter.
reception = {"center": [-7.75, 0, 3.10], "width": 5.40, "depth": 1.52, "bottom": .30, "top": 2.18}
before = set(bpy.context.scene.objects)
counter_outline = round_outline(5.40, 1.52, .26, 14)
extruded_outline("Projection Booth | rounded black reception solid carcass", counter_outline, .30, 2.10, COUNTER)
extruded_outline("Projection Booth | reception honed stone worktop", round_outline(5.46, 1.59, .27, 14), 2.10, 2.18, TOP)
extruded_outline("Projection Booth | reception grounded recessed foot", round_outline(5.16, 1.28, .22, 12), FLOOR_TOP, .32, BLACK)
outline_tube("Projection Booth | reception continuous warm pearl grounded toe", counter_outline, .31, .022, WHITE)
outline_tube("Projection Booth | reception fine pearl counter edge", round_outline(5.43, 1.56, .26, 14), 2.176, .010, WHITE)
line((-2.56, .35, .76), (-2.56, 2.07, .76), .018, TEAL)
# Use white brand mark on this reception, per the new mapping reference.
triangle_emblem((-1.70, 1.10, .78), .60)
glyph("livegrid AV", (-.95, 1.15, .797), .48, semibold=True, max_width=3.10)
glyph("RENTAL  |  SOLUTIONS  |  EXPERIENCES", (-1.64, .69, .797), .147, max_width=3.70, tracking=1.03)
box("Projection Booth | reception pale closed notebook", (-1.39, 2.205, .10), (1.15, .035, .62), SILVER, .011)
laptop = soft_box("Projection Booth | actual silver reception laptop lid", (-1.40, 2.52, -.05), (1.12, .65, .045), SILVER, .022)
laptop.rotation_euler[0] = .12
water_glass(1.69, 2.18, -.08)
flowers(2.08, 2.18, -.12, .21)
group("Projection Booth | complete left reception counter", before, reception["center"])

# One wide discovery kiosk and a second slim console in the foreground.
kiosk("Projection Booth | wide touch discovery desk", 7.25, 3.02, 2.85, 3.22, -.10, "projection-kiosk-wide")
kiosk("Projection Booth | slender touch display", -1.87, 3.44, 1.03, 2.80, .22, "projection-kiosk-slim")

# Interior lounge clusters are placed to the sides, leaving clear palace sight
# lines and a physical visitor route from the reception around the rail.
for x, z, yaw in ((-4.35, 2.0, 0), (-7.85, -.55, -.20), (5.15, 2.0, 0), (9.65, 1.4, 0)):
    lounge_chair(x, z, yaw, 1.35)
for x, z in ((-7.16, .16), (7.63, .25)):
    cafe_table(x, z)
    water_glass(x + .19, 1.44, z)
    flowers(x - .15, 1.44, z, .16)
sofa_v2(-7.90, -2.01, 2.10, .18)
sofa_v2(8.30, -1.98, 2.10, -.18)

# Dense varied foliage and two vertical planted strips soften the dark shell.
for name, x, z, h, r, seed in (("left outer", -10.41, 1.17, 2.35, .88, 11),
    ("left rear", -6.39, -3.20, 3.70, .88, 22), ("left screen", -9.94, -2.15, 3.22, .76, 33),
    ("right front", 10.39, 1.05, 3.22, .92, 44), ("right interior", 6.78, -2.88, 3.40, .90, 55),
    ("back left", -6.10, -4.86, 2.20, .71, 66), ("back right", 6.07, -4.96, 2.35, .76, 77)):
    feather_palm("Projection Booth | " + name + " feathered palm", x, z, h, r, seed)
for side in (-1, 1):
    for j in range(2):
        palm("Projection Booth | layered wall living foliage", side * 10.28, -4.20 + j * .44, 3.48 + .30 * (j % 2), .40, 80 + j + (side + 1) * 4)

# Local neutral industrial lattice, physically separate from booth fascia.
truss_before = set(bpy.context.scene.objects)
for z in (-6.55, -2.75, 1.10, 4.95):
    truss((-11.80, 11.65, z), (11.80, 11.65, z), .24)
for x in (-11.6, -7.75, -3.9, 0, 3.9, 7.75, 11.6):
    truss((x, 11.74, -6.70), (x, 11.74, 5.05), .24)
for ob in set(bpy.context.scene.objects) - truss_before:
    if ob.type == "MESH":
        ob.data.materials[0] = TRUSS


def material_batch(objects):
    bpy.context.view_layer.update()
    for ob in objects:
        if ob.type == "MESH":
            matrix = ob.matrix_world.copy()
            ob.parent = None
            ob.matrix_world = matrix
    groups = {}
    for ob in objects:
        if ob.type == "MESH":
            mat = ob.data.materials[0]
            if not mat.name.startswith("Projection Booth"):
                mat.name = "Projection Booth | " + mat.name.split(" | ")[-1]
            groups.setdefault(mat.name, []).append(ob)
    output = []
    for name, items in groups.items():
        bpy.ops.object.select_all(action="DESELECT")
        for ob in items:
            ob.select_set(True)
        bpy.context.view_layer.objects.active = items[0]
        if len(items) > 1:
            bpy.ops.object.join()
        ob = bpy.context.view_layer.objects.active
        ob.name = name
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        output.append(ob)
    return output


def export(path, objects):
    bpy.ops.object.select_all(action="DESELECT")
    for ob in objects:
        ob.select_set(True)
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(path), export_format="GLB", use_selection=True, export_yup=True,
        export_apply=True, export_materials="EXPORT", export_cameras=False, export_lights=False, export_animations=False,
        export_vertex_color="NAME", export_vertex_color_name="Col", export_all_vertex_colors=False)
    points = [ob.matrix_world @ Vector(corner) for ob in objects for corner in ob.bound_box]
    lo = [min(p[i] for p in points) for i in range(3)]
    hi = [max(p[i] for p in points) for i in range(3)]
    return {"file": path.name, "bytes": path.stat().st_size, "meshes": len(objects),
        "vertices": sum(len(ob.data.vertices) for ob in objects),
        "triangles": sum(sum(len(p.vertices) - 2 for p in ob.data.polygons) for ob in objects),
        "bounds": {"min": [lo[0], lo[2], -hi[1]], "max": [hi[0], hi[2], -lo[1]]}}


main_meshes = material_batch(list(bpy.context.scene.objects))
for ob in main_meshes:
    if ob.data.materials[0] == TRUSS:
        modifier = ob.modifiers.new("Realtime roof lattice topology", "DECIMATE")
        modifier.ratio = .55
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.modifier_apply(modifier=modifier.name)
ao_helper = Path(__file__).with_name("bake_technical_ao.py")
exec(compile(ao_helper.read_text(encoding="utf-8"), str(ao_helper), "exec"))
AO_STATS = bake_technical_ao(main_meshes, samples=32, max_seconds=140)
stats = export(OUT, main_meshes)
layout = {"version": 1, "authoringScale": 1, "root": ROOT_POSITION, "worldAnchor": ROOT_POSITION,
    "rootRotation": ROOT_ROTATION, "floorTop": FLOOR_TOP, "cameraSuggestion": HERO,
    "architecture": {"width": 23, "height": 10.90, "depth": 11.0, "frontFascia": "continuous swept black and broad champagne arch",
        "reception": reception, "palaceStage": {"min": [-6.2, .22, -3.55], "max": [6.2, 1.65, 1.25]},
        "canopies": [{"center": [0, 9.02, -.48], "radiusX": 6.75, "radiusZ": 3.87},
            {"center": [0, 8.73, -.34], "radiusX": 3.72, "radiusZ": 2.42}]},
    "apertures": SCREENS, "screens": SCREENS, "projectors": PROJECTORS,
    "interaction": {"position": [-7.75, 1.19, 3.89], "rotation": [0, 0, 0], "w": 5.10, "h": 1.58},
    "ambientOcclusion": AO_STATS, "stats": {"main": stats}}
LAYOUT_OUT.write_text(json.dumps(layout, indent=2), encoding="utf-8")
print("PROJECTION_MAPPING_STALL " + json.dumps(stats), flush=True)
