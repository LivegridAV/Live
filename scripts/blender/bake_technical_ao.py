"""Subtle contact occlusion for the static Technical Showcase architecture.

Call ``bake_technical_ao(list(bpy.context.scene.objects))`` after material
batching and transform application, immediately before export.  Then add
these arguments to the glTF export call::

    export_vertex_color="NAME", export_vertex_color_name="Col",
    export_all_vertex_colors=False

Blender 5.2's glTF exporter supports forced named colors independently of the
material node tree.  It writes this layer as COLOR_0 and retains the original
baseColorFactor/texture.  glTF multiplies COLOR_0 by that albedo, so no material
node edits, material copies, texture replacement, or extra draw calls are needed.
The colors intentionally contain only a neutral multiplier, with alpha 1.

The bake uses real world-space triangle geometry, cosine-weighted hemisphere
rays, a 0.7 m contact radius, and a distance falloff.  It excludes characters,
emitting displays, transparent glass, and the distant exhibition hall roof.
No image planes, light maps, or camera-dependent painted shadows are created.
"""

import json
import math
import time
from array import array

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree


_CHARACTER_WORDS = (
    "rocketbox", "business", "human", "person", "character", "guest",
    "avatar", "people", "skin", "hair", "eyelash", "eyebrow", "natural lip",
)
_HALL_WORDS = ("acoustic ceiling", "roof", "truss", "ceiling spotlight")


def _excluded_object(obj):
    """Characters remain excluded even when their imported mesh has a generic name."""
    ancestor = obj
    while ancestor is not None:
        lower = ancestor.name.lower()
        if any(word in lower for word in _CHARACTER_WORDS):
            return "character"
        if any(word in lower for word in _HALL_WORDS):
            return "distant_hall"
        ancestor = ancestor.parent
    return None


def _opaque_static_material(mat):
    if mat is None:
        return True
    if any(word in mat.name.lower() for word in _CHARACTER_WORDS):
        return False
    if mat.diffuse_color[3] < .999:
        return False
    if not mat.use_nodes or mat.node_tree is None:
        return True
    # Imported image-textured assets are usually characters in this authoring
    # file.  Keep their existing texture/vertex-color treatment untouched.
    for node in mat.node_tree.nodes:
        if node.type in {"TEX_IMAGE", "EMISSION"}:
            return False
        if node.type != "BSDF_PRINCIPLED":
            continue
        alpha = node.inputs.get("Alpha")
        transmission = node.inputs.get("Transmission Weight") or node.inputs.get("Transmission")
        if alpha and (alpha.is_linked or alpha.default_value < .999):
            return False
        if transmission and (transmission.is_linked or transmission.default_value > .001):
            return False
        strength = node.inputs.get("Emission Strength")
        emission = node.inputs.get("Emission Color") or node.inputs.get("Emission")
        emitting_color = emission and (emission.is_linked or max(emission.default_value[:3]) > .00001)
        if emitting_color and (strength is None or strength.is_linked or strength.default_value > .001):
            return False
    return True


def bake_technical_ao(objects, *, samples=32, max_distance=.7, min_factor=.45,
                      normal_bias=.0025, layer_name="Col", max_seconds=110):
    """Write neutral CORNER colors; return serializable timing/coverage statistics.

    World transforms and split corner normals are respected.  Coincident
    position/normal pairs share a ray result, reducing redundant casts after
    triangulation while preserving crisp contact shading on hard edges.  The
    time budget leaves unvisited corners white and reports ``budgetReached``;
    it never silently darkens an incomplete area or modifies material albedo.
    Existing color layers are preserved apart from this explicit named layer.
    """
    started = time.perf_counter()
    samples = max(1, min(32, int(samples)))
    max_distance = max(.01, float(max_distance))
    min_factor = max(0., min(1., float(min_factor)))
    normal_bias = max(.0001, float(normal_bias))
    bpy.context.view_layer.update()
    objects = list(objects)
    receivers = []
    skipped = {"non_mesh": 0, "character": 0, "distant_hall": 0, "non_opaque_or_emissive": 0}
    positions, triangles = [], []
    material_cache = {}

    for obj in objects:
        if obj.type != "MESH" or not obj.data.polygons:
            skipped["non_mesh"] += 1
            continue
        reason = _excluded_object(obj)
        if reason:
            skipped[reason] += 1
            continue
        mesh = obj.data
        allowed = []
        for mat in mesh.materials:
            key = mat.as_pointer() if mat else 0
            if key not in material_cache:
                material_cache[key] = _opaque_static_material(mat)
            allowed.append(material_cache[key])
        if not allowed:
            allowed = [True]
        valid_polys = [allowed[min(poly.material_index, len(allowed) - 1)] for poly in mesh.polygons]
        if not any(valid_polys):
            skipped["non_opaque_or_emissive"] += 1
            continue
        # A mixed-material object remains safe: excluded primitives receive
        # an identity multiplier.  Bake after joining to avoid join() filling
        # absent color layers on other objects with an unintended zero color.
        receivers.append((obj, valid_polys))
        offset = len(positions)
        matrix = obj.matrix_world
        positions.extend(matrix @ vertex.co for vertex in mesh.vertices)
        mesh.calc_loop_triangles()
        triangles.extend(tuple(offset + index for index in tri.vertices)
                         for tri in mesh.loop_triangles if valid_polys[tri.polygon_index])

    stats = {"layer": layer_name, "samples": samples, "radius": max_distance,
             "objects": len(receivers), "occluderTriangles": len(triangles),
             "corners": 0, "evaluatedPositions": 0, "rays": 0,
             "skipped": skipped, "budgetReached": False}
    if not triangles:
        stats.update(seconds=round(time.perf_counter() - started, 3), minimum=1., mean=1.)
        return stats
    bvh = BVHTree.FromPolygons(positions, triangles, all_triangles=True, epsilon=.000001)
    # Hammersley-like deterministic cosine samples, never exactly tangent.
    golden = math.pi * (3. - math.sqrt(5.))
    hemisphere = []
    for index in range(samples):
        radial = math.sqrt((index + .5) / samples)
        phi = index * golden
        hemisphere.append((radial * math.cos(phi), radial * math.sin(phi),
                           math.sqrt(1. - radial * radial)))
    cache = {}
    total, minimum = 0., 1.
    up = Vector((0., 0., 1.))
    side = Vector((0., 1., 0.))
    strength = 1. - min_factor
    expired = False

    for obj, valid_polys in receivers:
        mesh = obj.data
        # Shared meshes can occur in imported scenes; colors belong to an
        # instance's actual world contacts, so make only the receiver unique.
        if mesh.users > 1:
            mesh = mesh.copy()
            obj.data = mesh
        existing = mesh.color_attributes.get(layer_name)
        if existing and (existing.domain != "CORNER" or existing.data_type != "FLOAT_COLOR"):
            mesh.color_attributes.remove(existing)
            existing = None
        attribute = existing or mesh.color_attributes.new(name=layer_name, type="FLOAT_COLOR", domain="CORNER")
        mesh.color_attributes.active_color = attribute
        mesh.color_attributes.render_color_index = mesh.color_attributes.find(layer_name)
        count = len(mesh.loops)
        rgba = array("f", [1.]) * (count * 4)
        matrix = obj.matrix_world
        normal_matrix = matrix.to_3x3().inverted_safe().transposed()
        world_positions = [matrix @ vertex.co for vertex in mesh.vertices]
        corner_normals = mesh.corner_normals
        for poly in mesh.polygons:
            if not valid_polys[poly.index]:
                total += len(poly.loop_indices)
                continue
            for loop_index in poly.loop_indices:
                loop = mesh.loops[loop_index]
                point = world_positions[loop.vertex_index]
                normal = (normal_matrix @ corner_normals[loop_index].vector).normalized()
                key = (round(point.x, 3), round(point.y, 3), round(point.z, 3),
                       round(normal.x, 3), round(normal.y, 3), round(normal.z, 3))
                factor = cache.get(key)
                if factor is None:
                    if expired or (max_seconds and stats["evaluatedPositions"] % 256 == 0
                                   and time.perf_counter() - started > max_seconds):
                        expired = stats["budgetReached"] = True
                        factor = 1.
                    else:
                        tangent = normal.cross(up if abs(normal.z) < .95 else side).normalized()
                        bitangent = normal.cross(tangent)
                        origin = point + normal * normal_bias
                        blocked = 0.
                        for hx, hy, hz in hemisphere:
                            direction = tangent * hx + bitangent * hy + normal * hz
                            hit, hit_normal, face, distance = bvh.ray_cast(origin, direction, max_distance)
                            if hit is not None:
                                # Smooth finite contact radius: no dark halo at
                                # 0.7 m, strongest at genuine close contacts.
                                distance_weight = 1. - distance / max_distance
                                blocked += distance_weight * distance_weight
                        factor = max(min_factor, 1. - strength * blocked / samples)
                        cache[key] = factor
                        stats["evaluatedPositions"] += 1
                        stats["rays"] += samples
                offset = loop_index * 4
                rgba[offset] = rgba[offset + 1] = rgba[offset + 2] = factor
                total += factor
                minimum = min(minimum, factor)
        attribute.data.foreach_set("color", rgba)
        stats["corners"] += count
    stats.update(seconds=round(time.perf_counter() - started, 3),
                 minimum=round(minimum, 5),
                 mean=round(total / max(1, stats["corners"]), 5))
    print("TECHNICAL_AO " + json.dumps(stats), flush=True)
    return stats
