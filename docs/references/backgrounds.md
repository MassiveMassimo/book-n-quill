# Built-in panorama sources

Every built-in choice is a complete six-face panorama, without a baked-in HUD,
crosshair, or player hand. Scene names were chosen after image inspection.
Desktop uses mouse-look. Phones use an offline fixed perspective. Custom uploads
remain static on every device. The former four screenshot choices were replaced.

| Scene                 | Source                                       | Product directory                  |
| --------------------- | -------------------------------------------- | ---------------------------------- |
| Autumn Camp (default) | Original Java 26.3, installed asset index 34 | `public/minecraft/panorama/`       |
| Night Coast           | 1.21.11 vanilla variant                      | `public/backgrounds/snowy-coast/`  |
| Cherry Grove          | 26.1 vanilla variant                         | `public/backgrounds/cherry-grove/` |
| Sulfur Caves          | 26.2 vanilla variant                         | `public/backgrounds/sulfur-caves/` |

The online sets come from [Vanilla Panorama + assets](https://github.com/Vanilla-Panorama-Plus/vanilla-panorama-plus-assets),
pinned to commit `04907cea00baa1d6d62f5ffcae19ed862c42071f`. Only vanilla
textures and no-shader variants were copied. All faces retain the original
1024 × 1024 PNG bytes. Each set contains faces 0 through 5, including sky and ground.

[panoramas.json](panoramas.json) records pinned URLs, Git blob hashes, SHA-256,
versions, dimensions, and derived still images. Autumn Camp provenance is in
[assets.json](assets.json). [fetch-panoramas.py](../../scripts/fetch-panoramas.py)
reproduces the online sets. [extract-assets.py](../../scripts/extract-assets.py)
reproduces Autumn Camp from the read-only game installation. Stills use an upright
yaw/pitch of zero, a 70-degree vertical field of view, and a 1600 × 900 JPEG output.

The [resource-pack page](https://modrinth.com/resourcepack/vanilla-panorama-full)
lists MIT, but the pinned asset repository has no license file. The manifest
records that discrepancy. The mirror does not establish permission to
redistribute Minecraft assets. Public-use review remains separate from this local change.

All runtime assets are local. Themes persist in localStorage. Switching from
Custom to a scene preserves the uploaded image bytes. Restore Default removes
the custom image and selects Autumn Camp.
