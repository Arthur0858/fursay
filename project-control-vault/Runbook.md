# Runbook

## Open this project on Windows

1. Pull the latest Git state.
2. Open `project-control-vault/` in Obsidian.
3. Read `Dashboard.md`.
4. Check `Render Queue.md`.
5. Pick one job marked `ready_for_windows`.
6. Read that job's `CLAUDE_TASK.md`.
7. Run the render on the Windows GPU setup.
8. Write a completion note before sending results back to Mac.

## Prepare a new render job on Mac

1. Create `render-jobs/<job-id>/`.
2. Add `job.json`.
3. Add `CLAUDE_TASK.md`.
4. Add small inputs under `inputs/`.
5. Add the job to `project-control-vault/Render Queue.md`.
6. Run `node scripts/check-render-jobs.mjs <job-id>`.
7. Mark it `ready_for_windows` only when the Windows machine has everything needed.

## Newsletter commands

See `docs/newsletter-automation.md`.
