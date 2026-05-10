# Windows + Claude Desktop Setup

This file explains how to move the project to the Windows GPU machine when no GitHub remote is configured yet.

## Option A: Use a Git remote

Use this when a GitHub repository is available.

```powershell
git clone <repo-url> fursay
cd fursay
node scripts/check-render-jobs.mjs
```

Then open `project-control-vault/` in Obsidian and read:

1. `Dashboard.md`
2. `Handoff for Claude.md`
3. `Render Queue.md`

## Option B: Use the transfer bundle

Use this when the Mac has created a `.bundle` file under `transfer/`.

Copy the bundle file to Windows, then run:

```powershell
git clone fursay-windows-handoff.bundle fursay
cd fursay
node scripts/check-render-jobs.mjs
```

If Node.js is not installed on Windows, skip the validation command and use Obsidian to inspect `project-control-vault/Render Queue.md` manually.

## Windows render workflow

1. Open `project-control-vault/` in Obsidian.
2. Pick a job marked `ready_for_windows`.
3. Read `render-jobs/<job-id>/CLAUDE_TASK.md`.
4. Run the render in ComfyUI or the available GPU tool.
5. Save generated files under `render-jobs/<job-id>/outputs/`.
6. Write `render-jobs/<job-id>/completion-note.md`.
7. Send the generated output and completion note back to Mac.

## Do not put these into Git or Obsidian

- API keys
- MailerLite tokens
- YouTube API keys
- Model files
- local ComfyUI caches
- generated videos unless Mac/Codex explicitly promotes them

