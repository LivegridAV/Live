"""Bespoke anamorphic corner and connected Content Studio / gallery.

Blender 5.2: --background --factory-startup --python this-file.py [-- --preview]
All authoring values are Three.js XYZ: right, up, towards the viewer. Runtime
anchor is [-1,0,-107]. LED faces and the animated L-shaped water surface are
owned by the website; this asset contains the actual supporting architecture.
"""

from pathlib import Path
from mathutils import Matrix

# Load only reusable mesh/material/guest/furniture helpers. The cut is before
# any reception scene authoring, so prior assets are neither read nor exported.
HELPERS = Path(__file__).with_name("rebuild_reception_gallery.py")
helper_source = HELPERS.read_text(encoding="utf-8").split("# The hero cylinder rises")[0]
exec(compile(helper_source, str(HELPERS), "exec"))

OUT = ROOT / "public/models/expo/anamorphic-stall.glb"
LAYOUT_OUT = ROOT / "public/models/expo/anamorphic-stall-layout.json"
LEFT_WIDTH, RIGHT_WIDTH = 10.0, 9.81182
LED_BOTTOM, LED_TOP = .8, 10.0
HEADER_TOP = 11.1
STUDIO_CUTOUT = {"right": -3.414, "top": 6.711}
STALL_LEFT, STALL_RIGHT = -18.2, -10.0
STALL_FRONT, STALL_BACK = 8.0, -2.0
APERTURES, JETS = [], []
RNG = random.Random(20261016)

ROCK = material("Anamorphic | layered charcoal granite", (.032, .037, .044), .06, .82)
ROCK_LIGHT = material("Anamorphic | granite exposed facets", (.063, .070, .080), .04, .89)
ROCK_DARK = material("Anamorphic | wet dark stone", (.016, .020, .027), .12, .39)
for mat in (ROCK, ROCK_DARK):
    color_node = mat.node_tree.nodes.new("ShaderNodeVertexColor")
    color_node.layer_name = "GraniteTone"
    mat.node_tree.links.new(color_node.outputs["Color"], mat.node_tree.nodes.get("Principled BSDF").inputs["Base Color"])
STUDIO_FLOOR = material("Content Studio | warm charcoal honed pathway stone", (.060, .055, .047), .08, .42)
FLOOR_JOINT = material("Content Studio | recessed mineral floor expansion joint", (.010,.009,.008), 0,.78)
STUDIO_STONE = material("Content Studio | pale warm honed desk surface", (.40, .37, .31), .04, .48)
COVE = material("Stall | concealed champagne warm cove", (.98, .51, .22), 0, .40, 2.0)
CAPTION = material("Stall | quiet silver caption lettering", (.67, .74, .83), 0, .54, .16)

# A native mineral normal texture adds sub-centimeter granite grain to the
# actual fractured geometry. This is material detail, never a room/photo plate.
grain_size=256
grain_rng=random.Random(62104)
grain_height=[.27*math.sin(x*.31)*math.cos(y*.27)+.13*math.sin(x*1.93+y*1.41)+grain_rng.uniform(-.12,.12)
    for y in range(grain_size) for x in range(grain_size)]
grain_pixels=[]
for y in range(grain_size):
    for x in range(grain_size):
        dx=(grain_height[y*grain_size+(x+1)%grain_size]-grain_height[y*grain_size+(x-1)%grain_size])*.65
        dy=(grain_height[((y+1)%grain_size)*grain_size+x]-grain_height[((y-1)%grain_size)*grain_size+x])*.65
        normal=Vector((-dx,-dy,1)).normalized()
        grain_pixels.extend((normal.x*.5+.5,normal.y*.5+.5,normal.z*.5+.5,1))
grain_image=bpy.data.images.new("Anamorphic native fine granite relief",width=grain_size,height=grain_size)
grain_image.colorspace_settings.name="Non-Color"
grain_image.pixels.foreach_set(grain_pixels)
grain_image.pack()
for mat in (ROCK,ROCK_DARK):
    image_node=mat.node_tree.nodes.new("ShaderNodeTexImage")
    image_node.image=grain_image
    normal_node=mat.node_tree.nodes.new("ShaderNodeNormalMap")
    normal_node.inputs["Strength"].default_value=.85
    mat.node_tree.links.new(image_node.outputs["Color"],normal_node.inputs["Color"])
    mat.node_tree.links.new(normal_node.outputs["Normal"],mat.node_tree.nodes.get("Principled BSDF").inputs["Normal"])


def granite_uv(mesh):
    uv=mesh.uv_layers.new(name="Granite grain mapping")
    for loop in mesh.loops:
        p=mesh.vertices[loop.vertex_index].co
        uv.data[loop.index].uv=(p.x*2.3+p.y*.47,p.z*2.3+p.y*.66)


def group_at(name, before, position, yaw=0):
    pivot = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(pivot)
    pivot.location = xyz(position)
    pivot.rotation_euler[2] = yaw
    for ob in set(bpy.context.scene.objects) - before:
        if ob != pivot and ob.parent is None:
            ob.parent = pivot
    return pivot


def text(body, p, size, yaw=0, centered=False, tracking=1, mat=BRAND, semibold=False):
    before = set(bpy.context.scene.objects)
    ob = lettering(body, (0, 0, 0), size, centered, tracking, semibold=semibold)
    ob.data.materials[0] = mat
    group_at("Stall lettering placement", before, p, yaw)
    return ob


def aperture(name, p, width, height, media_hint, yaw=0):
    """Real black cabinet with a precisely documented unobstructed LED opening."""
    before = set(bpy.context.scene.objects)
    frame = .045
    box(name + " cabinet back", (0, 0, -.075), (width + .11, height + .11, .10), BLACK, .016)
    for side in (-1, 1):
        box(name + " vertical satin frame", (side * (width / 2 + frame / 2), 0, -.015),
            (frame, height + frame * 2, .040), ALLOY, .008)
        box(name + " horizontal satin frame", (0, side * (height / 2 + frame / 2), -.015),
            (width, frame, .040), ALLOY, .008)
    group_at(name + " orientation", before, p, yaw)
    face = (p[0] + math.sin(yaw) * .006, p[1], p[2] + math.cos(yaw) * .006)
    APERTURES.append({"name": name, "x": face[0], "y": face[1], "z": face[2],
        "w": width, "h": height, "position": list(face), "rotation": [0, yaw, 0],
        "mediaHint": media_hint})


def ellipse_band(name, center, outer, width, y0, y1, mat, segments=112):
    cx, cz = center
    rx, rz = outer
    vertices = []
    for y in (y0, y1):
        for xx, zz in ((rx - width, rz - width), (rx, rz)):
            for i in range(segments):
                angle = math.tau * i / segments
                vertices.append((cx + math.sin(angle) * xx, y, cz + math.cos(angle) * zz))
    faces = []
    for i in range(segments):
        nxt = (i + 1) % segments
        faces.extend([(i, nxt, segments + nxt, segments + i),
            (2 * segments + i, 3 * segments + i, 3 * segments + nxt, 2 * segments + nxt),
            (i, 2 * segments + i, 2 * segments + nxt, nxt),
            (segments + i, segments + nxt, 3 * segments + nxt, 3 * segments + i)])
    return patch_mesh(name, vertices, faces, mat)


def ellipse_disk(name, center, radii, y0, y1, mat, segments=80):
    cx, cz = center
    rx, rz = radii
    vertices = [(cx + math.sin(i * math.tau / segments) * rx, y,
        cz + math.cos(i * math.tau / segments) * rz)
        for y in (y0, y1) for i in range(segments)]
    faces = [tuple(range(segments - 1, -1, -1)), tuple(range(segments, segments * 2))]
    faces.extend([(i, (i + 1) % segments, (i + 1) % segments + segments, i + segments)
        for i in range(segments)])
    return patch_mesh(name, vertices, faces, mat)


def rock(name, p, radii, seed, subdivision=2, vertical_extent=None):
    rng = random.Random(seed)
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdivision, radius=1)
    for vertex in bm.verts:
        v = vertex.co.copy()
        # Correlated strata and varied facets create a fractured rock rather
        # than a uniformly perturbed ball or an artificial smooth pebble.
        strata = math.sin(v.z * 12 + v.x * 4) * .045
        variation = 1 + math.sin(v.x * 4 + math.sin(v.y * 3)) * .12 + math.sin(v.z * 8 + v.y * 5) * .06 + rng.uniform(-.025, .025) + strata
        vertex.co.x = v.x * radii[0] * variation
        vertex.co.y = v.y * radii[2] * variation
        vertex.co.z = v.z * radii[1] * variation
        if vertex.co.x > radii[0] * .42 + vertex.co.z * .15:
            vertex.co.x = radii[0] * .42 + vertex.co.z * .15 + rng.uniform(-.014, .014)
        if vertex.co.y < -radii[2] * .55 + vertex.co.z * .055:
            vertex.co.y = -radii[2] * .55 + vertex.co.z * .055 + rng.uniform(-.014, .014)
        if vertex.co.z < -radii[1] * .70:
            vertex.co.z = -radii[1] * .70 + rng.uniform(-.025, .025)
    if vertical_extent is not None:
        low = min(vertex.co.z for vertex in bm.verts)
        high = max(vertex.co.z for vertex in bm.verts)
        for vertex in bm.verts:
            vertex.co.z = vertical_extent[0] - p[1] + (vertex.co.z - low) / (high - low) * (vertical_extent[1] - vertical_extent[0])
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(ob)
    ob.location = xyz(p)
    for mat in (ROCK, ROCK_LIGHT, ROCK_DARK):
        mesh.materials.append(mat)
    colors = mesh.color_attributes.new(name="GraniteTone", type="FLOAT_COLOR", domain="POINT")
    for i, vertex in enumerate(mesh.vertices):
        q = vertex.co
        grain = .94 + .12 * math.sin(q.x * 8 + q.y * 11 + q.z * 13 + seed) + .07 * math.sin(q.x * 36 + q.z * 23) + .035 * math.sin(q.y * 72 + q.z * 68)
        colors.data[i].color = (.045 * grain, .050 * grain, .060 * grain, 1)
    for polygon in mesh.polygons:
        polygon.use_smooth = False
        polygon.material_index = 2 if polygon.center.z + p[1] < .74 else 0
    granite_uv(mesh)
    return ob


def jet_nozzle(x, z, yaw=0):
    before = set(bpy.context.scene.objects)
    disk("Basin brass nozzle mounting foot", 0, 0, .055, .48, .50, SATIN)
    path = []
    for i in range(13):
        a = math.pi * i / 12
        path.append(((0, .51 + math.sin(a) * .23, -.02 + (1 - math.cos(a)) * .12), .011))
    sweep("Basin arched fine brass spout", path, SATIN, 8)
    group_at("Basin nozzle placement", before, (x, 0, z), yaw)
    JETS.append({"position": [x + math.sin(yaw) * .22, .51, z + math.cos(yaw) * .22],
        "target": [x + math.sin(yaw) * .43, .515, z + math.cos(yaw) * .43], "radius": .006})


def angular_granite(name,outline,ridge,seed,back_depth=.4):
    """One interlocking broken slab with coarse fracture planes and fine chips."""
    rng = random.Random(seed)
    vertices, faces = [], []
    def plane(a,b,c,detail=12):
        base = len(vertices)
        aa,bb,cc = Vector(a),Vector(b),Vector(c)
        n = (bb-aa).cross(cc-aa).normalized()
        for row in range(detail+1):
            for col in range(detail+1-row):
                u,v = row/detail,col/detail
                p = aa*(1-u-v)+bb*u+cc*v
                # Fine irregular chips sit on broad, distinctly angled faces.
                edge = min(u,v,1-u-v)
                chips=rng.uniform(-.046,.046)+.028*math.sin(p.x*31+p.y*17+p.z*21)
                p += n * (chips * min(1,edge*18))
                vertices.append(tuple(p))
        index={}
        at=base
        for row in range(detail+1):
            for col in range(detail+1-row):
                index[(row,col)]=at
                at+=1
        for row in range(detail):
            for col in range(detail-row):
                faces.append((index[row,col],index[row+1,col],index[row,col+1]))
                if col < detail-row-1:
                    faces.append((index[row+1,col],index[row+1,col+1],index[row,col+1]))
    for i,a in enumerate(outline):
        b=outline[(i+1)%len(outline)]
        plane(a,b,ridge)
        backa=(a[0]+.08,a[1],a[2]-back_depth)
        backb=(b[0]+.08,b[1],b[2]-back_depth)
        plane(a,backa,b,4)
        plane(b,backa,backb,4)
        plane(backa,(ridge[0],ridge[1],ridge[2]-back_depth-.15),backb,4)
    ob=patch_mesh(name,vertices,faces,ROCK)
    ob.data.materials.append(ROCK_DARK)
    colors=ob.data.color_attributes.new(name="GraniteTone",type="FLOAT_COLOR",domain="POINT")
    for i,vertex in enumerate(ob.data.vertices):
        q=vertex.co
        tone=.94+.20*math.sin(q.x*7+q.z*8)+.10*math.sin(q.y*43+q.z*38)+rng.uniform(-.045,.045)
        colors.data[i].color=(.075*tone,.081*tone,.093*tone,1)
    for poly in ob.data.polygons:
        poly.use_smooth=False
        poly.material_index=1 if poly.center.z<.68 else 0
    granite_uv(ob.data)
    return ob


def fractured_diagonal_slab():
    # Separate, interlocking blocks create the broken diagonal silhouette and
    # deep shadow joints of the reference rather than one smooth pointed mass.
    angular_granite("Granite upper craggy broken block",
        [(-2.65,2.62,.90),(-2.76,3.04,.81),(-2.40,3.40,.80),(-2.04,3.65,.75),
         (-1.62,3.36,.81),(-1.44,2.91,.94),(-1.79,2.49,1.03)],(-2.11,3.03,1.23),614,.52)
    angular_granite("Granite diagonal stratified middle slab",
        [(-3.84,.49,1.72),(-3.48,1.18,1.46),(-2.96,1.73,1.29),(-2.50,2.46,1.10),
         (-2.14,2.60,.98),(-1.68,2.17,1.05),(-1.56,1.46,1.42),(-1.02,.61,1.75)],
        (-2.53,1.44,1.93),715,.66)
    angular_granite("Granite broad forward broken plate",
        [(-2.96,.50,2.18),(-2.84,.91,2.03),(-2.08,1.43,1.78),(-1.28,1.53,1.66),
         (-.43,1.08,2.08),(.20,.53,3.45),(-.80,.53,3.70),(-1.45,.48,3.10)],(-1.61,.91,2.78),816,.65)


# Tall convex L-corner. The real cabinet follows the studio opening: no LED or
# display backing exists inside the occupied studio return below the canopy.
box("Anamorphic left LED upper structural cabinet", (-(LEFT_WIDTH + .03)/2,(LED_TOP+STUDIO_CUTOUT["top"])/2,-.13),
    (LEFT_WIDTH-.03,LED_TOP-STUDIO_CUTOUT["top"],.22),BLACK,.012)
box("Anamorphic left LED lower right structural cabinet", ((STUDIO_CUTOUT["right"]-.03)/2,(LED_BOTTOM+STUDIO_CUTOUT["top"])/2,-.13),
    (-STUDIO_CUTOUT["right"]-.03,STUDIO_CUTOUT["top"]-LED_BOTTOM,.22),BLACK,.012)
box("Anamorphic right LED structural cabinet", (-.13, 5.4, -(RIGHT_WIDTH + .03) / 2),
    (.22, 9.2, RIGHT_WIDTH - .03), BLACK, .012)
box("Anamorphic left black crown band", (-LEFT_WIDTH / 2, 10.55, -.09),
    (LEFT_WIDTH, 1.1, .25), WALL, .006)
box("Anamorphic right black crown band", (-.09, 10.55, -RIGHT_WIDTH / 2),
    (.25, 1.1, RIGHT_WIDTH), WALL, .006)
box("Anamorphic left far cabinet edge", (-LEFT_WIDTH - .055, 5.4, -.105), (.11, 9.2, .23), BLACK, .004)
box("Anamorphic right far cabinet edge", (-.105, 5.4, -RIGHT_WIDTH - .055), (.23, 9.2, .11), BLACK, .004)
box("Anamorphic left low screen foundation", (-LEFT_WIDTH / 2, .40, -.15),
    (LEFT_WIDTH, .80, .40), BLACK, .008)
box("Anamorphic right low screen foundation", (-.15, .40, -RIGHT_WIDTH / 2),
    (.40, .80, RIGHT_WIDTH), BLACK, .008)
APERTURES.extend([
    {"name": "anamorphic-main-left", "x": -LEFT_WIDTH / 2, "y": 5.4, "z": 0,
     "w": LEFT_WIDTH, "h": 9.2, "position": [-LEFT_WIDTH / 2, 5.4, 0],
     "rotation": [0, 0, 0], "mediaHint": "anamorphic-main-left", "continuousCorner": True},
    {"name": "anamorphic-main-right", "x": 0, "y": 5.4, "z": -RIGHT_WIDTH / 2,
     "w": RIGHT_WIDTH, "h": 9.2, "position": [0, 5.4, -RIGHT_WIDTH / 2],
     "rotation": [0, math.pi / 2, 0], "mediaHint": "anamorphic-main-right", "continuousCorner": True},
])

# Content Studio: a forward luxurious pavilion, physically connected to the
# left LED endpoint by its side return. The open entrance remains walkable.
studio_before = set(bpy.context.scene.objects)
box("Studio rear charcoal wall", (-14.1, 3.95, -2.10), (8.4, 7.9, .20), WALL, .018)
box("Studio left deep side enclosure", (-18.2, 4.50, 3.0), (.24, 9.0, 10), WALL, .015)
box("Studio left facade fullheight pillar", (-18.15, 5.55, 8.0), (.34, 11.1, .33), BLACK, .012)
box("Studio broad black brand fascia", (-14.1, 10.0, 7.97), (8.2, 2.20, .30), WALL, .015)
box("Studio fascia concealed warm lower reveal", (-14.1, 8.88, 8.13), (8.0, .020, .028), COVE, .003)
box("Studio left content/display blade", (-16.85, 4.45, 8.04), (2.45, 8.9, .22), WALL, .012)
text("LivegridAV", (-17.30, 10.10, 8.139), 1.40)
text("C O N T E N T   S T U D I O", (-17.30, 9.47, 8.143), .50)
for i, line in enumerate(("IDEAS", "CONTENT", "EXPERIENCES", "REALITY")):
    text(line, (-17.83, 7.70 - i * .45, 8.157), .39, tracking=1.10)
box("Studio blade quiet underline", (-17.47, 6.05, 8.16), (.40, .016, .008), BRAND, 0)
aperture("studio-front-portrait", (-16.85, 3.98, 8.17), 2.18, 3.72, "studio-coastal-portrait")

# Sweeping oval canopy with two actual inset ceiling levels and many black
# vertical reeds. All hanging details end well above people/camera clearance.
CANOPY_CENTER = (-13.4, 4.6)
canopy_before = set(bpy.context.scene.objects)
ellipse_band("Studio oval canopy broad black ring", CANOPY_CENTER, (3.6, 2.8), .43, 7.12, 7.35, BLACK)
ellipse_band("Studio oval canopy champagne inner reveal", CANOPY_CENTER, (3.47, 2.67), .025, 7.105, 7.13, COVE)
ellipse_disk("Studio inset upper oval ceiling", CANOPY_CENTER, (3.16, 2.36), 7.24, 7.30, ROOF)
ellipse_band("Studio upper inset warm ceiling cove", CANOPY_CENTER, (2.86, 2.06), .017, 7.205, 7.225, COVE)
ellipse_disk("Studio lower recessed ceiling island", (-13.4, 3.6), (2.10, 1.23), 7.01, 7.13, WALL)
ellipse_band("Studio lower island fine warm cove", (-13.4, 3.6), (2.08, 1.21), .022, 6.985, 7.01, COVE)
for ix in range(33):
    for iz in range(25):
        xx, zz = -3.36 + ix * .21, -2.52 + iz * .21
        q = (xx / 3.4) ** 2 + (zz / 2.56) ** 2
        if .60 < q < 1.01 and not (zz < -.7 and abs(xx) < 1.7):
            x, z = CANOPY_CENTER[0] + xx, CANOPY_CENTER[1] + zz
            bottom = 6.5055 + RNG.random() * .38
            rod("Studio hanging satin black reed", (x, bottom, z), (x, 7.12, z), .0135, BLACK, 6)
            if (ix + iz) % 7 == 0:
                rod("Studio reed small champagne suspension collar", (x, 7.04, z), (x, 7.11, z), .017, CHAMPAGNE, 6)
CANOPY_OBJECTS = set(bpy.context.scene.objects) - canopy_before

# Interior image cabinets and caption surfaces are placed in real depth.
aperture("studio-rear-landscape", (-14.02, 4.22, -1.88), 3.34, 2.26, "studio-brighter-reality")
aperture("studio-rear-tall-screen", (-10.92, 3.55, -1.87), 1.62, 3.56, "studio-mountain-portrait")
aperture("studio-left-small-screen", (-16.65, 2.62, -1.86), 1.36, 1.73, "studio-forest")

# Back lounge service desk. The larger front desk is independently fitted below.
box("Studio rear low black service desk", (-12.08, .59, .25), (3.68, 1.02, .90), BLACK, .035)
box("Studio rear service desk honed top", (-12.08, 1.145, .25), (3.77, .060, .99), STUDIO_STONE, .015)
box("Studio rear service desk warm toe", (-12.08, .12, .716), (3.57, .024, .020), COVE, .003)
text("LivegridAV", (-13.55, .64, .725), .30)
lounge_before = set(bpy.context.scene.objects)
sofa(-14.1, 1.82, 2.50, 0)
chair(-15.7, 3.2, -38)
chair(-12.4, 3.15, 40)
cocktail_table(-14.1, 3.15)
LOUNGE_OBJECTS = set(bpy.context.scene.objects) - lounge_before
leafy_tree(-10.77, .95, 82, 2.9)
for x in (-12.75, -11.65):
    drinking_glass(x, 1.176, .20, mat=CLEAR_GLASS)
    metal = box("Studio small slim presentation tablet", (x + .30, 1.32, .20), (.27, .18, .022), BLACK, .012)
    metal.rotation_euler[0] = math.radians(14)
STUDIO_OBJECTS = set(bpy.context.scene.objects) - studio_before

# Right connected gallery facade, parallel to the right LED leaf.
gallery_before = set(bpy.context.scene.objects)
right_start, right_end = -RIGHT_WIDTH, -17.8
right_mid = (right_start + right_end) / 2
box("Gallery dark facade backing", (-.12, 4.45, right_mid), (.22, 8.9, right_start - right_end), WALL, .015)
box("Gallery broad black wordmark fascia", (-.05, 9.35, right_mid), (.30, 2.30, right_start - right_end), WALL, .014)
for z in (right_start - .04, right_end + .04):
    box("Gallery fullheight dark facade post", (-.08, 5.25, z), (.32, 10.5, .16), BLACK, .012)
text("LivegridAV", (.118, 9.48, -13.70), 1.30, math.pi / 2)
text("VISUALS FOR A BRIGHTER TOMORROW",
    (.122, 9.03, -13.47), .35, math.pi / 2, tracking=1.08)
aperture("gallery-upper-portrait", (.108, 6.55, -11.35), 2.32, 3.28, "gallery-ice-vortex", math.pi / 2)
for i, line in enumerate(("CONTENT", "PRODUCTION", "VIRTUAL", "PRODUCTION",
                         "LIVE", "EXPERIENCES", "LED", "SOLUTIONS")):
    text(line, (.130, 7.55 - i * .40, -12.95), .52, math.pi / 2, tracking=1.10, semibold=True)
for i, hint in enumerate(("gallery-human", "gallery-silver-object", "gallery-landscape", "gallery-abstract")):
    aperture("gallery-middle-%d" % i, (.110, 3.93, -10.88 - i * 1.86), 1.71, 1.48, hint, math.pi / 2)
aperture("gallery-lower-orb", (.111, 2.20, -10.99), 1.92, 1.48, "gallery-orb", math.pi / 2)
aperture("gallery-lower-landscape", (.111, 2.20, -13.58), 2.91, 1.48, "gallery-alpine", math.pi / 2)
for i, line in enumerate(("STORIES", "THAT MOVE", "PEOPLE")):
    text(line, (.136, 2.57 - i * .40, -15.50), .48, math.pi / 2, tracking=1.10, semibold=True)
for i, line in enumerate(("CREATIVE", "TECHNOLOGY", "HUMAN IMPACT")):
    text(line, (.138, 1.00 - i * .31, -15.15), .35, math.pi / 2, tracking=1.08, mat=CAPTION)
box("Gallery concealed warm front foundation", (.105, .075, right_mid), (.025, .025, right_start - right_end - .1), COVE, .004)
GALLERY_OBJECTS = set(bpy.context.scene.objects) - gallery_before

# A tapered, shallow foreground basin follows the reference's perspective
# anchors; the water mesh and the physical cabinet use the identical outline.
BASIN_OUTLINE = [(-4.309768,0),(-4.309768,3.426475),(4.001770,5.024154),
    (5.003548,-.411987),(0,-.411987),(0,0)]
n = len(BASIN_OUTLINE)
basin_vertices = [(x,y,z) for y in (0,.43) for x,z in BASIN_OUTLINE]
basin_faces = [tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]
basin_faces.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
basin = patch_mesh("Basin tapered solid dark foundation",basin_vertices,basin_faces,BLACK)
bm=bmesh.new()
bm.from_mesh(basin.data)
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
bm.to_mesh(basin.data)
bm.free()
for poly in basin.data.polygons:
    poly.use_smooth=False
for i in range(4):
    a,b=Vector(BASIN_OUTLINE[i]),Vector(BASIN_OUTLINE[i+1])
    d=b-a
    length=d.length
    yaw=math.atan2(-d.y,d.x)
    middle=(a+b)*.5
    outer=Vector((-d.y,d.x)).normalized()
    lip=box("Basin tapered satin black lip",(middle.x,.515,middle.y),(length+.025,.17,.08),BLACK,.008)
    lip.rotation_euler[2]=yaw
    glowpos=middle+outer*.045
    glow=box("Basin tapered continuous amber toe",(glowpos.x,.08,glowpos.y),(length+.015,.026,.018),COVE,.003)
    glow.rotation_euler[2]=yaw
right_edge=Vector(BASIN_OUTLINE[3])-Vector(BASIN_OUTLINE[2])
right_yaw=math.atan2(-right_edge.y,right_edge.x)
right_start=Vector(BASIN_OUTLINE[2])+right_edge.normalized()*.48
right_normal=Vector((math.sin(right_yaw),math.cos(right_yaw)))
right_start+=right_normal*.048
text("LIVE IDEAS   LIVING WORLDS", (right_start.x,.225,right_start.y), .32,right_yaw,tracking=1.14,mat=CAPTION)
fractured_diagonal_slab()
rock("Central lower angular rock", (1.25, .79, 2.65), (.68, .46, .50), 12, 4)
rock("Central leaning granite slab", (-1.0, 1.15, .78), (.95, .85, .42), 13, 4)
rock("Central sloping left granite fragment", (-2.90, .82, 1.00), (.80, .55, .38), 17, 3)
rock("Water channel right large stone", (3.60, .72, 2.00), (.46, .43, .50), 19, 3)
rock("Water channel left small stone", (-4.05, .65, 1.04), (.40, .31, .38), 23, 3)
for i in range(5):
    rock("Water channel small fractured stone", (.53 + i * .15, .54 + i * .035, .75 - i * .16),
        (.19, .17, .16), 50 + i, 1)
jet_nozzle(-3.40, 2.20, -.22)
jet_nozzle(-1.25, 1.07, .45)
jet_nozzle(3.90, 2.10, -math.pi / 2)

# Calm guests and studio staff occupy genuine floor areas, not picture planes.
studio_guest_before = set(bpy.context.scene.objects)
human(-12.55, -.55, 1.0, 0, False, NAVY, 1, 0, root_y=.09)
human(-11.42, -.57, .96, 0, True, CHARCOAL, 2, 1, root_y=.09)
human(-13.70, 4.03, 1.02, 175, False, NAVY, 0, 0, root_y=.09)
human(-11.57, 3.63, 1.00, 158, False, CHARCOAL, 1, 1, root_y=.09)
human(-14.32, 1.98, .98, 0, False, NAVY, 2, 0, True, root_y=.09)
STUDIO_OBJECTS.update(set(bpy.context.scene.objects) - studio_guest_before)
human(5.633727, .434807, 2.225019 / 1.793, 200, False, NAVY, 1, 0)
human(8.536077, 2.061548, 2.547878 / 1.793, -120, True, CHARCOAL, 2, 0)

# Local exhibition roof and real trusses connect both facades in the shared hall.
for i in range(8):
    box("Anamorphic dark acoustic roof panel", (-17.1 + i * 3.4, 13.82, -3.4), (3.36, .15, 27.8), ROOF, 0)
for z in (-16, -7, 2, 9):
    truss((-19, 13.32, z), (7, 13.32, z), .27)
for x in (-17.5, -8.5, 1.0, 6.0):
    truss((x, 13.23, -17), (x, 13.23, 10.2), .25)
for z in range(-17, 11, 2):
    box("Anamorphic black roof purlin", (-5.6, 13.62, z), (27, .15, .055), BLACK, .004)
for x, z in ((-16, 8), (-9, 7), (-2, 6), (5, 5), (-13, -4), (4, -6), (3, -14)):
    rod("Anamorphic warm exhibition spotlight", (x, 13.15, z), (x, 12.91, z + .08), .085, BLACK, 16)
    rod("Anamorphic warm fixture lens", (x, 12.90, z + .082), (x, 12.894, z + .084), .065, LENS, 16)

# Fit both connected facade assemblies to the approved reference projection.
# Studio front endpoints are A[-11.4902,7.80972] / B[-10,0]. Its original
# ten-meter room depth compresses to seven meters behind this rotated front.
STUDIO_YAW = math.atan2(7.80972, 1.4902)
STUDIO_WIDTH_SCALE = math.hypot(7.80972, 1.4902) / 8.2
studio_fit = Matrix.Translation(Vector(xyz((-10, 0, 0)))) @ Matrix.Rotation(STUDIO_YAW, 4, "Z") @ Matrix.Diagonal((STUDIO_WIDTH_SCALE, .7, 1, 1)) @ Matrix.Translation(-Vector(xyz((-10, 0, 8))))
gallery_dx, gallery_dz = 3.1758104, -19.1921293 + RIGHT_WIDTH
GALLERY_YAW = math.atan2(-gallery_dz, gallery_dx)
GALLERY_DELTA_YAW = GALLERY_YAW - math.pi / 2
GALLERY_WIDTH_SCALE = math.hypot(gallery_dx, gallery_dz) / (17.8 - RIGHT_WIDTH)
gallery_fit = Matrix.Translation(Vector(xyz((0, 0, -RIGHT_WIDTH)))) @ Matrix.Rotation(GALLERY_DELTA_YAW, 4, "Z") @ Matrix.Diagonal((1, GALLERY_WIDTH_SCALE, 1, 1)) @ Matrix.Translation(-Vector(xyz((0, 0, -RIGHT_WIDTH))))


def fit_objects(objects, matrix, yaw):
    for ob in objects:
        if ob.parent not in objects:
            if ob.type == "EMPTY" and ob.name.startswith(("Reception guest pose", "Reception lounge chair pose", "Reception ivory sofa pose", "Stall lettering placement")):
                # Move natural people/furniture and intact lettering rigidly;
                # resize architecture/cabinets to the measured facade widths.
                ob.location = matrix @ ob.matrix_world.translation
                ob.rotation_euler[2] += yaw
            else:
                ob.matrix_world = matrix @ ob.matrix_world


bpy.context.view_layer.update()
fit_objects(STUDIO_OBJECTS - CANOPY_OBJECTS, studio_fit, STUDIO_YAW)
fit_objects(GALLERY_OBJECTS, gallery_fit, GALLERY_DELTA_YAW)
CANOPY_FIT = {"center": [-4.003217, 5.6, 4.583103], "radii": [4.267194, 3.001019],
    "yaw": -.179367, "rimBottom": 5.6, "rimTop": 5.82}
canopy_fit = Matrix.Translation(Vector(xyz(CANOPY_FIT["center"]))) @ Matrix.Rotation(CANOPY_FIT["yaw"], 4, "Z") @ Matrix.Diagonal((CANOPY_FIT["radii"][0] / 3.6, CANOPY_FIT["radii"][1] / 2.8, .22 / .23, 1)) @ Matrix.Translation(-Vector(xyz((-13.4, 7.12, 4.6))))
fit_objects(CANOPY_OBJECTS, canopy_fit, CANOPY_FIT["yaw"])
fit_objects(LOUNGE_OBJECTS, Matrix.Translation(Vector(xyz((4,0,-2)))), 0)

# The studio is an occupied architectural volume with a genuine black return
# wall, two ceiling levels, and an open floor towards the viewer. It masks the
# notch below the main display; the smaller interior monitor remains separate.
box("Studio opaque interior return wall",(-6.707,3.3555,.08),(6.586,6.711,.24),WALL,.012)
box("Studio return right portal depth",(-3.474,3.3555,.34),(.12,6.711,.52),BLACK,.008)
box("Studio back service soffit",(-6.74,4.69,1.02),(6.42,.12,1.68),BLACK,.012)
box("Studio back soffit concealed warm cove",(-6.74,4.616,1.79),(6.26,.019,.028),COVE,.003)
box("Studio interior service counter",(-5.68,.62,1.31),(2.78,1.06,.70),BLACK,.027)
box("Studio interior service counter honed top",(-5.68,1.178,1.31),(2.86,.055,.76),STUDIO_STONE,.014)
box("Studio interior counter warm recessed toe",(-5.68,.145,1.672),(2.67,.024,.017),COVE,.003)
for xx in (-6.45,-5.95,-5.05):
    drinking_glass(xx,1.208,1.31,mat=CLEAR_GLASS)
flowers(-4.75,1.208,1.30,.28)
human(-5.65,.59,1.08,0,False,NAVY,1,0,worktop=(1.205-.09)/1.08,root_y=.09)

# One continuous raised mineral floor links the deep pavilion, reception desk,
# and portal. Its right edge meets the basin instead of covering its water.
STUDIO_FLOOR_OUTLINE=[(-18.367,6.498),(-11.4902,7.80972),(-6.62,9.62),
    (-5.40,9.62),(-4.65,5.10),(-4.309768,3.426475),(-4.309768,.065),
    (-3.414,.065),(-3.414,-.12),(-10,-.12),(-16.88,-1.312)]
floor_count=len(STUDIO_FLOOR_OUTLINE)
floor_vertices=[(x,y,z) for y in (0,.09) for x,z in STUDIO_FLOOR_OUTLINE]
floor_faces=[tuple(range(floor_count-1,-1,-1)),tuple(range(floor_count,floor_count*2))]
floor_faces.extend((i,(i+1)%floor_count,(i+1)%floor_count+floor_count,i+floor_count) for i in range(floor_count))
floor=patch_mesh("Studio continuous honed stone reception and entry floor",floor_vertices,floor_faces,STUDIO_FLOOR)
bm=bmesh.new()
bm.from_mesh(floor.data)
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
bm.to_mesh(floor.data)
bm.free()
for poly in floor.data.polygons:
    poly.use_smooth=False
for i in range(1,6):
    a,b=Vector(STUDIO_FLOOR_OUTLINE[i]),Vector(STUDIO_FLOOR_OUTLINE[i+1])
    edge=b-a
    midpoint=(a+b)*.5
    strip=box("Studio continuous recessed entry threshold",(midpoint.x,.055,midpoint.y),
        (edge.length+.01,.023,.020),COVE,.003)
    strip.rotation_euler[2]=math.atan2(-edge.y,edge.x)
for a,b in (((-11.7,6.6),(-5.20,5.7)),((-13.0,4.1),(-6.4,2.5)),((-14.2,1.7),(-8.0,.5))):
    d=Vector(b)-Vector(a)
    p=(Vector(a)+Vector(b))*.5
    joint=box("Studio mineral floor fine expansion joint",(p.x,.0905,p.y),(d.length,.001,.008),FLOOR_JOINT,0)
    joint.rotation_euler[2]=math.atan2(-d.y,d.x)

# Reference reception counter, props, and staff share a coherent real worktop.
FRONT_DESK={"center":[-6.134601,0,7.502843],"yaw":1.38224934,"width":3.490532,
    "depth":.95,"bottom":.09,"top":1.663721}
front_before=set(bpy.context.scene.objects)
box("Studio front reception black desk",(0,.89436,0),(3.490532,1.428721,.95),WALL,.035)
box("Studio front reception thin honed top",(0,1.636221,0),(3.550532,.055,1.01),STUDIO_STONE,.014)
box("Studio front reception recessed black foot",(0,.142,0),(3.35,.104,.81),BLACK,.014)
box("Studio front reception warm concealed toe",(0,.133,.483),(3.40,.026,.018),COVE,.003)
text("LivegridAV",(-1.65,.99,.484),.38)
for xx in (-1.15,-.92):
    drinking_glass(xx,1.664,.03,mat=CLEAR_GLASS)
box("Studio front reception slim black tablet",(-.80,1.78,-.04),(.24,.22,.018),BLACK,.01)
group_at("Studio fitted front reception assembly",front_before,FRONT_DESK["center"],FRONT_DESK["yaw"])
flowers(-6.44,1.67,6.58,.55)
front_tree_before=set(bpy.context.scene.objects)
leafy_tree(-7.671860,5.525178,74,3.80)
# Add a second, offset leaf layer without duplicating the trunk or branches.
# The jitter is per intact leaf so each small lanceolate shape stays coherent.
leaf_rng=random.Random(7411)
for leaf_mesh in set(bpy.context.scene.objects)-front_tree_before:
    if leaf_mesh.type=="MESH" and leaf_mesh.name.startswith("Olive dense natural leaf canopy"):
        extra=leaf_mesh.copy()
        extra.data=leaf_mesh.data.copy()
        extra.name="Studio front olive fuller green leaf layer"
        bpy.context.collection.objects.link(extra)
        for start in range(0,len(extra.data.vertices),5):
            leaf=list(extra.data.vertices)[start:start+5]
            center=sum((v.co for v in leaf),Vector())/len(leaf)
            jitter=Vector((leaf_rng.uniform(-.10,.10),leaf_rng.uniform(-.10,.10),leaf_rng.uniform(-.045,.045)))
            for vertex in leaf:
                vertex.co=center+(vertex.co-center)*1.08+jitter
human(-7.2012,7.50,2.19/1.793,-math.degrees(FRONT_DESK["yaw"]),True,CHARCOAL,1,0,
    worktop=(FRONT_DESK["top"]-.09)/(2.19/1.793),root_y=.09)
# The rear display belongs beneath the independently projected canopy. Its
# cabinet and opening share this same measured placement rather than inheriting
# the farther-left architectural wall orientation.
# A .86 camera-ray homothety keeps the measured image rectangle intact while
# clearing the legacy technical-wing forward wall and the main LED's cabinet.
INTERIOR_MAIN = {"position": [-8.111536,3.121102,1.871854], "w": 2.184559,
    "h": 1.538534, "yaw": .995517}
rear_normal = Vector((math.sin(INTERIOR_MAIN["yaw"]),0,math.cos(INTERIOR_MAIN["yaw"])))
rear_center = Vector(INTERIOR_MAIN["position"]) - rear_normal * .006
rear_group = bpy.data.objects.get("studio-rear-landscape orientation")
rear_group.matrix_world = Matrix.Translation(Vector(xyz(rear_center))) @ Matrix.Rotation(INTERIOR_MAIN["yaw"],4,"Z") @ Matrix.Diagonal((INTERIOR_MAIN["w"]/3.34,1,INTERIOR_MAIN["h"]/2.26,1))
# The slim portal mast belongs to the fitted overhang, not the rotated booth.
# Its base is naturally screened by the basin, and the fine upper strap carries
# the shallow oval without a heavy vertical obstruction across the LED image.
box("Studio fitted slim portal mast", (-3.414, 3.3555, .10), (.10, 6.711, .10), BLACK, .006)
rod("Studio fitted canopy narrow carrying strap", (-3.414, 6.65, .10),
    (-3.414, 5.71, 1.6402383), .038, BLACK, 8)
for item in APERTURES:
    if item["name"].startswith("studio-"):
        matrix, yaw, scale = studio_fit, STUDIO_YAW, STUDIO_WIDTH_SCALE
    elif item["name"].startswith("gallery-"):
        matrix, yaw, scale = gallery_fit, GALLERY_DELTA_YAW, GALLERY_WIDTH_SCALE
    else:
        continue
    transformed = matrix @ Vector(xyz(item["position"]))
    item["position"] = [transformed.x, transformed.z, -transformed.y]
    item["x"], item["y"], item["z"] = item["position"]
    item["w"] *= scale
    item["rotation"][1] += yaw
    if item["name"] == "studio-rear-landscape":
        item["position"] = INTERIOR_MAIN["position"][:]
        item["x"],item["y"],item["z"] = item["position"]
        item["w"],item["h"] = INTERIOR_MAIN["w"],INTERIOR_MAIN["h"]
        item["rotation"] = [0,INTERIOR_MAIN["yaw"],0]

screen_ids = {"studio-front-portrait": "left-portrait", "studio-rear-landscape": "interior-main",
    "studio-rear-tall-screen": "interior-side", "studio-left-small-screen": "interior-portrait",
    "gallery-upper-portrait": "gallery-fluid", "gallery-middle-0": "gallery-portrait",
    "gallery-middle-1": "gallery-sculpture", "gallery-middle-2": "gallery-wide",
    "gallery-middle-3": "gallery-abstract", "gallery-lower-orb": "gallery-orb",
    "gallery-lower-landscape": "gallery-landscape"}
for item in APERTURES:
    item["id"] = screen_ids.get(item["name"], item["name"])

# Bake parenting, then merge by material to keep runtime draw calls controlled.
bpy.context.view_layer.update()
write_lettering_audit(ROOT / "qa/typography-clarity/anamorphic-stall-labels.json")
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
    if len(objects) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
OUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(OUT), export_format="GLB", export_yup=True,
    export_apply=True, export_materials="EXPORT", export_cameras=False,
    export_lights=False, export_animations=False)

def inset_clockwise_polygon(points, amount):
    lines=[]
    for i,a in enumerate(points):
        a,b=Vector(a),Vector(points[(i+1)%len(points)])
        d=(b-a).normalized()
        lines.append((a+Vector((d.y,-d.x))*amount,d))
    result=[]
    for i,(b,v) in enumerate(lines):
        a,u=lines[i-1]
        delta=b-a
        cross=lambda p,q:p.x*q.y-p.y*q.x
        p=a+u*(cross(delta,v)/cross(u,v))
        result.append([p.x,p.y])
    return result
water_polygon=inset_clockwise_polygon(BASIN_OUTLINE,.065)
layout = {"version": 1, "worldAnchor": [-1, 0, -107], "root": [-1, 0, -107],
    "main": {"leftWidth": LEFT_WIDTH, "rightWidth": RIGHT_WIDTH, "bottom": LED_BOTTOM, "top": LED_TOP},
    "mainCorner": {"fold": [0, 0, 0], "leftWidth": LEFT_WIDTH, "rightWidth": RIGHT_WIDTH,
        "bottom": LED_BOTTOM, "top": LED_TOP, "headerTop": HEADER_TOP,"studioCutout":STUDIO_CUTOUT},
    "contentStudio": {"xMin": STALL_LEFT, "xMax": STALL_RIGHT, "frontZ": STALL_FRONT,
        "backZ": STALL_BACK, "sourceCanopyCenter": [-13.4, 7.15, 4.6], "sourceCanopyRadii": [3.6, 2.8],
        "fittedCanopy": CANOPY_FIT,
        "fittedFrontDesk": FRONT_DESK,"floorPolygonXZ":STUDIO_FLOOR_OUTLINE,"floorTop":.09,
        "returnWall":{"xMin":-10,"xMax":-3.414,"frontZ":.20,"top":6.711,"thickness":.24},
        "fittedFrontA": [-11.4902, 11.1, 7.80972], "fittedFrontB": [-10, 11.1, 0],
        "yaw": STUDIO_YAW, "widthScale": STUDIO_WIDTH_SCALE, "depthScale": .7},
    "rightGallery": {"near": [0, 10.5, -RIGHT_WIDTH], "far": [3.1758104, 10.5, -19.1921293],
        "yaw": GALLERY_YAW, "widthScale": GALLERY_WIDTH_SCALE},
    "apertures": APERTURES, "screens": [item for item in APERTURES if not item.get("continuousCorner")],
    "water": {"y": .515, "height": .515, "armWidth": 1.5, "polygonXZ": water_polygon,
        "outerPolygonXZ": BASIN_OUTLINE,
        "outerLipTop": .60}, "waterJets": JETS,
    "cameraSuggestion": {"position": [12.70331, 2.31546, 15.38635],
        "look": [-1.3006, 4.4715, 1.2712], "verticalFov": 35.0145}}
LAYOUT_OUT.write_text(json.dumps(layout, indent=2), encoding="utf-8")
meshes = [ob for ob in bpy.context.scene.objects if ob.type == "MESH"]
points = [ob.matrix_world @ Vector(corner) for ob in meshes for corner in ob.bound_box]
lo = [min(p[i] for p in points) for i in range(3)]
hi = [max(p[i] for p in points) for i in range(3)]
print("ANAMORPHIC_STALL " + json.dumps({"file": str(OUT), "bytes": OUT.stat().st_size,
    "meshes": len(meshes), "vertices": sum(len(ob.data.vertices) for ob in meshes),
    "triangles": sum(sum(max(1, len(poly.vertices) - 2) for poly in ob.data.polygons) for ob in meshes),
    "threeBounds": {"min": [lo[0], lo[2], -hi[1]], "max": [hi[0], hi[2], -lo[1]]},
    "layout": str(LAYOUT_OUT), "apertures": len(APERTURES)}), flush=True)

if "--preview" in __import__("sys").argv:
    BLUE = material("QA LED placeholder", (.07, .12, .25), 0, .45, .55)
    for item in APERTURES:
        before = set(bpy.context.scene.objects)
        box("QA untextured display face", (0, 0, .004), (item["w"], item["h"], .005), BLUE, 0)
        group_at("QA aperture placement", before, item["position"], item["rotation"][1])
    patch_mesh("QA basin water placeholder", [(p[0], .515, p[1]) for p in water_polygon],
        [(0, 1, 2), (0, 2, 5), (5, 2, 4), (4, 2, 3)], material("QA reflective water", (.08, .11, .14), .75, .09))
    bpy.ops.mesh.primitive_plane_add(size=150)
    bpy.context.object.data.materials.append(material("QA venue floor", (.09, .10, .12), .40, .25))
    def area(p, energy, color, size, target):
        data = bpy.data.lights.new("QA softbox", "AREA")
        data.energy, data.color, data.shape, data.size = energy, color, "DISK", size
        ob = bpy.data.objects.new(data.name, data)
        bpy.context.collection.objects.link(ob)
        ob.location = xyz(p)
        ob.rotation_euler = (Vector(xyz(target)) - ob.location).to_track_quat("-Z", "Y").to_euler()
    area((4, 11, 10), 4000, (.83, .87, 1), 10, (-5, 3, -2))
    area((-13, 9, 11), 2600, (1, .78, .57), 8, (-14, 2, 4))
    area((-13.5, 6.8, 4), 1300, (1, .67, .36), 5, (-13.5, 0, 3))
    bpy.ops.object.camera_add(location=xyz(layout["cameraSuggestion"]["position"]))
    camera = bpy.context.object
    camera.rotation_euler = (Vector(xyz(layout["cameraSuggestion"]["look"])) - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.sensor_fit, camera.data.sensor_height = "VERTICAL", 36
    camera.data.lens = 36 / (2 * math.tan(math.radians(35.0145 / 2)))
    scene = bpy.context.scene
    scene.camera, scene.render.engine = camera, "CYCLES"
    scene.cycles.samples, scene.cycles.use_denoising = 20, True
    scene.render.resolution_x, scene.render.resolution_y = 1672, 941
    scene.render.resolution_percentage = 100
    scene.world.color = (.06, .06, .06)
    scene.view_settings.view_transform = "AgX"
    scene.render.filepath = str(ROOT / ".next/cache/anamorphic-stall-qa.png")
    Path(scene.render.filepath).parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.render.render(write_still=True)
    print("ANAMORPHIC_STALL_PREVIEW " + scene.render.filepath, flush=True)
