# Implementation plan

Implement the confirmed intent and SPEC locally. Java 26.3 is the reference.
No deployment, remote storage, or Git commits are part of this task.
Use Bun for installation, package scripts, and unit tests, per the user's request.

1. Scaffold static Astro and extract only required original assets. Generate a
   browser font from the game's bitmap providers. Record source hashes and rules.
2. Test and implement plain-text pages, local saving, and exact export contents.
3. Build the book, signing, scene HUD, and Minecraft-style settings screens.
4. Add separate audio volumes, fullscreen, and local still-image backgrounds.
5. Verify behavior with unit tests and headless browser tests. Inspect the local
   preview, review simplicity, and document measured fidelity and limitations.

Acceptance: one editable book opens at load; edits survive reload; signing exports
immediately without locking the draft; all agreed settings work. No user content
leaves the browser. Desktop geometry follows the extracted game constants.

Reference adaptation: desktop uses integer GUI scale; small screens fit the same
GUI. Native text selection and IME remain available. The default background is a
CSS crop of a local gameplay screenshot; the visible crop excludes its HUD/hand.
