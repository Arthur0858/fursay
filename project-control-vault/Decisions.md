# Decisions

## 2026-05-10: Split Mac control plane and Windows GPU workstation

Decision:

- Mac + Codex owns project coordination, source edits, Git, docs, and newsletter automation.
- Windows + Claude Desktop owns GPU rendering and render review.

Reason:

- Claude Desktop is useful for reading Obsidian and guiding work, but it should not be assumed to have direct repo or shell access.
- Windows is the better place for GPU-heavy render work.
- A tool-neutral handoff avoids depending on Codex memory or Mac-only paths.

Consequence:

- Render jobs must be explicit, portable, and path-neutral.
- Obsidian notes must be readable by either Codex or Claude.
- Git remains the source of truth for project files.

