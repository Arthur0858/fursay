# Fursay Analytics Engine Enablement

Fursay already records anonymous event intent through `/api/event`. The remaining external step is enabling Cloudflare Analytics Engine for the planned `FURSAY_EVENTS` binding and then running the report with account credentials.

## Current State

- Dataset name: `fursay_events`
- Planned Worker binding: `FURSAY_EVENTS`
- Report command: `npm run report:events`
- Public status: `/deploy-readiness.json` and `/conversion-health.json`
- Current expected blocker: `pending_cloudflare_credentials_or_enablement`
- Last known Cloudflare deploy blocker when binding is added too early: `10089`

Do not add `analytics_engine_datasets` back to `wrangler.jsonc` until the Cloudflare dashboard can accept the Analytics Engine dataset for this account.

## Enablement Steps

1. Open the Cloudflare Analytics Engine dashboard for the Fursay account.
2. Enable Analytics Engine for dataset `fursay_events`.
3. Add or confirm the Worker binding name `FURSAY_EVENTS`.
4. Provide local or CI environment values:
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_ANALYTICS_TOKEN` or `CLOUDFLARE_API_TOKEN`
5. Run `npm run deploy:ready -- --require-cloudflare`.
6. Run `npm run report:events`.

## Report Handoff

Before Analytics Engine is enabled, `npm run report:events -- --dry-run` still writes an operator handoff to `/tmp/fursay-event-analytics-report/event-analytics-report.json`.

Use `enablementHandoff` in that JSON as the checklist for:

- enabling dataset `fursay_events` for binding `FURSAY_EVENTS`
- providing `CLOUDFLARE_ACCOUNT_ID` plus an analytics token without printing or committing secret values
- running `npm run deploy:ready -- --require-cloudflare`
- running `npm run report:events`
- reviewing Noor aggregate signals with `npm run noor:sprint:review`

## Success Criteria

The report is ready when `npm run report:events` writes `/tmp/fursay-event-analytics-report/event-analytics-report.json` with:

- `status` equal to `queried`
- `enablementHandoff.status` equal to `queried`
- `piiAllowed` equal to `false`
- `queries` count equal to `12`
- 7-day and 30-day rows for `noor_growth_signals`
- `decisionScoreboard.status` equal to `queried`

## Safety Rules

- Do not print, commit, or publish token values.
- Do not include email, name, phone, address, subscriber IDs, or MailerLite IDs in event rows.
- Keep checkout disabled until product-interest and subscriber signals are reviewable.
- Keep Noor newsletter publishing in `safe_wait_subscriber_empty` until at least one real Noor subscriber signal is observed.
