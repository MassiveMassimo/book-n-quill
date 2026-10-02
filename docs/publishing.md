# Publishing Book N Quill

## Hosting

Use Cloudflare Workers Static Assets. Astro builds the whole app into `dist/`.
Cloudflare serves those files directly. No Worker runtime, server-side rendering,
database, analytics, or note-upload endpoint is needed.

Keep notes and custom screenshots in browser storage. Storage is origin-specific:
localhost drafts do not transfer to the deployed site. Export a local draft first.

Hashed Astro files receive a one-year immutable cache policy. Unversioned images,
audio, and HTML use Cloudflare's normal asset caching and validation.

## Local checks

Use Bun for all commands. Keep `bun.lock` as the only dependency lockfile.

```sh
bun install --frozen-lockfile
bun run hooks:install
bun run lint
bun run format:check
bun run check
bun run test:unit
bun run build
bun run test:e2e
```

Install hooks after Git is initialized. The pre-commit hook checks staged files
with Oxlint and formats them with Prettier. CI checks the complete project.
Use `bun run format` for an intentional full formatting pass.

Oxlint and `@oxlint/plugins` are pinned to the same version. The anti-slop plugin
is vendored from the install-anti-slop skill under `tools/oxlint/anti-slop/`.
Keep its license and review updates before replacing it. React Doctor is not
installed: this app does not use React.

## CI and deployment

Pull requests and main pushes run lint, formatting, Astro checks, Bun unit tests,
a production build, and headless Chromium/WebKit/phone tests. Actions are pinned
to commit SHAs. Dependabot checks those pins monthly.

Only a successful trusted `main` run can deploy. Deployment uses the same `dist/`
that passed the browser tests. Pull requests receive no deployment credentials.

Before enabling deployment, configure these GitHub repository settings:

- Secret `CLOUDFLARE_API_TOKEN`: a dedicated token scoped to Workers deployment
  in the selected account. Do not use an expiring Wrangler OAuth access token.
- Variable `CLOUDFLARE_ACCOUNT_ID`: the selected Cloudflare account ID.

The user authorized bundling and publishing the current assets on 2026-10-02,
with a later review planned. This includes C418's Sweden track and third-party
screenshots. Publication terms remain unverified. User authorization is not a
copyright license. Do not describe these assets as project-owned or MIT-licensed.
Retain their provenance and resolve any restrictions found in the later review.

For an approved manual release, run `bun run build`, the checks above, then
`bun run deploy`. Wrangler can use the existing local login. CI needs its own
durable token. No paid plan change is part of this setup.

## Verification and rollback

After deployment, verify HTTP success, asset loading, writing, reload restoration,
export, audio, and menu controls at the public URL. A successful upload alone
does not verify those browser behaviors.

For a bad release, use `bunx --no-install wrangler rollback` to restore a prior
deployment. Inspect `wrangler rollback --help` before use. On the first release,
there may be no prior deployment. Fix the source and redeploy instead.
Then revert or fix the responsible commit so the next main deployment retains
the correction. Do not delete browser notes or change storage keys for rollback.

## Sources

- [Cloudflare static assets](https://developers.cloudflare.com/workers/static-assets/)
- [Prettier Astro plugin](https://github.com/withastro/prettier-plugin-astro)
- [Anti-slop](https://github.com/dmmulroy/anti-slop)
- [Minecraft usage guidelines](https://www.minecraft.net/en-us/usage-guidelines)

Status: the public [repository](https://github.com/MassiveMassimo/book-n-quill)
exists. Configuration and hooks are prepared locally. No source has been pushed
and no deployment has been made. The first lint run found 17 errors and two
warnings in existing application and test code. Astro checks and six unit tests
passed before concurrent panorama work changed the app. The subsequent build
failed because `src/scripts/app.ts` imported an absent `./panorama` module.
Complete that work, resolve lint findings, and rerun all checks before release.
