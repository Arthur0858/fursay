# Fursay Analytics Engine Enablement

Fursay already records anonymous event intent through `/api/event`. The Worker binding `FURSAY_EVENTS` is configured in `wrangler.jsonc`; the remaining external step is providing Cloudflare Analytics Engine SQL API query credentials and then running the report.

## Current State

- Dataset name: `fursay_events`
- Worker binding: `FURSAY_EVENTS`
- Report command: `npm run report:events`
- Handoff contract check: `npm run analytics:enablement:check`
- Public status: `/deploy-readiness.json` and `/conversion-health.json`
- Current expected blocker: `pending_cloudflare_credentials_or_enablement`
- Historical deploy blocker when binding was added before account support was available: `10089`

Do not remove the `analytics_engine_datasets` binding unless Cloudflare deployment starts failing again. Keep token values out of files, logs, and public reports.

## Enablement Steps

1. Confirm the deployed Worker accepts the `FURSAY_EVENTS` Analytics Engine binding.
2. Provide local or CI environment values:
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_ANALYTICS_TOKEN` or `CLOUDFLARE_API_TOKEN`
3. Run `npm run analytics:enablement:check`.
4. Run `npm run deploy:ready -- --require-cloudflare`.
5. Run `npm run report:events`.

## Report Handoff

Before Analytics Engine is enabled, `npm run report:events -- --dry-run` still writes an operator handoff to `/tmp/fursay-event-analytics-report/event-analytics-report.json`.

Use `enablementHandoff` in that JSON as the checklist for:

- confirming dataset `fursay_events` is reachable through binding `FURSAY_EVENTS`
- providing `CLOUDFLARE_ACCOUNT_ID` plus an analytics token without printing or committing secret values
- confirming `.env.example`, `wrangler.jsonc`, and the handoff JSON still agree with `npm run analytics:enablement:check`
- running `npm run deploy:ready -- --require-cloudflare`
- running `npm run report:events`
- reviewing Noor aggregate signals with `npm run noor:sprint:review`

## Success Criteria

The report is ready when `npm run report:events` writes `/tmp/fursay-event-analytics-report/event-analytics-report.json` with:

- `npm run analytics:enablement:check` passing
- `status` equal to `queried`
- `enablementHandoff.status` equal to `queried`
- `piiAllowed` equal to `false`
- `queries` count equal to `12`
- 7-day and 30-day rows for `noor_growth_signals`
- `decisionScoreboard.status` equal to `queried`

## Safety Rules

- Do not print, commit, or publish token values.
- Do not include email, name, phone, address, subscriber IDs, or MailerLite IDs in event rows.
- Keep checkout disabled until product-interest, sample download, source_id/placement aggregate, and subscriber signals are reviewable.
- Treat sample downloads, product-interest clicks, and source attribution as pre-revenue validation only; purchases/revenue_usd are required before claiming revenue.
- Keep Noor newsletter publishing in `safe_wait_subscriber_empty` until list/post-send gates are healthy. Newsletter is optional retention and must not block NOOR worksheet/sample traffic validation.
