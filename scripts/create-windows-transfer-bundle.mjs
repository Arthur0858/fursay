#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const exec = promisify(execFile);
const root = process.cwd();
const transferDir = path.join(root, "transfer");

function stamp() {
  const now = new Date();
  return now.toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z");
}

async function git(args) {
  return exec("git", args, { cwd: root });
}

await mkdir(transferDir, { recursive: true });

const { stdout: status } = await git(["status", "--short"]);
if (status.trim()) {
  console.error("Working tree has uncommitted tracked changes. Commit them before creating a transfer bundle.");
  console.error(status);
  process.exit(1);
}

const { stdout: commit } = await git(["rev-parse", "--short", "HEAD"]);
const fileBase = `fursay-windows-handoff-${stamp()}-${commit.trim()}`;
const bundlePath = path.join(transferDir, `${fileBase}.bundle`);
const notePath = path.join(transferDir, `${fileBase}-README.md`);

await git(["bundle", "create", bundlePath, "--all"]);

const note = `# Fursay Windows Handoff Bundle

- Commit: ${commit.trim()}
- Created: ${new Date().toISOString()}
- Bundle file: ${path.basename(bundlePath)}

## Restore on Windows

\`\`\`powershell
git clone ${path.basename(bundlePath)} fursay
cd fursay
node scripts/check-render-jobs.mjs
\`\`\`

Open \`project-control-vault/\` in Obsidian, then read:

1. \`Dashboard.md\`
2. \`Handoff for Claude.md\`
3. \`Render Queue.md\`

Generated render outputs should stay out of Git unless Mac/Codex explicitly promotes them.
`;

await writeFile(notePath, note, "utf8");

console.log(`Created ${path.relative(root, bundlePath)}`);
console.log(`Created ${path.relative(root, notePath)}`);

