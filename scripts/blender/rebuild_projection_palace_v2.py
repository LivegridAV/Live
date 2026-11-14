"""Projection maquette with shallow, genuinely recessed illuminated portals.

Keep the round domes, full building depth and carved supports of the original
palace. The reference's visible blue portals are shallow niche partitions;
placing them at the back of a one-metre vault hides them from the aisle.
"""
from pathlib import Path

original = Path(__file__).with_name("rebuild_projection_palace.py")
source = original.read_text(encoding="utf-8")
source = source.replace("projection-palace.glb", "projection-palace-v2.glb")
source = source.replace("projection-palace-layout.json", "projection-palace-v2-layout.json")
source = source.replace('"qa/projection-mapping"', '"qa/projection-mapping-v2"')
source = source.replace('front - depth + .05, .08, INSET)', 'front - min(depth, .72) + .05, .08, INSET)')
source = source.replace('"depth": depth, "back": front - depth}',
    '"depth": min(depth, .72), "structuralDepth": depth, "back": front - min(depth, .72)}')
exec(compile(source, str(original), "exec"))
