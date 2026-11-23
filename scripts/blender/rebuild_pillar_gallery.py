"""Reference pillar gallery architecture, with no floor or LED pillars.

Run: blender.exe --background --factory-startup --python scripts/blender/rebuild_pillar_gallery.py
All authoring helpers take website/Three coordinates: X right, Y up, Z forward.
The exported asset is placed at [-9, 0, -50] by the website. Blender coordinates
are (X, -Z, Y), and glTF's standard Y-up conversion restores website coordinates.
Only this newly created scene is exported; existing .blend files are never read.
"""

import bpy
import bmesh
import math
import random
import json
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public/models/expo/pillar-gallery.glb"
FONT = bpy.data.fonts.load("C:/Windows/Fonts/segoeui.ttf")
CAPTION_FONT = bpy.data.fonts.load("C:/Windows/Fonts/seguisb.ttf")
RNG = random.Random(20261015)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)


def xyz(p):
    return (p[0], -p[2], p[1])


def material(name, rgb, metal=0, rough=.5, emission=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*rgb, 1)
    shader.inputs["Metallic"].default_value = metal
    shader.inputs["Roughness"].default_value = rough
    if emission:
        shader.inputs["Emission Color"].default_value = (*rgb, 1)
        shader.inputs["Emission Strength"].default_value = emission
    return mat


BLACK = material("Gallery | black architectural steel", (.012, .015, .019), .36, .43)
WALL = material("Gallery | matte charcoal panel", (.015, .019, .025), .15, .69)
ROOF = material("Gallery | black acoustic roof", (.008, .010, .014), .02, .92)
ALLOY = material("Gallery | dark satin metal trim", (.10, .105, .11), .75, .34)
CHAMPAGNE = material("Gallery | champagne counter detail", (.29, .22, .14), .75, .31)
STONE = material("Gallery | warm silver travertine", (.31, .29, .25), .04, .57)
UPHOLSTERY = material("Gallery | graphite leather", (.026, .029, .032), .08, .43)
SEAM = material("Gallery | leather seams", (.045, .046, .047), .04, .64)
WARM = material("Gallery | concealed 2900K cove", (1, .58, .24), 0, .3, 3.5)
LENS = material("Gallery | warm fixture lens", (1, .83, .60), .1, .25, 4)
BRAND = material("Gallery | porcelain brand lettering", (.88, .92, .98), 0, .41, .34)
SHIRT = material("Guests | ivory cotton", (.68, .68, .64), 0, .92)
NAVY = material("Guests | midnight wool", (.018, .024, .035), 0, .93)
CHARCOAL = material("Guests | charcoal tailoring", (.029, .028, .031), 0, .96)
TAUPE = material("Guests | taupe jacket", (.17, .15, .13), 0, .98)
SKIN = [material("Guests | skin tone %s" % i, rgb, 0, .83) for i, rgb in enumerate([
    (.29, .16, .095), (.43, .26, .16), (.55, .36, .24), (.34, .20, .13)
])]
HAIR = material("Guests | dark hair", (.014, .009, .006), 0, .92)
SHOES = material("Guests | dark shoes", (.009, .011, .014), .02, .48)
TIMBER = material("Gallery | walnut stem", (.075, .045, .022), 0, .81)
LEAF = material("Gallery | olive foliage", (.065, .090, .038), 0, .9)


def box(name, p, size, mat=BLACK, bevel=.015):
    # Work on an isolated BMesh instead of repeatedly rebuilding the complete
    # scene dependency graph with mesh-add and modifier operators.
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    for vertex in bm.verts:
        vertex.co.x *= size[0]
        vertex.co.y *= size[2]
        vertex.co.z *= size[1]
    if bevel:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=2,
            affect="EDGES", clamp_overlap=True)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(ob)
    ob.location = xyz(p)
    ob.data.materials.append(mat)
    return ob


def rod(name, a, b, radius=.025, mat=BLACK, verts=8):
    a, b = Vector(xyz(a)), Vector(xyz(b))
    direction = (b - a).normalized()
    up = Vector((0, 0, 1)) if abs(direction.z) < .9 else Vector((0, 1, 0))
    u = direction.cross(up).normalized() * radius
    v = direction.cross(u).normalized() * radius
    points = [p + math.cos(i * 2 * math.pi / verts) * u + math.sin(i * 2 * math.pi / verts) * v
        for p in (a, b) for i in range(verts)]
    faces = [(i, (i + 1) % verts, (i + 1) % verts + verts, i + verts) for i in range(verts)]
    faces += [tuple(range(verts - 1, -1, -1)), tuple(range(verts, verts * 2))]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(points, [], faces)
    mesh.update()
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(mat)
    for polygon in ob.data.polygons:
        polygon.use_smooth = True
    return ob


def ellipsoid(name, p, radii, mat, segments=14, rings=8):
    points = [(p[0], p[1] + radii[1], p[2])]
    for j in range(1, rings):
        phi = math.pi * j / rings
        for i in range(segments):
            theta = 2 * math.pi * i / segments
            points.append((p[0] + radii[0] * math.sin(phi) * math.cos(theta),
                p[1] + radii[1] * math.cos(phi),
                p[2] + radii[2] * math.sin(phi) * math.sin(theta)))
    bottom = len(points)
    points.append((p[0], p[1] - radii[1], p[2]))
    faces = []
    for i in range(segments):
        faces.append((0, 1 + (i + 1) % segments, 1 + i))
    for j in range(rings - 2):
        for i in range(segments):
            a, b = 1 + j * segments + i, 1 + j * segments + (i + 1) % segments
            faces.append((a, b, b + segments, a + segments))
    for i in range(segments):
        faces.append((bottom, 1 + (rings - 2) * segments + i,
            1 + (rings - 2) * segments + (i + 1) % segments))
    return patch_mesh(name, points, faces, mat)


_PREMIUM_SIGNAGE = None
LOCKUP_GAP = .25  # logo-to-wordmark gap, in wordmark ink heights


def premium_signage():
    """The shared premium sign module, loaded on first use so builders that
    never ask for premium lettering (they pass premium=False) are untouched."""
    global _PREMIUM_SIGNAGE
    if _PREMIUM_SIGNAGE is None:
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "premium_signage", ROOT / "scripts/blender/premium_signage.py")
        _PREMIUM_SIGNAGE = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(_PREMIUM_SIGNAGE)
    return _PREMIUM_SIGNAGE


def _wordmark_aspect(signs):
    """Ink width / ink height of the premium livegridAV wordmark (a probe that
    is built unplaced, measured and removed; it leaves no SIGN_LOG entry)."""
    probe = signs.premium_wordmark((0, 0, 0), 1.0, place=lambda obs, p, yaw: None)
    signs.SIGN_LOG.pop()
    xs = [v.co.x for ob in probe for v in ob.data.vertices]
    ys = [v.co.y for ob in probe for v in ob.data.vertices]
    for ob in probe:
        mesh = ob.data
        bpy.data.objects.remove(ob, do_unlink=True)
        bpy.data.meshes.remove(mesh)
    return (max(xs) - min(xs)) / (max(ys) - min(ys))


def premium_lockup(p, size, centered=False, tracking=1.0):
    """Grid logo + livegridAV wordmark in the ink footprint of the flat
    single-object wordmark lettering(body, p, size, centered) used to make.
    Logo left, logo square = wordmark ink height, gap LOCKUP_GAP x that height;
    the pair is as wide as the old ink (never taller), centred on it vertically,
    left-aligned or centred like the old one, backs on the old back plane."""
    signs = premium_signage()
    old = lettering("LivegridAV", p, size, centered, tracking)
    bpy.context.view_layer.update()
    ink = [old.matrix_world @ v.co for v in old.data.vertices]
    x0, x1 = min(q.x for q in ink), max(q.x for q in ink)
    y0, y1 = min(q.z for q in ink), max(q.z for q in ink)
    back = min(-q.y for q in ink)
    mesh = old.data
    bpy.data.objects.remove(old, do_unlink=True)
    bpy.data.meshes.remove(mesh)
    aspect = _wordmark_aspect(signs)
    height = min(y1 - y0, (x1 - x0) / (1 + LOCKUP_GAP + aspect))
    width = height * (1 + LOCKUP_GAP + aspect)
    left = (x0 + x1 - width) / 2 if centered else x0
    bottom = (y0 + y1 - height) / 2
    emblem_height = height / .80  # premium_emblem: square .80 x height, lifted .10 x height
    cells = signs.premium_emblem((left, bottom - .10 * emblem_height, back), emblem_height)
    for ob in cells:
        ob["signage_log"] = len(signs.SIGN_LOG) - 1
    words = signs.premium_wordmark((left + height * (1 + LOCKUP_GAP), bottom, back), height,
        width=width - height * (1 + LOCKUP_GAP))
    for ob in words:
        ob["signage_log"] = len(signs.SIGN_LOG) - 1
    return words + cells


def lettering(body, p, size, centered=False, tracking=1.0, semibold=False, *, premium=False, slogan=False):
    """Flat glyph mesh, or with premium=True a premium sign: the wordmark becomes
    premium_lockup(), anything else is built as today and then deepened in
    place by premiumize_lettering (ivory face: this lettering is porcelain)."""
    if premium and premium_signage().is_wordmark(body):
        return premium_lockup(p, size, centered, tracking)
    bpy.ops.object.text_add(location=xyz(p), rotation=(math.pi / 2, 0, 0))
    ob = bpy.context.object
    ob.name = "Gallery lettering | " + body
    ob.data.body = body
    # Small physical captions need stronger stems at exhibition viewing
    # distances. Keep the established regular face for every wordmark.
    is_wordmark = "livegrid" in body.replace(" ", "").lower()
    caption = (size < .4 or semibold) and not is_wordmark
    ob.data.font = CAPTION_FONT if caption else FONT
    ob.data.size = size
    ob.data.space_character = tracking
    ob.data.extrude = .0018
    ob.data.resolution_u = 6 if caption else 3
    ob.data.align_x = "CENTER" if centered else "LEFT"
    ob.data.materials.append(BRAND)
    ob["signage_body"] = body
    ob["signage_size"] = size
    ob["signage_font"] = "Segoe UI Semibold" if caption else "Segoe UI"
    bpy.ops.object.convert(target="MESH")
    ob = bpy.context.object
    if premium:
        signs = premium_signage()
        signs.premiumize_lettering([ob], body, slogan=slogan, position=p)
        ob["signage_log"] = len(signs.SIGN_LOG) - 1
    return ob


def write_lettering_audit(path):
    """Record final physical glyph bounds before material batching."""
    bpy.context.view_layer.update()
    labels = []
    for ob in bpy.context.scene.objects:
        if ob.type != "MESH" or "signage_body" not in ob:
            continue
        local = [Vector(p) for p in ob.bound_box]
        world = [ob.matrix_world @ p for p in local]
        scales = [ob.matrix_world.col[i].to_3d().length for i in range(3)]
        local_span = [max(p[i] for p in local)-min(p[i] for p in local) for i in range(3)]
        lo = [min(p[i] for p in world) for i in range(3)]
        hi = [max(p[i] for p in world) for i in range(3)]
        labels.append({"text": ob["signage_body"], "font": ob["signage_font"],
            "size": ob["signage_size"], "width": local_span[0]*scales[0],
            "height": local_span[1]*scales[1], "axisScale": scales,
            "bounds": {"min": [lo[0],lo[2],-hi[1]], "max": [hi[0],hi[2],-lo[1]]}})
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"asset": OUT.name, "labels": labels}, indent=2), encoding="utf-8")


def patch_mesh(name, vertices, faces, mat):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([xyz(v) for v in vertices], [], faces)
    mesh.update()
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(mat)
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    return ob


def loft(name, rings, mat, segments=12):
    """Closed, softly tailored elliptical form from (x,y,z,half-width,half-depth)."""
    vertices = []
    for cx, cy, cz, rx, rz in rings:
        for i in range(segments):
            angle = i * 2 * math.pi / segments
            vertices.append((cx + math.cos(angle) * rx, cy, cz + math.sin(angle) * rz))
    faces = []
    for j in range(len(rings) - 1):
        for i in range(segments):
            nxt = (i + 1) % segments
            faces.append((j * segments + i, (j + 1) * segments + i,
                (j + 1) * segments + nxt, j * segments + nxt))
    faces += [tuple(range(segments)),
        tuple((len(rings) - 1) * segments + i for i in range(segments - 1, -1, -1))]
    return patch_mesh(name, vertices, faces, mat)


def tailored_guest(x, z, scale=1, turn=0, female=False, coat=NAVY, tone=0, pose=0):
    """Natural human outline: separate trousers, fitted jacket, collar, hands and hair.

    Figures are authored facing forward then rotated, so the foreground visitors
    present their backs to the reader as in the photographic reference.
    """
    before = set(bpy.context.scene.objects)
    s = scale
    head_y = 1.63 if female else 1.66
    # Neutral standing weight shifts slightly onto one foot.
    hip = .026 if pose % 2 else -.022
    for side in (-1, 1):
        dx = side * .098
        foot_z = .035 if side == (-1 if pose % 2 else 1) else -.035
        loft("Guest tailored trouser", [
            (dx, .115, foot_z, .058, .057),
            (dx + hip * .4, .47, foot_z * .55, .066, .070),
            (dx + hip, .86, -.002, .085, .090),
            (dx + hip, .98, 0, .089, .099),
        ], coat, 10)
        ellipsoid("Guest leather shoe", (dx, .070, foot_z + .045), (.068, .059, .145), SHOES)
    # Fitted torso silhouette with distinct shoulder line and waist.
    shoulder = .204 if female else .235
    loft("Guest tailored jacket", [
        (hip, .88, 0, .168, .100), (hip, .98, 0, .155, .102),
        (hip * .4, 1.13, 0, .151 if female else .181, .105),
        (0, 1.36, .004, shoulder, .119),
        (0, 1.405, .003, shoulder * .76, .105),
    ], coat)
    rod("Guest neck", (0, 1.39, 0), (0, 1.535, 0), .055, SKIN[tone], 10)
    # Shirt and discrete folded lapels on the front.
    patch_mesh("Guest visible shirt", [(-.09, 1.399, .099), (.09, 1.399, .099),
        (0, 1.11, .114)], [(0, 1, 2)], SHIRT)
    patch_mesh("Guest jacket lapels", [(-.09, 1.41, .111), (-.15, 1.34, .111),
        (-.087, 1.245, .117), (0, 1.10, .117), (.09, 1.41, .111),
        (.15, 1.34, .111), (.087, 1.245, .117)], [(0, 1, 2, 3), (4, 3, 6, 5)], coat)
    for side in (-1, 1):
        elbow_x = side * (.259 + (.025 if pose == 1 else 0))
        hand_x = side * (.245 + (.025 if pose == 1 else -.01))
        loft("Guest jacket sleeve", [(side * shoulder * .84, 1.375, 0, .079, .080),
            (elbow_x, 1.13, .017, .063, .060),
            (hand_x, .94, .050, .050, .047)], coat, 10)
        ellipsoid("Guest hand", (hand_x, .887, .060), (.043, .073, .040), SKIN[tone])
    ellipsoid("Guest head", (0, head_y, 0), (.093 if female else .100, .137, .105), SKIN[tone])
    ellipsoid("Guest hair crown", (0, head_y + .060, -.014), (.099 if female else .106, .092, .104), HAIR)
    if female:
        ellipsoid("Guest long hair", (0, 1.51, -.075), (.112, .178, .065), HAIR)
        loft("Guest jacket hem", [(hip, .91, 0, .17, .101), (hip, .87, 0, .177, .103)], coat)
    # Small ears, almost invisible except at the side, improve the silhouette.
    for side in (-1, 1):
        ellipsoid("Guest ear", (side * .099, head_y - .009, 0), (.018, .032, .025), SKIN[tone], 8, 6)
    new_objects = set(bpy.context.scene.objects) - before
    rotation = math.radians(turn)
    # Transform the authored Three-space mesh via a common empty parent.
    pivot = bpy.data.objects.new("Guest pose", None)
    bpy.context.collection.objects.link(pivot)
    pivot.location = xyz((x, 0, z))
    pivot.rotation_euler[2] = -rotation
    pivot.scale = (s, s, s)
    for ob in new_objects:
        ob.parent = pivot


def lounge_block(x, z, width=2.8, depth=1.13, back=True):
    box("Lounge recessed metal foot", (x, .085, z), (width - .20, .13, depth - .16), BLACK, .025)
    box("Lounge floating warm reveal", (x, .13, z + depth / 2 - .025),
        (width - .16, .026, .027), WARM, .005)
    # Split cushions have a narrow actual gap, not drawn-on seams.
    for i in range(2):
        xx = x + (i - .5) * width / 2
        box("Lounge leather seat", (xx, .39, z), (width / 2 - .026, .46, depth), UPHOLSTERY, .075)
        if back:
            box("Lounge low leather back", (xx, .73, z - depth * .37),
                (width / 2 - .025, .55, .24), UPHOLSTERY, .055)


def olive(x, z, seed):
    rng = random.Random(seed)
    box("Stone square planter", (x, .37, z), (.70, .74, .70), STONE, .035)
    box("Planter planting bed", (x, .746, z), (.61, .018, .61), TIMBER, .005)
    rod("Olive trunk", (x, .74, z), (x + .05, 2.46, z), .032, TIMBER)
    vertices, faces = [], []
    for i in range(15):
        angle = i * 2.4 + seed
        end = Vector((x + math.cos(angle) * rng.uniform(.30, .60),
            rng.uniform(1.75, 2.6), z + math.sin(angle) * rng.uniform(.28, .55)))
        start = Vector((x + .02, 1.45 + i * .055, z))
        rod("Olive branch", start, end, .008, TIMBER, 6)
        for j in range(9):
            center = start.lerp(end, .3 + .075 * j)
            center += Vector((rng.uniform(-.13, .13), rng.uniform(-.09, .09), rng.uniform(-.13, .13)))
            a = angle + j * 2.4
            direction = Vector((math.cos(a), .4, math.sin(a))) * .12
            side = Vector((-math.sin(a), .25, math.cos(a))) * .028
            idx = len(vertices)
            vertices.extend([center - direction, center + side, center + direction, center - side])
            faces.append((idx, idx + 1, idx + 2, idx + 3))
    patch_mesh("Olive fine leaf canopy", vertices, faces, LEAF)


def truss(a, b, width=.32):
    """Black square production truss with alternating diagonals on all sides."""
    a, b = Vector(a), Vector(b)
    direction = (b - a).normalized()
    transverse = Vector((0, 0, 1)) if abs(direction.x) > .9 else Vector((1, 0, 0))
    vertical = Vector((0, 1, 0))
    for h in (-1, 1):
        for t in (-1, 1):
            offset = vertical * width / 2 * h + transverse * width / 2 * t
            rod("Ceiling truss main chord", a + offset, b + offset, .028, BLACK)
    count = max(1, int((b - a).length / .72))
    for i in range(count):
        aa = a.lerp(b, i / count)
        bb = a.lerp(b, (i + 1) / count)
        slant = 1 if i % 2 else -1
        for t in (-1, 1):
            rod("Ceiling truss diagonal", aa + transverse * width / 2 * t - vertical * width / 2 * slant,
                bb + transverse * width / 2 * t + vertical * width / 2 * slant, .012, BLACK, 6)
        for h in (-1, 1):
            rod("Ceiling truss side diagonal", aa + vertical * width / 2 * h - transverse * width / 2 * slant,
                bb + vertical * width / 2 * h + transverse * width / 2 * slant, .012, BLACK, 6)


# Reception: a continuous dark feature wall with a softly lit stone lower band.
box("Reception black feature wall", (0, 3.62, -9.05), (22.3, 7.24, .36), WALL, .025)
box("Reception silver travertine lower wall", (0, 1.22, -8.84), (22.1, 2.38, .14), STONE, .015)
for x in (-8.2, -5.45, -2.7, .05, 2.8, 5.55, 8.3):
    box("Stone panel fine vertical joint", (x, 1.22, -8.756), (.012, 2.36, .006), ALLOY, 0)
box("Reception stone concealed upper cove", (0, 2.43, -8.78), (22.0, .038, .075), WARM, .006)
box("Reception floating shadow cornice", (0, 6.97, -8.58), (22.3, .37, .9), WALL, .015)
box("Reception warm roof-wall junction", (0, 6.75, -8.93), (22.0, .028, .05), WARM, .004)
for side in (-1,):
    # The side returns give the photographic background an enclosure and depth.
    box("Reception shallow side return", (side * 11.1, 3.05, -6.95), (.20, 6.10, 4.3), WALL, .02)
    box("Reception side silver stone", (side * 10.98, 1.22, -6.95), (.065, 2.38, 4.3), STONE, .01)
    box("Reception return warm cove", (side * 10.94, 2.43, -6.95), (.026, .038, 4.2), WARM, .004)

lettering("LivegridAV", (-2.8, 4.65, -8.822), .86, True, premium=True)
lettering("VISUAL EXPERIENCES", (-2.8, 3.93, -8.815), .36, True, 1.12, premium=True, slogan=True)
lettering("THAT MOVE PEOPLE", (-2.8, 3.48, -8.815), .36, True, 1.12, premium=True, slogan=True)
for i, line in enumerate(("PEOPLE", "PLACES", "IDEAS", "BRIGHTER", "TOGETHER")):
    # The stone wainscot projects in front of this black upper wall; the
    # complete caption stack belongs above its 2.43m concealed cove.
    lettering(line, (8.00, 5.10 - i * .45, -8.807), .36, False, 1.18, premium=True, slogan=True)

# Long restrained reception joinery: a quiet warm horizon below the installation.
box("Reception long warm stone counter", (2.15, .64, -7.16), (11.4, 1.12, .92), STONE, .055)
box("Reception satin dark countertop", (2.15, 1.235, -7.16), (11.50, .075, 1.02), ALLOY, .025)
box("Reception recessed champagne plinth", (2.15, .090, -7.16), (11.1, .14, .76), CHAMPAGNE, .02)
box("Reception concealed front footlight", (2.15, .18, -6.69), (11.26, .033, .022), WARM, .004)
for i in range(72):
    x = -3.45 + i * .157
    box("Reception fine vertical fluting", (x, .65, -6.687), (.012, .89, .012), CHAMPAGNE, .002)
for x in (-1.5, 2.5, 6.2):
    rod("Reception tablet stem", (x, 1.27, -7.24), (x, 1.47, -7.24), .018, BLACK)
    ob = box("Reception tablet screen", (x, 1.52, -7.24), (.39, .24, .028), BLACK, .012)
    ob.rotation_euler[0] = math.radians(12)

# Floral arrangement between the two reception desks.
ellipsoid("Reception vase", (4.3, 1.42, -7.21), (.13, .19, .13), STONE)
for i in range(12):
    angle = i * 2.4
    end = (4.3 + math.cos(angle) * .38, 1.9 + RNG.uniform(0, .25), -7.21 + math.sin(angle) * .28)
    rod("Reception flower stem", (4.3, 1.5, -7.21), end, .008, TIMBER, 6)
    ellipsoid("Reception ivory flower", end, (.06, .045, .06), SHIRT, 8, 6)

olive(-9.4, -6.6, 19)
olive(9.5, -7.0, 27)

# Low, almost black leather blocks occupy the same photograph-like edge zones.
lounge_block(-8.25, 5.05, 3.4, 1.35, True)
lounge_block(-8.25, 3.75, 3.4, 1.18, False)
lounge_block(8.05, 3.65, 3.7, 1.30, True)
lounge_block(8.05, 4.98, 3.7, 1.23, False)
lounge_block(-5.8, -3.1, 2.5, 1.05, True)

# Visitors, kept outside the central hero branding sightline.
tailored_guest(-5.55, 4.25, 1.04, 155, False, NAVY, 0, 0)
tailored_guest(6.25, 3.2, 1.00, 178, True, CHARCOAL, 2, 1)
tailored_guest(-8.85, -.5, .98, 24, False, CHARCOAL, 1, 2)
tailored_guest(-8.1, -1.0, .94, -30, True, NAVY, 2, 1)
tailored_guest(-6.65, -5.2, 1.00, 120, False, NAVY, 3, 0)
tailored_guest(-5.25, -5.0, .96, 184, True, CHARCOAL, 0, 0)
tailored_guest(-4.5, -5.7, .99, -20, False, TAUPE, 1, 2)
tailored_guest(2.2, -5.8, 1.02, 172, False, NAVY, 0, 0)
tailored_guest(1.28, -5.85, .97, 33, True, CHARCOAL, 2, 1)
tailored_guest(7.6, -5.5, 1.01, -15, False, CHARCOAL, 3, 0)
tailored_guest(8.5, -5.25, .96, 80, True, NAVY, 1, 2)
# Reception staff stand behind the counter, not inside its front face.
tailored_guest(-1.6, -7.93, .99, 0, False, CHARCOAL, 1, 0)
tailored_guest(3.55, -7.94, .95, 0, True, NAVY, 2, 0)
tailored_guest(6.15, -7.95, 1, 0, False, NAVY, 0, 1)

# Exhibition roof: rich black decking with a genuine square truss lattice below.
for i in range(8):
    box("Black acoustic roof deck", (-10.5 + i * 3, 14.78, -.6), (2.96, .13, 22.0), ROOF, 0)
for z in (-10.2, -5.0, .2, 5.4, 10.2):
    truss((-12, 14.15, z), (12, 14.15, z), .32)
for x in (-10.8, -5.4, 0, 5.4, 10.8):
    truss((x, 14.05, -11), (x, 14.05, 10.4), .28)
# Closely spaced purlins make the dark roof read as architecture, not a grid icon.
for z in range(-10, 11, 2):
    box("Roof structural purlin", (0, 14.52, z), (24, .15, .065), BLACK, .005)
for ix, x in enumerate((-9.2, -3.8, 2.0, 7.8)):
    for iz, z in enumerate((-7.5, -1.5, 5.8)):
        rod("Ceiling spotlight hanger", (x, 14.12, z), (x, 13.85, z), .019, BLACK)
        box("Warm exhibition spotlight body", (x, 13.75, z), (.23, .23, .34), BLACK, .025)
        box("Warm exhibition spotlight lens", (x, 13.625, z + .025), (.155, .018, .23), LENS, .014)
        # Restrained gold clip at the rim adds a photographed fixture highlight.
        box("Spotlight satin rim", (x, 13.63, z - .11), (.18, .032, .018), CHAMPAGNE, .004)

# Bake all guest parenting, then batch by material. This keeps hundreds of
# authored details to one renderable object per material in the WebGL gallery.
bpy.ops.object.select_all(action="DESELECT")
bpy.context.view_layer.update()
write_lettering_audit(ROOT / "qa/typography-clarity/pillar-gallery-labels.json")
for ob in list(bpy.context.scene.objects):
    if ob.type == "MESH":
        matrix = ob.matrix_world.copy()
        ob.parent = None
        ob.matrix_world = matrix
for ob in list(bpy.context.scene.objects):
    if ob.type == "EMPTY":
        bpy.data.objects.remove(ob, do_unlink=True)

groups = {}
for ob in list(bpy.context.scene.objects):
    if ob.type == "MESH":
        key = ob.data.materials[0].name
        groups.setdefault(key, []).append(ob)
for name, objects in groups.items():
    bpy.ops.object.select_all(action="DESELECT")
    for ob in objects:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    ob = bpy.context.object
    ob.name = name
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

OUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(OUT), export_format="GLB",
    export_yup=True, export_apply=True, export_materials="EXPORT",
    export_cameras=False, export_lights=False, export_animations=False)

meshes = [ob for ob in bpy.context.scene.objects if ob.type == "MESH"]
points = [ob.matrix_world @ Vector(corner) for ob in meshes for corner in ob.bound_box]
lo = [min(p[i] for p in points) for i in range(3)]
hi = [max(p[i] for p in points) for i in range(3)]
stats = {"file": str(OUT), "bytes": OUT.stat().st_size,
    "meshes": len(meshes), "materials": len(groups),
    "vertices": sum(len(ob.data.vertices) for ob in meshes),
    "triangles": sum(sum(max(1, len(poly.vertices)-2) for poly in ob.data.polygons) for ob in meshes),
    "three_bounds": {"min": [lo[0], lo[2], -hi[1]], "max": [hi[0], hi[2], -lo[1]]}}
print("PILLAR_GALLERY " + json.dumps(stats), flush=True)

# Optional standalone visual QA. The preview is stored in the ignored .next
# cache, avoiding Blender 5.2 path-template parsing of sandbox temp-directory
# braces. It is never part of the shipped model or repository artefacts.
if "--preview" in __import__("sys").argv:
    bpy.ops.mesh.primitive_plane_add(size=80)
    floor = bpy.context.object
    floor.name = "QA floor only"
    floor.data.materials.append(material("QA polished grey", (.10, .11, .13), .5, .23))
    def area(name, p, energy, color, size, target):
        data = bpy.data.lights.new(name, "AREA")
        data.energy, data.color, data.shape, data.size = energy, color, "DISK", size
        ob = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(ob)
        ob.location = xyz(p)
        ob.rotation_euler = (Vector(xyz(target)) - ob.location).to_track_quat("-Z", "Y").to_euler()
    area("QA hall warm fill", (1, 10, 6), 4200, (1, .78, .58), 12, (0, 1, -5))
    area("QA soft cool front", (2, 9, 12), 3000, (.65, .75, 1), 10, (0, 3, -5))
    area("QA reception wash", (2, 5, -5), 1800, (1, .68, .42), 7, (0, 3, -9))
    bpy.ops.object.camera_add(location=xyz((12, 3.6, 18)))
    camera = bpy.context.object
    camera.rotation_euler = (Vector(xyz((0, 5.8, -3))) - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.lens = 29
    bpy.context.scene.camera = camera
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 20
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 1100
    scene.render.resolution_y = 1000
    scene.render.resolution_percentage = 100
    scene.world.color = (.14, .14, .14)
    scene.view_settings.view_transform = "AgX"
    preview_path = ROOT / ".next/cache/livegrid-pillar-gallery-qa.png"
    preview_path.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(preview_path)
    bpy.ops.render.render(write_still=True)
    print("PILLAR_GALLERY_PREVIEW " + scene.render.filepath, flush=True)
