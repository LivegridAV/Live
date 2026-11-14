"""Real carved architectural palace for the projection-mapping pavilion.

Blender 5.2 --background --factory-startup --python this-file.py

This is a white physical model, not a textured plane or photo facade. Three
open pointed gateways, deep side niches, moulded architraves, onion domes,
balustrades, column capitals and jali lattices remain visible without mapping.
The website projects animated blue/gold light onto these actual mesh surfaces.
All mesh vertices are authored in Three XYZ (+Z toward the visitor) and baked
at identity transforms for coherent architectural projection coordinates.
"""
import bpy
import bmesh
import math
import json
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public/models/expo/projection-palace.glb"
LAYOUT_OUT = ROOT / "public/models/expo/projection-palace-layout.json"
QA = ROOT / "qa/projection-mapping"
BASE = 1.65
ROOT_POSITION = [10.2, 0, -189]
ROOT_ROTATION = [0, -math.pi / 2, 0]
ARCHES = []
DOMES = []

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)


def xyz(p):
    return (p[0], -p[2], p[1])


def material(role, rgb, rough=.72):
    mat = bpy.data.materials.new("Projection Palace | " + role)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*rgb, 1)
    shader.inputs["Metallic"].default_value = 0
    shader.inputs["Roughness"].default_value = rough
    mat.diffuse_color = (*rgb, 1)
    return mat


IVORY = material("ivory projection substrate", (.61, .60, .56))
TRIM = material("carved cornice projection trim", (.70, .68, .62), .63)
INSET = material("inset arch projection surface", (.46, .47, .48), .79)
RIB = material("dome rib projection trim", (.68, .65, .59), .62)
DARK = material("dark recessed arch interior", (.18, .20, .23), .88)


def mesh(name, points, faces, mat, smooth=False):
    data = bpy.data.meshes.new(name)
    data.from_pydata([xyz(p) for p in points], [], faces)
    data.update()
    bm = bmesh.new()
    bm.from_mesh(data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(data)
    bm.free()
    ob = bpy.data.objects.new("Projection Palace | " + name, data)
    bpy.context.collection.objects.link(ob)
    data.materials.append(mat)
    for face in data.polygons:
        face.use_smooth = smooth
    return ob


def box(name, p, size, mat=IVORY, bevel=.008):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    for vertex in bm.verts:
        vertex.co.x *= size[0]
        vertex.co.y *= size[2]
        vertex.co.z *= size[1]
    if bevel:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=1,
            affect="EDGES", clamp_overlap=True)
    data = bpy.data.meshes.new(name)
    bm.to_mesh(data)
    bm.free()
    ob = bpy.data.objects.new("Projection Palace | " + name, data)
    bpy.context.collection.objects.link(ob)
    ob.location = xyz(p)
    data.materials.append(mat)
    return ob


def tube(name, path, radius, mat=TRIM, sides=7):
    pts, faces = [], []
    for j, pp in enumerate(path):
        p = Vector(pp)
        tangent = Vector(path[min(j + 1, len(path) - 1)]) - Vector(path[max(0, j - 1)])
        if tangent.length < 1e-8:
            tangent = Vector((0, 1, 0))
        tangent.normalize()
        helper = Vector((0, 0, 1)) if abs(tangent.z) < .90 else Vector((1, 0, 0))
        u = tangent.cross(helper).normalized()
        v = tangent.cross(u).normalized()
        for k in range(sides):
            a = k * math.tau / sides
            pts.append(p + (u * math.cos(a) + v * math.sin(a)) * radius)
    for j in range(len(path) - 1):
        for k in range(sides):
            faces.append((j * sides + k, j * sides + (k + 1) % sides,
                (j + 1) * sides + (k + 1) % sides, (j + 1) * sides + k))
    faces.extend([tuple(range(sides - 1, -1, -1)),
        tuple((len(path) - 1) * sides + k for k in range(sides))])
    return mesh(name, pts, faces, mat, True)


def cylinder(name, x, z, profile, mat=IVORY, sides=32):
    pts = [(x + math.cos(k * math.tau / sides) * r, y,
        z + math.sin(k * math.tau / sides) * r)
        for r, y in profile for k in range(sides)]
    faces = []
    for j in range(len(profile) - 1):
        for k in range(sides):
            faces.append((j * sides + k, j * sides + (k + 1) % sides,
                (j + 1) * sides + (k + 1) % sides, (j + 1) * sides + k))
    faces.extend([tuple(range(sides - 1, -1, -1)),
        tuple((len(profile) - 1) * sides + k for k in range(sides))])
    return mesh(name, pts, faces, mat, True)


def contour(width, height, spring, steps=24):
    """Pointed ogival arch: vertical legs and two smooth rising cubic curves."""
    half = width / 2
    rise = height - spring
    left = []
    a = Vector((-half, spring))
    b = Vector((-half, spring + rise * .58))
    c = Vector((-half * .40, height - rise * .08))
    d = Vector((0, height))
    for j in range(steps + 1):
        t = j / steps
        p = a * (1 - t) ** 3 + b * (3 * (1 - t) ** 2 * t) + c * (3 * (1 - t) * t * t) + d * t ** 3
        left.append(tuple(p))
    curve = left + [(-x, y) for x, y in left[-2::-1]]
    return [(-half, 0)] + curve + [(half, 0)]


def extruded_polygon(name, poly, x, y, front, depth, mat):
    n = len(poly)
    pts = [(x + px, y + py, z) for z in (front, front - depth) for px, py in poly]
    faces = [tuple(range(n - 1, -1, -1)), tuple(range(n, 2 * n))]
    faces.extend((j, (j + 1) % n, (j + 1) % n + n, j + n) for j in range(n))
    return mesh(name, pts, faces, mat)


def arch_ring(name, x, y, front, width, height, spring, thickness, depth=.10, mat=TRIM, steps=24):
    inner = contour(width, height, spring, steps)
    outer = contour(width + 2 * thickness, height + 2 * thickness, spring + thickness, steps)
    outer = [(px, py - thickness) for px, py in outer]
    points, faces = [], []
    for (ix, iy), (ox, oy) in zip(inner, outer):
        points.extend(((x + ox, y + oy, front), (x + ix, y + iy, front),
            (x + ix, y + iy, front - depth), (x + ox, y + oy, front - depth)))
    n = len(inner)
    for j in range(n):
        nj = (j + 1) % n
        for k in range(4):
            faces.append((j * 4 + k, nj * 4 + k, nj * 4 + (k + 1) % 4, j * 4 + (k + 1) % 4))
    return mesh(name, points, faces, mat)


def arch_body(name, x, y, front, total_w, total_h, opening_w, opening_h, spring, depth):
    """Actual wall with an empty vaulted portal, never a facade rectangle."""
    curve = contour(opening_w, opening_h, spring)[1:-1]
    pier_w = (total_w - opening_w) / 2
    for side in (-1, 1):
        box(name + " | thick supporting wall pier", (x + side * (opening_w / 2 + pier_w / 2),
            y + total_h / 2, front - depth / 2), (pier_w, total_h, depth), IVORY, .005)
    for j in range(len(curve) - 1):
        left, right = curve[j], curve[j + 1]
        if abs(left[0] - right[0]) < 1e-6:
            continue
        poly = [left, right, (right[0], total_h), (left[0], total_h)]
        extruded_polygon(name + " | structural arch voussoir", poly, x, y, front, depth, IVORY)
    # A distant shaped back surface forms a deep projected niche. The open
    # doorway, carved jamb returns and vaulted soffit remain actual geometry.
    back = contour(opening_w * .96, opening_h * .985, spring)
    extruded_polygon(name + " | deeply recessed pointed wall", back, x, y + .02,
        front - depth + .05, .08, INSET)
    ARCHES.append({"name": name, "center": [x, y + opening_h / 2, front],
        "openingWidth": opening_w, "openingHeight": opening_h, "spring": spring,
        "depth": depth, "back": front - depth})


def rosette(name, x, y, z, radius=.09, petals=8):
    points, faces = [(x, y, z + .027)], []
    for k in range(petals * 2):
        a = k * math.tau / (petals * 2)
        r = radius * (1 if k % 2 == 0 else .52)
        points.append((x + math.sin(a) * r, y + math.cos(a) * r, z))
    for k in range(petals * 2):
        faces.append((0, k + 1, (k + 1) % (petals * 2) + 1))
    return mesh(name, points, faces, TRIM)


def column(name, x, z, bottom, top, radius=.105):
    h = top - bottom
    cylinder(name + " | moulded plinth and carved column", x, z,
        [(radius * 1.45, bottom), (radius * 1.45, bottom + .07),
         (radius * 1.20, bottom + .09), (radius * 1.12, bottom + .15),
         (radius * .88, bottom + .23), (radius * .82, bottom + h - .22),
         (radius * 1.16, top - .15), (radius * 1.45, top - .11),
         (radius * 1.45, top - .04), (radius * 1.18, top)], TRIM, 16)
    # Eight restrained longitudinal reeds read in the bright gold mapping.
    for k in range(8):
        a = k * math.tau / 8
        px, pz = x + math.cos(a) * radius * .84, z + math.sin(a) * radius * .84
        tube(name + " | fine fluted column reed", [(px, bottom + .24, pz),
            (px, top - .22, pz)], .009, TRIM, 5)


def finial(name, x, z, y, height=.30, radius=.075):
    cylinder(name + " | lotus urn and spear finial", x, z,
        [(radius * .7, y), (radius, y + height * .10), (radius * .6, y + height * .20),
         (radius * .85, y + height * .37), (radius * .48, y + height * .53),
         (radius * .29, y + height * .68), (radius * .12, y + height * .88),
         (.002, y + height)], RIB, 16)


def onion(name, x, z, base, radius, height, ribs=20, small=False):
    # The curved radial envelope follows the physical carved bulbous dome;
    # longitudinal ridges are separate slender volumetric ribs, not a texture.
    profile = [(0, base), (.77 * radius, base), (.81 * radius, base + .04 * height),
        (.89 * radius, base + .12 * height), (.98 * radius, base + .26 * height),
        (radius, base + .37 * height), (.94 * radius, base + .52 * height),
        (.79 * radius, base + .68 * height), (.58 * radius, base + .81 * height),
        (.34 * radius, base + .91 * height), (.13 * radius, base + .98 * height),
        (.012, base + height), (0, base + height)]
    cylinder(name + " | smooth bulbous onion dome", x, z, profile, IVORY, 48 if small else 64)
    for k in range(ribs):
        a = k * math.tau / ribs
        path = [(x + math.cos(a) * (r + .008), y,
            z + math.sin(a) * (r + .008)) for r, y in profile[1:-1]]
        tube(name + " | radial carved dome rib", path, .011 if small else .018, RIB, 6)
    cylinder(name + " | raised lotus springing collar", x, z,
        [(radius * .79, base - .045), (radius * .83, base - .045),
         (radius * .83, base + .025), (radius * .79, base + .055)], RIB, 48)
    DOMES.append({"name": name, "center": [x, base, z], "radius": radius,
        "height": height, "ribs": ribs})


def cornice(name, x, y, z, width, depth, scale=1):
    for offset, extra, thickness in ((0, 0, .06), (.055, .10, .05),
        (.11, .19, .065), (.17, .10, .04)):
        box(name + " | stepped carved horizontal entablature",
            (x, y + offset * scale, z), (width + extra * scale, thickness * scale, depth + extra * scale), TRIM, .005)
    # Small individual projecting brackets under the broad crown.
    count = max(5, int(width / .22))
    for k in range(count):
        xx = x - width * .47 + width * .94 * k / (count - 1)
        box(name + " | individual cornice dentil", (xx, y - .065 * scale, z + depth / 2 + .018),
            (.065 * scale, .11 * scale, .11 * scale), TRIM, .003)


def balustrade(name, x, y, z, width, scale=1):
    # Real slender balusters and rail; never opaque black rectangles.
    for side_y in (0, .25 * scale):
        box(name + " | fine horizontal parapet rail", (x, y + side_y, z), (width, .05 * scale, .08 * scale), TRIM, .005)
    n = max(5, int(width / (.18 * scale)))
    for k in range(n):
        xx = x - width * .47 + width * .94 * k / (n - 1)
        cylinder(name + " | individually turned parapet baluster", xx, z,
            [(.018 * scale, y), (.025 * scale, y + .06 * scale),
             (.013 * scale, y + .13 * scale), (.023 * scale, y + .20 * scale),
             (.018 * scale, y + .25 * scale)], TRIM, 8)


def lattice(name, x, bottom, z, width, height, spring, cell=.12):
    """Physical open diagonal jali bars clipped inside a pointed window."""
    shape = contour(width * .94, height * .96, spring)
    archcurve = shape[1:-1]
    def max_y(px):
        for a, b in zip(archcurve[:-1], archcurve[1:]):
            if a[0] <= px <= b[0] and abs(b[0] - a[0]) > 1e-8:
                t = (px - a[0]) / (b[0] - a[0])
                return a[1] + (b[1] - a[1]) * t
        return 0
    # Each line is clipped analytically against the actual pointed profile.
    half = width * .47
    for sign in (-1, 1):
        count = int((height + width) / cell) + 2
        for k in range(-count, count + 1):
            intercept = k * cell
            pts = []
            for j in range(91):
                px = -half + 2 * half * j / 90
                py = sign * px + intercept
                if .015 < py < max_y(px) - .015:
                    pts.append((x + px, bottom + py, z))
            if len(pts) > 1:
                tube(name + " | individually clipped diagonal stone jali", [pts[0], pts[-1]], .008, TRIM, 5)


def window(name, x, y, z, width, height, spring, jali=True):
    arch_ring(name + " | outer architrave", x, y, z + .045, width, height, spring, .052, .085)
    extruded_polygon(name + " | recessed inner arch field", contour(width * .97, height * .985, spring),
        x, y + .005, z - .07, .028, INSET)
    arch_ring(name + " | inner carved bead", x, y + .025, z + .060, width - .06,
        height - .045, spring - .01, .014, .03, RIB, 16)
    if jali:
        lattice(name, x, y + .015, z - .018, width - .04, height - .03, spring, .145)


# A broad low three-level sculptural palace base; the exhibition pedestal is
# authored separately, so this model's lowest surface is exactly Y1.65.
box("continuous three-dimensional palace foundation", (0, BASE + .075, -1.30),
    (11.70, .15, 4.00), IVORY, .018)
for yy, w, d in ((BASE + .15, 11.58, 3.94), (BASE + .22, 11.45, 3.82)):
    box("fine continuous foundation moulding", (0, yy, -1.30), (w, .055, d), TRIM, .005)

# The tall central block contains a real open arch with 2.5m-deep vault.
CBASE = BASE + .22
arch_body("grand central pointed gateway", 0, CBASE, .66,
    3.22, 3.57, 2.05, 2.98, 1.75, 2.65)
for layer, w, h, sp, thick, z in ((0, 2.05, 2.98, 1.75, .15, .80),
    (1, 2.36, 3.15, 1.80, .060, .84), (2, 1.95, 2.90, 1.71, .042, .72)):
    arch_ring("central nested carved ogival arch order %s" % layer, 0, CBASE,
        z, w, h, sp, thick, .15 if layer == 0 else .075)
for xx in (-1.43, 1.43):
    column("central portal monumental fluted pilaster", xx, .83, CBASE, 5.43, .115)
    for k in range(5):
        rosette("central portal carved floral roundel", xx, 2.25 + k * .58, .962, .067)
cornice("central royal gateway", 0, 5.43, -1.0, 3.32, 3.48)
balustrade("central crown stone parapet", 0, 5.62, .75, 2.70, .82)

# The rear and flanks remain architectural volumes: small inset windows and
# vaulted returns are available to the moving projection as the camera moves.
for xx in (-1.62, 1.62):
    box("deep central side masonry wall", (xx, 3.59, -1.10), (.12, 3.42, 3.54), IVORY, .008)
box("central rear wall", (0, 3.64, -2.89), (3.30, 3.53, .17), IVORY, .008)
for xx in (-.94, 0, .94):
    window("rear pointed niche", xx, 2.34, -2.79, .59, 1.69, 1.01)

# Three cleanly modeled entry steps sit in the open central portal.
for k in range(3):
    top = BASE + .07 + k * .07
    front = 1.05 - k * .16
    box("central real entry stair tread", (0, (BASE + top) / 2, front - .30),
        (2.02 - k * .10, top - BASE, .60), TRIM, .006)
    box("central stair moulded nosing", (0, top + .009, front + .004),
        (2.04 - k * .10, .025, .030), RIB, .003)
box("gateway real internal floor", (0, BASE + .22, -.69), (2.04, .08, 2.83), IVORY, .004)

# Squat octagonal drum, pierced arches and the large bulbous ribbed dome.
cylinder("grand central octagonal dome drum", 0, -1.1,
    [(1.02, 5.59), (1.02, 5.91)], IVORY, 16)
cylinder("central drum carved lower circular entablature", 0, -1.1,
    [(1.07, 5.60), (1.07, 5.65), (1.01, 5.67)], TRIM, 48)
for k in range(16):
    a = k * math.tau / 16
    x, z = math.sin(a) * 1.025, -1.1 + math.cos(a) * 1.025
    before = set(bpy.context.scene.objects)
    window("central drum small carved blind arcade", 0, 5.67, .0, .20, .21, .10, False)
    # Rotate each small sculpted window in the horizontal plane.
    for ob in set(bpy.context.scene.objects) - before:
        for v in ob.data.vertices:
            p = Vector((v.co.x, v.co.z, -v.co.y))
            v.co = Vector(xyz((x + p.x * math.cos(a) + p.z * math.sin(a), p.y,
                z - p.x * math.sin(a) + p.z * math.cos(a))))
onion("grand central dome", 0, -1.1, 5.89, 1.27, 1.15, 28)
finial("grand central dome", 0, -1.1, 7.04, .36, .087)


for side in (-1, 1):
    x = side * 3.13
    front = .38
    # The flanking domed towers use real through-arch wall supports.
    arch_body("flanking tower gateway", x, CBASE, front,
        2.43, 2.66, 1.30, 2.31, 1.30, 2.73)
    arch_ring("flanking tower grand carved architrave", x, CBASE, front + .13,
        1.30, 2.31, 1.30, .12, .15)
    arch_ring("flanking tower second carved pointed bead", x, CBASE,
        front + .17, 1.56, 2.44, 1.34, .040, .07)
    for xx in (x - .98, x + .98):
        column("flanking tower ornate portal pillar", xx, front + .18, CBASE, 4.60, .092)
        for yy in (2.17, 2.74, 3.31, 3.88):
            rosette("flanking tower carved floral roundel", xx, yy, front + .29, .057)
    cornice("flanking domed tower", x, 4.52, -1.0, 2.52, 3.10, .84)
    # A recessed rectangular spandrel field and actual floral stone motifs.
    for xx in (x - .55, x + .55):
        rosette("upper pointed arch spandrel rosette", xx, 4.30, front + .04, .10)
    balustrade("flanking tower crown parapet", x, 4.68, .45, 2.1, .67)
    cylinder("flanking tower sixteen sided dome drum", x, -1.08,
        [(.65, 4.69), (.65, 5.12)], IVORY, 16)
    for k in range(12):
        a = k * math.tau / 12
        px, pz = x + math.sin(a) * .651, -1.08 + math.cos(a) * .651
        tube("side drum raised arcade vertical bead", [(px, 4.75, pz), (px, 5.075, pz)], .014, RIB, 6)
    cylinder("side dome drum fine circular cornice", x, -1.08,
        [(.66, 5.07), (.72, 5.09), (.72, 5.14), (.66, 5.15)], TRIM, 40)
    onion("flanking bulbous dome", x, -1.08, 5.13, .73, .88, 20, True)
    finial("flanking bulbous dome", x, -1.08, 6.01, .26, .065)
    box("flanking rear masonry", (x, 3.22, -2.45), (2.46, 2.72, .18), IVORY, .007)
    # The low outer annex is a stepped architectural wing, not one big block.
    outer = side * 5.10
    arch_body("outer low annex pointed gateway", outer, CBASE, .10,
        1.45, 2.10, .78, 1.84, 1.10, 2.44)
    arch_ring("outer low annex double carved arch", outer, CBASE, .23,
        .78, 1.84, 1.10, .095, .12)
    arch_ring("outer low annex fine inner bead", outer, CBASE + .025, .26,
        .72, 1.78, 1.08, .024, .05, RIB, 18)
    for xx in (outer - .61, outer + .61):
        column("outer annex recessed fluted pillar", xx, .25, CBASE, 3.97, .064)
    cornice("outer annex stepped crown", outer, 3.97, -1.11, 1.45, 2.58, .68)
    balustrade("outer annex thin roof balustrade", outer, 4.095, .15, 1.31, .54)
    box("outer annex rear masonry", (outer, 2.95, -2.40), (1.46, 2.18, .13), IVORY, .005)
    # Deep side-arch insets are real moulded openings with diamond jali work.
    # Small patterned niches between the main tiers articulate the silhouette.
    for xx in (side * 1.95, side * 4.42):
        window("slim interstitial jali niche", xx, 2.14, .33, .34, 1.55, 1.00)
    # Corner kiosks and miniature turret roofs define the Mughal silhouette.
    for xx, zz, by, rr in ((side * 1.51, .55, 5.57, .18),
        (side * 2.02, .26, 4.70, .16), (side * 4.24, .26, 4.70, .16),
        (side * 5.70, .03, 4.13, .13)):
        cylinder("corner turret miniature stone drum", xx, zz,
            [(rr * .72, by), (rr * .72, by + rr * 1.20)], IVORY, 16)
        for k in range(6):
            a = k * math.tau / 6
            px, pz = xx + math.sin(a) * rr * .77, zz + math.cos(a) * rr * .77
            tube("corner turret miniature open arcade pillar", [(px, by + .015, pz),
                (px, by + rr * 1.14, pz)], .017, TRIM, 6)
        onion("miniature turret bulbous cap", xx, zz, by + rr * 1.17, rr * 1.15, rr * 1.05, 10, True)
        finial("miniature corner turret", xx, zz, by + rr * 2.22, rr * 1.00, rr * .24)

# A lower frieze of individually carved arches, rather than painted decoration.
for k in range(38):
    x = -5.48 + 10.96 * k / 37
    arch_ring("foundation repeated miniature blind arch", x, BASE + .025, .725,
        .18, .135, .063, .018, .035, RIB, 8)


def material_batch():
    """One identity-transform mesh for each of five projection surface roles."""
    bpy.context.view_layer.update()
    groups = {}
    for ob in list(bpy.context.scene.objects):
        if ob.type != "MESH":
            continue
        transform = ob.matrix_world.copy()
        for vertex in ob.data.vertices:
            vertex.co = transform @ vertex.co
        ob.matrix_world = Matrix.Identity(4)
        groups.setdefault(ob.data.materials[0].name, []).append(ob)
    output = []
    for name, objects in groups.items():
        bpy.ops.object.select_all(action="DESELECT")
        for ob in objects:
            ob.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        if len(objects) > 1:
            bpy.ops.object.join()
        ob = bpy.context.view_layer.objects.active
        ob.name = name
        output.append(ob)
    return output


objects = material_batch()
ao_helper = Path(__file__).with_name("bake_technical_ao.py")
exec(compile(ao_helper.read_text(encoding="utf-8"), str(ao_helper), "exec"))
AO_STATS = bake_technical_ao(objects, samples=24, max_distance=.38, min_factor=.62, max_seconds=80)

OUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="DESELECT")
for ob in objects:
    ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT), export_format="GLB", use_selection=True,
    export_yup=True, export_apply=True, export_materials="EXPORT", export_cameras=False,
    export_lights=False, export_animations=False, export_vertex_color="NAME",
    export_vertex_color_name="Col", export_all_vertex_colors=False)

positions = [ob.matrix_world @ vertex.co for ob in objects for vertex in ob.data.vertices]
lo = [min(p[i] for p in positions) for i in range(3)]
hi = [max(p[i] for p in positions) for i in range(3)]
bounds = {"min": [lo[0], lo[2], -hi[1]], "max": [hi[0], hi[2], -lo[1]]}
stats = {"file": OUT.name, "bytes": OUT.stat().st_size, "meshes": len(objects),
    "vertices": sum(len(ob.data.vertices) for ob in objects),
    "triangles": sum(sum(len(p.vertices) - 2 for p in ob.data.polygons) for ob in objects),
    "bounds": bounds}
layout = {"version": 1, "authoringScale": 1, "root": ROOT_POSITION,
    "rootRotation": ROOT_ROTATION, "modelCenter": [0, BASE, -1.3], "bottom": BASE,
    "domes": DOMES, "archApertures": ARCHES,
    "materialRoles": [ob.data.materials[0].name for ob in objects],
    "projection": {"method": "runtime light projected on genuine 3D mesh surfaces",
        "coordinateSpace": "authored local Three XYZ; all mesh transforms are identity",
        "substrate": "unmapped ivory plaster; blue/gold is applied by the website"},
    "ambientOcclusion": AO_STATS, "stats": stats}
LAYOUT_OUT.write_text(json.dumps(layout, indent=2), encoding="utf-8")
print("PROJECTION_PALACE " + json.dumps(stats), flush=True)

# Standalone clay render for architecture review. This is never loaded by the
# website and does not contain the reference photo or a facade photo texture.
QA.mkdir(parents=True, exist_ok=True)
floor_mat = material("QA ground only", (.018, .022, .027), .55)
ground = box("QA floor", (0, 1.53, -.8), (20, .10, 13), floor_mat, 0)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.render.resolution_x = 1440
scene.render.resolution_y = 1000
scene.render.resolution_percentage = 100
scene.world.color = (.17, .17, .17)
scene.view_settings.view_transform = "AgX"
def area(name, p, power, color, size, target):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = power
    data.color = color
    data.shape = "DISK"
    data.size = size
    ob = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(ob)
    ob.location = xyz(p)
    ob.rotation_euler = (Vector(xyz(target)) - ob.location).to_track_quat("-Z", "Y").to_euler()
    return ob
area("QA large warm key", (-5, 12, 7), 2500, (1.0, .85, .68), 7, (0, 4, -1))
area("QA soft cool fill", (7, 8, 3), 1800, (.68, .81, 1.0), 5, (0, 4, -1))
area("QA soft overhead rim", (0, 10, -7), 2500, (1.0, .97, .87), 5, (0, 4, -1))
cam_data = bpy.data.cameras.new("QA palace clay camera")
cam = bpy.data.objects.new("QA palace clay camera", cam_data)
bpy.context.collection.objects.link(cam)
cam.location = xyz((12.8, 8.4, 20))
cam.rotation_euler = (Vector(xyz((0, 4.1, -1.0))) - cam.location).to_track_quat("-Z", "Y").to_euler()
cam_data.type = "ORTHO"
cam_data.ortho_scale = 14.8
scene.camera = cam
scene.render.filepath = str(QA / "palace-unmapped-clay.png")
bpy.ops.render.render(write_still=True)
