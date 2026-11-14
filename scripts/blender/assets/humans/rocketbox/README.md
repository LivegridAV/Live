# Textured Technical Showcase people

These four business characters are from the official [Microsoft Rocketbox
library](https://github.com/microsoft/Microsoft-Rocketbox), released under the
[MIT License](https://github.com/microsoft/Microsoft-Rocketbox/blob/master/LICENSE.md).
The full copyright and permission notice is retained in `LICENSE.md` and is
distributed with the website at `public/models/expo/technical-humans-LICENSE.txt`.

Source tree: `0943055db6ec570bcef9f2c8b41c9e5467c808f9`.
Original character folders are `Assets/Avatars/Professions/Business_Male_01`,
`Business_Male_02`, `Business_Female_01`, and `Business_Female_04`.

Each source FBX is retained. Body and head diffuse textures are converted from
the original TGA files to 2048-pixel JPEGs; original normal maps are retained as
1024-pixel PNGs. Hair color/opacity uses a PNG and alpha-tested strands. Clothing,
face, hair, hands, UVs, and smooth surface normals come from the original assets.
These are artist-authored textured human meshes, not photographic cutout planes.

`prepare_rocketbox_humans.py` uses the source rigs to author idle, conversation,
and operator arm poses, then bakes them to static meshes. Mesh height is normalized
to 1.793 m so the accepted booth placement scales preserve their existing head
heights. Intermediate posed GLBs live in `.next/cache/rocketbox-prepared`; they
are generated files and can be recreated offline from the retained FBX/texture
files here.

Rebuild with the installed Blender 5.2 executable:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python scripts/blender/prepare_rocketbox_humans.py
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python scripts/blender/rebuild_technical_showcase.py
```

The final booth GLB shares each character's photographic texture materials
between repeated poses. It contains no runtime skeleton or animation. The booth's
vertex AO bake excludes all Rocketbox materials and meshes.

The foreground guest has an authored fitted backpack and a dark upper-garment
variant. The right discussion guest uses a white upper-garment variant.
`prepare_rocketbox_clothing.py` creates these diffuse derivatives using the
original garment UVs, preserving the photographed creases and cloth detail,
original skin colors, all head/hair maps, and all original normal maps. Run it
with Python and Pillow after preparing the posed meshes when rebuilding the
clothing variants. These edits retain the original MIT license and attribution.
