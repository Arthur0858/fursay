# Cross-Device Handoff

This project uses a split workflow:

- Mac + Codex is the control plane for planning, site edits, newsletter automation, Git commits, and project documentation.
- Windows + Claude Desktop is the GPU/render workstation for ComfyUI, image/video generation, and reviewing the render queue.
- Git syncs source-controlled project files.
- Obsidian syncs project state, decisions, and render queue notes.
- Render job folders carry only the inputs and instructions needed by the Windows GPU machine.

## Source of truth

- `docs/site-architecture.md`: site structure and edit rules.
- `docs/newsletter-automation.md`: newsletter automation workflow.
- `docs/render-job-protocol.md`: portable render job format.
- `project-control-vault/Dashboard.md`: current status and next actions.
- `project-control-vault/Render Queue.md`: GPU task queue for Windows.
- `project-control-vault/Handoff for Claude.md`: paste-ready guidance for Claude Desktop.

## What to sync through Git

- Source files, docs, scripts, configuration templates, and static site files.
- Newsletter state that is needed to continue work, including `content/newsletters/state.json`.
- Pending newsletter request/copy JSON files when they represent active work.
- Render job inputs and config files under `render-jobs/<job-id>/`.

## What not to sync through Git

- `.env` or any real API keys.
- `output/`, large QA screenshots, generated archives, rendered videos, and model caches.
- Obsidian app metadata under `.obsidian/`.
- Machine-specific paths from either macOS or Windows.

## Mac handoff checklist

1. Update `project-control-vault/Dashboard.md` with the current status.
2. Update `project-control-vault/Render Queue.md` if a GPU job is ready.
3. Create or update a render job folder under `render-jobs/`.
4. Commit source-controlled handoff files to Git.
5. Transfer large input assets separately only if they are too large for Git.

## Windows handoff checklist

1. Pull the latest Git state.
2. Open `project-control-vault/` as an Obsidian vault.
3. Read `Dashboard.md`, then `Handoff for Claude.md`, then `Render Queue.md`.
4. Run only jobs marked `ready_for_windows`.
5. Save generated files into the job `outputs/` folder locally.
6. Write the result summary into the job completion note and Obsidian queue before returning the output to Mac.

