"""Headless self-test for scripts/blender/premium_signage.py.

Run:
  "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b --factory-startup \
      --python scripts/blender/test_premium_signage.py

Prints PREMIUM_SIGNAGE_SELFTEST PASS on success; exits 1 on any failure.
Nothing is written to disk.
"""
import importlib.util
import math
import sys
import traceback
from pathlib import Path

import bpy
from mathutils import Vector

HERE = Path(__file__).resolve().parent
MM = .001
FAILURES = []

FACE = 'Premium Sign | ivory lit face'
AQUA = 'Premium Sign | aqua lit face'
RETURN = 'Premium Sign | brushed champagne return'
EDGE = 'Premium Sign | polished champagne edge'
CELL_ON = 'Premium Sign | frosted aqua cell'
CELL_OFF = 'Premium Sign | dim signal cell'
HALO = 'Premium Sign | aqua halo'


def check(condition, message):
    if not condition:
        FAILURES.append(message)
        print('PREMIUM_SIGNAGE_SELFTEST FAIL:', message, flush=True)


def close(a, b, tol=MM):
    return abs(a - b) <= tol


def load_module():
    path = HERE / 'premium_signage.py'
    spec = importlib.util.spec_from_file_location('premium_signage', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def world_points(objects):
    bpy.context.view_layer.update()
    return [ob.matrix_world @ v.co for ob in objects for v in ob.data.vertices]


def poly_material(ob, poly):
    mat = ob.data.materials[poly.material_index] if ob.data.materials else None
    return mat.name if mat else None


def materials_used(objects):
    return {poly_material(ob, poly) for ob in objects for poly in ob.data.polygons}


def frame(ob):
    """World unit axes (right, up, facing) of an object's local X, Y, +Z."""
    bpy.context.view_layer.update()
    m = ob.matrix_world.to_3x3()
    return [(m @ Vector(axis)).normalized() for axis in ((1, 0, 0), (0, 1, 0), (0, 0, 1))]


def extents(points, axes):
    out = []
    for axis in axes:
        d = [p.dot(axis) for p in points]
        out.append((min(d), max(d)))
    return out


def make_text(body, height, location=(0, 0, 0), yaw=0):
    """A flat label the way exhibition_base_helpers.lettering() + rental label() make it:
    a text object rotated (pi/2,0,0), converted to mesh, glyphs scaled in place so
    the ink is `height` tall. Its transform is NOT baked, so local +Z faces out."""
    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.object.text_add(location=location, rotation=(math.pi / 2, 0, yaw))
    ob = bpy.context.object
    ob.data.body = body
    ob.data.font = bpy.data.fonts.load('C:/Windows/Fonts/segoeui.ttf', check_existing=True)
    ob.data.size = 1
    ob.data.extrude = .0018
    ob.data.resolution_u = 3
    bpy.ops.object.convert(target='MESH')
    ob = bpy.context.object
    low = min(v.co.y for v in ob.data.vertices)
    high = max(v.co.y for v in ob.data.vertices)
    factor = height / (high - low)
    for v in ob.data.vertices:
        v.co.y -= low
        v.co *= factor
    ob.data.update()
    return ob


def run():
    scene_before = {ob.name for ob in bpy.context.scene.objects}
    ps = load_module()
    scene_after = {ob.name for ob in bpy.context.scene.objects}
    check(scene_before == scene_after, 'importing the module changed the scene (it must not build on import)')

    # --- pure helpers -----------------------------------------------------
    check(ps.is_wordmark('livegrid AV'), 'is_wordmark("livegrid AV")')
    check(ps.is_wordmark('LivegridAV'), 'is_wordmark("LivegridAV")')
    check(not ps.is_wordmark('CONTENT STUDIO'), 'is_wordmark("CONTENT STUDIO") must be false')
    check(ps.sign_kind('livegrid AV') == 'wordmark', 'sign_kind wordmark')
    check(ps.sign_kind('CONTENT STUDIO') == 'name', 'sign_kind name')
    check(close(ps.sign_depth(.1), .018, 1e-9), 'sign_depth(.1) == .018, got %r' % ps.sign_depth(.1))
    check(close(ps.sign_depth(.5), .0375, 1e-9), 'sign_depth(.5) == .0375, got %r' % ps.sign_depth(.5))
    check(close(ps.sign_depth(2), .065, 1e-9), 'sign_depth(2) == .065, got %r' % ps.sign_depth(2))
    check(ps.SIGN_LOG == [], 'SIGN_LOG starts empty')

    # --- emblem -----------------------------------------------------------
    cells = ps.premium_emblem((0, 2, 0), 1.0)
    check(len(cells) == 25, 'emblem makes 25 cells, got %d' % len(cells))
    on = [c for c in cells if materials_used([c]) == {CELL_ON}]
    off = [c for c in cells if materials_used([c]) == {CELL_OFF}]
    check(len(on) == 18, 'emblem has 18 lit cells, got %d' % len(on))
    check(len(off) == 7, 'emblem has 7 dim cells, got %d' % len(off))
    pts = world_points(cells)
    width = max(p.x for p in pts) - min(p.x for p in pts)
    want = .80 * (4 * 57 / 276 + 48 / 276)
    check(close(width, want), 'emblem width %.5f, want %.5f' % (width, want))
    check(close(min(p.x for p in pts), 0), 'emblem starts at its anchor x')

    # --- wordmark ---------------------------------------------------------
    marks = ps.premium_wordmark((0, 2, 0), .6)
    used = materials_used(marks)
    check(FACE in used and AQUA in used, 'wordmark uses ivory and aqua faces, got %s' % sorted(used))
    ivory = [ob for ob in marks if FACE in materials_used([ob])]
    aqua = [ob for ob in marks if AQUA in materials_used([ob])]
    check(len(ivory) == 1 and len(aqua) == 1, 'wordmark has one livegrid part and one AV part')
    if ivory and aqua:
        live_pts, av_pts = world_points(ivory), world_points(aqua)
        check(min(p.x for p in av_pts) > max(p.x for p in live_pts),
              'AV sits right of livegrid')
    pts = world_points(marks)
    depth = max(p.y for p in pts) - min(p.y for p in pts)
    check(close(depth, ps.sign_depth(.6)), 'wordmark depth %.5f, want %.5f' % (depth, ps.sign_depth(.6)))
    ink = max(p.z for p in pts) - min(p.z for p in pts)
    check(close(ink, .6), 'wordmark ink height %.5f, want .6' % ink)
    check(close(min(p.z for p in pts), 2), 'wordmark ink bottom sits on anchor y')
    check(close(min(p.x for p in pts), 0), 'wordmark ink starts at anchor x')
    check(close(max(p.y for p in pts), 0), 'wordmark back sits on the anchor plane')
    fitted = ps.premium_wordmark((0, 5, 0), .6, 1.0, centered=True)
    pts = world_points(fitted)
    check(close(max(p.x for p in pts) - min(p.x for p in pts), 1.0), 'wordmark fits to width')
    check(close(max(p.x for p in pts) + min(p.x for p in pts), 0), 'centered wordmark is centred on anchor')
    ps.SIGN_LOG.pop()  # the fit check is not part of the kinds-order check

    # --- premiumize a yawed label -----------------------------------------
    # Website yaw pi/2 = Blender Z rotation pi/2: the label faces website +X.
    label = make_text('CONTENT STUDIO', .4, location=(3, 2, 1), yaw=math.pi / 2)
    right, up, facing = frame(label)
    check((facing - Vector((1, 0, 0))).length < 1e-6, 'test label faces website +X')
    axes = (right, up, facing)
    (r0, r1), (u0, u1), (f0, f1) = extents(world_points([label]), axes)
    out = ps.premiumize_lettering([label], 'CONTENT STUDIO')
    check(out == [label], 'premiumize_lettering returns the same objects')
    (r0b, r1b), (u0b, u1b), (f0b, f1b) = extents(world_points([label]), axes)
    check(close(r0, r0b) and close(r1, r1b), 'front face X bounds unchanged')
    check(close(u0, u0b) and close(u1, u1b), 'front face Y bounds unchanged')
    check(close(f0, f0b), "back plane stays at today's stand-off (%.5f -> %.5f)" % (f0, f0b))
    check(close(f1b, f0 + ps.sign_depth(.4)), 'front grows forward to back + depth (%.5f, want %.5f)'
          % (f1b, f0 + ps.sign_depth(.4)))
    check(close(f1b - f0b, ps.sign_depth(.4)), 'label depth %.5f, want %.5f' % (f1b - f0b, ps.sign_depth(.4)))
    check(f1b > f1 + .02, 'label grows toward its facing direction')
    m = label.matrix_world.to_3x3()
    sides, fronts, edges = set(), set(), 0
    for poly in label.data.polygons:
        n = (m @ poly.normal).normalized().dot(facing)
        name = poly_material(label, poly)
        if abs(n) < .35:
            sides.add(name)
        elif n > .97:
            fronts.add(name)
        if name == EDGE:
            edges += 1
    check(sides == {RETURN}, 'side faces carry brushed champagne return, got %s' % sorted(sides))
    check(fronts == {FACE}, 'front faces carry ivory lit face, got %s' % sorted(fronts))
    check(edges > 0, 'a .4 m label has a polished front edge')
    check(not any((m @ p.normal).normalized().dot(facing) < -.9 for p in label.data.polygons),
          'no back cap left')

    # --- log --------------------------------------------------------------
    kinds = [entry['kind'] for entry in ps.SIGN_LOG]
    check(kinds == ['emblem', 'wordmark', 'name'], 'SIGN_LOG kinds %s' % kinds)
    check(all(set(entry) == {'body', 'kind', 'position'} for entry in ps.SIGN_LOG), 'SIGN_LOG entry keys')
    if len(ps.SIGN_LOG) == 3:
        check(ps.SIGN_LOG[0]['position'] == [0, 2, 0], 'emblem logged at its anchor')
        check(ps.SIGN_LOG[1]['body'] == 'livegridAV', 'wordmark logged as livegridAV')
        pos = ps.SIGN_LOG[2]['position']
        check(all(close(a, b) for a, b in zip(pos, (3, 1, -2))), 'label logged at its website origin, got %s' % pos)

    # --- halo -------------------------------------------------------------
    halo = ps.premium_halo((0, 2, 0), 2.0, 1.0)
    check(materials_used([halo]) == {HALO}, 'halo carries %s' % HALO)
    pts = world_points([halo])
    check(len(pts) == 4, 'halo is one plane')
    check(all(close(p.y, .03) for p in pts), 'halo sits 3 cm behind the face')
    check(close(min(p.x for p in pts), 0) and close(max(p.x for p in pts), 2), 'halo width from anchor')
    check(close(min(p.z for p in pts), 2) and close(max(p.z for p in pts), 3), 'halo height from anchor')
    check(len(halo.data.uv_layers) == 1, 'halo has UVs')
    check(ps.SIGN_LOG[-1]['kind'] == 'halo', 'halo is logged')
    image = bpy.data.images.get('premium-sign-halo')
    check(image is not None and tuple(image.size) == (512, 160), 'halo image is 512x160')

    # --- materials ----------------------------------------------------------
    names = {mat.name for mat in bpy.data.materials}
    for name in (FACE, AQUA, RETURN, EDGE, CELL_ON, CELL_OFF, HALO):
        check(name in names, 'material %s exists' % name)
    check(not [n for n in names if 'glass' in n.lower()], 'no material name contains glass')
    check(not [n for n in names if n.startswith('Premium Sign |') and n[-4:-3] == '.'],
          'no duplicated Premium Sign materials')

    # --- fonts --------------------------------------------------------------
    if not Path('C:/Windows/Fonts/ARIALN.TTF').exists():
        font = ps.load_font('C:/Windows/Fonts/ARIALN.TTF')
        check(font.filepath.lower().endswith('seguisb.ttf'), 'missing Arial Narrow resolves to seguisb.ttf')

    # --- budget ladder ------------------------------------------------------
    check(ps.text_resolution(6) == 6, 'step 0 keeps curve resolution')
    ps.set_budget_step(1)
    caption = make_text('TECHNOLOGY', .2)
    _, _, facing = frame(caption)
    (f0, f1), = extents(world_points([caption]), (facing,))
    ps.premiumize_lettering([caption], 'TECHNOLOGY')
    (f0b, f1b), = extents(world_points([caption]), (facing,))
    check(close(f1b - f0b, .012, .0002), 'step 1: .2 m caption depth %.5f, want .012' % (f1b - f0b))
    check(close(f0, f0b), 'step 1: caption back stays put')
    check(EDGE not in materials_used([caption]), 'step 1: caption has no bevel')
    ps.set_budget_step(2)
    check(ps.text_resolution(6) == 2, 'step 2: curve resolution 2')
    ps.set_budget_step(3)
    slogan = make_text('IDEAS IN MOTION', .19)
    (f0, f1), = extents(world_points([slogan]), (frame(slogan)[2],))
    ps.premiumize_lettering([slogan], 'IDEAS IN MOTION', slogan=True)
    (f0b, f1b), = extents(world_points([slogan]), (frame(slogan)[2],))
    check(close(f0, f0b, 1e-6) and close(f1, f1b, 1e-6), 'step 3: slogan keeps today\'s depth')
    check(FACE in materials_used([slogan]) and RETURN in materials_used([slogan]),
          'step 3: slogan gets the new materials')
    ps.set_budget_step(0)


def main():
    try:
        run()
    except Exception:
        traceback.print_exc()
        FAILURES.append('exception')
    if FAILURES:
        print('PREMIUM_SIGNAGE_SELFTEST FAILED (%d)' % len(FAILURES), flush=True)
        sys.exit(1)
    print('PREMIUM_SIGNAGE_SELFTEST PASS', flush=True)


main()
