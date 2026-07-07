# fursay — AGENTS

Cloudflare **Worker** (not Pages) serving the Fursay site + newsletter + render queue.

## Commands
- `npm run check` — `release-fursay --check-only`. Run after any edit.
- `npm run deploy` — build + stage to CF Workers. BLOCKED until Workers token present.
- `npm run deploy:push` — also push git.
- `npm run analytics:enablement:check` — verify Analytics Engine contract before touching analytics.
- `npm run noor:sprint:log|next|review` — Noor sprint pipeline logging/review.

## Conventions
- Local-only git, no remote. Deploy needs a **Workers** token (CF account `e6780ef96bb6f53eba1dbc4d6dfa7376`).
- Analytics Engine not yet enabled — set `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_ANALYTICS_TOKEN` to unlock.
- Secrets via wrangler / `.local-secrets/`; never commit.

## Do NOT
- Assume the CF **Pages** token covers Workers — it does NOT.
- Deploy without the Workers token present.
