# Fursay Project Dashboard

Last updated: 2026-05-10

## Current setup

- Mac + Codex: control plane for project planning, site edits, newsletter automation, Git, and documentation.
- Windows + Claude Desktop: GPU/render workstation and Obsidian progress reader.
- Obsidian vault path: `project-control-vault/`.
- Render jobs path: `render-jobs/`.

## Current project state

- Site runtime: Cloudflare Worker serves static files from `fursay-optimized-site/`.
- Main docs: `docs/site-architecture.md` and `docs/newsletter-automation.md`.
- Newsletter state: `content/newsletters/state.json`.
- Cross-device handoff docs are now in `docs/cross-device-handoff.md`.

## Next actions

- Send the current transfer bundle to the Windows GPU machine if no Git remote is available yet.
- On Windows, clone the bundle or Git remote, then open `project-control-vault/` in Obsidian.
- Use `Render Queue.md` to run `test-gpu-handoff-001` as the first smoke test.
- Keep generated media and machine-specific outputs out of Git unless they are intentionally promoted.

## Do not sync

- `.env`
- API keys or tokens
- `output/`
- generated videos
- model caches
- Obsidian `.obsidian/` app settings
