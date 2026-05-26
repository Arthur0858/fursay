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

## Production behavior

1. Fetch the channel upload playlist from YouTube Data API.
2. Sort videos from oldest to newest and assign/parse episode numbers from `ep001`.
3. Select the lowest unsent episode for the channel.
4. Write a request JSON for Codex.
5. Codex writes the structured newsletter JSON.
6. Run MailerLite API preflight: token, target group, sender/reply-to, and target schedule.
7. Validate required fields, language expectations, video CTA, and repeat protection.
8. Create and schedule a MailerLite campaign for the channel group through the API.
9. Mark the episode as sent only after MailerLite schedule succeeds.

If any step fails, the job writes a failed run artifact and does not mark the episode as sent.

## MailerLite plan note

MailerLite's campaign API accepts HTML content through `emails.*.content`, but the official API currently documents that this field requires the Advanced plan. If the account is still on the Free plan, API delivery may fail with `providerErrorCode: "advanced_plan_required"`. In that case the runner leaves the episode unsent, preserves the generated `htmlPreview`, and reports the exact retry command.
