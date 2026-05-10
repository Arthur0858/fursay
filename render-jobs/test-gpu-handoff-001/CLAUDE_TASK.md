# Claude Desktop Task: test-gpu-handoff-001

You are on the Windows GPU machine.

Goal:

- Confirm that this portable render job can be understood and completed without Mac-specific paths or Codex memory.

Steps:

1. Read `job.json`.
2. Read `inputs/prompt.md`.
3. Use any available Windows GPU render tool, preferably ComfyUI if configured.
4. Produce one small image or short video.
5. Save the output locally under `outputs/`.
6. Create `completion-note.md` using the format from `docs/render-job-protocol.md`.

Success criteria:

- At least one output file exists.
- The completion note states the tool/model used.
- The completion note says whether Mac/Codex can proceed.

Do not:

- Add API keys or tokens to any file.
- Use absolute Mac or Windows paths in the note.
- Commit generated video or large output files unless Mac/Codex explicitly promotes them.

