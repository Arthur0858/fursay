# Fursay Newsletter Automation

Codex Automation is the scheduler and copywriter. The project script is the source of truth for YouTube source selection, QA, MailerLite delivery, and state.

## Weekly schedule

- Koko: Codex runs every Sunday and schedules the MailerLite campaign for Monday 09:00 Asia/Taipei.
- Arabic: Codex runs every Tuesday and schedules the MailerLite campaign for Wednesday 09:00 Asia/Taipei.

## API-first commands

Prepare the next episode for Codex copywriting:

```bash
node scripts/newsletter-runner.mjs --mode prepare --channel koko
node scripts/newsletter-runner.mjs --mode prepare --channel arabic
```

Verify MailerLite API access without creating a campaign:

```bash
node scripts/newsletter-runner.mjs --mode api-preflight --channel koko
node scripts/newsletter-runner.mjs --mode api-preflight --channel arabic
```

Create and schedule a MailerLite campaign from a Codex-generated newsletter JSON:

```bash
node scripts/newsletter-runner.mjs --mode send --channel koko --input content/newsletters/pending/<file>.newsletter.json
node scripts/newsletter-runner.mjs --mode send --channel arabic --input content/newsletters/pending/<file>.newsletter.json
```

Override the default send slot when needed:

```bash
node scripts/newsletter-runner.mjs --mode send --channel koko --input content/newsletters/pending/<file>.newsletter.json --schedule-date 2026-06-01 --schedule-time 09:00
node scripts/newsletter-runner.mjs --mode send --channel arabic --input content/newsletters/pending/<file>.newsletter.json --schedule-date 2026-06-03 --schedule-time 09:00
```

Validate without creating a MailerLite campaign:

```bash
node scripts/newsletter-runner.mjs --mode send --channel koko --input content/newsletters/pending/<file>.newsletter.json --dry-run
node scripts/newsletter-runner.mjs --mode send --channel arabic --input content/newsletters/pending/<file>.newsletter.json --dry-run
```

## Free-plan Chrome publishing commands

MailerLite Free plan can still send regular campaigns from the dashboard, but campaign content submission through the API is gated to Advanced plan accounts. On the Free plan, use the API only for preflight and handoff data, then use logged-in Chrome to schedule the campaign.

Create the browser handoff package after the dry-run passes:

```bash
node scripts/newsletter-runner.mjs --mode chrome-handoff --channel koko --input content/newsletters/pending/<file>.newsletter.json
node scripts/newsletter-runner.mjs --mode chrome-handoff --channel arabic --input content/newsletters/pending/<file>.newsletter.json
```

The handoff writes both JSON and Markdown files under `content/newsletters/browser-handoff/`. These files contain the campaign name, target group, sender, subject, preheader, rich-text body, schedule, and the exact success/failure recording commands.

After Chrome confirms the campaign is scheduled and visible in MailerLite Outbox, record success:

```bash
node scripts/newsletter-runner.mjs --mode chrome-result --channel koko --input content/newsletters/pending/<file>.newsletter.json --browser-status scheduled --campaign-url <outbox-or-campaign-url>
node scripts/newsletter-runner.mjs --mode chrome-result --channel arabic --input content/newsletters/pending/<file>.newsletter.json --browser-status scheduled --campaign-url <outbox-or-campaign-url>
```

If Chrome cannot publish because login, UI, group, subscriber, or scheduling checks fail, record failure instead:

```bash
node scripts/newsletter-runner.mjs --mode chrome-result --channel koko --input content/newsletters/pending/<file>.newsletter.json --browser-status failed --failure-code login_required --failure-detail "MailerLite asked for login"
```

Only refresh the YouTube episode catalog:

```bash
node scripts/newsletter-runner.mjs --channel koko --sync-only
node scripts/newsletter-runner.mjs --channel arabic --sync-only
```

## State files

- `content/newsletters/state.json`: channel episode catalogs, sent status, and recent run summaries.
- `content/newsletters/pending/*.request.json`: next episode source packet and exact JSON schema for Codex.
- `content/newsletters/pending/*.newsletter.json`: Codex-generated newsletter copy.
- `content/newsletters/runs/*.json`: full per-run artifact, including QA errors and generated HTML preview.
- `content/newsletters/browser-handoff/*.json`: structured Chrome publishing package for MailerLite Free plan.
- `content/newsletters/browser-handoff/*.md`: copy/paste friendly Chrome publishing package for MailerLite Free plan.

## Production behavior

1. Fetch the channel upload playlist from YouTube Data API.
2. Sort videos from oldest to newest and assign/parse episode numbers from `ep001`.
3. Select the lowest unsent episode for the channel.
4. Write a request JSON for Codex.
5. Codex writes the structured newsletter JSON.
6. Run MailerLite API preflight: token, target group, sender/reply-to, and target schedule.
7. Validate required fields, language expectations, video CTA, and repeat protection.
8. On Advanced-capable accounts, create and schedule a MailerLite campaign for the channel group through the API.
9. On Free plan accounts, write a Chrome handoff package, use logged-in Chrome to schedule the regular campaign in MailerLite, and record the Chrome result.
10. Mark the episode as sent only after MailerLite API schedule succeeds or Chrome Outbox confirmation is recorded.

If any step fails, the job writes a failed run artifact and does not mark the episode as sent.

## MailerLite plan note

MailerLite's campaign API accepts HTML content through `emails.*.content`, but the official API currently documents that this field requires the Advanced plan. Keep `MAILERLITE_ALLOW_CONTENT_API_SEND=false` on the Free plan. In that state, non-dry-run sends fail closed with `providerErrorCode: "advanced_plan_required"` before calling the campaign content endpoint. The runner leaves the episode unsent, preserves the generated `htmlPreview`, and reports the exact retry command.

Set `MAILERLITE_ALLOW_CONTENT_API_SEND=true` only after the MailerLite account plan is upgraded or otherwise verified to support API content submission.

## Chrome publishing safety

The Chrome path is a Free-plan compatibility bridge, not a durable API sender. The automation must stop and write a `chrome-result` failure if MailerLite asks for login/MFA, the expected group is missing, the selected group has 0 active subscribers, the editor cannot be reached, the schedule page blocks the selected time, or the campaign cannot be verified in Outbox.

Use the Rich-text editor for Free plan publishing. Do not use Custom HTML editor unless the account explicitly exposes it without an upgrade prompt.
