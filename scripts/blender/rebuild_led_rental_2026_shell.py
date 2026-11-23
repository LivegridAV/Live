"""New October 2026 rectilinear LED Rental booth shell.

Geometry authority: Livegrid AV Booth.png and Livegrid AV Booth Views.png.
Three coordinates: X right, Y up, front +Z. No retired booth construction runs.
Runtime owns emitting LED faces, animated products, furniture and visitors.
"""
from pathlib import Path
import hashlib
import sys
from mathutils import Matrix

HELPERS = Path(__file__).with_name("exhibition_base_helpers.py")
exec(compile(HELPERS.read_text(encoding="utf-8"), str(HELPERS), "exec"))
# Arial Narrow (ARIALN.TTF) is not installed on the build machine; the
# condensed captions use Segoe UI Semibold, fitted by label() to the same width.
CONDENSED_FONT = bpy.data.fonts.load("C:/Windows/Fonts/seguisb.ttf", check_existing=True)
PREFIX = "LED Rental 2026 | "
OUT = ROOT / "public/models/expo/led-rental-2026-shell.glb"
LAYOUT_OUT = ROOT / "public/models/expo/led-rental-2026-layout.json"
QA = ROOT / "qa/led-rental-2026"
QA.mkdir(parents=True, exist_ok=True)

BLACK = material(PREFIX + "matte black powdercoat", (.006, .008, .010), .28, .42)
WALL = material(PREFIX + "charcoal architectural panel", (.008, .010, .013), .12, .63)
CABINET = material(PREFIX + "ventilated graphite LED cabinet", (.011, .015, .019), .44, .45)
TRIM = material(PREFIX + "brushed dark aluminium edge", (.043, .052, .059), .78, .30)
GOLD = material(PREFIX + "satin champagne metal", (.34, .27, .18), .84, .30)
TEAL = material(PREFIX + "teal continuous LED edge", (.012, .65, .48), .08, .28, 2.0)
WARM = material(PREFIX + "warm white 3000K trim", (1.0, .68, .35), .02, .30, 1.8)
WHITE = material(PREFIX + "white brand lettering", (.84, .90, .94), .04, .34, .25)
MINT = material(PREFIX + "illuminated teal brand emblem", (.003, .50, .35), .10, .34, .9)
CABLE = material(PREFIX + "fine stainless suspension cable", (.13, .15, .16), .78, .36)
RIG = material(PREFIX + "production black truss steel", (.036, .043, .051), .68, .40)
LENS = material(PREFIX + "warm spotlight lens", (1.0, .76, .52), .02, .24, 2.5)

SIGNAGE = []
FIXTURES = []
APERTURES = []
PRODUCTS = []


def transform(objects, p=(0, 0, 0), yaw=0):
    basis = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
    pose = basis @ (Matrix.Translation(Vector(p)) @ Matrix.Rotation(yaw, 4, "Y")) @ basis.inverted()
    bpy.context.view_layer.update()
    for ob in objects:
        if ob.type != "MESH":
            continue
        matrix = pose @ ob.matrix_world.copy()
        ob.parent = None
        for v in ob.data.vertices:
            v.co = matrix @ v.co
        ob.matrix_world = Matrix.Identity(4)


def label(body, p, height, width=None, centered=False, yaw=0, tracking=1.06, semibold=False, mat=WHITE, font=None,
          *, premium=False, accent=None, slogan=False):
    """Uniformly fit physical vector glyphs; never stretch their aspect ratio.

    premium=True (opt-in) builds a premium sign: the livegridAV wordmark goes
    through premium_wordmark (Space Grotesk `livegrid` + aqua `AV`, ink bottom
    on p.y, ink left on p.x, backs on p's plane); any other body is built as
    today and deepened in place by premiumize_lettering before the transform
    is baked (local +Z still faces the visitor). `accent` (default: a teal or
    mint `mat`) gives an aqua face; `slogan` marks non-name copy."""
    global FONT
    if premium and premium_signage().is_wordmark(body):
        return premium_label_wordmark(p, height, width, centered, yaw)
    before = set(bpy.context.scene.objects)
    previous_font = FONT
    FONT = font or (CAPTION_FONT if semibold else FONT)
    ob = lettering(body, (0, 0, 0), 1, centered, tracking, semibold)
    FONT = previous_font
    ob.name = PREFIX + "lettering " + body
    ob.data.materials[0] = mat
    low = min(v.co.y for v in ob.data.vertices)
    high = max(v.co.y for v in ob.data.vertices)
    factor = height / (high - low)
    natural = (max(v.co.x for v in ob.data.vertices) - min(v.co.x for v in ob.data.vertices)) * factor
    fit = min(1, width / natural) if width else 1
    for v in ob.data.vertices:
        v.co.y -= low
        v.co *= factor * fit
    if premium:
        if accent is None:
            accent = any(word in mat.name.lower() for word in ("teal", "mint", "cyan", "aqua"))
        premium_signage().premiumize_lettering([ob], body, accent=accent, slogan=slogan, position=p)
    transform(set(bpy.context.scene.objects) - before, p, yaw)
    SIGNAGE.append({"body": body, "position": list(p), "height": height * fit,
        "width": natural * fit, "yaw": yaw, "uniformScale": True, **({"premium": True} if premium else {})})
    return ob


def premium_label_wordmark(p, height, width=None, centered=False, yaw=0):
    """label(premium=True) for the wordmark: the premium livegridAV pair in
    label()'s ink box (as the approved test placed it). Returns its objects;
    SIGNAGE records the fitted ink height and width (the halo is sized from it)."""
    signs = premium_signage()
    obs = signs.premium_wordmark(p, height, width, centered=centered, yaw=yaw,
                                 place=lambda objects, at, turn: None)
    xs = [v.co.x for ob in obs for v in ob.data.vertices]
    ys = [v.co.y for ob in obs for v in ob.data.vertices]
    transform(set(obs), p, yaw)
    SIGNAGE.append({"body": "livegridAV", "position": list(p), "height": max(ys) - min(ys),
        "width": max(xs) - min(xs), "yaw": yaw, "uniformScale": True, "premium": True})
    return obs


def emblem(p, height, yaw=0):
    before = set(bpy.context.scene.objects)
    polygons = [[(0, 0), (0, 1), (.18, .88), (.18, .30)],
        [(.18, .88), (.72, .49), (.72, .31), (.35, .52)],
        [(0, 0), (.72, .31), (.72, .49), (.18, .25)]]
    for poly in polygons:
        verts = [(x * height, y * height, z) for z in (-.012, .012) for x, y in poly]
        n = len(poly)
        faces = [tuple(range(n - 1, -1, -1)), tuple(range(n, n * 2))]
        faces.extend((i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n))
        ob = patch_mesh(PREFIX + "folded triangular teal brand emblem", verts, faces, MINT)
        for face in ob.data.polygons:
            face.use_smooth = False
    transform(set(bpy.context.scene.objects) - before, p, yaw)


def mark_overhead(objects):
    for ob in objects:
        if ob.type == "MESH":
            ob["ledRentalOverhead"] = True


def segment_box(name, a, b, bottom, top, depth, mat, overhead=False):
    """A rectangular-plan folded fascia segment, its front on the supplied line."""
    a, b = Vector((a[0], 0, a[1])), Vector((b[0], 0, b[1]))
    direction = (b - a).normalized()
    normal = Vector((-direction.z, 0, direction.x))
    front = [a, b, b - normal * depth, a - normal * depth]
    verts = [(v.x, y, v.z) for y in (bottom, top) for v in front]
    faces = [(3, 2, 1, 0), (4, 5, 6, 7), (0, 1, 5, 4),
        (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    ob = patch_mesh(PREFIX + name, verts, faces, mat)
    for face in ob.data.polygons:
        face.use_smooth = False
    if overhead:
        ob["ledRentalOverhead"] = True
    return ob


def line(name, a, b, radius, mat, overhead=False):
    ob = rod(PREFIX + name, a, b, radius, mat, 8)
    if overhead:
        ob["ledRentalOverhead"] = True
    return ob


def screen_cabinet(id, position, width, height, hint, depth=.15, frame=.035):
    x, y, z = position
    box(PREFIX + id + " rear LED cabinet", (x, y, z - depth / 2 - .012),
        (width + frame * 2, height + frame * 2, depth), CABINET, .012)
    for side in (-1, 1):
        box(PREFIX + id + " vertical precision bezel", (x + side * (width / 2 + frame / 2), y, z),
            (frame, height + frame * 2, .026), TRIM, .004)
        box(PREFIX + id + " horizontal precision bezel", (x, y + side * (height / 2 + frame / 2), z),
            (width, frame, .026), TRIM, .004)
    APERTURES.append({"id": id, "position": list(position), "w": width, "h": height,
        "rotation": [0, 0, 0], "mediaHint": hint})


def suspension(x, y_top, z, width):
    for side in (-1, 1):
        line("product taut suspension cable", (x + side * width * .36, y_top, z),
            (x + side * width * .36, 7.04, z), .005, CABLE)
        box(PREFIX + "suspension ceiling fixing", (x + side * width * .36, 7.05, z),
            (.07, .035, .07), TRIM, .003)


# Three real architectural volumes make the back of the open U plan.
box(PREFIX + "left product showcase graphite wall", (-7.12, 3.59, -4.86), (7.78, 6.94, .25), WALL, .018)
box(PREFIX + "main LED backing architectural wall", (1.35, 3.59, -5.015), (9.46, 6.94, .25), WALL, .018)
box(PREFIX + "right application display architectural wall", (8.55, 3.59, -4.58), (4.72, 6.94, .25), WALL, .018)
box(PREFIX + "left architectural side return", (-11.01, 3.59, -.58), (.24, 6.94, 8.75), BLACK, .018)
box(PREFIX + "right architectural side return", (11.01, 3.59, -.03), (.24, 6.94, 9.6), BLACK, .018)

# Fine full-height panel joints are actual recessed dark seams.
for x in (-10.85, -8.4, -5.9, -3.35):
    box(PREFIX + "left wall vertical joint", (x, 3.59, -4.727), (.012, 6.86, .008), BLACK, 0)
for y in (1.47, 2.64, 3.81, 4.98, 6.15):
    box(PREFIX + "right wall horizontal precision joint", (8.55, y, -4.448), (4.68, .012, .008), BLACK, 0)

PIERS = [(-10.9, 3.8, .32, .45), (-3.05, -3.5, .38, .65), (10.9, 4.45, .36, .48)]
for x, z, w, d in PIERS:
    box(PREFIX + "slender matte black structural pier", (x, 3.585, z), (w, 6.93, d), BLACK, .013)
    box(PREFIX + "pier base stainless shadow plinth", (x, .18, z), (w + .06, .12, d + .06), TRIM, .006)

# Rectilinear fascia with two crisp folded ends; no curved canopy or sweeping arch.
FASCIA_PLAN = [(-11.0, 4.8), (-9.8, 3.8), (5.8, 3.8), (10.9, 4.8)]
for a, b in zip(FASCIA_PLAN, FASCIA_PLAN[1:]):
    segment_box("folded rectangular black upper fascia", a, b, 7.05, 8.4, .42, BLACK, True)
    segment_box("continuous teal fascia underside reveal", a, b, 7.035, 7.064, .12, TEAL, True)
    line("warm white fine crown edge", (a[0], 8.39, a[1]), (b[0], 8.39, b[1]), .008, WARM, True)
segment_box("left solid fascia return", (-11.0, -4.9), (-11.0, 4.8), 7.05, 8.4, .40, BLACK, True)
segment_box("right solid fascia return", (10.9, 4.8), (10.9, -4.8), 7.05, 8.4, .40, BLACK, True)
line("left side continuous teal underside", (-10.98, 7.04, -4.8), (-10.98, 7.04, 4.8), .011, TEAL, True)
line("right side continuous teal underside", (10.88, 7.04, -4.8), (10.88, 7.04, 4.8), .011, TEAL, True)

before = set(bpy.context.scene.objects)
emblem((-9.35, 7.18, 3.833), 1.06)
label("livegrid AV", (-8.35, 7.24, 3.837), .95, 5.65, semibold=True, tracking=1.0)
label("LED RENTAL SOLUTIONS", (.20, 7.70, 3.837), .165, 4.6, tracking=1.48)
label("FOR EVERY VISION", (.20, 7.39, 3.837), .165, 4.4, tracking=1.48)
right_a, right_b = Vector(FASCIA_PLAN[2]), Vector(FASCIA_PLAN[3])
right_direction = right_b - right_a
right_yaw = -math.atan2(right_direction.y, right_direction.x)
right_x = 8.17
right_z = right_a.y + (right_x - right_a.x) / right_direction.x * right_direction.y + .034
for i, body in enumerate(("STAGES", "EVENTS", "EXHIBITIONS", "BRANDS", "FIXED INSTALLATIONS", "AND MORE")):
    label(body, (right_x, 7.99 - i * .145, right_z), .105, 2.45, yaw=right_yaw, tracking=1.15)
line("right fascia teal vertical divider", (7.94, 7.21, right_z - .045), (7.94, 8.03, right_z - .045), .008, TEAL)
mark_overhead(set(bpy.context.scene.objects) - before)

# Outer side identity and simple service copy match the reference's vertical return.
emblem((11.142, 5.25, 3.26), 1.02, math.pi / 2)
for i, body in enumerate(("IDEAS", "IN", "MOTION")):
    label(body, (11.145, 4.00 - i * .25, 3.0), .16, 1.1, yaw=math.pi / 2, tracking=1.10)
line("right return teal edge", (11.146, .22, 4.50), (11.146, 7.04, 4.50), .011, TEAL)

# A broad front-facing branding return sits just behind the reception cabinet.
# Its front face clears the cabinet's z=2.925 rear edge by four centimetres.
box(PREFIX + "front right full height branding blade", (10.6, 3.585, 2.795), (1.1, 6.93, .18), BLACK, .012)
emblem((10.30, 5.75, 2.902), .74)
for i, body in enumerate(("IDEAS", "IN", "MOTION")):
    label(body, (10.46, 4.95 - i * .30, 2.904), .13, .74, centered=True, tracking=1.12)
line("right front blade fine teal edge", (11.105, .22, 2.908), (11.105, 7.04, 2.908), .008, TEAL)

# Vertical champagne slat banks beside the main LED add architectural depth.
for x0, count in ((6.32, 12), (-3.32, 5)):
    for i in range(count):
        x = x0 + (i - (count - 1) / 2) * .055
        box(PREFIX + "champagne architectural vertical fin", (x, 3.58, -4.43), (.022, 6.78, .19), GOLD, .003)
    box(PREFIX + "fin bank upper warm reveal", (x0, 6.99, -4.304), (count * .055, .025, .025), WARM, .003)

# The main and application wall cabinets have open, perfectly registered live faces.
screen_cabinet("main-backdrop", (1.35, 4.05, -4.75), 9.1, 5.85, "rental-2026-main", .19, .045)
for i, y in enumerate((6.10, 4.95, 3.80, 2.65)):
    screen_cabinet("application-" + str(i), (8.0, y, -4.3), 2.35, 1.10, "rental-2026-application-" + str(i), frame=.018)
    label(("CORPORATE EVENTS", "LIVE EXPERIENCES", "BRAND ACTIVATIONS", "RETAIL & SHOWROOMS")[i],
        (9.30, y - .045, -4.305), .1512, 1.53, tracking=1.04, font=CONDENSED_FONT)

# Real product housings. Emissive surfaces and DNA motion are owned by the runtime.
PRODUCTS = [
    {"id": "flat", "type": "flat", "position": [-9.7, 6.0, -3.9], "width": 1.75, "height": 1.60, "label": ["FLAT LED"]},
    {"id": "curved", "type": "curved", "position": [-7.0, 6.0, -3.9], "width": 2.22, "height": 1.60, "radius": 1.3, "arc": 2.04, "label": ["CURVED LED"]},
    {"id": "cylinder", "type": "cylinder", "position": [-4.55, 6.0, -3.9], "radius": .67, "height": 1.80, "label": ["CYLINDRICAL LED"]},
    {"id": "corner", "type": "corner", "position": [-9.7, 3.55, -3.9], "side": 1.2, "height": 1.45, "label": ["SEAMLESS", "CORNER LED"]},
    {"id": "transparent", "type": "transparent", "position": [-7.7, 3.55, -3.9], "width": 1.4, "height": 1.9, "label": ["TRANSPARENT LED"]},
    {"id": "dna", "type": "dna", "position": [-5.9, 3.55, -3.9], "width": 1.0, "height": 2.5, "label": ["DNA LED"]},
    {"id": "sphere", "type": "sphere", "position": [-4.30, 3.55, -3.9], "radius": .72, "label": ["SPHERE LED"]},
]
for p in PRODUCTS:
    x, y, z = p["position"]
    h = p.get("height", p.get("radius", 0) * 2)
    w = p.get("width", p.get("radius", p.get("side", .5)) * 2)
    p["labelPosition"] = [x, y - h / 2 - .30, z + .04]
    for i, body in enumerate(p["label"]):
        label(body, (x, p["labelPosition"][1] - i * .18, z + .04), .13125, 2.12, centered=True, tracking=1.04)
    if p["id"] in ("flat", "curved", "cylinder"):
        suspension(x, y + h / 2, z - .04, w)
    if p["id"] == "sphere":
        line("sphere fine suspension wire", (x, y + p["radius"], z), (x, 7.04, z), .005, CABLE)

# Open ceiling: square production trusses, purlins and warm fixture lenses.
before = set(bpy.context.scene.objects)
for z in (-4.0, -1.5, 1.0, 3.25):
    for y in (7.30, 7.59):
        line("ceiling truss longitudinal chord", (-10.70, y, z - .15), (10.7, y, z - .15), .022, RIG)
        line("ceiling truss longitudinal chord", (-10.70, y, z + .15), (10.7, y, z + .15), .022, RIG)
    for i in range(29):
        x = -10.7 + i * 21.4 / 29
        for side in (-1, 1):
            line("ceiling truss alternating diagonal", (x, 7.30, z + side * .15),
                (x + 21.4 / 29, 7.59, z - side * .15), .010, RIG)
for x in (-10.0, -6.0, -2.0, 2.0, 6.0, 10.0):
    line("transverse ceiling structural batten", (x, 7.66, -4.8), (x, 7.66, 3.5), .024, RIG)
for x in (-9.8, -7.5, -5.2, -2.7, 0, 2.7, 5.4, 8.1, 10.3):
    for z in (-3.9, -.8, 2.75):
        box(PREFIX + "ceiling spotlight yoke", (x, 7.18, z), (.09, .22, .09), RIG, .006)
        box(PREFIX + "ceiling adjustable black spotlight body", (x, 6.99, z), (.18, .19, .24), BLACK, .020)
        box(PREFIX + "ceiling warm recessed optical lens", (x, 6.889, z + .005), (.13, .014, .14), LENS, .010)
        FIXTURES.append({"position": [x, 6.88, z], "target": [x, .12, z - .35], "color": "#ffe1b5", "type": "spot"})
mark_overhead(set(bpy.context.scene.objects) - before)


def batch():
    bpy.context.view_layer.update()
    groups = {}
    for ob in list(bpy.context.scene.objects):
        if ob.type != "MESH":
            continue
        groups.setdefault((ob.data.materials[0].name, bool(ob.get("ledRentalOverhead", False))), []).append(ob)
    result = []
    for (name, overhead), objects in groups.items():
        bpy.ops.object.select_all(action="DESELECT")
        for ob in objects:
            ob.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        if len(objects) > 1:
            bpy.ops.object.join()
        ob = bpy.context.object
        ob.name = name + (" | overhead" if overhead else " | shell")
        ob["ledRentalOverhead"] = overhead
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        if not ob.data.uv_layers:
            uv = ob.data.uv_layers.new(name="UVMap")
            for loop in ob.data.loops:
                p = ob.data.vertices[loop.vertex_index].co
                uv.data[loop.index].uv = (p.x * .25, p.z * .25 - p.y * .13)
        result.append(ob)
    return result


meshes = batch()
ao_file = Path(__file__).with_name("bake_technical_ao.py")
exec(compile(ao_file.read_text(encoding="utf-8"), str(ao_file), "exec"))
ao = {"draft": True, "samples": 0} if "--draft" in sys.argv else bake_technical_ao(meshes, samples=16, max_distance=.34, max_seconds=75)
OUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(OUT), export_format="GLB", export_yup=True, export_apply=True,
    export_materials="EXPORT", export_extras=True, export_cameras=False, export_lights=False,
    export_animations=False, export_vertex_color="ACTIVE")
points = [ob.matrix_world @ Vector(c) for ob in meshes for c in ob.bound_box]
lo, hi = [min(p[i] for p in points) for i in range(3)], [max(p[i] for p in points) for i in range(3)]
stats = {"bytes": OUT.stat().st_size, "sha256": hashlib.sha256(OUT.read_bytes()).hexdigest(),
    "meshes": len(meshes), "materials": len({mat.name for ob in meshes for mat in ob.data.materials}),
    "vertices": sum(len(ob.data.vertices) for ob in meshes),
    "triangles": sum(sum(len(p.vertices) - 2 for p in ob.data.polygons) for ob in meshes),
    "bounds": {"min": [lo[0], lo[2], -hi[1]], "max": [hi[0], hi[2], -lo[1]]}}
layout = {"version": 2026, "coordinateSystem": "Three XYZ; front +Z", "dimensions": {"width": 22, "depth": 11, "height": 8.4},
    "floorTop": .12, "facade": {"plan": FASCIA_PLAN, "bottom": 7.05, "top": 8.4, "shape": "folded rectilinear"},
    "piers": [{"position": [x, .12, z], "width": w, "depth": d, "height": 6.93} for x, z, w, d in PIERS],
    "frontRightBrandingBlade": {"position": [10.6, 3.585, 2.795], "size": [1.1, 6.93, .18], "front": 2.885},
    "apertures": APERTURES, "products": PRODUCTS, "fixtures": FIXTURES, "typography": SIGNAGE,
    "cutaway": {"nodeExtra": "ledRentalOverhead", "overheadBatches": sum(bool(ob.get("ledRentalOverhead")) for ob in meshes)},
    "ambientOcclusion": ao, "stats": stats}
LAYOUT_OUT.write_text(json.dumps(layout, indent=2), encoding="utf-8")
print("LED_RENTAL_2026_SHELL " + json.dumps(stats), flush=True)


if "--preview" in sys.argv:
    # Diagnostic placeholder faces are preview-only and are never exported.
    preview_blue = material("QA only blue LED surrogate", (.01, .075, .18), 0, .7, .5)
    for aperture in APERTURES:
        x, y, z = aperture["position"]
        box("QA only placeholder LED", (x, y, z + .003), (aperture["w"], aperture["h"], .004), preview_blue, 0)
    floor = material("QA only grey floor", (.10, .105, .11), .28, .30)
    box("QA only floor", (0, -.04, 0), (80, .08, 80), floor, 0)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 24
    scene.cycles.use_denoising = True
    scene.world.color = (.20, .23, .28)
    for p, energy, size, color in (((0, 11, 7), 5200, 13, (1, .84, .66)),
        ((-12, 8, 1), 3200, 9, (.68, .82, 1)), ((10, 7, -1), 2600, 8, (1, .76, .49))):
        data = bpy.data.lights.new("QA only soft architectural area", "AREA")
        data.energy, data.shape, data.size, data.color = energy, "DISK", size, color
        ob = bpy.data.objects.new("QA only area", data)
        bpy.context.collection.objects.link(ob)
        ob.location = xyz(p)
        ob.rotation_euler = (Vector(xyz((0, 3, -1))) - ob.location).to_track_quat("-Z", "Y").to_euler()
    bpy.ops.object.camera_add(location=xyz((-4.8, 3.0, 25.6)))
    camera = bpy.context.object
    camera.rotation_euler = (Vector(xyz((0, 4.25, -.65))) - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.lens = 35
    scene.camera = camera
    scene.render.resolution_x = 1500
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = "AgX"
    scene.render.filepath = str(QA / "shell-preview.png")
    bpy.ops.render.render(write_still=True)
