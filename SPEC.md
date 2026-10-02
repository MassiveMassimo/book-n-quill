# Spec: Book n Quill

Status: implemented locally under the user's 2026-10-02 implementation request.
Product intent is confirmed. Defaults below were adopted for this local version.
See docs/verification.md for measured results and remaining release questions.

The [confirmed intent](docs/intent/book-n-quill.md) is the product authority.
This spec covers one browser app and its supporting settings. These are not
separate services or independently deployed modules.

## Objective

Make a visitor feel as if they are writing in Minecraft's Java Edition Book and
Quill. The app is a playful place to jot text, save it locally, and export it to
another note app. Authenticity is the main success criterion.

The book opens immediately. Desktop and phones are supported. Fullscreen,
original UI sounds, quiet background music, and a Minecraft scene support
the experience.

## Implementation defaults

- Use the installed vanilla Java 26.3 client as the reference. Use its original
  assets rather than the launcher's selected resource packs.
- Ship a static Astro page. Run editing, persistence, settings, audio, fullscreen,
  and downloads in the browser. No server receives notes or selected images.
- Use TypeScript and native browser APIs. Start with native text input styled
  with the original font. Validate glyph metrics and editing behavior before
  settling the rendering technique. Do not add a UI framework or game engine
  without evidence that the current design is insufficient.
- Use localStorage for the small draft and settings. Use IndexedDB for the one
  custom background image bytes and MIME type. WebKit rejected storing a Blob
  during verification. Keep storage code specific to this app.
- Require a nonempty title before signing. The title's exact length and character
  rules come from the reference game. Sanitize the download filename separately.
- Preserve the typed text in exports. Markdown syntax typed by a user remains
  visible as text in the editor and is exported unchanged.

## Minecraft reference and assets

Read-only inspection found the following in the local Java 26.3 installation:

- Original book texture, button sprites, page-arrow sprites, and font definitions.
- Bitmap font texture and references to the game's additional font providers.
- Book page-turn/closing sounds and the button click sound in the asset cache.

This establishes asset availability. It does not establish visual parity,
font-conversion fidelity, the exact animation timings, or public redistribution
permission.

Before implementing the editor, record a compact reference for the book, signing
screen, HUD, pause menu, and relevant Options pages. Record logical positions,
glyph advances, line spacing, cursor and selection behavior, hover states,
page limits, title rules, transition behavior, and sound triggers. Use gameplay
observation and the selected client definitions together. Resolve disagreements
against the running reference game.

Copy only the assets the app uses. Record version, source path, conversion steps,
and any required notices. Do not modify the local Minecraft installation.
Preserve sharp pixel edges. Use the real font providers and fallback behavior;
a similar community font does not satisfy the exact-font requirement.

The app's animations follow the reference. A decorative page-flip or camera
animation is not implied by the word "animations" in the interview.

Original music, textures, and audio need a public-use review before publication.
An asset mirror does not supply permission by itself. Review Mojang's current
usage guidelines, attribution and unofficial-product notices, and any separate
music terms that apply. The release remains unapproved until this is resolved.

## Screens and interaction

| Screen      | Required behavior                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Book editor | Initial screen. Restore the one draft and selected page. Show the reference book, page controls, Done, and Sign.                      |
| Signing     | Reference title-screen layout. Sign and Close downloads immediately, then closes to the scene. Cancel returns to the editor.          |
| Scene       | All built-in themes support desktop mouse-look. Phones and custom uploads stay fixed. Right-click or the book item reopens the draft. |
| Game Menu   | Minecraft-style Back to Game and Options controls. Returning goes to the scene.                                                       |
| Options     | Music & Sounds, Video Settings, Export Settings, and Background settings.                                                             |

Escape closes the editor or returns from a nested menu to its parent. Escape from
the scene opens Game Menu. Provide a Minecraft-style pause control for phones.
Do not intercept Escape to trap a visitor in fullscreen. Browser fullscreen
handling can take precedence over the app's keyboard handling.

Signing is the intentional exception to game mechanics. The warning explains
that signing downloads a copy and leaves the local book editable. Signing does
not permanently lock or discard the browser draft.

## Writing and pages

- Use plain text, fixed pages, and the selected game's page navigation rules.
- Measure wrapping with the original glyph advances. Page counters and arrows
  reflect the real page list. Do not replace pagination with an expanding page
  or an infinite-scroll editor.
- Establish numeric page, text-area, and title limits from the reference before
  coding them. Asset dimensions alone do not define the interactive layout.
- Keep keyboard input, cursor movement, selection, paste, and composition usable.
  Verify native phone keyboards and composition input explicitly.
- Keep text and visual wrapping separate. Saving or exporting must not replace
  user text with render-generated line breaks or fallback glyphs.
- Page-limit handling must preserve the existing draft. Restore and export must
  not silently truncate previously saved text.

## Saving and local custody

Persist text pages, the selected page, and title after committed edits. Restore
these after a normal reload or browser restart. Persist music volume,
sound-effect volume, export format, and the selected custom background.

Fullscreen is transient browser state. Reflect fullscreenchange and the actual
fullscreen element. Do not display a persisted ON state after the browser has
exited fullscreen or automatically request fullscreen on reload.

Keep the current text in memory when saving fails and show a concise failure
message. Do not report that failed writes were saved. Invalid stored data must
not crash the editor or overwrite the original stored value on initial load.
Cleared browser data and private sessions are outside the persistence guarantee.
Do not introduce accounts, cloud backup, or storage migrations for version one.

The draft remains a single book. A note manager, collection index, and multiple
book schema are excluded. No analytics, remote note API, or image-upload service
is required.

## Export

The default format is Markdown. Export Settings can select plain text. Signing
uses the saved selection without a format chooser or a separate Export button.

One book produces one UTF-8 file. Export pages in order, separating adjacent
pages with a blank line. Preserve explicit line breaks within each page. Do not
include visual wrapping, game page numbers, textures, sounds, or backgrounds.
The title names the file; do not add an inferred content heading or metadata.

Use .md for Markdown and .txt for plain text. Typed content is unchanged in both
formats. Markdown-aware destination apps may interpret typed Markdown syntax.
Sanitize filename characters and supply a safe basename if sanitization removes
the title. Keep the original title in the draft.

Trigger the download directly from the signing gesture. Verify browser behavior
on desktop and phones. Some browsers can use a preview or native save sheet;
successful handoff of the file is required. Do not claim that an export has been
imported into Notion, Obsidian, or Apple Notes without testing that destination.

## Backgrounds

Every built-in theme is a complete six-face panorama. Autumn Camp, the default,
uses the original Java 26.3 panorama. Native WebGL
renders a fixed camera position with yaw and pitch. There is no world movement,
automatic rotation, or game engine. Mouse-look applies to every built-in theme.
Book and menus freeze the view and release pointer lock. Close or Back to Game
requests pointer lock from the gesture. An unlocked scene can capture it on a
click. Escape or unexpected lock loss opens Game Menu. Lock denial leaves the
hotbar usable. Use the system cursor in menus, as in the selected Java client.
Phones show an offline fixed perspective of the selected panorama, with no
WebGL or drag-to-look behavior. Custom uploads remain static on every device.

Custom backgrounds use a gameplay screenshot captured with HUD and player hand hidden.
Draw the app's real controls over it. Use a centered cover fit and apply game-like
darkening while the book or menus are open, based on the reference capture.

Built-in panoramas have no baked-in HUD, crosshair, or hand. Do not bundle the
user's gameplay screenshot. Background settings provide a Theme button that
cycles the scenes; Choose Image; a preview; and Restore Default (Autumn Camp).
Reuse one renderer and cube texture when switching themes. Decode all six faces
before upload. Serialize loads and show only the latest selected theme. Load
only the selected theme's faces on desktop. Phones load only the still image.
Persist the selected theme. Choosing a theme preserves saved custom image bytes.
Restore Default removes the saved custom image, as before. Older stored custom
backgrounds remain usable when no theme choice was saved.
The preview uses the current viewport crop. Selecting an image does not upload
it to a server. Save one decoded still image locally and keep the previous
background if validation or storage fails.

Accept PNG and JPEG screenshots for the first version. Reject videos and animated
images, including animated PNG files and mismatched file content. Proposed image
size limit: 10 MiB. Validate decoding before replacing the saved image. Revoke
app-created object URLs when they are replaced or no longer needed.

Show this capture hint: "For best results, hide the HUD with F1 before taking your
screenshot." Users can still select images with baked-in HUD or hands. Those
pixels remain visible. Do not add HUD detection, image repair, or automatic
control hiding.

## Audio and fullscreen

Start quiet background music after the first suitable interaction, subject to
browser playback policy and the saved music volume. Proposed first-use defaults:
music at 15%, sound effects at 50%. Zero volume disables that category.

Play the original UI sounds at the measured reference triggers. Do not layer an
extra click sound onto an action that already plays a book sound unless the game
does so. A failed audio load must not block editing or export.

Use Music & Sounds for separate music and sound-effect sliders. Use Video
Settings for Fullscreen ON/OFF. The fullscreen control calls the browser API from
the user gesture. Keep the complete scene, HUD, and menus inside the fullscreen
element. A denied or unsupported request leaves the app usable in its normal
window and must not falsely show Fullscreen ON.

Verify fullscreen support on the actual target browsers. Universal native
fullscreen support on phones is not promised. Browser Escape behavior is an
explicit limit to Minecraft parity.

## Desktop, phones, and accessibility

Desktop reproduces the measured logical layout at appropriate pixel scales.
Phones preserve the visual design while adapting scale and position to the
available viewport. Test portrait and landscape, including the keyboard-open
state. Keep the active text and essential controls reachable without horizontal
page scrolling. Do not replace the book with a generic mobile note editor.

Use semantic controls, accessible names, visible focus, and native keyboard
entry. Restore focus after menu and title-screen transitions. The app must remain
usable with music muted. Respect reduced-motion preferences for any additional
nonessential transitions. Screenshot selection and error handling use short,
plain text in the same visual style.

## Tech stack

Proposed runtime: Astro static output, TypeScript, DOM/CSS, browser audio APIs,
Fullscreen API, localStorage, IndexedDB, and Blob downloads. No SSR adapter,
backend, database service, or client UI framework is required.

Registry metadata checked on 2026-10-02:

| Package          | Observed version | Intended role                                               |
| ---------------- | ---------------- | ----------------------------------------------------------- |
| astro            | 7.3.5            | Static app and processed browser scripts                    |
| typescript       | 6.0.3            | Compatible with @astrojs/check's supported TypeScript range |
| @astrojs/check   | 0.9.10           | Astro and TypeScript checking                               |
| @playwright/test | 1.63.0           | Repeatable browser tests                                    |

Local Node is 24.17.0. Astro's minimum is Node 22.12.0. Dependencies are installed
and locked in bun.lock. Bun 1.4.2 is the selected package manager and native unit
test runner, per the user's instruction. Astro and Playwright are run through Bun
package scripts. No Git commit or deployment is part of this local implementation.

## Commands

These package scripts and commands exist in the implementation.

| Purpose                     | Executable command                           | Script            |
| --------------------------- | -------------------------------------------- | ----------------- |
| Install locked dependencies | bun install --frozen-lockfile                | Lockfile required |
| Local preview               | bun run dev --host 127.0.0.1 --port 4321     | astro dev         |
| Type and Astro check        | bun run check                                | astro check       |
| Pure logic tests            | bun run test:unit                            | bun test          |
| Browser tests               | bun run test:e2e                             | playwright test   |
| Static build                | bun run build                                | astro build       |
| Built-site preview          | bun run preview --host 127.0.0.1 --port 4321 | astro preview     |

Run check separately because astro build does not itself type-check the app.
Do not add a linter solely to fill this command table.

## Proposed project structure

```text
src/pages/index.astro       Static page and accessible app shell
src/components/            Book, HUD, and menu markup when separation helps
src/scripts/               Browser controller, editing, storage, audio, export
src/styles/                Original GUI styling and responsive layout
public/minecraft/          Only the original assets used by the app
public/backgrounds/        Supplied gameplay background
tests/                     Focused pure logic tests
e2e/                       Playwright behavior tests
docs/intent/               Confirmed product intent
docs/references/            Game measurements and asset provenance
SPEC.md                    Current implementation contract
```

Create files only when they carry a concrete responsibility. There is no required
component hierarchy, storage framework, event bus, or settings registry.

## Code style

Use descriptive camelCase names for values and functions, PascalCase for types,
and kebab-case for files. Keep the interaction controller explicit. Extract pure
text and export logic when it makes behavior easier to verify.

Example of the intended TypeScript style, not implemented application code:

```ts
type ExportFormat = 'markdown' | 'text';

function getDownloadName(title: string, format: ExportFormat): string {
  const basename =
    title.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_') || 'book';
  const extension = format === 'markdown' ? 'md' : 'txt';
  return `${basename}.${extension}`;
}
```

Keep comments technical and concise. Explain constraints or intent. Do not add
commentary that narrates what the next line does.

## Testing strategy

Use focused tests for page navigation and text boundaries, ordered export,
filename handling, and save/restore failures. Tests must verify behavior and
contracts, not duplicate the implementation. Use Node's test runner for isolated
logic and Playwright for the browser flows.

Run Playwright headless by default. Use the built-in browser for visual review of
the local app. Automated tests do not replace a comparison with the selected
Minecraft reference or real phone checks.

Required browser evidence includes reload recovery, title and export behavior,
settings persistence, custom-image restoration, mobile keyboard usability,
audio startup after a gesture, and actual fullscreen state. Test storage failure
without overwriting user data. Use synthetic notes and fixtures.

Keep review-only screenshots and recordings outside repository commits. Keep
product assets in the repository. Use one task-specific browser output location,
check disk space before large or repeated runs, and clean up only task-created
disposable output at closure. Retain compact evidence for unresolved failures.

## Boundaries

Always:

- Preserve the confirmed single-book scope and original-game visual contract.
- Keep notes, settings, and chosen screenshots in the user's browser.
- Verify game behavior before claiming exact parity.
- Run affected type, behavior, build, and browser checks during implementation.
- Preserve existing user files and document material changes to this spec.

Ask first:

- A new service, client framework, subsystem, or public interface outside scope.
- Accounts, remote custody, telemetry, billing, or a deployment target.
- Public publishing, asset redistribution, or replacing original assets with a
  different design to resolve release constraints.

Never:

- Modify the local Minecraft installation or distribute its code/JARs.
- Silently discard saved text or replace a user's background after a failed save.
- Add video backgrounds, multiple books, or advanced note features to version one.
- Claim a build, download, destination import, or visual comparison passed without
  the corresponding evidence.

## Acceptance checks

1. A fresh visit opens the editable book over the default panorama view.
2. Original font metrics, textures, logical layout, hover states, and UI sound
   triggers match the selected Java reference at the checked desktop scale.
3. Editing, paging, title entry, and returning through menus preserve the draft.
4. Reload and browser restart restore committed text, page selection, title,
   persistent settings, and the custom screenshot in a normal browser session.
5. Done closes the book. Desktop panorama captures the mouse. Right-click opens
   the same draft and releases it. Phones keep a static view and tap the book.
6. Sign and Close directly hands off one correctly named UTF-8 file, then returns
   to the scene. Export format changes take effect on the next signing action.
7. Export contains page text in order and explicit line breaks, with no visual
   wrapping, page-counter text, or bundled scene assets. The draft stays editable.
8. Music starts after an allowed gesture. Both volume sliders work and persist.
9. Fullscreen includes the whole app. ON/OFF follows actual browser state. Exit,
   denial, or lack of support leaves the editor and menus usable.
10. Background selection previews and restores one local still image. Videos,
    animated images, invalid files, and files over the selected size limit do not
    replace the current background. Restore Default works.
11. Desktop and phone layouts keep writing, signing, settings, and reopening
    usable. Check a phone with its keyboard open and perform a real download.
12. Build and behavior checks pass, visual evidence is reviewed, and public asset
    use is resolved before an approved public release.

## Open items before implementation or release

- The game version was proposed, not explicitly chosen by the user. Use installed
  vanilla Java 26.3 unless the user selects another reference.
- Record the numeric game limits, logical layout, sound triggers, and transition
  behavior before implementing fidelity-dependent code.
- Validate the native-input/original-font approach in a small parity prototype.
  Resolve a rendering failure before building a larger editor around it.
- Select the supplied gameplay screenshot and the original music assets. Record
  their provenance. The default background is the original full panorama.
- Select and lock compatible dependencies during scaffolding. The versions above
  are observed candidates, not a tested installation.
- Resolve original-asset and music publication terms before public distribution.
  A disclaimer alone is not a finding that all asset uses are permitted.

These items do not authorize implementation, publishing, a service purchase, or
changes to the user's game installation.

## Sources

- [Astro client-side scripts](https://docs.astro.build/en/guides/client-side-scripts/)
- [Astro TypeScript checks](https://docs.astro.build/en/guides/typescript/)
- [Astro static output](https://docs.astro.build/en/reference/configuration-reference/#output)
- [Mojang: Book and Quill](https://www.minecraft.net/en-us/article/book-and-quill)
- [Mojang: book data components](https://www.minecraft.net/en-us/article/minecraft-java-edition-1-20-5)
- [Minecraft usage guidelines](https://www.minecraft.net/en-us/usage-guidelines)
- [MDN: fullscreen guide](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API/Guide)
- [MDN: fullscreen activation](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen)
- [MDN: audio autoplay](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)
- [MDN: localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [Notion text and Markdown import](https://www.notion.com/help/import-data-into-notion)
- [Obsidian Markdown import](https://obsidian.md/help/import/markdown)
- [Apple Notes import on macOS 26](https://support.apple.com/guide/notes/not201900c07/4.13/mac/26)
- Package version metadata from registry.npmjs.org, checked on 2026-10-02.
