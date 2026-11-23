"""Premium 3D signage shared by every stall builder.

Built-up letters (softly self-lit face, brushed champagne returns, a thin
polished front edge on large letters), the LivegridAV wordmark (Space Grotesk
600 `livegrid` + aqua `AV`, one word), the 5x5 signal-grid logo, and one soft
aqua halo per stall. Promoted from the approved spike (spike/premium-sign,
8c5499c). Spec: docs/superpowers/specs/2026-11-23-premium-stall-signage-design.md.

Load it by path from any builder in this folder; importing it builds nothing
and never touches the scene:

    spec = importlib.util.spec_from_file_location('premium_signage', HERE / 'premium_signage.py')
    signage = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(signage)

Coordinates are website metres (X right, Y up, Z toward the visitor). Every
builder function takes `place(objects, p, yaw)`, the calling stall's own
transform; the default is rental's `transform`. Objects are built in the same
local frame the stall label helpers use (an object rotated (pi/2, 0, 0) whose
local +Z faces the visitor), so `place` bakes them exactly like a label.

`SIGN_LOG` and the budget step live in `bpy.app.driver_namespace`, so every
copy of this module loaded in one Blender session shares one log and one step
(a driver and the shell/interior modules it loads each may load this file).
A process that builds more than one stall calls `SIGN_LOG.clear()` between them.
"""
import ast
import math
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector  # used by the borrowed `transform`

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
WORDMARK_FONT_PATH = ROOT / 'assets/blender/entrance-refinement/Official-SpaceGrotesk-600.ttf'
CAPTION_FONT_PATH = Path('C:/Windows/Fonts/seguisb.ttf')


def _borrow(filename, names):
    """Define top-level functions from a sibling builder file in this module
    WITHOUT running that file. exhibition_base_helpers.py deletes every scene
    object and loads fonts when executed, and rebuild_led_rental_2026_shell.py
    executes the base helpers and loads the missing ARIALN.TTF, so neither can
    be imported. Only the named `def`s are compiled, with their own line numbers,
    and they resolve their globals (bpy, bmesh, Matrix, Vector, xyz) here."""
    path = HERE / filename
    tree = ast.parse(path.read_text(encoding='utf-8'), str(path))
    found = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in names]
    missing = set(names) - {node.name for node in found}
    if missing:
        raise ImportError('%s no longer defines %s' % (filename, ', '.join(sorted(missing))))
    exec(compile(ast.Module(body=found, type_ignores=[]), str(path), 'exec'), globals())


BLACK = None  # default of the borrowed box(mat=BLACK); every call here passes a material
_borrow('exhibition_base_helpers.py', ('xyz', 'material', 'box'))
_borrow('rebuild_led_rental_2026_shell.py', ('transform',))

# --- shared state ------------------------------------------------------------
_STATE = bpy.app.driver_namespace.setdefault('premium_signage_state', {'log': [], 'step': 0})
SIGN_LOG = _STATE['log']

# --- materials (exact names; never "glass": the website treats /glass/ as see-through)
AQUA_LINEAR = (.0137, .3528, .2918)  # #1FA093
SIGNAL_HEIGHTS = (2, 4, 3, 5, 4)
HALO_OFFSET = .03
WORDMARK_GAP = .045  # font units between `livegrid` and `AV`


def _material(name, rgb, metal=0, rough=.5, emission=0):
    """Get-or-create, so loading this module twice never makes `name.001`."""
    return bpy.data.materials.get(name) or material(name, rgb, metal, rough, emission)


FACE = _material('Premium Sign | ivory lit face', (.86, .84, .79), 0, .42, .6)
AQUA = _material('Premium Sign | aqua lit face', AQUA_LINEAR, 0, .38, .75)
RETURN = _material('Premium Sign | brushed champagne return', (.40, .32, .22), .9, .30)
EDGE = _material('Premium Sign | polished champagne edge', (.62, .52, .38), 1.0, .10)
CELL_ON = _material('Premium Sign | frosted aqua cell', AQUA_LINEAR, 0, .30, .95)
CELL_OFF = _material('Premium Sign | dim signal cell', (.055, .095, .088), .2, .2, .55)


def _halo_material():
    name = 'Premium Sign | aqua halo'
    existing = bpy.data.materials.get(name)
    if existing:
        return existing
    w, h = 512, 160
    img = bpy.data.images.get('premium-sign-halo') or bpy.data.images.new('premium-sign-halo', w, h, alpha=True)
    xs = (np.arange(w) + .5) / w
    ys = (np.arange(h) + .5) / h
    X, Y = np.meshgrid(xs, ys)
    # Distance outside an inner rounded rectangle, in units of the short side.
    dx = np.maximum(np.abs(X - .5) - .40, 0) * (w / h)
    dy = np.maximum(np.abs(Y - .5) - .22, 0)
    d = np.sqrt(dx * dx + dy * dy)
    px = np.zeros((h, w, 4), dtype=np.float32)
    px[..., 0], px[..., 1], px[..., 2] = AQUA_LINEAR
    px[..., 3] = np.exp(-(d / .12) ** 2) * .22
    img.pixels.foreach_set(px.ravel())
    img.file_format = 'PNG'
    img.pack()
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    shader = nodes.get('Principled BSDF')
    tex = nodes.new('ShaderNodeTexImage')
    tex.image = img
    links.new(tex.outputs['Color'], shader.inputs['Base Color'])
    links.new(tex.outputs['Color'], shader.inputs['Emission Color'])
    links.new(tex.outputs['Alpha'], shader.inputs['Alpha'])
    shader.inputs['Emission Strength'].default_value = 1.0
    shader.inputs['Roughness'].default_value = 1.0
    try:
        mat.surface_render_method = 'BLENDED'
    except Exception:
        mat.blend_method = 'BLEND'
    return mat


HALO = _halo_material()


# --- fonts -------------------------------------------------------------------
def load_font(path):
    """Load a font; a missing file (e.g. ARIALN.TTF, not installed here)
    resolves to Segoe UI Semibold. bpy.data.fonts.load cannot be monkeypatched,
    so builders route their caption font paths through this."""
    path = Path(path)
    if not path.exists():
        print('PREMIUM_SIGNAGE font %s missing; using %s' % (path, CAPTION_FONT_PATH), flush=True)
        path = CAPTION_FONT_PATH
    return bpy.data.fonts.load(str(path), check_existing=True)


def _wordmark_font():
    if not WORDMARK_FONT_PATH.exists():
        raise FileNotFoundError('brand font missing: %s' % WORDMARK_FONT_PATH)
    return bpy.data.fonts.load(str(WORDMARK_FONT_PATH), check_existing=True)


# --- rules -------------------------------------------------------------------
def is_wordmark(body: str) -> bool:
    return body.replace(' ', '').lower() == 'livegridav'


def sign_kind(body: str) -> str:
    return 'wordmark' if is_wordmark(body) else 'name'


def sign_depth(height: float) -> float:
    """clamp(0.075 x letter height, 1.8 cm, 6.5 cm)."""
    return max(.018, min(.065, height * .075))


def set_budget_step(step: int) -> None:
    """0 = full spec. Start-group step-down ladder:
    1: lettering under 0.3 m gets 1.2 cm depth and no bevel;
    2: also curve resolution_u 2 (see text_resolution);
    3: also slogans (premiumize_lettering(..., slogan=True)) keep today's depth.

    NOT USED in this rollout: the start group came to 22.8 of 24 MiB without it.
    The ladder has not been verified against the spec's ladder. Known gaps:
    step 1 also thins wordmarks and names (the spec says captions only), so it
    must exempt wordmarks and names before first use; step 2 only changes
    premium_wordmark's resolution."""
    if step not in (0, 1, 2, 3):
        raise ValueError('budget step must be 0-3, got %r' % (step,))
    _STATE['step'] = int(step)


def text_resolution(default: int) -> int:
    """Curve resolution_u for a text helper: `default`, or 2 from budget step 2."""
    return min(default, 2) if _STATE['step'] >= 2 else default


def _depth_and_bevel(height):
    """Depth and front-edge bevel (metres) for letters `height` tall."""
    if _STATE['step'] >= 1 and height < .3:
        return .012, 0
    depth = sign_depth(height)
    return depth, (min(.004, depth * .09) if height >= .3 else 0)


def _log(body, kind, position):
    SIGN_LOG.append({'body': body, 'kind': kind, 'position': [round(float(c), 4) for c in position]})


def _website(blender_point):
    return (blender_point.x, blender_point.z, -blender_point.y)


# --- geometry ----------------------------------------------------------------
def _assign(bm, me, face_mat):
    """Face / return / edge by local normal. Materials are set on the mesh
    BEFORE bm.to_mesh: clearing them afterwards resets every index to 0 and
    the returns render with the face material."""
    for f in bm.faces:
        nz = f.normal.z
        f.material_index = 0 if nz > .97 else (1 if abs(nz) < .35 or nz < -.9 else 2)
    me.materials.clear()
    for mat in (face_mat, RETURN, EDGE):
        me.materials.append(mat)
    bm.to_mesh(me)
    me.update()


def _deepen(me, face_mat, depth, bevel, back):
    """Rebuild a flat glyph mesh (lettering faces local +Z) as a built-up
    letter: the back stays on the plane z=`back` (today's stand-off) and the
    lit face grows forward to z=back+depth. The glyph footprint in local X/Y
    is unchanged. The back cap is dropped (it faces the wall)."""
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.normal_update()
    caps = [f for f in bm.faces if f.normal.z > .9]
    if not caps:
        bm.free()
        raise ValueError('%s has no +Z glyph faces; local +Z must face the visitor' % me.name)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.normal.z <= .9], context='FACES')
    for v in bm.verts:
        v.co.z = back
    res = bmesh.ops.extrude_face_region(bm, geom=caps)
    lid = [g for g in res['geom'] if isinstance(g, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=lid, vec=(0, 0, depth))
    stale = [f for f in bm.faces if all(v.co.z < back + depth * .01 for v in f.verts)]
    if stale:
        bmesh.ops.delete(bm, geom=stale, context='FACES')
    bm.normal_update()
    if bevel > 0:
        edges = [e for e in bm.edges if len(e.link_faces) == 2 and
                 sum(f.normal.z > .9 for f in e.link_faces) == 1]
        try:
            bmesh.ops.bevel(bm, geom=edges, offset=bevel, segments=1, affect='EDGES',
                            clamp_overlap=True, profile=.5)
        except Exception as error:
            print('PREMIUM_SIGNAGE bevel skipped', me.name, error, flush=True)
        bm.normal_update()
    _assign(bm, me, face_mat)
    bm.free()


def _restyle(me, face_mat):
    """Budget step 3 slogans: today's thin slab, new materials."""
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.normal_update()
    _assign(bm, me, face_mat)
    bm.free()


def _new_object(name, me):
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    ob.rotation_euler = (math.pi / 2, 0, 0)  # local +Z toward the visitor, as text_add makes it
    return ob


def _text_object(name, body, font, resolution):
    """Flat glyph mesh at size 1 without bpy.ops (no context dependence)."""
    curve = bpy.data.curves.new(name, 'FONT')
    curve.body = body
    curve.font = font
    curve.size = 1
    curve.space_character = 1
    curve.extrude = .0018
    curve.resolution_u = resolution
    curve.align_x = 'LEFT'
    holder = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(holder)
    graph = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(holder.evaluated_get(graph))
    bpy.data.objects.remove(holder)
    bpy.data.curves.remove(curve)
    me.name = name
    return _new_object(name, me)


# --- public builders ---------------------------------------------------------
def premium_wordmark(p, height, width=None, *, centered=False, yaw=0, place=transform):
    """`livegrid` (ivory) + `AV` (aqua), Space Grotesk 600, one word.

    Anchors as rental's label(): ink bottom on p.y; ink left edge on p.x, or
    the ink centred on p.x when `centered`. `height` is the shared ink height
    (descender included); `width` shrinks the pair uniformly to fit. As in the
    approved test, the letter backs sit on p's plane and the letters stand
    `sign_depth` proud of it toward the visitor."""
    font = _wordmark_font()
    resolution = text_resolution(3)
    parts = []
    for text, face in (('livegrid', FACE), ('AV', AQUA)):
        ob = _text_object('Premium Sign | wordmark ' + text, text, font, resolution)
        xs = [v.co.x for v in ob.data.vertices]
        ys = [v.co.y for v in ob.data.vertices]
        parts.append((ob, text, face, min(xs), max(xs), min(ys), max(ys)))
    ink_low = min(part[5] for part in parts)
    ink_high = max(part[6] for part in parts)
    factor = height / (ink_high - ink_low)
    cursor, shifts = 0.0, []
    for ob, text, face, x0, x1, y0, y1 in parts:
        shifts.append(cursor - x0)
        cursor += (x1 - x0) + WORDMARK_GAP
    natural = (cursor - WORDMARK_GAP) * factor
    fit = min(1, width / natural) if width else 1
    scale = factor * fit
    start = -natural * fit / 2 if centered else 0
    ink = height * fit
    depth, bevel = _depth_and_bevel(ink)
    obs = []
    for (ob, text, face, x0, x1, y0, y1), shift in zip(parts, shifts):
        for v in ob.data.vertices:
            v.co.x = (v.co.x + shift) * scale + start
            v.co.y = (v.co.y - ink_low) * scale
            v.co.z *= scale
        _deepen(ob.data, face, depth, bevel, back=0)
        ob['signage_body'] = text
        ob['signage_font'] = 'Space Grotesk 600'
        ob['signage_size'] = ink
        obs.append(ob)
    place(obs, p, yaw)
    _log('livegridAV', 'wordmark', p)
    return obs


def premium_emblem(p, height, yaw=0, place=transform):
    """The 5x5 signal grid: columns lit bottom-up 2,4,3,5,4. Square, 0.80 x the
    emblem `height` it replaces, lifted 0.10 x height; left edge on p.x, cell
    backs on p's plane, raised toward the visitor."""
    size = height * .80
    lift = height * .10
    pitch = size * 57 / 276
    cell = size * 48 / 276
    depth = max(.02, min(.05, size * .045))
    bevel = min(.010, cell * .07)
    cells = []
    for col, rise in enumerate(SIGNAL_HEIGHTS):
        for row in range(5):  # row 0 = top
            lit = (5 - row) <= rise
            cx = col * pitch + cell / 2
            cy = lift + (4 - row) * pitch + cell / 2
            cells.append(box('Premium Sign | %s signal cell' % ('lit' if lit else 'dim'),
                             (cx, cy, depth / 2), (cell, cell, depth),
                             CELL_ON if lit else CELL_OFF, bevel))
    place(cells, p, yaw)
    _log('signal grid logo', 'emblem', p)
    return cells


def premium_halo(p, width, height, yaw=0, place=transform):
    """One soft aqua wash plane, `width` x `height`, its bottom-left corner at
    p's x/y and HALO_OFFSET (3 cm) behind p's plane (the letter backs). Call it
    once per stall, for the main fascia logo + wordmark only."""
    z = -HALO_OFFSET
    me = bpy.data.meshes.new('Premium Sign | aqua halo')
    me.from_pydata([(0, 0, z), (width, 0, z), (width, height, z), (0, height, z)], [], [(0, 1, 2, 3)])
    uv = me.uv_layers.new(name='UVMap')
    for loop, coord in zip(uv.data, ((0, 0), (1, 0), (1, 1), (0, 1))):
        loop.uv = coord
    me.materials.append(HALO)
    me.update()
    ob = _new_object('Premium Sign | aqua halo', me)
    place([ob], p, yaw)
    _log('aqua halo', 'halo', p)
    return ob


def premiumize_lettering(obs, body, *, accent=False, slogan=False, position=None):
    """Convert flat letter meshes made by a stall's own text helper, in place.

    Each object's local +Z must be the letter's facing direction (true for a
    text_add/convert label before its transform is baked, e.g. inside rental's
    label() before `transform`); a helper that bakes its transform into the
    vertices calls this before the bake. The back plane stays where today's
    thin letter's back is (so the stand-off gap to the panel is unchanged) and
    the lit face grows forward, toward the facing direction, to back +
    sign_depth(ink height); the glyph footprint in local X/Y stays put. Ink
    height is the extent of all `obs` together along the first object's local
    Y in world metres.

    Faces get ivory (aqua when `accent`; for a wordmark split into parts the
    last part is aqua), sides brushed champagne, the bevel polished champagne.
    `slogan=True` marks non-name copy for budget step 3. `position` is the
    world-metre anchor for SIGN_LOG; default: the first object's origin."""
    obs = list(obs)
    if not obs:
        raise ValueError('premiumize_lettering needs at least one object')
    bpy.context.view_layer.update()
    first = obs[0]
    up = (first.matrix_world.to_3x3() @ Vector((0, 1, 0))).normalized()
    heights = [(ob.matrix_world @ v.co).dot(up) for ob in obs for v in ob.data.vertices]
    depth, bevel = _depth_and_bevel(max(heights) - min(heights))
    wordmark = is_wordmark(body)
    keep_thin = slogan and not wordmark and _STATE['step'] >= 3
    done = set()
    for i, ob in enumerate(obs):
        if ob.data.as_pointer() in done:
            continue
        done.add(ob.data.as_pointer())
        aqua = accent or (wordmark and len(obs) > 1 and i == len(obs) - 1)
        face = AQUA if aqua else FACE
        if keep_thin:
            _restyle(ob.data, face)
            continue
        m = ob.matrix_world.to_3x3()
        sx = (m @ Vector((1, 0, 0))).length
        sz = (m @ Vector((0, 0, 1))).length
        back = min(v.co.z for v in ob.data.vertices)
        _deepen(ob.data, face, depth / sz, bevel / sx, back=back)
    if position is None:
        position = _website(first.matrix_world.translation)
    _log(body, sign_kind(body), position)
    return obs
