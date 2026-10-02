# Local verification: 2026-10-02

Implemented the confirmed single-book scope. Java 26.3 is the asset and geometry
reference. The game installation was read only. The current preview is at
http://127.0.0.1:4321 and was started through Bun.

## Final commands and results

| Command                       | Result                                                                |
| ----------------------------- | --------------------------------------------------------------------- |
| bun install --frozen-lockfile | Passed; bun.lock is the sole dependency lockfile                      |
| bun run check                 | Passed; 0 errors, 0 warnings, 0 hints                                 |
| bun run test:unit             | 6 passed with Bun's native runner                                     |
| bun run build                 | Static build passed                                                   |
| bun run test:e2e              | 44 passed, 4 intentionally skipped; Chromium, WebKit, emulated iPhone |

Browser tests ran against the production build. They verify committed draft,
page, and title persistence; Markdown and TXT filenames and exact file contents;
editing after signing; local background persistence and reset; rejection of invalid
background replacement; page capacity; corrupt saved data preservation; failed-save
recovery in memory; original glyph advances; no external requests; fullscreen
state; menu Escape hierarchy; viewport bounds; native undo/redo and Unicode;
composition event commits; and actual successful original audio playback after
interaction. Composition was tested with synthetic lifecycle events, not an OS IME.

## Browser-observed UI

The built-in Codex browser was used to inspect the book, static scene with the
interactive hotbar, Options, and Background screens. The 320 × 568 layout was
inspected visually, then the viewport was restored. The final book preview is
left open. No test writing was left in the user's preview book.

Original button borders, page arrow transparency, font advances, and game book
coordinates were checked. Desktop tests cover widths 320, 768, 1024, and 1440.
Phone settings stack the same controls. A later independent visual review found
the defects recorded below and supersedes the initial UI finish assessment. The code simplification
review kept the direct native controller and small supporting modules. It removed
an unused extraction import and simplified focus selection.

## Resolved failures

- Save warnings intercepted the hotbar click. Status messages now pass pointer
  events through and retain persistent storage warnings after temporary notices.
- WebKit returned `UnknownError: Error preparing Blob/File data to be stored in
object store`. Storing image bytes and MIME type fixes the reproduced case.
- The browser default button background showed behind a page arrow. Its
  background is now transparent.
- A test assumed the same undo grouping after a scripted fill in both engines.
  The final test verifies native typed undo/redo, then checks Unicode composition
  separately. No custom undo system was added.

## Delivery limits

The 2,414 extracted bitmap glyphs use original pixels and advances. Unifont-only
characters use browser fallback glyphs, while saving and export preserve the raw
text. Native caret and selection behavior remain browser-controlled. Signing,
phone layout, and custom settings are documented adaptations of the game.

Mobile checks used WebKit emulation and a narrow built-in-browser viewport.
Physical phone keyboards, iOS audio-volume behavior, and device fullscreen still
need device verification. Browser Escape may exit fullscreen before reaching the
app. Firefox and imports into destination note apps were not tested.

This is locally implemented and tested. It has not been publicly deployed or
committed. Original asset and music redistribution needs review before publishing.

## Independent visual audit

Three read-only reviewers checked desktop geometry, phone layouts, and original
asset rendering. The installed Java 26.3 bytecode confirms horizontal centering
and `backgroundTop() = 2`. The book is deliberately not vertically centered.
The signing screen uses the same y=2 anchor. Four new desktop browser checks
assert book, arrow, and action-button geometry in Chromium and WebKit.

The audit found and fixed six defects: height-based phone font shrinking;
unreachable short-screen Background controls; an incorrect preview aspect ratio;
a half-pixel WebKit font baseline; lost glyph left bearings; and stretched widget
textures. Phones now retain width-based scale, scroll on short viewports, and
extend button hit areas to 44 screen pixels. Background previews use the current
viewport aspect and crop. Font metrics preserve baseline 7 and original bearings.
Widget interiors and full-height side strips preserve original source pixels.

The asset reviewer rechecked the actual dev assets in both engines: baseline 7,
original `│` and `▐` bearings, and zero pixel mismatches for three button states
at widths 98, 150, and 200. Slider tracks also match. The desktop reviewer accepted
the geometry coverage. The phone reviewer confirmed scrolling, readable text,
and the portrait preview crop. Its follow-up found a border offset in the new
hit-area calculation; that offset was corrected and the targeted test passed.
The final phone recheck measured 44-pixel hit heights and verified 24 boundary
taps without activating adjacent controls. All three reviewers closed their
accepted issue sets.

The full post-fix suite passed. The final touch-area correction has an additional
targeted short-phone check. These checks use isolated browser data. The built-in
browser timed out during this audit; fresh visual evidence uses headless browsers.

## Online backgrounds and theme selection

The user's local gameplay image was removed from product assets and extraction.
Four online HUD-free gameplay backgrounds are bundled as local files: Mountains
(default), Cherry Grove, Badlands, and Village. The Background screen cycles the
themes, saves the selected choice, and previews the viewport crop. Custom uploads
remain browser-only. Theme switching retains their stored bytes; Restore Default
removes the stored custom image. Sources and hashes are in
`docs/references/backgrounds.md`. Earlier private-capture notes are superseded.

Type checking, 6 unit tests, static build, and the full 44-test browser suite
passed. After fitting the taller Background screen at desktop integer scales,
14 affected browser cases passed again. The built-in browser still timed out;
isolated headless screenshots provided the fresh visual evidence.
The phone reviewer found a 0.88-pixel overlap between Theme and Choose Image
touch areas at 320 pixels wide. Explicit target heights avoid browser-dependent
dual-inset sizing. Row centers now have at least 48 screen pixels of separation;
45-pixel target heights allow rounding while staying above the 44-pixel minimum.
The targeted regression checks the actual boundary tap, short-screen scroll
navigation, theme cycling, and persistence. Seven affected cases passed after
the final spacing fix; two desktop-only skips are intentional.
The final boundary-tap test passed, and the independent phone reviewer confirmed
that `(160, 294.43)` activates Theme rather than Choose Image at 320 × 568.
The final complete browser suite passed again: 44 passed, 4 intentional skips.

## Artifact hygiene

Task-created test output and failure traces were removed after passing checks.
Independent audit screenshots, measurements, and small comparison scripts remain
in five `/tmp/book-n-quill-*-review` or audit/recheck directories (about 7.4 MB).
The final desktop screenshot is
`/tmp/book-n-quill-live-asset-recheck-20261002/chromium-desktop-book.png`.
Two review screenshots (about 1.4 MB total) are retained outside the project in
`/tmp/book-n-quill-review-20261002-1207/`. The static build is retained in dist
(about 3.4 MB). Installed dependencies remain for the working preview (about
239 MB). Product assets remain in public (about 3.3 MB). Theme-review screenshots
(about 1.2 MB) and online alignment references (about 0.25 MB) remain in
`/tmp/book-n-quill-themes-review-20261002/` and
`/tmp/book-n-quill-alignment-20261002/`.
