"""Reception architecture rebuilt around the supplied curved-LED reference.

Run with Blender 5.2 --background --factory-startup --python this-file.py.
Coordinates below are Three.js X/right, Y/up, Z/towards viewer. The runtime
places the resulting group at [0, 0, -75]. LED faces and the venue floor are
deliberately runtime assets. This file exports only authored architecture.
"""

from pathlib import Path

# Share the established mesh helpers, typography and plausible guest proportions
# without executing or modifying any of the separate pillar scene authoring.
HELPERS = Path(__file__).with_name("exhibition_base_helpers.py")
source = HELPERS.read_text(encoding="utf-8").split("# Reception: a continuous")[0]
exec(compile(source.replace('Gallery |', 'Reception |'), str(HELPERS), "exec"))
OUT = ROOT / "public/models/expo/reception-gallery.glb"

# Keep exhibition architecture physically dark under the runtime's bright LED
# spill and key lights. These are linear reflectances, not display hex values.
for mat, rgb, metal, rough in ((BLACK, (.0038, .0045, .0055), .18, .61),
    (WALL, (.0028, .0034, .0044), .025, .86),
    (ROOF, (.0016, .0018, .0022), 0, .95),
    (ALLOY, (.028, .032, .037), .65, .49),
    (NAVY, (.007, .010, .017), 0, .93),
    (CHARCOAL, (.012, .011, .014), 0, .95)):
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*rgb, 1)
    shader.inputs["Metallic"].default_value = metal
    shader.inputs["Roughness"].default_value = rough

TAUPE_LEATHER = material("Reception | pale ivory lounge upholstery", (.58, .535, .455), 0, .69)
TOP = material("Reception | honed ivory stone counter", (.45, .425, .38), 0, .48)
GLASS = material("Reception | fine clear bronze glass", (.65, .55, .35), .02, .12)
GLASS.node_tree.nodes.get("Principled BSDF").inputs["Transmission Weight"].default_value = .76
GLASS.node_tree.nodes.get("Principled BSDF").inputs["IOR"].default_value = 1.46
WHITE_FLOWER = material("Reception | ivory white blossom", (.87, .84, .73), 0, .84)
CLEAR_GLASS = material("Counter | optically clear glassware", (.86, .89, .91), .015, .085)
CLEAR_GLASS.node_tree.nodes.get("Principled BSDF").inputs["Transmission Weight"].default_value = .88
CLEAR_GLASS.node_tree.nodes.get("Principled BSDF").inputs["IOR"].default_value = 1.46
COUNTER_WARM = material("Counter | concealed warm amber toe light", (.98, .42, .12), 0, .38, 1.5)
PIPING = material("Reception | upholstery fine piping", (.34, .30, .24), 0, .8)
SATIN = material("Reception | brushed champagne bar tools", (.52, .39, .22), .86, .23)
BOTTLE = material("Reception | deep olive bottle glass", (.045, .056, .025), .15, .22)
EYE = material("Guests | natural eye and eyelash", (.013, .010, .008), 0, .72)
LIP = material("Guests | subtle natural lip", (.21, .085, .062), 0, .75)
LEAVES = [LEAF, material("Reception | olive light leaf", (.14, .17, .067), 0, .91),
    material("Reception | olive deep leaf", (.032, .058, .018), 0, .95)]
ASSEMBLIES = {}
# The audit can fit assembly silhouettes without reauthoring their fine details.
# Values are Three-space pivots and relative XYZ scales. LED faces remain runtime.
LAYOUT = {
    "cylinder": {"source": [-7, 0, 0], "position": [-7, 0, 0], "scale": [1, 1, 1]},
    "halo": {"source": [1, 8, -3], "position": [2.35446, 10.11994, -4.43058],
        "scale": [8.08472 / 4.9, 2, 4.06681 / 4.9]},
    "panorama": {"source": [8, 3.55, 2], "position": [-1.499, 4.2015, 1.498],
        "scale": [13.594 / 9, 7.903 / 6.6, 13.594 / 9], "rotation_y": -.66665},
    "counter": {"source": [4, 0, -.6], "position": [4.8863, 0, -.2692],
        "scale": [1, 1, 1], "rotation_y": -.23157},
    "lounge": {"source": [-3.3, 0, -4.3], "position": [-3.3, 0, -4.3], "scale": [1, 1, 1]},
    "right": {"source": [15.1, 0, -4.85], "position": [12, 0, 1],
        "scale": [1, 11 / 9.4, 1], "rotation_y": -.2},
    "right_tree": {"source": [14.6, 0, -3.55], "position": [10.3866, 0, 1.8982],
        "scale": [1, 1, 1]},
    "left_pavilion": {"source": [-12.5, 0, -5.75], "position": [-16.4, 0, -5.75],
        "scale": [1, 1, 1]},
}

# Attach the left branding wall tangentially to the exact fitted LED endpoint.
# The visible front-right corner lies on the LED face; the physical 0.22m
# panel extends behind that plane, closing against the screen's cabinet edge.
panorama_fit = LAYOUT["panorama"]
left_join_theta = math.pi + panorama_fit["rotation_y"] + 1.48 / 2
left_join_radius = 9 * panorama_fit["scale"][0]
left_join_edge = (panorama_fit["position"][0] + math.sin(left_join_theta) * left_join_radius,
    panorama_fit["position"][2] + math.cos(left_join_theta) * left_join_radius)
left_join_normal = (-math.sin(left_join_theta), -math.cos(left_join_theta))
left_join_tangent = (math.cos(left_join_theta), -math.sin(left_join_theta))
LEFT_BRAND_EMITTER_TOP = panorama_fit["position"][1] + 3.3 * panorama_fit["scale"][1]
LEFT_BRAND_TOP = panorama_fit["position"][1] + (6.875 - 3.55) * panorama_fit["scale"][1]
left_brand_front_center = [left_join_edge[i] + left_join_tangent[i] * 3.9 / 2 for i in range(2)]
left_brand_center = [left_brand_front_center[i] - left_join_normal[i] * .22 / 2 for i in range(2)]
LAYOUT["left_brand"] = {"source": [-5.3, 0, -7.7],
    "position": [left_brand_center[0], 0, left_brand_center[1]],
    "scale": [1, 1, 1], "rotation_y": left_join_theta - math.pi}
COUNTER_PROFILE = {"radius": 6.2, "arc": 1.2, "led_bottom": .15,
    "led_top": 1.29, "slab_bottom": 1.315, "top": 1.36,
    "slab_depth": .68, "slab_outer": 6.245,
    "warm_bottom": .055, "warm_top": .085, "warm_radius": 6.19}


def remember(name, before):
    ASSEMBLIES.setdefault(name, set()).update(set(bpy.context.scene.objects) - before)


def positioned_group(name, before, x, z, turn=0):
    pivot = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(pivot)
    pivot.location = xyz((x, 0, z))
    pivot.rotation_euler[2] = -math.radians(turn)
    for ob in set(bpy.context.scene.objects) - before:
        if ob != pivot and ob.parent is None:
            ob.parent = pivot
    return pivot


def lathe(name, x, z, profile, mat, segments=24):
    """A continuous spun profile; turned-back inner wall gives real hollow rims."""
    points = [(x + math.sin(i * math.tau / segments) * r, y,
        z + math.cos(i * math.tau / segments) * r)
        for r, y in profile for i in range(segments)]
    faces = []
    for j in range(len(profile) - 1):
        for i in range(segments):
            nxt = (i + 1) % segments
            faces.append((j * segments + i, j * segments + nxt,
                (j + 1) * segments + nxt, (j + 1) * segments + i))
    return patch_mesh(name, points, faces, mat)


def sweep(name, path, mat, segments=12):
    """Smooth tapered tailored sleeve/branch following a three-dimensional bend."""
    points, faces = [], []
    for j, (p, radius) in enumerate(path):
        p = Vector(p)
        tangent = Vector(path[min(j + 1, len(path) - 1)][0]) - Vector(path[max(0, j - 1)][0])
        tangent.normalize()
        other = Vector((0, 0, 1)) if abs(tangent.z) < .9 else Vector((1, 0, 0))
        u = tangent.cross(other).normalized()
        v = tangent.cross(u).normalized()
        for i in range(segments):
            angle = i * math.tau / segments
            points.append(p + (math.cos(angle) * u + math.sin(angle) * v) * radius)
    for j in range(len(path) - 1):
        for i in range(segments):
            nxt = (i + 1) % segments
            faces.append((j * segments + i, j * segments + nxt,
                (j + 1) * segments + nxt, (j + 1) * segments + i))
    faces.extend([tuple(range(segments - 1, -1, -1)),
        tuple((len(path) - 1) * segments + i for i in range(segments))])
    return patch_mesh(name, points, faces, mat)


def human(x, z, scale=1, turn=0, female=False, coat=NAVY, tone=0, pose=0, seated=False, worktop=None, root_y=0):
    """Anatomically proportioned guests with sculpted faces and tailored clothing.

    Arms have genuine elbow poses; bar staff rest one hand over the worktop.
    Faces are small, subdued details rather than blank spherical placeholders.
    """
    before = set(bpy.context.scene.objects)
    s = SKIN[tone]
    dy = -.39 if seated else 0
    hip = .022 if pose % 2 else -.022
    for side in (-1, 1):
        xx = side * .096
        if seated:
            sweep("Guest bent tailored trouser", [((xx + hip, .55, 0), .086),
                ((xx, .47, .30), .074), ((xx, .42, .42), .065),
                ((xx, .13, .47), .052)], coat)
            foot_z = .52
        else:
            foot_z = .035 * side
            loft("Guest softly tailored trouser", [(xx, .115, foot_z, .055, .058),
                (xx + hip * .4, .47, foot_z * .6, .063, .074),
                (xx + hip, .84, 0, .081, .091), (xx + hip, .98, 0, .088, .098)], coat, 14)
            rod("Guest trouser fine outer seam", (xx + side * .063, .16, .016),
                (xx + hip + side * .081, .87, .006), .0025, CHARCOAL, 5)
        ellipsoid("Guest shaped leather shoe", (xx, .067, foot_z + .035), (.064, .053, .131), SHOES, 18, 10)
        box("Guest shoe heel", (xx, .025, foot_z - .035), (.102, .036, .091), SHOES, .012)
    shoulder = .195 if female else .225
    loft("Guest fitted jacket", [(hip, .88 + dy, 0, .158, .103),
        (hip, 1.01 + dy, 0, .151, .106), (0, 1.16 + dy, 0, .159 if female else .178, .112),
        (0, 1.36 + dy, 0, shoulder, .122), (0, 1.417 + dy, 0, shoulder * .73, .100)], coat, 20)
    rod("Guest neck", (0, 1.38 + dy, -.008), (0, 1.544 + dy, -.008), .051, s, 16)
    patch_mesh("Guest shirt front", [(-.082, 1.40 + dy, .106), (.082, 1.40 + dy, .106),
        (0, 1.10 + dy, .116)], [(0, 1, 2)], SHIRT)
    patch_mesh("Guest jacket lapels", [(-.083, 1.414 + dy, .116), (-.15, 1.35 + dy, .116),
        (-.078, 1.252 + dy, .122), (0, 1.102 + dy, .124), (.083, 1.414 + dy, .116),
        (.15, 1.35 + dy, .116), (.078, 1.252 + dy, .122)], [(0, 1, 2, 3), (4, 3, 6, 5)], coat)
    if not female:
        patch_mesh("Guest small silk tie", [(-.019, 1.374 + dy, .117), (.019, 1.374 + dy, .117),
            (.027, 1.194 + dy, .124), (0, 1.16 + dy, .126), (-.027, 1.194 + dy, .124)], [(0, 1, 2, 3, 4)], CHARCOAL)
    for by in (1.08, 1.20):
        ellipsoid("Guest jacket subtle button", (.028, by + dy, .116), (.008, .008, .006), SHOES, 8, 6)
    rod("Guest jacket pocket welt", (.083, 1.31 + dy, .117), (.158, 1.31 + dy, .111), .003, CHARCOAL, 6)
    for side in (-1, 1):
        hand = Vector((side * .242, .91 + dy, .040))
        elbow = Vector((side * .258, 1.15 + dy, .01))
        if pose >= 3 and side == -1:
            elbow = Vector((side * .283, 1.17 + dy, .25))
            hand = Vector((side * .18, 1.37 + dy, .58))
        elif pose % 3 == 1 and side == 1:
            elbow = Vector((side * .28, 1.14 + dy, .08))
            hand = Vector((side * .20, 1.13 + dy, .32))
        if worktop is not None:
            elbow = Vector((side * .265, 1.15, .22))
            hand = Vector((side * .19, worktop + (.018 if side == -1 else .075), .53))
        if seated:
            elbow = Vector((side * .26, .75, .04))
            hand = Vector((side * .15, .65, .30))
        sweep("Guest softly curved jacket sleeve", [((side * shoulder * .84, 1.375 + dy, .004), .075),
            (elbow, .061), (hand + Vector((0, .045, -.015)), .044)], coat, 14)
        ellipsoid("Guest wrist shirt cuff", hand + Vector((0, .033, 0)), (.043, .025, .043), SHIRT, 12, 8)
        resting = worktop is not None and side == -1
        ellipsoid("Guest sculpted palm", hand, (.038, .018, .055) if resting else (.038, .055, .024), s, 14, 8)
        for f in range(4):
            px = hand.x + (f - 1.5) * .016
            if resting:
                rod("Counter staff resting finger", (px, hand.y - .004, hand.z + .03),
                    (px + .003, hand.y - .009, hand.z + .082 - abs(f - 1.5) * .006), .007, s, 6)
            elif worktop is not None:
                rod("Counter staff glass-gripping finger", (px, hand.y - .024, hand.z + .005),
                    (px + .003, hand.y - .060 + abs(f - 1.5) * .006, hand.z + .024), .007, s, 6)
            else:
                rod("Guest relaxed finger", (px, hand.y - .03, hand.z + .003),
                    (px + .003, hand.y - .078 + abs(f - 1.5) * .007, hand.z + .015), .007, s, 6)
        rod("Guest thumb", hand + Vector((-.034 * side, 0, .005)),
            hand + Vector((-.049 * side, -.005 if resting else -.033, .039 if resting else .025)), .010, s, 7)
    # A restrained jaw, cheek, temples and crown create a real facial profile.
    loft("Guest sculpted facial head", [(0, 1.511 + dy, .013, .039, .057),
        (0, 1.543 + dy, .006, .068, .079), (0, 1.61 + dy, 0, .088, .097),
        (0, 1.676 + dy, -.004, .084, .092), (0, 1.731 + dy, -.014, .072, .077),
        (0, 1.767 + dy, -.019, .041, .048), (0, 1.778 + dy, -.019, .011, .012)], s, 24)
    ellipsoid("Guest nose bridge", (0, 1.632 + dy, .095), (.014, .037, .019), s, 14, 8)
    ellipsoid("Guest nose tip", (0, 1.605 + dy, .111), (.021, .015, .024), s, 14, 8)
    for side in (-1, 1):
        ellipsoid("Guest cheek subtle volume", (side * .056, 1.609 + dy, .071), (.028, .033, .021), s, 14, 8)
        ellipsoid("Guest ear", (side * .088, 1.629 + dy, -.004), (.017, .031, .020), s, 12, 8)
        ellipsoid("Guest subtle eye", (side * .036, 1.659 + dy, .080), (.013, .0047, .004), EYE, 10, 6)
        rod("Guest eyebrow", (side * .023, 1.682 + dy, .083), (side * .051, 1.68 + dy, .077), .003, HAIR, 5)
    ellipsoid("Guest mouth", (0, 1.566 + dy, .085), (.024, .0034, .005), LIP, 12, 6)
    ellipsoid("Guest hair crown", (0, 1.733 + dy, -.025), (.083, .060, .083), HAIR, 24, 12)
    ellipsoid("Guest hair back", (0, 1.672 + dy, -.062), (.085, .081, .048), HAIR, 20, 10)
    if female:
        ellipsoid("Guest long soft hair", (0, 1.51 + dy, -.080), (.103, .181, .058), HAIR, 24, 14)
        for side in (-1, 1):
            sweep("Guest layered side hair", [((side * .077, 1.72 + dy, -.015), .026),
                ((side * .093, 1.59 + dy, -.013), .026), ((side * .102, 1.41 + dy, -.045), .021)], HAIR)
    if worktop is not None:
        drinking_glass(.19, worktop + .005, .53, mat=CLEAR_GLASS)
    elif pose == 1 and not seated:
        drinking_glass(.20, 1.095 + dy, .32)
    pivot = positioned_group("Reception guest pose", before, x, z, turn)
    pivot.location = xyz((x, root_y, z))
    pivot.scale = (scale, scale, scale)


def arc_shell(name, center, radius, depth, y0, y1, mat=BLACK, arc=math.tau, segments=96, rotation=0):
    """Closed constant-depth curved architectural panel. Arc zero points +Z."""
    cx, cz = center
    vertices = []
    for y in (y0, y1):
        for r in (radius - depth, radius):
            for i in range(segments + 1):
                angle = -arc / 2 + arc * i / segments + rotation
                vertices.append((cx + math.sin(angle) * r, y, cz + math.cos(angle) * r))
    count = segments + 1
    faces = []
    for i in range(segments):
        j = i + 1
        faces.extend([(i, j, count + j, count + i),
            (2 * count + i, 3 * count + i, 3 * count + j, 2 * count + j),
            (i, 2 * count + i, 2 * count + j, j),
            (count + i, count + j, 3 * count + j, 3 * count + i)])
    faces.extend([(0, count, 3 * count, 2 * count),
        (segments, 2 * count + segments, 3 * count + segments, count + segments)])
    return patch_mesh(name, vertices, faces, mat)


def curved_profile(name, center, profile, arc, mat, segments=112):
    """Rounded continuous slab profile swept along the gently bowed frontage."""
    vertices = []
    count = len(profile)
    for i in range(segments + 1):
        angle = -arc / 2 + arc * i / segments
        for radius, y in profile:
            vertices.append((center[0] + math.sin(angle) * radius, y,
                center[1] + math.cos(angle) * radius))
    faces = []
    for i in range(segments):
        for j in range(count):
            nxt = (j + 1) % count
            faces.append((i * count + j, (i + 1) * count + j,
                (i + 1) * count + nxt, i * count + nxt))
    faces.extend([tuple(range(count - 1, -1, -1)),
        tuple(segments * count + j for j in range(count))])
    return patch_mesh(name, vertices, faces, mat)


def disk(name, x, z, radius, y0, y1, mat):
    return rod(name, (x, y0, z), (x, y1, z), radius, mat, 96)


def chair(x, z, turn=0):
    """Compact curved lounge tub with open underside and slender bronze feet."""
    before = set(bpy.context.scene.objects)
    ellipsoid("Lounge molded seat", (0, .45, 0), (.43, .14, .42), TAUPE_LEATHER, 20, 10)
    # The tub opens toward +Z. This profile rises gently at each arm.
    vertices, faces = [], []
    steps = 40
    for i in range(steps + 1):
        angle = -.76 * math.pi + 1.52 * math.pi * i / steps
        h = .74 + .29 * math.cos(angle / 1.52)
        profile = ((.34, .44), (.43, .44), (.485, .59), (.49, h - .055),
            (.465, h), (.405, h + .006), (.365, h - .045), (.325, .49))
        for r, y in profile:
            vertices.append((math.sin(angle) * r, y, -math.cos(angle) * r))
    for i in range(steps):
        for j in range(8):
            faces.append((i * 8 + j, (i + 1) * 8 + j,
                (i + 1) * 8 + (j + 1) % 8, i * 8 + (j + 1) % 8))
    faces.extend([tuple(range(7, -1, -1)), tuple(steps * 8 + j for j in range(8))])
    patch_mesh("Lounge continuous upholstered tub", vertices, faces, TAUPE_LEATHER)
    for xx in (-.28, .28):
        for zz in (-.25, .25):
            rod("Lounge slim black leg", (xx * 1.13, .035, zz * 1.12), (xx, .41, zz), .018, BLACK)
    for i in range(steps):
        a, b = -.76 * math.pi + 1.52 * math.pi * i / steps, -.76 * math.pi + 1.52 * math.pi * (i + 1) / steps
        rod("Lounge fine stitched upper piping", (math.sin(a) * .435, .749 + .29 * math.cos(a / 1.52), -math.cos(a) * .435),
            (math.sin(b) * .435, .749 + .29 * math.cos(b / 1.52), -math.cos(b) * .435), .003, PIPING, 5)
    positioned_group("Reception lounge chair pose", before, x, z, turn)


def soft_box(name, p, size, mat, bevel=.08):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    for vertex in bm.verts:
        vertex.co.x *= size[0]
        vertex.co.y *= size[2]
        vertex.co.z *= size[1]
    bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=5,
        affect="EDGES", clamp_overlap=True)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(ob)
    ob.location = xyz(p)
    ob.data.materials.append(mat)
    return ob


def sofa(x, z, width=2.5, turn=0):
    """Soft ivory two-seat lounge sofa with loose cushions and recessed feet."""
    before = set(bpy.context.scene.objects)
    soft_box("Sofa upholstered floating base", (0, .29, 0), (width, .27, .88), TAUPE_LEATHER, .10)
    soft_box("Sofa continuous cushioned back", (0, .76, -.35), (width - .12, .66, .26), TAUPE_LEATHER, .11)
    for side in (-1, 1):
        soft_box("Sofa softly rounded arm", (side * (width / 2 - .12), .61, .035), (.25, .56, .89), TAUPE_LEATHER, .11)
        soft_box("Sofa loose seat cushion", (side * (width - .48) / 4, .495, .05), ((width - .5) / 2 - .018, .20, .72), TAUPE_LEATHER, .082)
        ob = soft_box("Sofa soft back cushion", (side * (width - .48) / 4, .83, -.20), ((width - .5) / 2 - .022, .46, .20), TAUPE_LEATHER, .08)
        ob.rotation_euler[0] = math.radians(-7)
        for zz in (-.28, .27):
            rod("Sofa slender black foot", (side * (width / 2 - .21), .025, zz),
                (side * (width / 2 - .23), .20, zz), .021, BLACK)
    positioned_group("Reception ivory sofa pose", before, x, z, turn)


def drinking_glass(x, y, z, wine=False, mat=GLASS):
    if wine:
        lathe("Bar delicate wine glass", x, z, [(.006, y), (.051, y + .004), (.051, y + .008),
            (.009, y + .013), (.006, y + .115), (.032, y + .125), (.045, y + .170),
            (.042, y + .219), (.038, y + .240), (.035, y + .240), (.039, y + .217),
            (.042, y + .170), (.028, y + .128), (.005, y + .123)], mat)
    else:
        lathe("Bar thin hollow highball", x, z, [(.001, y), (.034, y), (.037, y + .005),
            (.041, y + .159), (.040, y + .163), (.036, y + .163),
            (.033, y + .014), (.001, y + .014)], mat, 20)


def leafy_tree(x, z, seed, height=3.3):
    rng = random.Random(seed)
    lathe("Olive tall honed stone planter", x, z, [(.26, .025), (.34, .08), (.38, .62),
        (.38, .66), (.35, .66), (.33, .58), (.27, .10)], STONE, 32)
    disk("Olive dark soil", x, z, .344, .603, .61, TIMBER)
    sweep("Olive gently curved trunk", [((x, .60, z), .048), ((x + .05, 1.30, z), .034),
        ((x - .06, 2.05, z + .03), .024), ((x + .04, height - .35, z), .009)], TIMBER, 12)
    vertices, faces, leaf_mats = [], [], []
    for i in range(28):
        a = i * 2.399 + seed
        radius = rng.uniform(.50, .96) * (1 - abs(i / 28 - .5) * .30)
        end = Vector((x + math.cos(a) * radius,
            1.95 + rng.random() * (height - 1.9), z + math.sin(a) * radius * .83))
        start = Vector((x + .02, 1.25 + i / 28 * 1.20, z))
        sweep("Olive irregular branch", [(start, .012), (start.lerp(end, .6) + Vector((0, .08, 0)), .007), (end, .003)], TIMBER, 7)
        for j in range(25):
            center = start.lerp(end, .45 + j / 25 * .55)
            center += Vector((rng.uniform(-.19, .19), rng.uniform(-.13, .16), rng.uniform(-.19, .19)))
            angle = a + j * 2.4
            direction = Vector((math.cos(angle), rng.uniform(-.25, .55), math.sin(angle))) * rng.uniform(.055, .095)
            transverse = Vector((-math.sin(angle), .2, math.cos(angle))) * .023
            idx = len(vertices)
            vertices.extend([center - direction, center + transverse,
                center + direction, center - transverse, center + Vector((0, .010, 0))])
            faces.extend([(idx, idx + 1, idx + 4), (idx + 1, idx + 2, idx + 4),
                (idx + 2, idx + 3, idx + 4), (idx + 3, idx, idx + 4)])
            leaf_mats.extend([rng.randrange(3)] * 4)
    ob = patch_mesh("Olive dense natural leaf canopy", vertices, faces, LEAVES[0])
    for mat in LEAVES[1:]:
        ob.data.materials.append(mat)
    for polygon, mat_index in zip(ob.data.polygons, leaf_mats):
        polygon.material_index = mat_index


def cocktail_table(x, z):
    disk("Lounge circular dark table", x, z, .47, .49, .535, BLACK)
    rod("Lounge table central stem", (x, .07, z), (x, .495, z), .035, CHAMPAGNE)
    disk("Lounge low table foot", x, z, .24, .04, .075, BLACK)
    for dx in (-.12, .12):
        drinking_glass(x + dx, .535, z)
    soft_box("Lounge ivory folded linen napkin", (x + .1, .543, z + .18), (.14, .016, .12), SHIRT, .01)


def flowers(x, y, z, scale=1):
    lathe("Reception tall handblown floral vase", x, z, [(.085 * scale, y),
        (.13 * scale, y + .03 * scale), (.115 * scale, y + .28 * scale),
        (.075 * scale, y + .39 * scale), (.070 * scale, y + .39 * scale),
        (.107 * scale, y + .28 * scale), (.12 * scale, y + .03 * scale)], GLASS, 32)
    for i in range(17):
        angle = i * 2.4
        p = Vector((x + math.cos(angle) * (.18 + RNG.random() * .30) * scale,
            y + (.76 + RNG.uniform(0, .35)) * scale,
            z + math.sin(angle) * .32 * scale))
        start = Vector((x, y + .20 * scale, z))
        sweep("Reception fine branching floral stem", [(start, .004 * scale),
            (start.lerp(p, .65) + Vector((0, .08 * scale, 0)), .0035 * scale),
            (p, .0018 * scale)], TIMBER, 6)
        for cluster in range(3):
            center = start.lerp(p, .70 + cluster * .15)
            center += Vector((math.cos(angle + cluster) * .075 * scale, 0, math.sin(angle + cluster) * .075 * scale))
            rod("Reception orchid delicate twig", start.lerp(p, .65 + cluster * .15), center, .0015 * scale, TIMBER, 5)
            for j in range(5):
                a = j * math.tau / 5 + i
                ellipsoid("Reception individual ivory orchid petal",
                    center + Vector((math.cos(a) * .026 * scale, math.sin(a) * .024 * scale, .006 * scale)),
                    (.026 * scale, .021 * scale, .009 * scale), WHITE_FLOWER, 10, 6)
            ellipsoid("Reception tiny warm orchid heart", center, (.009 * scale, .009 * scale, .009 * scale), CHAMPAGNE, 8, 6)


# The hero cylinder rises from a low circular black stage with concealed amber.
before = set(bpy.context.scene.objects)
disk("Cylinder low black circular plinth", -7, 0, 2.45, .035, .24, BLACK)
arc_shell("Cylinder exposed concealed circular footlight", (-7, 0), 2.456, .012, .055, .11, WARM)
disk("Cylinder slim dark top cap", -7, 0, 1.875, 8.835, 8.90, BLACK)
arc_shell("Cylinder champagne base reveal", (-7, 0), 1.89, .025, .24, .265, CHAMPAGNE)
remember("cylinder", before)

# Suspended LED halo. Outer r4.9 LED stays unobstructed between y7.3 and8.7.
before = set(bpy.context.scene.objects)
arc_shell("Halo inner satin steel skin", (1, -3), 4.825, .035, 7.30, 8.70, WALL)
arc_shell("Halo narrow lower housing", (1, -3), 4.928, .135, 7.245, 7.30, BLACK)
arc_shell("Halo continuous champagne lower lip", (1, -3), 4.931, .021, 7.258, 7.277, CHAMPAGNE)
arc_shell("Halo concealed warm lower edge", (1, -3), 4.934, .015, 7.245, 7.260, WARM)
arc_shell("Halo fine top housing", (1, -3), 4.929, .137, 8.70, 8.747, BLACK)
for i in range(6):
    angle = i * math.tau / 6 + .2
    x, z = 1 + math.sin(angle) * 4.87, -3 + math.cos(angle) * 4.87
    rod("Halo fine ceiling suspension", (x, 8.745, z), (x, 12.8, z), .011, BLACK, 6)
remember("halo", before)

# Concave panoramic cinema support. Its centerline is [8,3.55,-7]; the
# negative-Z arc opens toward arrivals and leaves a corridor at x<1.9.
before = set(bpy.context.scene.objects)
arc_shell("Panoramic LED concealed rear support", (8, 2), 9.13, .105, .25, 6.85, WALL, 1.48, rotation=math.pi)
arc_shell("Panoramic LED thin lower cabinet", (8, 2), 9.035, .18, .225, .265, BLACK, 1.48, rotation=math.pi)
arc_shell("Panoramic LED thin upper cabinet", (8, 2), 9.035, .18, 6.835, 6.875, BLACK, 1.48, rotation=math.pi)
remember("panorama", before)

# Tall brand panel joins the LED endpoint without stretching the glyph meshes.
before = set(bpy.context.scene.objects)
box("Reception left brand feature wall", (-5.3, LEFT_BRAND_TOP / 2, -7.7),
    (3.9, LEFT_BRAND_TOP, .22), WALL, 0)
lettering("LivegridAV", (-6.64, 4.90, -7.575), .72)
for i, line in enumerate(("EXPERIENCE", "CONNECT", "CREATE", "TOGETHER")):
    lettering(line, (-6.60, 3.90 - i * .55, -7.572), .52, tracking=1.14, semibold=True)
box("Left brand small underline", (-6.42, 2.00, -7.57), (.35, .014, .009), BRAND, 0)
remember("left_brand", before)
# Far-right flat feature panel does not form an aisle-blocking side return.
before = set(bpy.context.scene.objects)
box("Reception far-right brand feature wall", (15.1, 4.7, -4.85), (2.0, 9.4, .24), WALL, .025)
for i, line in enumerate(("LED", "DESIGN", "TECHNOLOGY", "PEOPLE", "IMPACT")):
    lettering(line, (14.24, (8.40 - i * .52) / (11 / 9.4), -4.723), .42, tracking=1.08, semibold=True)
box("Right brand small underline", (14.60, 5.80 / (11 / 9.4), -4.72), (.39, .017, .009), BRAND, 0)
remember("right", before)
# The left edge of the reference is framed by a quiet black pavilion blade.
# It remains wholly outside the hero cylinder and the central walkthrough.
before = set(bpy.context.scene.objects)
box("Left pavilion tall charcoal sign blade", (-12.5, 3.25, -5.75), (2.05, 6.5, .20), WALL, .025)
for i, line in enumerate(("A", "BRIGHTER", "TOMORROW", "TOGETHER")):
    lettering(line, (-13.23, 4.70 - i * .38, -5.642), .34, tracking=1.10)
box("Left pavilion small porcelain underline", (-12.97, 3.16, -5.64), (.33, .014, .008), BRAND, 0)
box("Left pavilion pale interior reveal", (-12.5, 1.30, -5.71), (1.86, 2.60, .055), STONE, .015)
box("Left pavilion warm concealed threshold", (-12.5, 2.70, -5.67), (1.88, .02, .032), WARM, .004)
remember("left_pavilion", before)

# Broad shallow reception bar: the LED face has a 6.2m radius over a 1.2rad
# segment. The thin ivory slab has a small rounded nose, a restrained dark
# underside and a genuine recessed amber toe light beneath the black kick.
before = set(bpy.context.scene.objects)
COUNTER = (4, -.60)
counter_arc = COUNTER_PROFILE["arc"]
counter_y = COUNTER_PROFILE["top"]
arc_shell("Curved reception solid dark carcass", COUNTER, 6.18, .615, .15, 1.315, BLACK, counter_arc)
curved_profile("Curved reception thin ivory rounded worktop", COUNTER,
    [(6.237, 1.315), (6.245, 1.323), (6.245, 1.353), (6.238, 1.36),
     (5.573, 1.36), (5.565, 1.352), (5.565, 1.323), (5.573, 1.315)], counter_arc, TOP)
arc_shell("Curved reception recessed black plinth", COUNTER, 6.12, .555, .035, .15, BLACK, counter_arc)
arc_shell("Curved reception concealed amber toe light", COUNTER, 6.19, .012, .055, .085, COUNTER_WARM, counter_arc)
arc_shell("Curved reception fine black lower kick", COUNTER, 6.213, .055, .105, .15, BLACK, counter_arc)
arc_shell("Curved reception fine black upper shadow trim", COUNTER, 6.224, .060, 1.29, 1.315, BLACK, counter_arc)


def barpoint(angle, radius=5.91):
    return 4 + math.sin(angle) * radius, -.6 + math.cos(angle) * radius


def metal_bottle(x, z, y, height=.31):
    lathe("Counter brushed champagne water bottle", x, z,
        [(.001, y), (.045, y), (.048, y + .018), (.045, y + height * .70),
         (.029, y + height * .79), (.021, y + height * .83),
         (.021, y + height * .98), (.018, y + height), (.001, y + height)], SATIN, 28)
    arc_shell("Counter bottle understated dark cap seam", (x, z), .0215, .001,
        y + height * .93, y + height * .945, BLACK, math.tau, 24)


# Three individually curated service stations, each arranged radially on the
# narrow worktop. The service pieces stay low enough to preserve faces/branding.
for station, (angle, service_radius) in enumerate(((-.27, 5.91), (.15, 5.99), (.43, 5.91))):
    x, z = barpoint(angle, service_radius)
    disk("Counter thin satin serving tray", x, z, .21, counter_y + .002, counter_y + .010, SATIN)
    for i, (dx, dz) in enumerate(((-.075, -.055), (.07, -.05), (0, .065))):
        drinking_glass(x + dx, counter_y + .011, z + dz,
            wine=station != 1 and i != 2, mat=CLEAR_GLASS)
    if station == 0:
        metal_bottle(x - .31, z - .01, counter_y, .32)
        lathe("Counter slender champagne bottle", x + .31, z - .015,
            [(.001, counter_y), (.042, counter_y), (.044, counter_y + .025),
             (.042, counter_y + .20), (.023, counter_y + .25),
             (.018, counter_y + .27), (.018, counter_y + .34), (.001, counter_y + .34)], BOTTLE, 28)
        arc_shell("Counter champagne small pale label", (x + .31, z - .015), .043, .001,
            counter_y + .07, counter_y + .13, SHIRT, math.tau, 24)
        arc_shell("Counter champagne short neck foil", (x + .31, z - .015), .019, .001,
            counter_y + .26, counter_y + .34, SATIN, math.tau, 24)
    elif station == 1:
        lathe("Counter polished tapered shaker", x - .27, z,
            [(.001, counter_y), (.043, counter_y), (.052, counter_y + .17),
             (.040, counter_y + .21), (.023, counter_y + .22),
             (.022, counter_y + .26), (.001, counter_y + .267)], SATIN, 28)
        lathe("Counter double-ended jigger", x + .26, z + .06,
            [(.029, counter_y), (.013, counter_y + .047), (.032, counter_y + .098),
             (.030, counter_y + .10), (.012, counter_y + .053), (.027, counter_y + .003)], SATIN, 24)
        rod("Counter fine stirring spoon", (x - .27, counter_y + .15, z),
            (x - .27, counter_y + .30, z + .025), .003, SATIN, 7)
    else:
        metal_bottle(x + .28, z - .015, counter_y, .29)
        lathe("Counter low clear water carafe", x - .27, z,
            [(.001, counter_y), (.058, counter_y), (.062, counter_y + .025),
             (.056, counter_y + .17), (.032, counter_y + .23), (.035, counter_y + .27),
             (.030, counter_y + .27), (.027, counter_y + .23), (.051, counter_y + .17),
             (.057, counter_y + .025), (.001, counter_y + .012)], CLEAR_GLASS, 28)
    soft_box("Counter folded ivory service linen", (x - .08, counter_y + .008, z - .19),
        (.15, .014, .11), SHIRT, .010)

# A single tall ivory orchid arrangement occupies the far right as in the
# reference. The small low posy is deliberately below the staff sightlines.
flower_x, flower_z = barpoint(.21, 5.74)
flowers(flower_x, counter_y, flower_z, .82)
posy_x, posy_z = barpoint(-.52, 5.93)
flowers(posy_x, counter_y, posy_z, .16)
remember("counter", before)

# Quiet back-of-house seating and planting preserve the clear central aisle.
before = set(bpy.context.scene.objects)
sofa(-3.25, -5.35, 2.5, 0)
sofa(-7.95, -4.70, 2.3, 75)
for x, z, turn in ((-5.15, -3.8, -40), (-1.60, -3.7, 42),
    (-4.25, -2.35, 165), (-2.1, -2.25, -150)):
    chair(x, z, turn)
cocktail_table(-3.35, -3.85)
cocktail_table(-7.0, -4.15)
human(-3.73, -5.13, .98, 0, False, NAVY, 1, 1, True)
human(-2.76, -5.14, .94, -7, True, CHARCOAL, 2, 0, True)
remember("lounge", before)
leafy_tree(-6.78, -5.35, 36, 3.25)
before = set(bpy.context.scene.objects)
leafy_tree(14.6, -3.55, 43, 3.8)
remember("right_tree", before)

# Visitors stay outside x[-3,4] z[3,8], where the close-passes travel.
human(-6.38, 5.2, 1.08, 155, False, NAVY, 0, 0)
human(-6.98, 3.9, 1.01, 174, False, CHARCOAL, 1, 1)
human(-6.0, -3.15, .99, 30, False, NAVY, 1, 0)
human(-6.52, -3.60, .97, -25, True, CHARCOAL, 2, 1)
human(-4.00, -6.30, .99, 120, False, NAVY, 0, 0)
human(7.40, -4.30, .97, 178, True, CHARCOAL, 1, 1)
# Staff are on the open concave side behind the curve, never inside the cabinet.
before = set(bpy.context.scene.objects)
STAFF_FIT = [(-.4117895, .99, .436792, False, CHARCOAL, 1),
    (-.0958144, .95, .534394, True, NAVY, 2),
    (.0597709, 1.00, .537759, False, NAVY, 0)]
for angle, scale, root_y, female, coat, tone in STAFF_FIT:
    x, z = barpoint(angle, 5.20)
    # The concealed working riser preserves natural adult proportions while
    # matching the reference's visible torsos. Its front edge ends just behind
    # the cabinet's inner face; the counter conceals it from the public side.
    riser = box("Counter staff concealed black working platform", (x, root_y / 2, z),
        (.72, root_y, .68), BLACK, .012)
    riser.rotation_euler[2] = angle
    human(x, z, scale, -math.degrees(angle), female, coat, tone,
        pose=0, worktop=(counter_y - root_y) / scale, root_y=root_y)
remember("counter", before)

# The reference is a working exhibition hall: black roof panels, purlins,
# suspended square production trusses, fixtures, yokes, cabling and warm lenses.
# All of this stays overhead; the floor and travel corridors remain runtime.
def production_truss(a, b, width=.32, pitch=1.30):
    a, b = Vector(a), Vector(b)
    transverse = Vector((0, 0, 1)) if abs((b - a).normalized().x) > .9 else Vector((1, 0, 0))
    vertical = Vector((0, 1, 0))
    for side in (-1, 1):
        for height in (-1, 1):
            offset = transverse * width / 2 * side + vertical * width / 2 * height
            rod("Roof truss structural chord", a + offset, b + offset, .025, BLACK, 8)
    count = max(1, int((b - a).length / pitch))
    for i in range(count):
        start, end = a.lerp(b, i / count), a.lerp(b, (i + 1) / count)
        sign = 1 if i % 2 else -1
        for side in (-1, 1):
            rod("Roof truss fine diagonal", start + transverse * width / 2 * side - vertical * width / 2 * sign,
                end + transverse * width / 2 * side + vertical * width / 2 * sign, .012, BLACK, 6)
        for height in (-1, 1):
            rod("Roof truss side diagonal", start + vertical * width / 2 * height - transverse * width / 2 * sign,
                end + vertical * width / 2 * height + transverse * width / 2 * sign, .010, BLACK, 6)

for i in range(9):
    box("Reception charcoal roof acoustic panel", (-13.5 + i * 4, 13.42, -3), (3.97, .16, 34), ROOF, 0)
for z in (-17.5, -10, -2.5, 5, 12.5):
    production_truss((-15, 12.74, z), (19, 12.74, z), .31)
for x in (-13, -4, 5, 14):
    production_truss((x, 12.55, -19), (x, 12.55, 13), .27)
for z in range(-19, 14, 2):
    box("Reception roof fine purlin", (2, 13.15, z), (34, .18, .06), BLACK, .006)
for ix, x in enumerate((-11.5, -5, 1.5, 8, 15)):
    for iz, z in enumerate((-16, -8.5, -1, 6.5)):
        rod("Reception spotlight hanging clamp", (x, 12.70, z), (x, 12.30, z), .015, BLACK)
        # Separate side forks are a real U-shaped spotlight yoke.
        for side in (-1, 1):
            rod("Reception spotlight yoke fork", (x + side * .12, 12.31, z),
                (x + side * .12, 12.08, z), .012, ALLOY, 6)
        rod("Reception spotlight yoke crossbar", (x - .12, 12.31, z), (x + .12, 12.31, z), .012, ALLOY, 6)
        rod("Reception exhibition spotlight body", (x, 12.24, z), (x, 11.99, z + .11), .108, BLACK, 20)
        rod("Reception exhibition spotlight satin rim", (x, 12.005, z + .103), (x, 11.986, z + .112), .111, CHAMPAGNE, 20)
        rod("Reception warm spotlight recessed lens", (x, 11.984, z + .113), (x, 11.978, z + .116), .087, LENS, 20)
        sweep("Reception discreet electrical cable", [((x + .14, 12.42, z), .004),
            ((x + .20, 12.31, z + .03), .004), ((x + .16, 12.18, z + .02), .004)], BLACK, 5)

# Apply any silhouette-fit adjustments once per assembly root before baking.
from mathutils import Matrix
def assembly_matrix(fit):
    old, new, scales = fit["source"], fit["position"], fit["scale"]
    return Matrix.Translation(Vector(xyz(new))) @ Matrix.Rotation(fit.get("rotation_y", 0), 4, "Z") @ Matrix.Diagonal((scales[0], scales[2], scales[1], 1)) @ Matrix.Translation(-Vector(xyz(old)))

bpy.context.view_layer.update()
for name, objects in ASSEMBLIES.items():
    fit = LAYOUT[name]
    matrix = assembly_matrix(fit)
    for ob in objects:
        if ob.parent not in objects:
            if "signage_body" in ob:
                # Move labels rigidly with a fitted wall; its height fit must
                # never turn the original letterforms into tall narrow glyphs.
                ob.location = matrix @ ob.matrix_world.translation
                ob.rotation_euler[2] += fit.get("rotation_y", 0)
            else:
                ob.matrix_world = matrix @ ob.matrix_world

# Suspensions terminate at the new authored ceiling rather than penetrating it.
# Their lower attachment follows the fitted halo; rods are six tiny mesh strips.
for ob in list(bpy.context.scene.objects):
    if ob.name.startswith("Halo fine ceiling suspension"):
        bpy.data.objects.remove(ob, do_unlink=True)
halo_fit = LAYOUT["halo"]
for i in range(6):
    angle = i * math.tau / 6 + .2
    x = halo_fit["position"][0] + math.sin(angle) * 4.87 * halo_fit["scale"][0]
    z = halo_fit["position"][2] + math.cos(angle) * 4.87 * halo_fit["scale"][2]
    rod("Halo fitted fine suspension", (x, halo_fit["position"][1] + .745 * halo_fit["scale"][1], z), (x, 13.30, z), .011, BLACK, 6)

# Bake all guests and chairs, then reduce to one renderable per material.
bpy.ops.object.select_all(action="DESELECT")
bpy.context.view_layer.update()
write_lettering_audit(ROOT / "qa/typography-clarity/reception-gallery-labels.json")
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
        groups.setdefault(ob.data.materials[0].name, []).append(ob)
for name, objects in groups.items():
    bpy.ops.object.select_all(action="DESELECT")
    for ob in objects:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    bpy.context.object.name = name
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
OUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(OUT), export_format="GLB", export_yup=True,
    export_apply=True, export_materials="EXPORT", export_cameras=False,
    export_lights=False, export_animations=False)
meshes = [ob for ob in bpy.context.scene.objects if ob.type == "MESH"]
points = [ob.matrix_world @ Vector(corner) for ob in meshes for corner in ob.bound_box]
lo = [min(p[i] for p in points) for i in range(3)]
hi = [max(p[i] for p in points) for i in range(3)]
print("RECEPTION_GALLERY " + json.dumps({"file": str(OUT), "bytes": OUT.stat().st_size,
    "meshes": len(meshes), "materials": len(groups),
    "vertices": sum(len(ob.data.vertices) for ob in meshes),
    "triangles": sum(sum(max(1, len(poly.vertices)-2) for poly in ob.data.polygons) for ob in meshes),
    "three_bounds": {"min": [lo[0], lo[2], -hi[1]], "max": [hi[0], hi[2], -lo[1]]}}), flush=True)
print("RECEPTION_LEFT_BRAND_JOIN " + json.dumps({
    "led_front_edge_xz": left_join_edge,
    "panel_front_right_edge_xz": left_join_edge,
    "panel_physical_center": [left_brand_center[0], LEFT_BRAND_TOP / 2, left_brand_center[1]],
    "width": 3.9, "thickness": .22, "bottom": 0, "top": LEFT_BRAND_TOP,
    "led_emitter_top": LEFT_BRAND_EMITTER_TOP,
    "yaw": left_join_theta - math.pi,
    "front_normal_xz": left_join_normal,
    "leftward_tangent_xz": left_join_tangent}), flush=True)
print("RECEPTION_COUNTER_CONTRACT " + json.dumps({
    "source_pivot": [4, 0, -.6], "fitted_pivot": LAYOUT["counter"]["position"],
    "yaw": LAYOUT["counter"]["rotation_y"], "scale": [1, 1, 1],
    "profile": COUNTER_PROFILE,
    "chord": 2 * COUNTER_PROFILE["radius"] * math.sin(COUNTER_PROFILE["arc"] / 2),
    "sagitta": COUNTER_PROFILE["radius"] * (1 - math.cos(COUNTER_PROFILE["arc"] / 2)),
    "staff_radius": 5.2, "staff_angles": [item[0] for item in STAFF_FIT],
    "staff_uniform_scales": [item[1] for item in STAFF_FIT],
    "staff_platform_heights": [item[2] for item in STAFF_FIT],
    "staff_head_centers_y": [1.6445 * item[1] + item[2] for item in STAFF_FIT],
    "service_radii": [5.91, 5.99, 5.91], "service_angles": [-.27, .15, .43],
    "tall_flower_angle": .21, "tall_flower_radius": 5.74, "tall_flower_scale": .82,
    "low_posy_angle": -.52, "low_posy_scale": .16}), flush=True)

if "--preview" in __import__("sys").argv:
    # Structural QA only: simple blue placeholders make the authored black
    # architecture legible. Runtime owns the reference LED textures and light.
    BLUE = material("QA untextured LED", (.08, .16, .40), 0, .35, .45)
    proxy = disk("QA cylinder LED", -7, 0, 1.85, .24, 8.84, BLUE)
    proxy.matrix_world = assembly_matrix(LAYOUT["cylinder"])
    proxy = arc_shell("QA halo outer LED", (1, -3), 4.9, .012, 7.3, 8.7, BLUE)
    proxy.matrix_world = assembly_matrix(LAYOUT["halo"])
    proxy = arc_shell("QA counter LED", (4, -.6), 6.2, .01, .15, 1.29, BLUE, 1.2)
    proxy.matrix_world = assembly_matrix(LAYOUT["counter"])
    proxy = arc_shell("QA panoramic LED", (8, 2), 9.015, .015, .25, 6.85, BLUE, 1.48, rotation=math.pi)
    proxy.matrix_world = assembly_matrix(LAYOUT["panorama"])
    bpy.ops.mesh.primitive_plane_add(size=100)
    bpy.context.object.data.materials.append(material("QA reflective floor", (.11, .12, .14), .45, .23))
    def area(p, energy, color, size, target):
        data = bpy.data.lights.new("QA large softbox", "AREA")
        data.energy, data.color, data.shape, data.size = energy, color, "DISK", size
        ob = bpy.data.objects.new(data.name, data)
        bpy.context.collection.objects.link(ob)
        ob.location = xyz(p)
        ob.rotation_euler = (Vector(xyz(target)) - ob.location).to_track_quat("-Z", "Y").to_euler()
    area((1, 11, 5), 3200, (1, .76, .56), 10, (0, 0, -3))
    area((-8, 6, 8), 1500, (.62, .74, 1), 9, (0, 3, 0))
    area((7, 5, 5), 1400, (1, .88, .73), 7, (3, 1, 1))
    bpy.ops.object.camera_add(location=xyz((-1.445, 2.448, 11)))
    camera = bpy.context.object
    camera.rotation_euler = (Vector(xyz((.552, 4.56, -8.79))) - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.lens = 36 / (2 * math.tan(math.radians(64.924 / 2)))
    camera.data.sensor_fit = "VERTICAL"
    camera.data.sensor_height = 36
    scene = bpy.context.scene
    scene.camera = camera
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 20
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = 1400, 788
    scene.render.resolution_percentage = 100
    scene.world.color = (.1, .1, .1)
    scene.view_settings.view_transform = "AgX"
    scene.render.filepath = str(ROOT / ".next/cache/reception-architecture-qa.png")
    Path(scene.render.filepath).parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.render.render(write_still=True)
    print("RECEPTION_PREVIEW " + scene.render.filepath, flush=True)
