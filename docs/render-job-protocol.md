# Render Job Protocol

Render jobs are portable work packets for the Windows GPU machine.

Each job lives at:

```text
render-jobs/<job-id>/
```

Required files:

- `job.json`: structured job metadata and expected output.
- `CLAUDE_TASK.md`: paste-ready task brief for Claude Desktop.
- `inputs/`: prompt files, references, and small assets needed to run the job.
- `outputs/`: local output folder. Keep generated media out of Git unless intentionally promoted.

Optional files:

- `completion-note.md`: written after Windows finishes or fails the job.
- `checksums.txt`: checksums for important inputs when assets are transferred outside Git.

## Job states

- `draft`: not ready for Windows.
- `ready_for_windows`: Windows can run it.
- `running_on_windows`: Windows is actively rendering.
- `completed`: output was produced and reviewed.
- `blocked`: Windows could not complete the job.

## Rules

- Use relative paths only.
- Do not include macOS paths like `/Users/...`.
- Do not include Windows paths like `C:\...`.
- Do not include API keys or login tokens.
- Put exact model, workflow, seed, size, duration, and output expectations in `job.json` when known.
- If a setting is unknown, write `null` and explain it in `CLAUDE_TASK.md`.

## Validation

Before handing a job to Windows, run:

```bash
node scripts/check-render-jobs.mjs
```

To check one job:

```bash
node scripts/check-render-jobs.mjs test-gpu-handoff-001
```

## Completion note format

```markdown
# Completion Note: <job-id>

- Status:
- Output files:
- Tool/model used:
- Key settings:
- Problems:
- Can proceed to next step: yes/no
- Notes for Mac/Codex:
```
