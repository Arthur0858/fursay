# Local accessibility regression

Run from the repository root with the existing Node 22, Playwright dependency,
and installed Playwright Chromium:

```bash
npm run test:accessibility
# Optional evidence directory:
npm run test:accessibility -- --out-dir /tmp/fursay-accessibility-review
```

The command starts an ephemeral server bound to `127.0.0.1`, uses one headless
Chromium browser with sequential fresh contexts, and closes both on completion.
It does not need Wrangler, a running Worker, credentials, or a production URL.
Missing browser binaries are a failure, not a skipped test; this command never
installs dependencies or browsers automatically.

All external browser requests and WebSockets are blocked, service workers are
disabled, and local `/api/event` calls receive a synthetic response. Any
`/api/subscribe` request is blocked and fails the test. No email is entered and
the submit button is never activated. The local static server also refuses API
requests and non-GET requests. Nothing is sent to MailerLite or analytics.

## Coverage

The 12 representative routes are `/`, `/koko`, `/arabic`, `/privacy`, and their
`/zh/` and `/ar/` equivalents. The nine subscription pages exercise:

- Keyboard discovery of the skip-link, its visible viewport position, actual
  focus on the main landmark, and the subsequent Tab position.
- Language and RTL direction, dialog labels/descriptions, trigger relationships,
  `aria-modal`, initial/open/closed `aria-hidden`, and live status attributes.
- Initial email focus, two complete forward and reverse Tab cycles, both
  boundary wraps, and checkbox Space activation with a visible focus cue.
- Native background focus/pointer isolation and Chromium's accessibility tree.
  A temporary background probe is deliberately above the visual overlay, so
  blocking clicks is checked independently of the overlay's hit area.
- Preservation of an already-inert element and restored background interaction.
- Escape, keyboard activation of the close button, backdrop click, and inside
  click behavior; each dismissal restores the current trigger's focus.
- A different trigger and three deterministic close/reopen microtask cycles
  before a pending animation-frame focus restoration can run.
- Zero subscription API requests and no uncaught page errors.

The three privacy pages also verify skip navigation when main contains only
text: the next Tab can legitimately move to the footer.

`accessibility-browser.json` records the Chromium version, successful checks,
failures, blocked external resource count, mocked event count, and subscription
request count for every page. Any failure produces exit code 1, including browser
startup failure. Chromium CDP is used for the native accessibility tree because
Playwright's role locator does not account for `inert` in this installed version.
This suite does not claim screen-reader, Firefox, WebKit, or production testing.

## Release gate

`scripts/release-fursay.mjs` runs this browser checker immediately after the
existing markup accessibility contract and writes its JSON under the release
artifact directory as `accessibility-browser-local/accessibility-browser.json`.
The current CI validate command and evidence upload already include this stage;
no deployment trigger or approval behavior is changed.

For an already-generated site, `npm run check` runs the check-only gate. For a
fresh checkout, the full local CI-equivalent gate generates the missing manifests:

```bash
node scripts/release-fursay.mjs --skip-deploy --skip-live
npm run check
node --test test/*.test.mjs
```

Run generation only in a disposable worktree: it also updates tracked generated
pages. `--skip-live` alone does not prevent older browser checks from loading
external fonts. To enforce offline execution on Linux/WSL where user network
namespaces are available, run the gate inside a new namespace with only loopback:

```bash
unshare -Urn bash -c 'ip link set lo up; node scripts/release-fursay.mjs --skip-deploy --skip-live'
```

Do not run deployment, live checks, analytics queries without `--dry-run`, or
newsletter commands as part of this regression. No standalone lint or typecheck
command is configured; the release gate runs JavaScript syntax and contract checks.

## Bounded homepage font regression

The homepage CSS already names Baloo 2 and Nunito (EN/ZH), and Cairo (RTL);
the brand page generator uses the same Google Fonts families. The homepages
previously had no font loader. They now reference
/css/home-fonts-20261004-v1.css, with the existing official Latin/Arabic
WOFF2 subsets served from /fonts/home-20261004/. Unmodified source hashes,
download URLs, and the three OFL 1.1 notices ship beside the font files.
Font-display swap, original unicode ranges/weights, and no preload keep
loading non-blocking and on demand. No visitor Google Fonts request is added.
Chinese glyphs retain the platform CJK fallback; existing RTL .btn rules
name Nunito and therefore Arabic CTA glyphs still use the platform fallback.
This change does not redesign those font stacks.

Run the focused local checker with the existing installation:

    node scripts/check-home-font-browser.mjs /tmp/fursay-home-font-review

Optionally pass a before snapshot containing the three original homepage
HTML files beneath fursay-optimized-site as the second argument.

It checks the three homepages at 390/900/901/980/981/1440 px, plus EN/RTL Noor
at 901/1440 px, records actual CDP font glyphs and screenshots, validates
font hashes, and reuses the existing full homepage accessibility checks at
390/981 px (six cases). It blocks external traffic, writes, service workers
and WebSockets, mocks event requests, and never submits subscriptions.
Noor's existing Google CSS request is fulfilled offline using the same
official face declarations; the actual product HTML is unchanged.

The bounds/CTA hit checks are limited geometry assertions, not proof against
decorative glyph occlusion. Review the screenshots separately. This integrated candidate retains the final hero/sitemap source.
The checker additionally verifies the hidden 901/980 decorative camel and
visible 981 camel composition; other existing decoration remains scoped. Keep those visual failures separate from
the font-loading and keyboard results. Do not reset PNG baselines or use
this bounded command as a full release/production gate.
