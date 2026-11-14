"""Physical 12 x 5.5 x 5.8 m sculptural projection booth, latest reference.

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
OUT = ROOT / "public/models/expo/projection-mapping-stall-v3.glb"
LAYOUT_OUT = ROOT / "public/models/expo/projection-mapping-v3-layout.json"
SCREENS, PROJECTORS = [], []
SCALE = Vector((12 / 23, 5.8 / 10.9, 5.5 / 11))
OFFSET = Vector((0, 0, .30))
ROOT_POSITION, ROOT_ROTATION = [10.2, 0, -189], [0, -math.pi / 2, 0]
PHYSICAL_FLOOR = .10
FLOOR_TOP = PHYSICAL_FLOOR / SCALE.y
for mat in bpy.data.materials:
    if mat.name.startswith("Projection Booth"):
        mat.name = "Projection Booth V3 | " + mat.name.split(" | ")[-1]
FASCIA = material("Projection Booth V3 | satin black curved fascia", (.006, .008, .010), .42, .36)
GREEN_FOLD_LIGHT = material("Projection Booth V3 | folded emerald metallic facet", (.006, .092, .054), .66, .31)
HEADER_MINT = material("Projection Booth V3 | mint cyan illuminated header emblem", (.004, .36, .20), .03, .40, 1.10)
SIGNAGE_METRICS = []
SIGNAGE_OBJECTS = []


def readable_label(body, p, height, max_width=None, centered=False, yaw=0, mat=None):
    """Reference-weight metre-scale type with natural aspect and uniform fit."""
    before = set(bpy.context.scene.objects)
    bpy.ops.object.text_add(location=(0, 0, 0), rotation=(math.pi / 2, 0, 0))
    ob = bpy.context.object
    ob.name = "Gallery lettering | " + body
    ob.data.body = body
    ob.data.font = FONT
    ob.data.size = 1
    ob.data.space_character = 1.08
    ob.data.extrude = .0018
    ob.data.resolution_u = 6
    ob.data.align_x = "CENTER" if centered else "LEFT"
    ob.data.materials.append(mat or BRAND)
    bpy.ops.object.convert(target="MESH")
    ob = bpy.context.object
    group("Projection Booth V3 | reference lettering placement", before, p, yaw)
    lo = min(v.co.y for v in ob.data.vertices)
    hi = max(v.co.y for v in ob.data.vertices)
    factor = height / (hi - lo)
    natural_width = (max(v.co.x for v in ob.data.vertices) - min(v.co.x for v in ob.data.vertices)) * factor
    fit = min(1.0, max_width / natural_width) if max_width else 1.0
    for v in ob.data.vertices:
        v.co.y -= lo
        v.co *= factor * fit
    ob.data.update()
    SIGNAGE_METRICS.append({"body": body, "position": list(p), "yaw": yaw, "requestedCapHeight": height,
        "capHeight": height * fit, "width": natural_width * fit, "uniformFit": fit,
        "horizontalAspectRatio": 1, "font": "Segoe UI", "curveResolution": 6})
    SIGNAGE_OBJECTS.append((ob, SIGNAGE_METRICS[-1]))
    return ob


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

# The reference's right emerald soffit occupies a real gap between the black
# crown and the descending gold arch. Keep the crown's original upper curve,
# then lower only this gold shoulder, fading out before the grounded leg.
for p in ARCH_PATH:
    x = p.x * SCALE.x
    rise = max(0, min(1, (x - .20) / 3.40))
    fall = 1 - max(0, min(1, (x - 4.20) / 1.10))
    rise = rise * rise * (3 - 2 * rise)
    fall = fall * fall * (3 - 2 * fall)
    p.y -= .30 * rise * fall / SCALE.y


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
    if inset:
        ellipse_annulus(name + " | real inset cosmic ceiling substrate", (rx - .12, rz - .12),
            ((rx - .12) * .14, (rz - .12) * .14), 0, 0, -.025, .035, BACK, 144)
    pose_meshes(set(bpy.context.scene.objects) - before, center, Matrix.Rotation(pitch, 4, "X"))
    for angle in (-2.3, -.7, .9, 2.5):
        p = Matrix.Rotation(pitch, 4, "X") @ Vector((math.sin(angle) * rx, .19, math.cos(angle) * rz)) + Vector(center)
        rod(name + " | real thin ring suspension", p, (p.x, 10.13, p.z), .006, CABLE, 6)
    if inset:
        surface = Vector(center) + Vector((0, -math.cos(pitch), -math.sin(pitch))) * .060
        SCREENS.append({"id": "projection-ceiling-inner", "type": "ellipse", "x": surface.x, "y": surface.y, "z": surface.z,
            "w": (rx - .12) * 2, "h": (rz - .12) * 2, "radiusX": rx - .12, "radiusZ": rz - .12, "innerFraction": .14,
            "rotation": [math.pi / 2 + pitch, 0, 0], "mediaHint": "projection-ceiling"})


# Exact physical 12 x 5.5m deck after transformation. Angular front corners
# provide the deep island perspective visible in the reference photograph.
deck = [(-11.50, -6.10), (11.50, -6.10), (11.50, 3.10), (10.20, 4.90),
    (-4.95, 4.90), (-10.90, 3.88), (-11.50, 2.98)]
extruded_outline("Projection Booth V3 | angular twelve metre stone island", deck, .035, FLOOR_TOP, FLOOR)
deck_trim = [(x - math.copysign(.025, x), z - math.copysign(.025, z + .60)) for x, z in deck]
outline_tube("Projection Booth V3 | continuous fine warm platform edge", deck_trim, FLOOR_TOP + .022, .015, WHITE)
outline_tube("Projection Booth V3 | machined champagne platform joint", deck_trim, FLOOR_TOP + .004, .010, CHAMPAGNE)

# A deep rounded perimeter fascia, with actual side returns. The curved front
# is continuous with its left return and no longer a shallow flat banner.
# Real diagonal left return: the corner is a broad architectural face, not a
# green arrow glued to a rectangular banner. Main front lettering stays on the
# established Z2.15 plane. The right corner retains its rounded return.
physical_outer = [(5.65 + .35 * math.cos(a * math.pi / 24), 1.80 + .35 * math.sin(a * math.pi / 24)) for a in range(13)]
physical_outer.extend([(-3.85, 2.15), (-6.00, .35), (-6.00, -2.75), (6.00, -2.75)])
physical_inner = []
for j, p in enumerate(physical_outer):
    previous = Vector(physical_outer[j - 1])
    current = Vector(p)
    following = Vector(physical_outer[(j + 1) % len(physical_outer)])
    a, b = (current - previous).normalized(), (following - current).normalized()
    na, nb = Vector((-a.y, a.x)), Vector((-b.y, b.x))
    bisector = (na + nb).normalized()
    physical_inner.append(tuple(current + bisector * (.17 / max(.3, bisector.dot(na)))))
outer = [(x / SCALE.x, (z - OFFSET.z) / SCALE.z) for x, z in physical_outer]
inner = [(x / SCALE.x, (z - OFFSET.z) / SCALE.z) for x, z in physical_inner]
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
ob = patch_mesh("Projection Booth V3 | continuous deep rounded black fascia and returns", vertices, faces, FASCIA)
for face in ob.data.polygons:
    face.use_smooth = False

# One coherent asymmetric champagne inner arch. It is a real broad planar
# return with substantial depth, not two gold tubes around a black outline.
path = ARCH_PATH
widths = ARCH_WIDTHS
depths = [(.58 + .70 * math.sin(j / (len(path) - 1) * math.pi) ** .55) / SCALE.z for j in range(len(path))]
sharp_sweep("Projection Booth V3 | substantial black integrated structural arch", [p - Vector((0, 0, .045)) for p in path],
    [w + .45 for w in widths], [d + .23 for d in depths], BLACK)
sharp_sweep("Projection Booth V3 | single broad champagne inner arch and soffit", path, widths, depths, CHAMPAGNE)
inner_edge = []
for j, p in enumerate(path):
    tangent = path[min(j + 1, len(path) - 1)] - path[max(0, j - 1)]
    normal = Vector((-tangent.y, tangent.x, 0)).normalized()
    inner_edge.append((p + normal * widths[j] / 2 + Vector((0, 0, .008)), .009))
sweep("Projection Booth V3 | restrained inner arch warm seam", inner_edge, WHITE, 7)

# Large folded emerald corner volumes, fully exposed outside the arch. Each
# facet has its own planar normal and a dark second return rather than decals.
for physical in (
        [(-5.10, 5.78, 1.106), (-3.85, 5.78, 2.15), (-3.85, 5.05, 2.15), (-5.10, 3.35, 1.106)],
        [(-5.98, 5.78, .367), (-5.10, 5.78, 1.106), (-5.10, 4.75, 1.106), (-5.98, 4.75, .367)]):
    physical = [(x - .010, y, z + .012) for x, y, z in physical]
    points = [tuple((p[i] - OFFSET[i]) / SCALE[i] for i in range(3)) for p in physical]
    for name, indices, mat in (("upper", (0, 1, 2), DEEP_GREEN), ("lower", (0, 2, 3), DEEP_GREEN)):
        facet = patch_mesh("Projection Booth V3 | " + name + " emerald planar corner fold", points, [indices], mat)
        for p in facet.data.polygons:
            p.use_smooth = False
    back = [(x, y, z - .24) for x, y, z in points]
    patch_mesh("Projection Booth V3 | emerald corner real metal depth return", points + back,
        [(j, (j + 1) % 4, (j + 1) % 4 + 4, j + 4) for j in range(4)], DEEP_GREEN)
    line(points[0], points[1], .010, TEAL)
    line(points[2], points[3], .010, TEAL)

# Integrated outer side walls: copy belongs on the actual LEFT RETURN, viewed
# from outside the booth at front-left. No independent foreground sign posts.
box("Projection Booth V3 | left continuous black outer return wall", (-11.34, 4.55, -3.00), (.28, 8.61, 6.20), WALL, .018)
box("Projection Booth V3 | right continuous black outer return wall", (11.34, 4.55, -1.39), (.28, 8.61, 9.41), WALL, .018)
box("Projection Booth V3 | integrated right front return cap", (10.57, 4.55, 3.16), (1.78, 8.61, .26), BLACK, .012)
line((11.475, 8.79, -5.88), (11.475, 8.79, 2.83), .018, TEAL)

# All front branding is authored after the dimensional warp at natural aspect.

# Recessed side application walls and slim vertical planted/gold architectural
# returns keep the interior open, rather than placing a flat wall at the front.
for x0, x1 in ((-10.50, -4.40), (5.50, 10.55)):
    box("Projection Booth V3 | recessed side graphite application wall", ((x0 + x1) / 2, 4.54, -4.75), (x1 - x0, 8.61, .19), WALL, .008)
box("Projection Booth V3 | deeply recessed matte black sculptural backdrop", (0, 4.50, -6.00), (11.2, 8.52, .19), BLACK, .008)
for side in (-1, 1):
    for j in range(13):
        x = side * (10.05 + j * .085)
        box("Projection Booth V3 | long integrated green champagne architectural fin", (x, 4.50, -2.25), (.042, 8.52, .25), CHAMPAGNE if j % 4 == 0 else DEEP_GREEN, .005)
    line((side * 11.14, .28, -2.08), (side * 11.14, 8.65, -2.08), .010, TEAL)

for j, (py, caption) in enumerate(((3.95, "ARCHITECTURAL MAPPING"), (3.20, "STAGE MAPPING"),
        (2.45, "PRODUCT MAPPING"), (1.70, "INTERACTIVE SPACES"))):
    cx, cy, cz = -3.40 / SCALE.x, py / SCALE.y, (-.86 - OFFSET.z) / SCALE.z
    aperture("projection-application-" + str(j), (cx, cy, cz), 1.68 / SCALE.x, .60 / SCALE.y,
        "projection-application-" + str(j), yaw=-math.atan((SCALE.x / SCALE.z) * math.tan(.12)), frame=.028)
aperture("projection-hero", (4.15 / SCALE.x, 2.43 / SCALE.y, (-1.08 - OFFSET.z) / SCALE.z),
    2.10 / SCALE.x, 1.18 / SCALE.y, "projection-hero", yaw=-math.atan((SCALE.x / SCALE.z) * math.tan(.12)), frame=.035)
# There are deliberately no large vertical forest screens in this design.
# Dark physical flutes, climbing greenery and the sculpture provide the depth.

# Dark forest canopy is behind a SINGLE concentric ceiling-ring zone. The two
# real rings share pitch and height; they are not separately floating screens.
roof_center = Vector((0, 4.86 / SCALE.y, (-.35 - OFFSET.z) / SCALE.z))
rx, rz = 4.15 / SCALE.x, 2.25 / SCALE.z
pitch = -math.atan((SCALE.z / SCALE.y) * math.tan(.24))
before = set(bpy.context.scene.objects)
ellipse_annulus("Projection Booth V3 | broad dark forest annular canopy backing", (rx, rz), (rx * .28, rz * .28), 0, 0, .035, .12, BACK, 144)
pose_meshes(set(bpy.context.scene.objects) - before, roof_center, Matrix.Rotation(pitch, 4, "X"))
surface = roof_center + Vector((0, -math.cos(pitch), -math.sin(pitch))) * .055
SCREENS.append({"id": "projection-ceiling-outer", "type": "ellipse", "x": surface.x, "y": surface.y, "z": surface.z,
    "w": rx * 2, "h": rz * 2, "radiusX": rx, "radiusZ": rz, "innerFraction": .28,
    "rotation": [math.pi / 2 + pitch, 0, 0], "mediaHint": "projection-ceiling"})
ring_pitch = -math.atan((SCALE.z / SCALE.y) * math.tan(.24))
ring_geometry("Projection Booth V3 | outer common ceiling ring", (0, 4.60 / SCALE.y, (-.45 - OFFSET.z) / SCALE.z),
    2.90 / SCALE.x, 1.55 / SCALE.z, ring_pitch)
inner_pitch = -math.atan((SCALE.z / SCALE.y) * math.tan(.22))
ring_geometry("Projection Booth V3 | inner concentric ceiling ring", (0, 4.28 / SCALE.y, (-.45 - OFFSET.z) / SCALE.z),
    1.92 / SCALE.x, 1.12 / SCALE.z, inner_pitch, inset=True)

# Open roof rails and small practical downlights nest within the shell.
for z in (-5.30, -2.30, 1.15, 2.90):
    rod("Projection Booth V3 | fine black ceiling cross track", (-10.65, 9.05, z), (10.65, 9.05, z), .025, BRUSHED, 8)
for x in (-10.1, -8.4, -6.5, -4.6, -2.6, -.6, 1.4, 3.4, 5.4, 7.4, 9.6):
    for z in (-4.36, 2.86):
        rod("Projection Booth V3 | warm recessed practical housing", (x, 8.76, z), (x, 8.52, z), .073, BLACK, 12)
        disk("Projection Booth V3 | small warm practical optic", x, z, .046, 8.506, 8.52, WHITE)

# Model platform physical dimensions are independent of the old 12m maquette.
stage_x = 0
stage_w, stage_d = 4.70 / SCALE.x, 2.00 / SCALE.z
stage_z = (-.50 - OFFSET.z) / SCALE.z
stage_outline = [(x + stage_x, z + stage_z) for x, z in round_outline(stage_w, stage_d, .16, 12)]
extruded_outline("Projection Booth V3 | recessed sculpture demonstration platform", stage_outline, FLOOR_TOP, .72 / SCALE.y, COUNTER)
outline_tube("Projection Booth V3 | sculpture brushed champagne fine upper edge", stage_outline, .72 / SCALE.y, .013, CHAMPAGNE)
outline_tube("Projection Booth V3 | sculpture restrained green lower cove", stage_outline, .20 / SCALE.y, .016, TEAL)


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
logo_before = set(bpy.context.scene.objects)
logo((-2.20, 5.10, 2.166), .45, max_width=2.20)
for ob in set(bpy.context.scene.objects) - logo_before:
    if ob.type == "MESH":
        for slot in ob.material_slots:
            if slot.material == TEAL_BRAND:
                slot.material = HEADER_MINT
glyph("PROJECTION MAPPING", (.90, 5.14, 2.168), .19, tracking=1.24, max_width=3.30)
readable_label("TRANSFORM SPACES INTO STORIES", (.91, 4.83, 2.168), .15, max_width=3.25, mat=TEAL_BRAND)

for j, copy in enumerate(("ANY", "SURFACE", "A CANVAS")):
    readable_label(copy, (5.10, 5.17 - j * .27, 2.19), .15, max_width=.80)
for j, copy in enumerate(("IDEAS", "MAPPED", "BIGGER")):
    readable_label(copy, (5.9958, 3.70 - j * .31, .35), .18, yaw=math.pi / 2, max_width=1.75)

for j, (py, rows) in enumerate(((3.95, ("ARCHITECTURAL", "MAPPING")), (3.20, ("STAGE", "MAPPING")),
        (2.45, ("PRODUCT", "MAPPING")), (1.70, ("INTERACTIVE", "SPACES")))):
    if j < 3:
        readable_label(" ".join(rows), (-3.40, py - .425, -.825), .10, centered=True, max_width=1.78, yaw=-.12)
    else:
        # This caption sits above the foreground counter, on a real black ledge.
        before = set(bpy.context.scene.objects)
        box("Projection Booth V3 | lower gallery caption black ledge", (0, 1.325, 0), (1.65, .14, .012), BLACK, .004)
        pose_meshes(set(bpy.context.scene.objects) - before, (-3.40, 0, -.843), Matrix.Rotation(-.12, 4, "Y"))
        readable_label("INTERACTIVE SPACES", (-3.40, 1.275, -.829), .10, centered=True, max_width=1.59, yaw=-.12)
for j, copy in enumerate(("MAPPING", "PEOPLE", "EMOTIONS")):
    readable_label(copy, (3.15, 3.70 - j * .27, -1.12), .18, max_width=1.70)
readable_label("FROM IMAGINATION", (4.15, 1.70, -1.045), .13, centered=True, max_width=2.0)
readable_label("TO IMMERSION", (4.15, 1.48, -1.045), .13, centered=True, max_width=2.0)

# A clearly visible broad emerald underside follows the right champagne turn.
# It is a real metal volume behind the gold edge, not an emissive triangle.
green_pairs = []
for j, p in enumerate(ARCH_PATH):
    tangent = ARCH_PATH[min(j + 1, len(ARCH_PATH) - 1)] - ARCH_PATH[max(0, j - 1)]
    normal = Vector((-tangent.y, tangent.x, 0)).normalized()
    gold_edge = (p + normal * ARCH_WIDTHS[j] / 2) * SCALE + OFFSET
    if .35 <= gold_edge.x <= 4.75:
        top_y = shell_bottom(gold_edge.x / SCALE.x) * SCALE.y - .016
        bottom_y = max(gold_edge.y + .008, top_y - .55)
        if top_y > bottom_y + .018:
            green_pairs.append((Vector((gold_edge.x, top_y, 2.167)), Vector((gold_edge.x, bottom_y, gold_edge.z + .014))))
vertices, faces = [], []
for top, bottom in green_pairs:
    vertices.extend((top, bottom, bottom - Vector((0, 0, .25)), top - Vector((0, 0, .25))))
for j in range(len(green_pairs) - 1):
    for side in range(4):
        faces.append((j * 4 + side, (j + 1) * 4 + side, (j + 1) * 4 + (side + 1) % 4, j * 4 + (side + 1) % 4))
faces.extend(((3, 2, 1, 0), tuple(range((len(green_pairs) - 1) * 4, len(green_pairs) * 4))))
patch_mesh("Projection Booth V3 | emerald shoulder below black crown", vertices, faces, DEEP_GREEN)

# Matte black rear flutes retain genuine depth behind the sculptural maquette.
box("Projection Booth V3 | full black fluted rear wall backing", (0, 2.50, -2.65), (5.62, 4.80, .12), WALL, .012)
for j in range(44):
    box("Projection Booth V3 | individual fine black rear wall flute", (-2.64 + j * .123, 2.48, -2.546), (.035, 4.72, .075), BLACK, .005)
for side in (-1, 1):
    line((side * 2.77, .12, -2.50), (side * 2.77, 4.80, -2.50), .005, CHAMPAGNE)

# A narrow actual front return belongs to the continuous left wall. It sits
# behind the reception, so the service copy reads from the fitted front view
# without a foreground post masking the counter or the application gallery.
# This broad service wall follows the same diagonal plane as the crown and
# folded green corner. It is connected to the real left return, not a narrow
# frontal sign post. Its labels keep the previously established cap heights.
service_start = Vector((-5.98, .10, .367))
service_end = Vector((-5.10, .10, 1.106))
service_u = (service_end - service_start).normalized()
service_normal = Vector((-service_u.z, 0, service_u.x))
service_yaw = -math.atan2(service_u.z, service_u.x)
front = [service_start, service_end, service_end + Vector((0, 4.64, 0)), service_start + Vector((0, 4.64, 0))]
back = [p - service_normal * .13 for p in front]
patch_mesh("Projection Booth V3 | broad integrated diagonal black service return", front + back,
    [(0, 1, 2, 3), (7, 6, 5, 4)] + [(j, (j + 1) % 4, (j + 1) % 4 + 4, j + 4) for j in range(4)], BLACK)

def service_label(body, y, height, width):
    p = service_start + service_u * .05 + service_normal * .018
    p.y = y
    return readable_label(body, p, height, max_width=width, yaw=service_yaw)

for j, copy in enumerate(("BUILDINGS", "STAGES", "PRODUCTS", "INTERIORS", "EXPERIENCES")):
    service_label(copy, 4.10 - j * .26, .125, .60)
a = service_start + service_u * .05 + service_normal * .019
b = service_start + service_u * .35 + service_normal * .019
a.y = b.y = 2.88
line(a, b, .003, CHAMPAGNE)
for copy, y in (("REAL SPACES", 2.48), ("REAL EMOTIONS", 2.31)):
    service_label(copy, y, .11, .52)


def living_strip(name, x, z, bottom=.55, top=4.45, width=.22, seed=0):
    rng = random.Random(seed)
    box(name + " | planted dark wall backing", (x, (bottom + top) / 2, z), (width, top - bottom, .045), BLACK, .006)
    vertices, faces, palette = [], [], []
    for j in range(72):
        t = (j + .3) / 72
        p = Vector((x + rng.uniform(-width * .40, width * .40), bottom + (top - bottom) * t, z + .033))
        a = j * 2.39996
        leaflen = rng.uniform(.07, .145)
        direction = Vector((math.cos(a), math.sin(a) * .7, .25)).normalized() * leaflen
        side = Vector((-direction.y, direction.x, 0)).normalized() * leaflen * .29
        index = len(vertices)
        vertices.extend((p, p + direction * .55 + side, p + direction + Vector((0, 0, -.012)),
            p + direction * .55 - side, p + direction * .53 + Vector((0, 0, .019))))
        faces.extend(((index, index + 1, index + 4), (index + 1, index + 2, index + 4),
            (index + 2, index + 3, index + 4), (index + 3, index, index + 4)))
        palette.extend([rng.randrange(3)] * 4)
    ob = patch_mesh(name + " | individually modeled climbing green leaves", vertices, faces, LEAVES[0])
    for mat in LEAVES[1:]:
        ob.data.materials.append(mat)
    for face, index in zip(ob.data.polygons, palette):
        face.material_index = index


living_strip("Projection Booth V3 | left gallery living wall", -4.91, -1.31, .60, 4.55, .20, 17)
living_strip("Projection Booth V3 | left sculpture living wall", -2.53, -2.49, .72, 4.62, .20, 29)
living_strip("Projection Booth V3 | right sculpture living wall", 2.53, -2.49, .72, 4.62, .20, 43)


def scaled_prop(builder, position, scale=(1, 1, 1), yaw=0):
    global FLOOR_TOP
    before = set(bpy.context.scene.objects)
    FLOOR_TOP = 0
    builder()
    FLOOR_TOP = PHYSICAL_FLOOR
    pose = Matrix.Rotation(yaw, 4, "Y") @ Matrix.Diagonal((*scale, 1))
    pose_meshes(set(bpy.context.scene.objects) - before, position, pose)


# Real metre-scale furnishings are added AFTER the dimensional warp. The
# recessed clusters stay behind the discovery consoles and sculpture rail.
for x, z, yaw in ((-3.00, .15, -.60), (-4.15, .15, .65), (-2.50, 1.25, -.85),
        (2.95, .70, .65), (4.70, -.15, -.60), (4.85, 1.20, -.85)):
    scaled_prop(lambda: lounge_chair(0, 0, 0, 1.35), (x, FLOOR_TOP, z), (.58, .55, .55), yaw)
for x, z, yaw in ((-3.55, -1.55, .05), (4.15, -.70, -.15)):
    scaled_prop(lambda: sofa_v2(0, 0, 2.10, 0), (x, FLOOR_TOP, z), (.66, .46, .55), yaw)
for x, z in ((-3.25, -.15), (4.20, .30)):
    scaled_prop(lambda: cafe_table(0, 0), (x, FLOOR_TOP, z), (.37, .38, .37))
    flowers(x, .65, z, .095)
    water_glass(x + .10, .65, z)

# Matching black projector housings are genuinely ceiling mounted. Their
# physical optics/lens metadata are in metres and line up with live rays.
projector_source = helper_source[helper_source.index("def projector("):helper_source.index("def kiosk(")]
projector_source = projector_source.replace("10.16", "5.52")
exec(compile(projector_source, "physical-projection-projector-helper", "exec"))
for name, lens, target, scale, radius, opacity in (
        ("Projection central projector", (0, 4.10, 1.45), (0, 2.30, -.10), .35, .76, .10),
        ("Projection left projector", (-2.50, 4.40, .65), (-1.20, 2.25, -.10), .29, .56, .055),
        ("Projection right projector", (2.50, 4.40, .65), (1.20, 2.25, -.10), .29, .56, .055),
        ("Projection peripheral left projector", (-4.55, 4.65, .40), (-1.80, 1.80, -.20), .22, .36, .024),
        ("Projection peripheral right projector", (4.55, 4.65, .40), (1.80, 1.80, -.20), .22, .36, .024)):
    projector(name, lens, target, scale)
    PROJECTORS[-1].update(radius=radius, opacity=opacity, width=radius * 2, height=3.40)

# Rounded 3.0m reception at front-left, fully clear of integrated return copy.
reception = {"center": [-4.47, .10, 1.92], "width": 3.00, "height": 1.05, "depth": .78, "top": 1.15}
before = set(bpy.context.scene.objects)
counter_outline = round_outline(2.97, .78, .115, 12)
extruded_outline("Projection Booth V3 | physical 3.0 metre rounded reception", counter_outline, 0, 1.00, COUNTER)
extruded_outline("Projection Booth V3 | thin dark reception stone top", round_outline(3.00, .81, .12, 12), 1.0, 1.05, TOP)
outline_tube("Projection Booth V3 | fine warm reception toe", counter_outline, .025, .009, WHITE)
outline_tube("Projection Booth V3 | fine pearl counter top edge", round_outline(2.99, .80, .12, 12), 1.048, .004, WHITE)
triangle_emblem((-1.20, .49, .401), .39)
glyph("livegrid AV", (-.72, .54, .408), .29, semibold=True, max_width=1.80)
readable_label("RENTAL  |  SOLUTIONS  |  EXPERIENCES", (-1.18, .25, .409), .12, max_width=2.35)
box("Projection Booth V3 | small real silver reception laptop base", (-.82, 1.066, -.02), (.57, .028, .36), SILVER, .008)
soft_box("Projection Booth V3 | silver reception laptop screen lid", (-.82, 1.24, -.13), (.56, .34, .025), SILVER, .009)
flowers(1.19, 1.05, -.02, .10)
group("Projection Booth V3 | complete metre scale reception", before, reception["center"])


def physical_kiosk(id, p, width, height, depth, yaw=0):
    before = set(bpy.context.scene.objects)
    front, back = height - .34, height
    verts = [(-width / 2, 0, -depth / 2), (width / 2, 0, -depth / 2), (width / 2, 0, depth / 2), (-width / 2, 0, depth / 2),
        (-width / 2, back, -depth / 2), (width / 2, back, -depth / 2), (width / 2, front, depth / 2), (-width / 2, front, depth / 2)]
    patch_mesh("Projection Booth V3 | actual angled discovery kiosk", verts, [(0, 3, 2, 1), (0, 1, 5, 4), (1, 2, 6, 5), (3, 7, 6, 2), (0, 4, 7, 3), (4, 5, 6, 7)], COUNTER)
    for side in (-1, 1):
        line((side * width / 2, 0, depth / 2), (side * width / 2, front, depth / 2), .006, CHAMPAGNE)
    pitch = -math.atan2(depth, .34)
    aperture(id, (0, (front + back) / 2 + .012, 0), width - .10, math.hypot(depth, .34) - .085,
        "projection-kiosk", frame=.012, rotation=[pitch, 0, 0])
    if width > 1:
        readable_label("EXPLORE", (0, .61, depth / 2 + .012), .135, centered=True, max_width=width - .18)
        readable_label("POSSIBILITIES", (0, .40, depth / 2 + .012), .135, centered=True, max_width=width - .18)
    group("Projection Booth V3 | physical angled console complete", before, p, yaw)
    a = SCREENS[-1]
    q = Matrix.Rotation(yaw, 4, "Y") @ Vector((a["x"], a["y"], a["z"])) + Vector(p)
    a.update(x=q.x, y=q.y, z=q.z, rotation=[math.atan2(math.sin(pitch), math.cos(yaw) * math.cos(pitch)),
        math.asin(math.sin(yaw) * math.cos(pitch)), math.atan2(-math.sin(yaw) * math.sin(pitch), math.cos(yaw))])


physical_kiosk("projection-kiosk-wide", (3.32, FLOOR_TOP, 2.05), 1.45, 1.30, .67, -.12)
physical_kiosk("projection-kiosk-slim", (-1.10, FLOOR_TOP, 2.22), .50, 1.18, .39, .18)

# Small real barriers do not form a row of chairs at the front edge.
for x in (-2.15, -1.075, 0, 1.075, 2.15):
    disk("Projection Booth V3 | small barrier grounded foot", x, .86, .065, FLOOR_TOP, FLOOR_TOP + .018, BRUSHED)
    rod("Projection Booth V3 | slim sculpture visitor rail post", (x, FLOOR_TOP, .86), (x, .82, .86), .012, BLACK, 10)
for j in range(4):
    x = -2.15 + j * 1.075
    sweep("Projection Booth V3 | subtle hanging dark barrier rope", [(Vector((x + 1.075 * k / 12, .81 - .05 * math.sin(math.pi * k / 12), .86)), .009) for k in range(13)], BLACK, 6)

# Slender planted strips, varied slim palms, and correct planter sizes keep
# screens and circulation visible while providing the reference's greenery.
for name, x, z, h, r, seed in (("left entrance", -5.55, .81, 1.45, .38, 12),
    ("left interior", -2.83, -1.52, 2.35, .44, 24), ("left living strip", -5.13, -1.19, 2.75, .33, 35),
    ("right entrance", 5.34, .72, 2.10, .42, 47), ("right interior", 2.92, -1.51, 2.45, .43, 59),
    ("rear left", -2.63, -2.02, 1.25, .35, 67), ("rear right", 2.99, -2.04, 1.28, .36, 78)):
    feather_palm("Projection Booth V3 | " + name + " slender palm", x, z, h, r, seed)

# Neutral local hall lattice is above the 5.8m booth, not counted as its height.
truss_before = set(bpy.context.scene.objects)
for z in (-5.50, -3.00, -.50, 2.00, 4.50):
    truss((-11.0, 6.70, z), (11.0, 6.70, z), .17)
for x in (-10.0, -7.5, -5.0, -2.5, 0, 2.5, 5.0, 7.5, 10.0):
    truss((x, 6.88, -6.00), (x, 6.88, 5.80), .17)
for ob in set(bpy.context.scene.objects) - truss_before:
    if ob.type == "MESH":
        ob.data.materials[0] = TRUSS
ROOF_OPTIC = material("Projection Booth V3 | production roof truss integrated warm optic", (.90, .72, .42), 0, .40, 1.6)
for x in (-8.5, -5.2, -2.0, 1.2, 4.5, 7.8):
    for z in (-3.0, 2.0):
        rod("Projection Booth V3 | production roof truss warm fixture", (x, 6.65, z), (x, 6.35, z), .075, TRUSS, 12)
        disk("Projection Booth V3 | production roof truss warm optical lens", x, z, .047, 6.315, 6.33, ROOF_OPTIC)


# Batch semantic materials only after all metre-scale transforms are complete.
bpy.context.view_layer.update()
for ob, record in SIGNAGE_OBJECTS:
    points = [ob.matrix_world @ v.co for v in ob.data.vertices]
    positions = [[p.x, p.z, -p.y] for p in points]
    origin = ob.matrix_world @ Vector((0, 0, 0))
    record["position"] = [origin.x, origin.z, -origin.y]
    record["bounds"] = {"min": [min(p[i] for p in positions) for i in range(3)],
        "max": [max(p[i] for p in positions) for i in range(3)]}
tail = STALL_HELPER_SOURCE
batch_source = tail[tail.index("def material_batch("):tail.index("main_meshes = material_batch(")]
batch_source = batch_source.replace('startswith("Projection Booth")', 'startswith("Projection Booth V3")').replace('"Projection Booth | "', '"Projection Booth V3 | "')
exec(compile(batch_source, "projection-v3-export-helpers", "exec"))
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
layout = {"version": 3, "authoringScale": 1, "root": ROOT_POSITION, "worldAnchor": ROOT_POSITION, "rootRotation": ROOT_ROTATION,
    "floorTop": PHYSICAL_FLOOR, "deckPolygonXZ": [[x * SCALE.x, z * SCALE.z + OFFSET.z] for x, z in deck],
    "cameraSuggestion": {"position": [-4.9, 2.35, 14.0], "look": [0, 2.95, -.25], "verticalFov": 34, "aspect": 1450 / 700},
    "architecture": {"width": 12, "height": 5.8, "depth": 5.5, "frontFascia": "diagonal integrated emerald left return; deep champagne arch; layered cosmic ceiling",
        "dimensions": {"width": 12, "height": 5.8, "depth": 5.5},
        "deckBounds": {"min": [-6, .10, -2.75], "max": [6, .10, 2.75]},
        "deckPolygon": [[x * SCALE.x, z * SCALE.z + OFFSET.z] for x, z in deck],
        "deckPolygonXZ": [[x * SCALE.x, z * SCALE.z + OFFSET.z] for x, z in deck],
        "zones": {"left": 3.8, "center": 4.4, "right": 3.8},
        "reception": reception,
        "stage": {"center": [0, .72, -.50], "width": 4.70, "depth": 2.00, "top": .72,
            "min": [-2.35, .10, -1.50], "max": [2.35, .72, .50]},
        "sculptureStage": {"min": [-2.35, .10, -1.50], "max": [2.35, .72, .50]}},
    "modelPlacement": {"position": [0, .72, -.45], "scale": [1, 1, 1], "sourceAnchor": [0, 0, 0],
        "targetWidth": 4.30, "targetHeight": 2.49, "bottom": .72},
    "apertures": SCREENS, "screens": SCREENS, "projectors": PROJECTORS,
    "interaction": {"position": [-4.47, .64, 2.334], "rotation": [0, 0, 0], "w": 2.85, "h": .93},
    "typography": SIGNAGE_METRICS,
    "ambientOcclusion": AO_STATS, "stats": {"main": stats}}
LAYOUT_OUT.write_text(json.dumps(layout, indent=2), encoding="utf-8")
print("PROJECTION_MAPPING_STALL_V3 " + json.dumps(stats), flush=True)
