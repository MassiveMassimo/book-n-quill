# Book n Quill: confirmed intent

Confirmed on 2026-10-02 after the interview and a fresh subagent review.

## Outcome

Make someone feel as if they are taking notes inside Minecraft. This is a fun,
deliberately small Astro web app for quickly jotting something down. It is not
intended to replace a person's daily note system.

## First version

- One Book and Quill. It opens immediately when the site loads.
- Real Minecraft Java Edition fonts, textures, sounds, and faithful GUI behavior.
  The game is the visual reference. Game parity takes priority over conventional
  web toolbars and export buttons.
- Plain-text writing on fixed book pages. The browser automatically saves the
  draft. Returning to the site restores it.
- Desktop supports a full six-face panorama. Closing the book captures the mouse
  when supported. Mouse movement turns the view. Right-click opens the book and
  restores the cursor. Escape releases the mouse and opens Game Menu.
- Phones use a fixed background and touch controls. There is no drag-to-look.
  The app draws its own interactive HUD, without a player hand.
- Built-in backgrounds come from online Minecraft screenshots, not the user's
  game capture. Background settings include a Theme button that cycles through
  Panorama, Mountains, Cherry Grove, Badlands, and Village. The choice persists
  locally. Screenshots and custom uploads stay static on all devices.
- Closing the book reveals the background and a Book and Quill icon. The icon
  reopens the same editable draft.
- Minecraft-style Game Menu and Options pages. Settings include music volume,
  sound-effect volume, fullscreen, export format, and background selection.
- Quiet background music starts after the first interaction. Music and sound
  effects have separate volume controls.
- Fullscreen is optional and entered through settings. It supports immersion
  without adding a separate web toolbar or entry screen.
- Sign opens the title screen. Sign and Close immediately downloads the book,
  using the title as the filename and the selected export format. Markdown is the
  default. Plain text is an option in settings. There is no format dialog at
  signing time.
- Signing closes the book but preserves an editable browser draft. This is an
  intentional change to Minecraft's permanent signing lock.
- Users can select their own still background image in settings. The image is
  stored locally in the browser. Videos and animated backgrounds are excluded.
- Desktop is the exact visual reference. Phones use the same GUI fitted to the
  screen, with touch controls and the native keyboard.

## Boundaries

Accounts, cloud sync, multiple books, advanced editing, playable worlds, and video
backgrounds are outside the first version. No paid service or deployment was
selected during the interview.

Custom screenshots can contain baked-in HUD or hands. The app does not remove
those pixels or hide its own functional controls to compensate. Background
selection includes a preview and guidance to capture screenshots with the HUD
hidden.

## Reference and handoff

The installed Java 26.3 client is the implementation reference adopted under the
2026-10-02 implementation request. Its assets and editor geometry were inspected
read-only. See [reference measurements](../references/java-26.3.md) and
[verification](../verification.md) for evidence and deliberate browser adaptations.

[SPEC.md](../../SPEC.md) translates this intent into the implementation contract.
Public-release questions remain separate from the local implementation.
