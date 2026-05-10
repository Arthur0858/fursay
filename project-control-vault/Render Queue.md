# Render Queue

## Queue rules

- `ready_for_windows` means the Windows GPU machine can run the job.
- Each job must have a matching folder under `render-jobs/`.
- Generated media stays in each job `outputs/` folder locally until Mac/Codex decides whether to promote it.
- Update the status after every attempt.

## Jobs

| Job ID | Status | Purpose | Job folder | Output needed |
| --- | --- | --- | --- | --- |
| `test-gpu-handoff-001` | `ready_for_windows` | Verify that Windows + Claude Desktop can read a portable render task and return a result note. | `render-jobs/test-gpu-handoff-001/` | One small test image or video plus completion note. |

