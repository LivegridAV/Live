"""Physical 12 x 5 x 4.5 m projection booth from the technical board.

This is a new shell, not a refit of the earlier two-leg rectangular scene.
Architecture is constructed in a useful design grid, then brought to the
technical board's exact metres before correctly sized furnishings are added.
All final coordinates and aperture metadata use Three XYZ, front +Z.
"""
from pathlib import Path

STALL_HELPER_FILE = Path(__file__).with_name("rebuild_projection_mapping_stall.py")
STALL_HELPER_SOURCE = STALL_HELPER_FILE.read_text(encoding="utf-8")
helper_source = STALL_HELPER_SOURCE.split("# A broad island")[0]
exec(compile(helper_source, str(STALL_HELPER_FILE), "exec"))
OUT = ROOT / "public/models/expo/projection-mapping-stall-v2.glb"
LAYOUT_OUT = ROOT / "public/models/expo/projection-mapping-v2-layout.json"
SCREENS, PROJECTORS = [], []
SCALE = Vector((12 / 23, 4.5 / 10.9, 5 / 11))
OFFSET = Vector((0, 0, 3 / 11))
ROOT_POSITION, ROOT_ROTATION = [10.2, 0, -189], [0, -math.pi / 2, 0]
PHYSICAL_FLOOR = .10
FLOOR_TOP = PHYSICAL_FLOOR / SCALE.y
for mat in bpy.data.materials:
    if mat.name.startswith("Projection Booth"):
        mat.name = "Projection Booth V2 | " + mat.name.split(" | ")[-1]
FASCIA = material("Projection Booth V2 | satin black curved fascia", (.006, .008, .010), .42, .36)
GREEN_FOLD_LIGHT = material("Projection Booth V2 | folded emerald metallic facet", (.006, .092, .054), .66, .31)


def sharp_sweep(name, path, widths, depths, mat):
    """Broad rectangular ribbon: four independent smooth strips, sharp edges.

    Independent face topology retains planar metal reveals instead of making
    a smoothed four-sided cross section resemble a luminous rounded pipe.
    The front surface is the path's Z, and physical depth extends behind it.
    """
    pts = [Vector(p) for p in path]
    cross_sections = []
    for j, p in enumerate(pts):
        tangent = pts[min(j + 1, len(pts) - 1)] - pts[max(0, j - 1)]
        normal = Vector((-tangent.y, tangent.x, 0)).normalized()
        half = widths[j] / 2
        cross_sections.append((p - normal * half, p + normal * half,
            p + normal * half - Vector((0, 0, depths[j])),
            p - normal * half - Vector((0, 0, depths[j]))))
    vertices, faces = [], []
    for face in range(4):
        start = len(vertices)
        for section in cross_sections:
            vertices.extend((section[face], section[(face + 1) % 4]))
        for j in range(len(pts) - 1):
            a = start + j * 2
            faces.append((a, a + 2, a + 3, a + 1))
    for end in (0, -1):
        start = len(vertices)
        vertices.extend(cross_sections[end])
        faces.append(tuple(start + j for j in ((3, 2, 1, 0) if end == 0 else (0, 1, 2, 3))))
    ob = patch_mesh(name, vertices, faces, mat)
    for p in ob.data.polygons[-2:]:
        p.use_smooth = False
    return ob


def interpolate(x, controls):
    if x <= controls[0][0]:
        return controls[0][1]
    for (a, y0), (b, y1) in zip(controls, controls[1:]):
        if x <= b:
            t = (x - a) / (b - a)
            t = t * t * (3 - 2 * t)
            return y0 + (y1 - y0) * t
    return controls[-1][1]


ARCH_CONTROLS = [(-10.57083, .25, 2.64), (-10.09083, 3.85, 2.73), (-9.22083, 7.60, 2.97),
    (-8.45083, 8.92, 3.24), (-6.80, 9.13, 3.42), (-3.20, 8.92, 3.62),
    (.80, 8.67, 3.71), (4.90, 8.35, 3.70), (7.60, 7.95, 3.51),
    (8.90, 6.70, 3.26), (9.80, 3.75, 3.04), (10.28, .25, 2.85)]
ARCH_PATH = catmull(ARCH_CONTROLS, 12)
ARCH_WIDTHS = [max(.36, p.x) for p in catmull([(w, 0, 0) for w in
    (.54, .615, .7875, .645, .46, .46, .47, .54, .84, 1.06, 1.02, .90)], 12)]
ARCH_UPPER_CROWN = []
for j in range(36, 97):
    tangent = ARCH_PATH[j + 1] - ARCH_PATH[j - 1]
    normal = Vector((-tangent.y, tangent.x, 0)).normalized()
    p = ARCH_PATH[j] + normal * ARCH_WIDTHS[j] / 2
    ARCH_UPPER_CROWN.append((p.x, p.y + .012))


def shell_bottom(x):
    # The fascia is fitted to the ACTUAL upper gold edge, not a disconnected
    # approximate curve that can slice through the arch beneath the wordmark.
    if ARCH_UPPER_CROWN[0][0] <= x <= ARCH_UPPER_CROWN[-1][0]:
        return interpolate(x, ARCH_UPPER_CROWN)
    if x < ARCH_UPPER_CROWN[0][0]:
        return interpolate(x, [(-11.5, 8.84), (-10.4, 8.94), ARCH_UPPER_CROWN[0]])
    return interpolate(x, [ARCH_UPPER_CROWN[-1], (9.8, 8.24), (11.5, 8.18)])


def put_fascia_text(body, p, height, **kwargs):
    return glyph(body, p, height, **kwargs)


def ring_geometry(name, center, rx, rz, pitch, inset=False):
    before = set(bpy.context.scene.objects)
    ellipse_annulus(name + " | broad black oval suspended ring", (rx + .22, rz + .22), (rx - .11, rz - .11), 0, 0, 0, .21, BLACK, 144)
    ellipse_annulus(name + " | flat champagne oval underside", (rx + .16, rz + .16), (rx - .08, rz - .08), 0, 0, -.045, .015, CHAMPAGNE, 144)
    outline_tube(name + " | thin warm integrated rim", ellipse_points(rx - .065, rz - .065, 0, 0, 144), -.052, .012, WHITE)
    pose_meshes(set(bpy.context.scene.objects) - before, center, Matrix.Rotation(pitch, 4, "X"))
    for angle in (-2.3, -.7, .9, 2.5):
        p = Matrix.Rotation(pitch, 4, "X") @ Vector((math.sin(angle) * rx, .19, math.cos(angle) * rz)) + Vector(center)
        rod(name + " | real thin ring suspension", p, (p.x, 10.13, p.z), .006, CABLE, 6)
    if inset:
        surface = Vector(center) + Vector((0, -math.cos(pitch), -math.sin(pitch))) * .060
        SCREENS.append({"id": "projection-ceiling-inner", "type": "ellipse", "x": surface.x, "y": surface.y, "z": surface.z,
            "w": rx * 2, "h": rz * 2, "radiusX": rx, "radiusZ": rz, "innerFraction": .93,
            "rotation": [math.pi / 2 + pitch, 0, 0], "mediaHint": "projection-ceiling"})


# Exact physical deck envelope after transformation. Angular front corners
# provide the deep island perspective visible in the reference photograph.
deck = [(-11.50, -6.10), (11.50, -6.10), (11.50, 3.10), (10.20, 4.90),
    (-4.95, 4.90), (-10.90, 3.88), (-11.50, 2.98)]
extruded_outline("Projection Booth V2 | angular twelve metre stone island", deck, .035, FLOOR_TOP, FLOOR)
deck_trim = [(x - math.copysign(.025, x), z - math.copysign(.025, z + .60)) for x, z in deck]
outline_tube("Projection Booth V2 | continuous fine warm platform edge", deck_trim, FLOOR_TOP + .022, .015, WHITE)
outline_tube("Projection Booth V2 | machined champagne platform joint", deck_trim, FLOOR_TOP + .004, .010, CHAMPAGNE)

# A deep rounded perimeter fascia, with actual side returns. The curved front
# is continuous with its left return and no longer a shallow flat banner.
outer = [(x, z - 1.20) for x, z in round_outline(23, 9.80, 1.12, 18)]
inner = [(x, z - 1.20) for x, z in round_outline(22.32, 9.12, .78, 18)]
# Densify straight spans too. Corner-only samples leave one enormous front
# quad whose straight lower edge cuts across a curved champagne crown.
dense_outer, dense_inner = [], []
for j in range(len(outer)):
    k = (j + 1) % len(outer)
    a, b = Vector(outer[j]), Vector(outer[k])
    ia, ib = Vector(inner[j]), Vector(inner[k])
    count = max(1, math.ceil((b - a).length / .25))
    for q in range(count):
        dense_outer.append(tuple(a.lerp(b, q / count)))
        dense_inner.append(tuple(ia.lerp(ib, q / count)))
outer, inner = dense_outer, dense_inner
vertices, faces = [], []
for (x, z), (ix, iz) in zip(outer, inner):
    blend = max(0, min(1, (z - 2.15) / 1.55))
    bottom = 8.82 * (1 - blend) + shell_bottom(x) * blend
    vertices.extend(((x, bottom, z), (x, 10.90, z), (ix, 10.90, iz), (ix, bottom, iz)))
for j in range(len(outer)):
    nxt = (j + 1) % len(outer)
    for q in range(4):
        faces.append((j * 4 + q, nxt * 4 + q, nxt * 4 + (q + 1) % 4, j * 4 + (q + 1) % 4))
ob = patch_mesh("Projection Booth V2 | continuous deep rounded black fascia and returns", vertices, faces, FASCIA)
for face in ob.data.polygons:
    face.use_smooth = False

# One coherent asymmetric champagne inner arch. It is a real broad planar
# return with substantial depth, not two gold tubes around a black outline.
path = ARCH_PATH
widths = ARCH_WIDTHS
depths = [1.25 + .18 * math.sin(j / (len(path) - 1) * math.pi) for j in range(len(path))]
sharp_sweep("Projection Booth V2 | substantial black integrated structural arch", [p - Vector((0, 0, .045)) for p in path],
    [w + .45 for w in widths], [d + .23 for d in depths], BLACK)
sharp_sweep("Projection Booth V2 | single broad champagne inner arch and soffit", path, widths, depths, CHAMPAGNE)
inner_edge = []
for j, p in enumerate(path):
    tangent = path[min(j + 1, len(path) - 1)] - path[max(0, j - 1)]
    normal = Vector((-tangent.y, tangent.x, 0)).normalized()
    inner_edge.append((p + normal * widths[j] / 2 + Vector((0, 0, .008)), .009))
sweep("Projection Booth V2 | restrained inner arch warm seam", inner_edge, WHITE, 7)

# Large folded emerald corner volumes, fully exposed outside the arch. Each
# facet has its own planar normal and a dark second return rather than decals.
for side in (-1, 1):
    physical = ([(-5.95, 4.20, 1.75), (-4.80, 4.49, 1.91), (-4.80, 4.00, 2.015), (-5.80, 2.78, 1.82)] if side == -1 else
        [(5.12, 4.48, 1.97), (5.90, 4.22, 1.81), (5.88, 3.22, 1.77), (5.20, 3.77, 2.05)])
    points = [tuple((p[i] - OFFSET[i]) / SCALE[i] for i in range(3)) for p in physical]
    for name, indices, mat in (("upper", (0, 1, 2), DEEP_GREEN), ("lower", (0, 2, 3), GREEN_FOLD_LIGHT)):
        facet = patch_mesh("Projection Booth V2 | " + name + " emerald planar corner fold", points, [indices], mat)
        for p in facet.data.polygons:
            p.use_smooth = False
    back = [(x, y, z - .24) for x, y, z in points]
    patch_mesh("Projection Booth V2 | emerald corner real metal depth return", points + back,
        [(j, (j + 1) % 4, (j + 1) % 4 + 4, j + 4) for j in range(4)], DEEP_GREEN)
    line(points[0], points[1], .010, TEAL)
    line(points[2], points[3], .010, TEAL)

# Integrated outer side walls: copy belongs on the actual LEFT RETURN, viewed
# from outside the booth at front-left. No independent foreground sign posts.
box("Projection Booth V2 | left continuous black outer return wall", (-11.34, 4.55, -1.39), (.28, 8.61, 9.41), WALL, .018)
box("Projection Booth V2 | right continuous black outer return wall", (11.34, 4.55, -1.39), (.28, 8.61, 9.41), WALL, .018)
box("Projection Booth V2 | integrated right front return cap", (10.57, 4.55, 3.16), (1.78, 8.61, .26), BLACK, .012)
for j, copy in enumerate(("BUILDINGS", "STAGES", "PRODUCTS", "INTERIORS", "EXPERIENCES")):
    glyph(copy, (-11.492, 6.76 - j * .43, -.20), .235, yaw=-math.pi / 2, max_width=2.30)
line((-11.495, 4.22, -.20), (-11.495, 4.22, .65), .009, CHAMPAGNE)
for j, copy in enumerate(("REAL SPACES", "REAL EMOTIONS")):
    glyph(copy, (-11.492, 3.42 - j * .42, -.20), .195, yaw=-math.pi / 2, max_width=2.30)
for j, copy in enumerate(("ANY", "SURFACE", "A CANVAS")):
    glyph(copy, (9.86, 8.34 - j * .44, 3.31), .24, max_width=1.30)
for j, copy in enumerate(("IDEAS", "MAPPED", "BIGGER")):
    glyph(copy, (11.492, 6.25 - j * .58, .10), .31, yaw=math.pi / 2, max_width=2.75, tracking=1.16)
line((11.475, 8.79, -5.88), (11.475, 8.79, 2.83), .018, TEAL)

# Sharp front fascia identity with adequate separation between logo and title.
# The main logo is authored after the dimensional warp below, so its natural
# typography is not stretched horizontally by the architecture's design grid.
put_fascia_text("PROJECTION MAPPING", (2.42, 9.78, 3.732), .31, tracking=1.26, max_width=6.50)
put_fascia_text("TRANSFORM SPACES INTO STORIES", (2.45, 9.27, 3.732), .21, tracking=1.19, max_width=6.46, mat=TEAL_BRAND)

# Recessed side application walls and slim vertical planted/gold architectural
# returns keep the interior open, rather than placing a flat wall at the front.
for x0, x1 in ((-10.50, -5.50), (5.50, 10.55)):
    box("Projection Booth V2 | recessed side graphite application wall", ((x0 + x1) / 2, 4.54, -4.75), (x1 - x0, 8.61, .19), WALL, .008)
box("Projection Booth V2 | deeply recessed main backdrop enclosure", (.38, 4.50, -6.00), (11.2, 8.52, .19), BLACK, .008)
for side in (-1, 1):
    for j in range(13):
        x = side * (10.05 + j * .085)
        box("Projection Booth V2 | long integrated green champagne architectural fin", (x, 4.50, -2.25), (.042, 8.52, .25), CHAMPAGNE if j % 4 == 0 else DEEP_GREEN, .005)
    line((side * 11.14, .28, -2.08), (side * 11.14, 8.65, -2.08), .010, TEAL)

for j, (py, caption) in enumerate(((3.30, "ARCHITECTURAL MAPPING"), (2.68, "STAGE MAPPING"),
        (2.06, "PRODUCT MAPPING"), (1.44, "INTERACTIVE SPACES"))):
    cx, cy, cz = -3.65 / SCALE.x, py / SCALE.y, (-.85 - OFFSET.z) / SCALE.z
    aperture("projection-application-" + str(j), (cx, cy, cz), 1.70 / SCALE.x, .50 / SCALE.y,
        "projection-application-" + str(j), yaw=.09, frame=.028)
    glyph(caption, (cx, cy - .33 / SCALE.y, cz + .06), .145, centered=True, max_width=1.66 / SCALE.x, semibold=True)
for j, copy in enumerate(("MAPPING", "PEOPLE", "EMOTIONS")):
    glyph(copy, (7.85, 7.22 - j * .44, -2.90), .27, max_width=2.90, tracking=1.08)
aperture("projection-hero", (8.93, 4.71, -2.84), 3.70, 2.33, "projection-hero", yaw=-.05, frame=.035)
glyph("FROM IMAGINATION", (8.93, 3.11, -2.795), .18, centered=True, tracking=1.08, max_width=3.50)
glyph("TO IMMERSION", (8.93, 2.75, -2.795), .18, centered=True, tracking=1.08, max_width=3.50)
for side in (-1, 1):
    aperture("projection-backdrop-" + ("left" if side == -1 else "right"), (side * 3.96 + .38, 4.46, -5.78), 3.80, 5.52, "projection-backdrop", frame=.025)

# Dark forest canopy is behind a SINGLE concentric ceiling-ring zone. The two
# real rings share pitch and height; they are not separately floating screens.
roof_center = Vector((0, 3.80 / SCALE.y, -.55))
rx, rz = 7.80, 4.20
pitch = -math.atan((SCALE.z / SCALE.y) * math.tan(.22))
before = set(bpy.context.scene.objects)
ellipse_annulus("Projection Booth V2 | broad dark forest annular canopy backing", (rx, rz), (rx * .28, rz * .28), 0, 0, .035, .12, BACK, 144)
pose_meshes(set(bpy.context.scene.objects) - before, roof_center, Matrix.Rotation(pitch, 4, "X"))
surface = roof_center + Vector((0, -math.cos(pitch), -math.sin(pitch))) * .055
SCREENS.append({"id": "projection-ceiling-outer", "type": "ellipse", "x": surface.x, "y": surface.y, "z": surface.z,
    "w": rx * 2, "h": rz * 2, "radiusX": rx, "radiusZ": rz, "innerFraction": .28,
    "rotation": [math.pi / 2 + pitch, 0, 0], "mediaHint": "projection-ceiling"})
ring_geometry("Projection Booth V2 | outer common ceiling ring", (0, 8.86, -.55), 7.22, 3.83, pitch)
ring_geometry("Projection Booth V2 | inner concentric ceiling ring", (0, 8.83, -.55), 4.18, 2.69, pitch, inset=True)

# Open roof rails and small practical downlights nest within the shell.
for z in (-5.30, -2.30, 1.15, 2.90):
    rod("Projection Booth V2 | fine black ceiling cross track", (-10.65, 9.05, z), (10.65, 9.05, z), .025, BRUSHED, 8)
for x in (-10.1, -8.4, -6.5, -4.6, -2.6, -.6, 1.4, 3.4, 5.4, 7.4, 9.6):
    for z in (-4.36, 2.86):
        rod("Projection Booth V2 | warm recessed practical housing", (x, 8.76, z), (x, 8.52, z), .073, BLACK, 12)
        disk("Projection Booth V2 | small warm practical optic", x, z, .046, 8.506, 8.52, WHITE)

# Model platform physical dimensions are independent of the old 12m maquette.
stage_x = .40 / SCALE.x
stage_w, stage_d = 5.00 / SCALE.x, 2.20 / SCALE.z
stage_z = (-.30 - OFFSET.z) / SCALE.z
stage_outline = [(x + stage_x, z + stage_z) for x, z in round_outline(stage_w, stage_d, .16, 12)]
extruded_outline("Projection Booth V2 | recessed five metre palace platform", stage_outline, FLOOR_TOP, .68 / SCALE.y, COUNTER)
outline_tube("Projection Booth V2 | palace brushed champagne fine upper edge", stage_outline, .68 / SCALE.y, .013, CHAMPAGNE)
outline_tube("Projection Booth V2 | palace restrained green lower cove", stage_outline, .20 / SCALE.y, .016, TEAL)


def warp_architecture():
    basis = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
    warp = Matrix.Translation(OFFSET) @ Matrix.Diagonal((*SCALE, 1))
    pose = basis @ warp @ basis.inverted()
    bpy.context.view_layer.update()
    originals = [(ob, ob.matrix_world.copy()) for ob in bpy.context.scene.objects if ob.type == "MESH"]
    for ob, matrix in originals:
        # Nonuniform scaling of a yawed cabinet contains shear. Assigning this
        # matrix to an Object silently decomposes it to rotation/scale and moves
        # the cabinet in front of its analytically warped media plane. Bake the
        # full affine pose into the actual vertices so both remain identical.
        if ob.data.users > 1:
            ob.data = ob.data.copy()
        ob.parent = None
        ob.data.transform(pose @ matrix)
        ob.data.update()
        ob.matrix_world = Matrix.Identity(4)
    for a in SCREENS:
        p = Vector((a["x"], a["y"], a["z"])) * SCALE + OFFSET
        a.update(x=p.x, y=p.y, z=p.z)
        if a["type"] == "ellipse":
            theta = a["rotation"][0]
            fit = math.hypot(SCALE.y * math.cos(theta), SCALE.z * math.sin(theta))
            a["radiusX"] *= SCALE.x
            a["radiusZ"] *= fit
            a["w"], a["h"] = a["radiusX"] * 2, a["radiusZ"] * 2
            a["rotation"] = [math.atan2(SCALE.z * math.sin(theta), SCALE.y * math.cos(theta)), 0, 0]
        else:
            yaw = a["rotation"][1]
            fit = math.hypot(SCALE.x * math.cos(yaw), SCALE.z * math.sin(yaw))
            a["w"] *= fit
            a["h"] *= SCALE.y
            a["width"], a["height"] = a["w"], a["h"]
            a["rotation"] = [0, math.atan2(SCALE.z * math.sin(yaw), SCALE.x * math.cos(yaw)), 0]


warp_architecture()
FLOOR_TOP = PHYSICAL_FLOOR
logo((-2.46, 3.91, 1.968), .375, max_width=2.10)


def scaled_prop(builder, position, scale=(1, 1, 1), yaw=0):
    global FLOOR_TOP
    before = set(bpy.context.scene.objects)
    FLOOR_TOP = 0
    builder()
    FLOOR_TOP = PHYSICAL_FLOOR
    pose = Matrix.Rotation(yaw, 4, "Y") @ Matrix.Diagonal((*scale, 1))
    pose_meshes(set(bpy.context.scene.objects) - before, position, pose)


# Real metre-scale furnishings are added AFTER the dimensional warp. The
# recessed clusters stay behind the discovery consoles and palace rail.
for x, z, yaw in ((-2.95, -.05, -.45), (-4.65, -.08, .45), (3.55, -.05, .45), (4.85, -.05, -.45)):
    scaled_prop(lambda: lounge_chair(0, 0, 0, 1.35), (x, FLOOR_TOP, z), (.58, .55, .55), yaw)
for x, z, yaw in ((-3.86, -1.12, .15), (4.04, -1.10, -.15)):
    scaled_prop(lambda: sofa_v2(0, 0, 2.10, 0), (x, FLOOR_TOP, z), (.66, .46, .55), yaw)
for x, z in ((-3.70, .88), (4.15, .95)):
    scaled_prop(lambda: cafe_table(0, 0), (x, FLOOR_TOP, z), (.37, .38, .37))
    flowers(x, .65, z, .095)
    water_glass(x + .10, .65, z)

# Three matching black projector housings are genuinely ceiling mounted. Their
# physical optics/lens metadata are in metres and line up with live rays.
projector_source = helper_source[helper_source.index("def projector("):helper_source.index("def kiosk(")]
projector_source = projector_source.replace("10.16", "4.15")
exec(compile(projector_source, "physical-projection-projector-helper", "exec"))
for name, lens, target, scale in (("Projection central projector", (0, 8.49, 1.45), (0, 4.55, -.62), .35),
        ("Projection left projector", (-4.65, 7.73, .46), (-3.06, 3.90, -.85), .29),
        ("Projection right projector", (4.65, 7.73, .46), (3.06, 3.90, -.85), .29)):
    physical_lens, physical_target = Vector(lens) * SCALE + OFFSET, Vector(target) * SCALE + OFFSET
    projector(name, physical_lens, physical_target, scale)
    PROJECTORS[-1]["radius"] = .68 if scale == .35 else .49

# Rounded 3.2m reception at front-left, fully clear of integrated return copy.
reception = {"center": [-4.32, .10, 1.60], "width": 3.20, "height": 1.05, "depth": .78, "top": 1.15}
before = set(bpy.context.scene.objects)
counter_outline = round_outline(3.20, .78, .115, 12)
extruded_outline("Projection Booth V2 | physical 3.2 metre rounded reception", counter_outline, 0, 1.00, COUNTER)
extruded_outline("Projection Booth V2 | thin dark reception stone top", round_outline(3.23, .81, .12, 12), 1.0, 1.05, TOP)
outline_tube("Projection Booth V2 | fine warm reception toe", counter_outline, .025, .009, WHITE)
outline_tube("Projection Booth V2 | fine pearl counter top edge", round_outline(3.22, .80, .12, 12), 1.048, .004, WHITE)
triangle_emblem((-1.20, .49, .401), .39)
glyph("livegrid AV", (-.72, .54, .408), .29, semibold=True, max_width=1.80)
glyph("RENTAL  |  SOLUTIONS  |  EXPERIENCES", (-1.18, .28, .409), .079, max_width=2.35, tracking=1.03)
box("Projection Booth V2 | small real silver reception laptop base", (-.82, 1.066, -.02), (.57, .028, .36), SILVER, .008)
soft_box("Projection Booth V2 | silver reception laptop screen lid", (-.82, 1.24, -.13), (.56, .34, .025), SILVER, .009)
flowers(1.19, 1.05, -.02, .10)
group("Projection Booth V2 | complete metre scale reception", before, reception["center"])


def physical_kiosk(id, p, width, height, depth, yaw=0):
    before = set(bpy.context.scene.objects)
    front, back = height - .34, height
    verts = [(-width / 2, 0, -depth / 2), (width / 2, 0, -depth / 2), (width / 2, 0, depth / 2), (-width / 2, 0, depth / 2),
        (-width / 2, back, -depth / 2), (width / 2, back, -depth / 2), (width / 2, front, depth / 2), (-width / 2, front, depth / 2)]
    patch_mesh("Projection Booth V2 | actual angled discovery kiosk", verts, [(0, 3, 2, 1), (0, 1, 5, 4), (1, 2, 6, 5), (3, 7, 6, 2), (0, 4, 7, 3), (4, 5, 6, 7)], COUNTER)
    for side in (-1, 1):
        line((side * width / 2, 0, depth / 2), (side * width / 2, front, depth / 2), .006, CHAMPAGNE)
    pitch = -math.atan2(depth, .34)
    aperture(id, (0, (front + back) / 2 + .012, 0), width - .10, math.hypot(depth, .34) - .085,
        "projection-kiosk", frame=.012, rotation=[pitch, 0, 0])
    if width > 1:
        glyph("EXPLORE", (0, .57, depth / 2 + .012), .083, centered=True, tracking=1.10)
        glyph("POSSIBILITIES", (0, .42, depth / 2 + .012), .083, centered=True, tracking=1.05)
    group("Projection Booth V2 | physical angled console complete", before, p, yaw)
    a = SCREENS[-1]
    q = Matrix.Rotation(yaw, 4, "Y") @ Vector((a["x"], a["y"], a["z"])) + Vector(p)
    a.update(x=q.x, y=q.y, z=q.z, rotation=[math.atan2(math.sin(pitch), math.cos(yaw) * math.cos(pitch)),
        math.asin(math.sin(yaw) * math.cos(pitch)), math.atan2(-math.sin(yaw) * math.sin(pitch), math.cos(yaw))])


physical_kiosk("projection-kiosk-wide", (3.30, FLOOR_TOP, 1.92), 1.45, 1.30, .67, -.12)
physical_kiosk("projection-kiosk-slim", (-1.90, FLOOR_TOP, 2.04), .50, 1.18, .39, .18)

# Small real barriers do not form a row of chairs at the front edge.
for x in (-1.95, -.85, .25, 1.35, 2.45):
    disk("Projection Booth V2 | small barrier grounded foot", x, .94, .065, FLOOR_TOP, FLOOR_TOP + .018, BRUSHED)
    rod("Projection Booth V2 | slim palace visitor rail post", (x, FLOOR_TOP, .94), (x, .76, .94), .012, BLACK, 10)
for j in range(4):
    x = -1.95 + j * 1.10
    sweep("Projection Booth V2 | subtle hanging dark barrier rope", [(Vector((x + 1.1 * k / 12, .75 - .05 * math.sin(math.pi * k / 12), .94)), .009) for k in range(13)], BLACK, 6)

# Slender planted strips, varied slim palms, and correct planter sizes keep
# screens and circulation visible while providing the reference's greenery.
for name, x, z, h, r, seed in (("left entrance", -5.55, .81, 1.45, .38, 12),
    ("left interior", -2.83, -1.52, 1.75, .44, 24), ("left living strip", -5.13, -1.19, 1.95, .33, 35),
    ("right entrance", 5.34, .72, 1.64, .42, 47), ("right interior", 2.92, -1.51, 1.85, .43, 59),
    ("rear left", -2.63, -2.02, 1.25, .35, 67), ("rear right", 2.99, -2.04, 1.28, .36, 78)):
    feather_palm("Projection Booth V2 | " + name + " slender palm", x, z, h, r, seed)

# Neutral local hall lattice is above the 4.5m booth, not counted as its height.
truss_before = set(bpy.context.scene.objects)
for z in (-2.65, -.65, 1.35, 2.66):
    truss((-6.17, 4.94, z), (6.17, 4.94, z), .10)
for x in (-6.1, -3.0, 0, 3.0, 6.1):
    truss((x, 5.00, -2.7), (x, 5.00, 2.75), .10)
for ob in set(bpy.context.scene.objects) - truss_before:
    if ob.type == "MESH":
        ob.data.materials[0] = TRUSS


# Batch semantic materials only after all metre-scale transforms are complete.
tail = STALL_HELPER_SOURCE
batch_source = tail[tail.index("def material_batch("):tail.index("main_meshes = material_batch(")]
batch_source = batch_source.replace('startswith("Projection Booth")', 'startswith("Projection Booth V2")').replace('"Projection Booth | "', '"Projection Booth V2 | "')
exec(compile(batch_source, "projection-v2-export-helpers", "exec"))
main_meshes = material_batch(list(bpy.context.scene.objects))
for ob in main_meshes:
    if ob.data.materials[0] == TRUSS:
        mod = ob.modifiers.new("Realtime neutral hall lattice", "DECIMATE")
        mod.ratio = .55
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.modifier_apply(modifier=mod.name)
ao_helper = Path(__file__).with_name("bake_technical_ao.py")
exec(compile(ao_helper.read_text(encoding="utf-8"), str(ao_helper), "exec"))
AO_STATS = bake_technical_ao(main_meshes, samples=32, max_distance=.32, max_seconds=100)
stats = export(OUT, main_meshes)
palace_scale = .40
layout = {"version": 2, "authoringScale": 1, "root": ROOT_POSITION, "worldAnchor": ROOT_POSITION, "rootRotation": ROOT_ROTATION,
    "floorTop": PHYSICAL_FLOOR, "cameraSuggestion": {"position": [-8.5, 1.85, 10.5], "look": [-.2, 2.35, -.15], "verticalFov": 38},
    "architecture": {"width": 12, "height": 4.5, "depth": 5, "frontFascia": "deep rounded fascia with one broad asymmetrical champagne inner arch",
        "deckBounds": {"min": [-6, .10, -2.5], "max": [6, .10, 2.5]},
        "zones": {"left": 3.8, "center": 4.8, "right": 3.0, "totalColumnAllowance": .4},
        "reception": reception, "palaceStage": {"min": [-2.10, .10, -1.40], "max": [2.90, .68, .80]}},
    "palacePlacement": {"center": [.40, .68, -.45], "sourceAnchor": [0, 1.65, -1.3],
        "position": [.40, .02, .07], "scale": [palace_scale, palace_scale, palace_scale], "uniformScale": palace_scale,
        "targetWidth": 4.68, "targetHeight": 2.30, "bottom": .68},
    "apertures": SCREENS, "screens": SCREENS, "projectors": PROJECTORS,
    "interaction": {"position": [-4.32, .64, 2.014], "rotation": [0, 0, 0], "w": 3.05, "h": .93},
    "ambientOcclusion": AO_STATS, "stats": {"main": stats}}
LAYOUT_OUT.write_text(json.dumps(layout, indent=2), encoding="utf-8")
print("PROJECTION_MAPPING_STALL_V2 " + json.dumps(stats), flush=True)
