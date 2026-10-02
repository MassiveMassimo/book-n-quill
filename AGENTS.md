# Book n Quill

- Read [the confirmed intent](docs/intent/book-n-quill.md) and [the current spec](SPEC.md)
  before changing the app. Distinguish confirmed scope from proposed technical defaults.
- Game fidelity is the main product constraint. Use the selected Java reference
  for artwork and behavior. Do not add conventional web controls outside the
  agreed Minecraft-style screens without a concrete need.
- Inspect the user's installed Minecraft files read-only. Copy only needed assets
  and record their version and provenance. Never modify the game installation.
- Keep user notes and selected screenshots in the browser. A server, telemetry,
  or remote image service requires explicit scope approval.
- Keep review-only media out of repository commits. Preserve product assets and
  compact reference evidence needed to verify fidelity.
- Use Bun for dependency installation, package scripts, and native unit tests.
  Keep bun.lock as the sole dependency lockfile. Browser tests use Playwright.
