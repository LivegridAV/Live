# October 18 LED rental screen content

This folder contains isolated LED artwork for the actual 3D pavilion. No complete booth photograph is rendered as a plane, overlay or background. Only the `*.webp` runtime files are preloaded by `ledRental2026Painters.ts`; source masters and records are retained for editing.

`Livegrid AV Booth.png` and `Livegrid AV Booth Views.png` supplied the new design reference. `flat.webp` is a perspective-corrected crop of the flat product screen, excluding the physical display frame, hall and product caption. Its source corner coordinates appear in `asset-manifest.json`.

The clean mountain lake, three pink jellyfish, blue ocean wave, city panorama and corporate/concert/activation/retail application masters were recovered from this project's prior generated artwork cache. These images were originally created with the built-in image generation tool as standalone content, without a booth or architecture. Their original SHA256 hashes and cache paths are recorded in `asset-manifest.json`; no older stall geometry or media registration was restored.

The new backdrop painter raises the landscape horizon, extends the clean upper sky, adds fine fixed stars and renders the reference logo and wording as sharp Canvas vectors: `livegrid AV`, `SPACES CHANGE.` and `POSSIBILITIES DON'T.` The cropped original reference partially hides the LED behind people and planting, so those occlusions are not baked into the new display.

DNA filaments and the transparent diode matrix are native Canvas content. The cylinder wraps mirrored copies of the clean jellyfish image to close its full 360-degree seam. The transparent display's black gaps must be treated as an alpha mask by its real screen material. Actual product shapes and rotation remain native 3D geometry.

The Earth texture is NASA Blue Marble, credited to NASA/Goddard Space Flight Center, with land/ocean imagery assembled by Reto Stockli and Robert Simmon. Source: https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57730/land_ocean_ice_2048.jpg . The cached original is `earth-source-nasa.jpg`; the sphere painter applies an electric blue display grade, geographically derived coast glow and decorative great-circle light routes to this real equirectangular map. Route positions unwrap across the longitude seam; no sphere-shaped photograph or circle background is painted onto the map. NASA media guidance: https://www.nasa.gov/nasa-brand-center/images-and-media/ . Use does not imply NASA endorsement.

`prepare-artwork.py` only crops, resizes and encodes local source masters. `asset-manifest.json` records dimensions, byte counts and SHA256 values. `qa/led-rental-2026/render-painter-qa.cjs` renders all 12 native painters without browser automation, checks image decoding and verifies exact 24-second loop closure. It does not replace rendered scene QA.
