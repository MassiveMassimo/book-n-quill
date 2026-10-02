# Java 26.3 reference measurements

Measured on 2026-10-02 from the installed client. The installation was read only.
No game code or client archive is copied into this project.

## Book geometry and limits

`javap -p -c -constants` from the existing PrismLauncher Java runtime was used
to inspect the unobfuscated `BookEditScreen` and `BookSignScreen` classes.

| Property                       | Java 26.3                             |
| ------------------------------ | ------------------------------------- |
| Book blit                      | 192 × 192, source atlas 256 × 256     |
| Book position                  | (GUI width − 192) / 2, y = 2          |
| Text region                    | 114 × 126                             |
| Text line height               | 9                                     |
| Line limit                     | 126 / 9 = 14                          |
| Page character limit           | 1,024                                 |
| Maximum pages                  | 100                                   |
| Page indicator                 | right aligned at book x + 148, y + 16 |
| Page buttons                   | x + 43 and x + 116, y + 157           |
| Sign/Done buttons              | width 98, height 20, gap 4, y = 196   |
| Title length                   | 15                                    |
| Title prompt                   | y = 34                                |
| Title input / author / warning | y = 50 / 60 / 82                      |

The editable field is the game's newer `MultiLineEditBox`. Its undecorated
122 × 134 widget includes internal padding; the app exposes a native 114 × 126
text region at the corresponding inset. Pages are explicit. Overflow is rejected
with the preceding committed page retained, rather than silently truncating paste.

The game font uses 8-pixel bitmap providers with ascent 7 and a 12-pixel accented
provider with ascent 10. Space advances 4 pixels. Glyph advance is its rightmost
occupied bitmap column, scaled to the provider height, rounded, plus one pixel.
The extraction script turns each original pixel into a square outline. At 8px
browser font size, tested advances are W = 6, i = 2, space = 4, Hello = 24.

Widget button metadata specifies nine-slice scaling, 200 × 20 with a 3-pixel
border. At the app's 20-pixel widget height, the game draws the original horizontal
prefix and fixed side strips. CSS preserves those pixels without stretching the
interior. Slider tracks use the same path with 1-pixel side strips.
The font preserves original left bearings and uses a 7-pixel ascent with a
2-pixel descent for an integer baseline in both Chromium and WebKit.
Page arrows use original transparent
sprites; page changes are immediate, with the original book-turn sound.

## Online alignment comparison: 2026-10-02

The full-frame [4Netplayers Book and Quill screenshot](https://www.4netplayers.com/en/blog/minecraft/minecraft-underrated-items-features/)
shows a single-page Java editor horizontally centered near the top edge, with
Sign and Done below. The article is dated 2025-08-07 but does not identify its
exact game version or GUI scale. It corroborates placement, not exact 26.3 pixels.

The [FixBookGUI author's comparison](https://modrinth.com/mod/fixbookgui)
explicitly shows the change from top-center to middle-center and links MC-61489.
Centered screenshots can therefore depict a mod rather than vanilla behavior.
The [MC-61489 archive](https://mojira.dev/MC-61489) records this placement as a
reported issue. That archive is a historical snapshot; it does not establish the
current official ticket status. Direct official bug-tracker access timed out.

Online images were checked alongside the installed vanilla 26.3 bytecode. No
alignment change is needed for the agreed game-fidelity goal. Review-only images
remain outside the repository under `/tmp/book-n-quill-alignment-20261002/`.

## Panorama source and verification: 2026-10-02

The six original 1024 × 1024 panorama images come from Swift Craft Launcher's
asset index `34.json`, under `minecraft/textures/gui/title/background/panorama_0.png`
through `panorama_5.png`. Each copied object's SHA-1 matches its index hash.
[assets.json](assets.json) records source keys, object hashes, output SHA-256
hashes, the face mapping, and the derived still's conversion parameters.
[extract-assets.py](../../scripts/extract-assets.py) reproduces these assets.

Read-only `javap` inspection of the installed Java 26.3 `CubeMapTexture.SUFFIXES`
established the upload order `1, 3, 5, 4, 0, 2` for `+X, -X, +Y, -Y, +Z, -Z`.
The game flips the image rows. `CubeMap.render` starts with `rotationX(PI)`.
[panorama.ts](../../src/scripts/panorama.ts) uses that order and an upright ray
`(x, -y, z)`. Yaw 0/90/180/270 faces images 0/1/2/3. Looking up faces image 4;
looking down faces image 5.

The approved browser adaptation uses 70-degree vertical FOV instead of the game's
85 degrees. Desktop mouse deltas move the camera at 0.15 degrees per CSS pixel.
Yaw wraps through 360 degrees; pitch clamps at ±89 degrees. Rendering occurs on
demand. Snapshots redraw immediately before `toDataURL`. Context loss hides the
canvas so the static background remains visible. The caller skips WebGL on phones.
The separate `public/minecraft/panorama/panorama-still.jpg` is an offline 1600 × 900
perspective at yaw/pitch 0 with the same 70-degree FOV.

Headless Chromium captures after the production build covered yaw 0/90/180/270
and pitch ±89. These use explicit renderer API calls, not native pointer lock.
Contact-sheet inspection found no swapped or inverted faces. Independent
projection samples covered all six faces. Chromium and WebKit checks also
confirmed nonblank snapshots, resize, context-loss hiding, and zero WebGL calls
in phone emulation. Later full Chromium headless tests verified native pointer
lock, mouse movement, right-click release, recapture, and Escape to Game Menu.
Playwright's headless-shell build rejects lock on this Mac. Native Safari and
physical phone checks remain separate from this evidence.

Review evidence remains outside the repository:

- Contact sheet: `/tmp/book-n-quill-panorama-20261002/contact-sheet.jpg`
- Projection samples: `/tmp/book-n-quill-panorama-20261002/mapping-proof.json`
- Capture angles: `/tmp/book-n-quill-panorama-20261002/capture-results.json`

## Deliberate adaptations

- Sign and Close exports and retains an editable draft. Its warning states this
  behavior instead of the game's permanent signing warning.
- Desktop uses integer GUI scale. Phones fit the book width and stack Options
  controls. Short screens scroll instead of shrinking the font. Touch hit areas
  extend beyond the original button art.
- Native text input retains selection, copy/paste, undo/redo, and IME. Unicode
  outside the extracted bitmap providers uses browser fallback glyphs.
- Settings are the agreed app subset, using original game controls.
- All built-in backgrounds are full panoramas without baked-in HUD or hand.
  Background settings offer Autumn Camp, Night Coast, Cherry Grove, and Sulfur
  Caves. Custom uploads remain static. The original private capture is not bundled.
- Backgrounds use IndexedDB records containing image bytes and MIME type. The
  first browser run reproduced WebKit's error preparing a Blob for storage.
  Storing bytes fixes the observed failure without changing data custody.

## Documentation used

- [Astro client scripts](https://docs.astro.build/en/guides/client-side-scripts/)
- [Astro TypeScript checks](https://docs.astro.build/en/guides/typescript/)
- [Playwright browser projects](https://playwright.dev/docs/test-projects)
- [Fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API/Guide)
- [Autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)
- [Minecraft Book and Quill](https://www.minecraft.net/en-us/article/book-and-quill)
- [Minecraft usage guidelines](https://www.minecraft.net/en-us/usage-guidelines)

Astro, Playwright, and Bun documentation were resolved and queried through Context7.
Installed Astro CLI help and source also confirmed the agent background-server
behavior and `--ignore-lock` flag used by the test server.
