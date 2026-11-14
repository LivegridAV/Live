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


def lettering(body, p, size, centered=False, tracking=1.0, semibold=False):
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
    return bpy.context.object


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


