# Fursay Cloudflare Deploy Runbook

Fursay deploys through Cloudflare Workers Static Assets, not Cloudflare Pages.

## Deploy Target

- Worker name: `fursay`
- Static asset directory: `fursay-optimized-site`
- Worker entrypoint: `src/worker.js`
- Wrangler config: `wrangler.jsonc`
- Production origin: `https://fursay.com`

## GitHub Automation

The deploy workflow is `.github/workflows/deploy-worker.yml`.

- `push` to `main` runs the local release gate and deploys only when Cloudflare secrets are present and the remote gate passes.
- `workflow_dispatch` runs the local release gate, but does not deploy unless the workflow is changed to allow manual deploys.
- Workflow runs use concurrency group `fursay-worker-${{ github.ref }}` and cancel older in-progress runs for the same ref.
- Every run uploads `/tmp/fursay-release-*` as `fursay-release-evidence-${{ github.run_id }}` for 14 days.

## Required GitHub Secrets

Configure these in the repository before expecting push-to-deploy to run:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The workflow intentionally skips deployment when either secret is missing. This is fail-closed behavior.

## Local Gates

Use these commands before pushing:

```bash
npm run deploy:ready
npm run check
```

Use strict gates when validating the full auto-deploy path:

```bash
npm run deploy:ready -- --require-remote
npm run deploy:ready -- --require-cloudflare
npm run deploy:ready -- --require-remote --require-cloudflare
```

Expected local warnings on this Mac are:

- `git_missing_origin_remote`
- `missing_CLOUDFLARE_API_TOKEN`
- `missing_CLOUDFLARE_ACCOUNT_ID`

Those warnings explain why this machine can deploy with Wrangler authentication but cannot prove GitHub push-to-deploy is fully configured.

## Production Verification

After deployment, verify:

```bash
npm run smoke:live
```

Live smoke must keep these invariants:

- 9 public pages pass audit with `badCount 0`
- `/api/subscribe` smoke remains intercepted-only and does not call MailerLite
- `/release.json`, `/site-health.json`, `/deploy-readiness`, `/deploy-readiness.json`, `/campaigns.json`, `/creator-kit.json`, `/share-kit.json`, `/traffic-launch.json`, `/links`, `/links.json`, `/conversion-health`, `/conversion-health.json`, `/products`, `/zh/products`, `/ar/products`, `/product-samples/koko-printable`, `/product-samples/noor-worksheet`, `/products.json`, `/monetization-roadmap`, `/monetization-roadmap.json`, `/video-discovery.json`, `/shortlinks.json`, `/sitemap.xml`, and `/robots.txt` are readable
- `/creator-kit`, `/share-kit`, `/traffic-launch`, `/conversion-health`, `/monetization-roadmap`, and `/products` render their public copy/launch/growth/product surfaces without calling MailerLite
- `/deploy-readiness.json` publishes only boolean readiness evidence and required secret names, never secret values
- `/api/event` receives anonymous conversion events through the `FURSAY_EVENTS` Analytics Engine binding for dataset `fursay_events`, with Worker logs as a fail-closed fallback; no email, name, token, address, or subscriber payload is written
- `npm run report:events` is the post-enablement conversion report path; it queries 7-day and 30-day Analytics Engine summaries after `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_ANALYTICS_TOKEN` are available, including page intent, product interest, affiliate clicks, outbound clicks, and Noor variant attribution
- owned-product checkout remains disabled until product-interest evidence, disclosure copy, refund/support copy, and checkout tracking are all present in `/conversion-health.json`
- product sample previews remain noindex interest-validation pages and do not include price, purchase, or payment links
- versioned CSS/JS and image assets use long cache headers
- HTML and clean URL redirects keep short cache headers
