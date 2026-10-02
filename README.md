# Book n Quill

A small Astro app for jotting text inside a Minecraft Java Book and Quill.
One book. Original game artwork, pixel glyphs, and sounds. All writing and
selected backgrounds stay in the browser.

## Run locally

Use Bun 1.4.2 or newer. Astro's CLI also requires Node 22.12 or newer.

```sh
bun install --frozen-lockfile
bun run dev --host 127.0.0.1 --port 4321
```

Open http://127.0.0.1:4321. Astro 7 can start its dev server in the background
when an agent runs it. Use `bunx astro dev status` or
`bunx astro dev stop` to inspect or stop that instance.

## Use the book

- Write directly on the page. Committed edits save automatically.
- Use the arrows or Page Up / Page Down to turn pages.
- Done closes the book. In the desktop Panorama theme, the mouse controls the
  view. Right-click opens the same draft and restores the cursor. Escape releases
  the mouse and opens Game Menu. If capture is unavailable, use the first hotbar
  slot. Phones keep a fixed view and use the hotbar.
- Sign opens the title screen. Sign and Close downloads the selected file format
  immediately. Your browser draft stays editable.
- Escape closes the book. Escape again opens Game Menu. Phones have a pause
  button. Game Menu → Options contains audio, fullscreen, export, and background
  settings. Escape goes back through these menus.
- Markdown is the default export; plain text is also available. The raw text is
  preserved. Pages join with blank lines. The title supplies the filename.
- Custom backgrounds accept still PNG or JPEG files up to 10 MB. Select an image
  to preview and save it locally. Restore Default removes that custom image.
  Capture gameplay with F1 to hide the existing HUD and hand.

Storage is specific to the browser and site address. Clearing site data removes
the draft and custom image. A failed save leaves the current text in memory and
shows a warning. Export it before closing that tab.

## Checks

See [publishing and development tooling](docs/publishing.md) for lint, formatting,
pre-commit hooks, and the prepared Cloudflare Workers CI workflow.

```sh
bun run check
bun run test:unit
bun run build
bun run test:e2e
```

Browser tests use a production preview on localhost:4322. They run headless
Chromium, WebKit, and an emulated iPhone. Install missing test browsers with
`bunx playwright install chromium webkit`. Unit tests use Bun's native test runner.

## Reference and limits

Java 26.3 supplies the book, buttons, arrows, HUD, item sprites, bitmap font
providers, UI sounds, and Sweden music track. The generated font contains 2,414
original bitmap glyphs. Other Unicode characters use browser fallback fonts;
their raw text is retained in saving and export. Native caret, selection, and
undo follow browser behavior. No extra page-flip animation is added.

The default background is the full Java 26.3 panorama. Options → Background →
Theme cycles Panorama, Mountains, Cherry Grove, Badlands, and Village.
The panorama supports desktop mouse-look. The other themes and custom images
stay static. Phones show a fixed view of every theme.
These static images have no baked-in HUD, crosshair, or hand. Local copies avoid
remote requests from the app. The selected theme persists in browser settings.
See [background sources](docs/references/backgrounds.md) for provenance.
Small screens fit the same book and stack the same settings controls.

Fullscreen and autoplay remain subject to browser support. Browser Escape can
exit fullscreen before the app receives it. Real-device mobile keyboard and
fullscreen checks remain separate from emulation.

See [reference measurements](docs/references/java-26.3.md),
[asset provenance](docs/references/assets.json), and
[verification](docs/verification.md). `scripts/extract-assets.py` reproduces the
local asset extraction with Python, Pillow, fontTools, and Brotli. It reads the
game installation and writes only into this project.

This is an unofficial Minecraft fan project. Original game assets and music are
not owned by this project. The owner authorized bundling them for the initial
public release, with publication terms still pending review. See
[asset notices](ASSET_NOTICES.md).

NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.

The public repository is [MassiveMassimo/book-n-quill](https://github.com/MassiveMassimo/book-n-quill).
The live app is [Book N Quill](https://book-n-quill.mhmmadjid.workers.dev).
GitHub Actions runs the release checks. Automatic deployment is prepared but
disabled until its dedicated Cloudflare token is stored in GitHub Secrets.
