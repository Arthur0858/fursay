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
- `/release.json`, `/site-health.json`, `/deploy-readiness`, `/deploy-readiness.json`, `/campaigns.json`, `/creator-kit.json`, `/share-kit.json`, `/traffic-launch.json`, `/links`, `/links.json`, `/conversion-health`, `/conversion-health.json`, `/video-discovery.json`, `/shortlinks.json`, `/sitemap.xml`, and `/robots.txt` are readable
- `/creator-kit`, `/share-kit`, `/traffic-launch`, and `/conversion-health` render their public copy/launch/growth kits without calling MailerLite
- `/deploy-readiness.json` publishes only boolean readiness evidence and required secret names, never secret values
- `FURSAY_EVENTS` Analytics Engine dataset `fursay_events` receives anonymous `/api/event` datapoints only; no email, name, token, address, or subscriber payload is written
- versioned CSS/JS and image assets use long cache headers
- HTML and clean URL redirects keep short cache headers
