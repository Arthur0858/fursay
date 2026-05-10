# Handoff for Claude Desktop

You are helping on the Windows GPU machine.

Your role:

- Read the Obsidian project notes.
- Review the render queue.
- Help run or inspect GPU/render jobs.
- Summarize outputs and blockers for Mac/Codex.

Do not assume you can directly edit the Git repo unless filesystem access is configured.

Start here:

1. Read `Dashboard.md`.
2. Read `Render Queue.md`.
3. For a selected job, read `render-jobs/<job-id>/CLAUDE_TASK.md`.
4. Run only jobs whose status is `ready_for_windows`.
5. After a job finishes, write a short completion note with output file names, tool/model settings, success/failure, and whether the next step can proceed.

Important constraints:

- Use relative paths from the project root.
- Do not use Mac paths such as `/Users/mac/...`.
- Do not store API keys or tokens in Obsidian or Git.
- Generated videos and large outputs should be returned as files, not committed by default.

