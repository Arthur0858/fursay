#!/usr/bin/env node

import { access, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const jobsRoot = path.join(root, "render-jobs");
const DEFAULT_OUT = "/tmp/fursay-render-jobs";
const secretPatterns = [
  /api[_-]?key/i,
  /token/i,
  /secret/i,
  /password/i,
  /bearer\s+[a-z0-9._-]+/i
];

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { outDir: DEFAULT_OUT, jobIds: [] };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--out-dir") {
      parsed.outDir = args[++i];
    } else {
      parsed.jobIds.push(args[i]);
    }
  }
  return parsed;
}

function isAbsoluteLike(value) {
  return path.isAbsolute(value) || /^[a-zA-Z]:[\\/]/.test(value);
}

function flattenStrings(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((item) => flattenStrings(item, out));
  else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => flattenStrings(item, out));
  }
  return out;
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listJobIds() {
  try {
    const entries = await readdir(jobsRoot, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  } catch {
    return [];
  }
}

async function checkTextFile(filePath, problems) {
  if (!(await exists(filePath))) {
    problems.push(`Missing ${path.relative(root, filePath)}`);
    return;
  }

  const text = await readFile(filePath, "utf8");
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (/\/Users\/|[a-zA-Z]:\\/.test(line)) {
      problems.push(`${path.relative(root, filePath)}:${index + 1} contains an absolute machine path`);
    }
    if (secretPatterns.some((pattern) => pattern.test(line)) && /=\s*\S+/.test(line)) {
      problems.push(`${path.relative(root, filePath)}:${index + 1} may contain a secret value`);
    }
  });
}

async function checkJob(jobId) {
  const jobDir = path.join(jobsRoot, jobId);
  const problems = [];
  const jobPath = path.join(jobDir, "job.json");

  if (!(await exists(jobPath))) {
    return { jobId, problems: ["Missing job.json"] };
  }

  let job;
  try {
    job = JSON.parse(await readFile(jobPath, "utf8"));
  } catch (error) {
    return { jobId, problems: [`job.json is not valid JSON: ${error.message}`] };
  }

  if (job.job_id !== jobId) {
    problems.push(`job.json job_id should be "${jobId}"`);
  }

  if (!["draft", "ready_for_windows", "running_on_windows", "completed", "blocked"].includes(job.status)) {
    problems.push("job.json status is not one of the allowed states");
  }

  for (const value of flattenStrings(job)) {
    if (isAbsoluteLike(value) || value.includes("/Users/")) {
      problems.push(`job.json contains machine-specific path: ${value}`);
    }
  }

  for (const inputPath of job.input_paths || []) {
    if (typeof inputPath !== "string") {
      problems.push("job.json input_paths must contain strings");
      continue;
    }
    if (isAbsoluteLike(inputPath)) {
      problems.push(`input path must be relative: ${inputPath}`);
      continue;
    }
    if (!(await exists(path.join(root, inputPath)))) {
      problems.push(`input path does not exist: ${inputPath}`);
    }
  }

  await checkTextFile(path.join(jobDir, "CLAUDE_TASK.md"), problems);

  const outputsDir = path.join(jobDir, "outputs");
  if (!(await exists(outputsDir)) || !(await stat(outputsDir)).isDirectory()) {
    problems.push("Missing outputs/ directory");
  }

  return { jobId, problems };
}

const args = parseArgs();
const selectedJobIds = args.jobIds;
const jobIds = selectedJobIds.length ? selectedJobIds : await listJobIds();

if (!jobIds.length) {
  await mkdir(args.outDir, { recursive: true });
  await writeFile(path.join(args.outDir, "render-jobs.json"), JSON.stringify({
    ok: true,
    failed: 0,
    jobs: 0,
    results: [],
  }, null, 2) + "\n");
  console.log("No render jobs found.");
  process.exit(0);
}

const results = [];
for (const jobId of jobIds) {
  results.push(await checkJob(jobId));
}

let failed = false;
for (const result of results) {
  if (result.problems.length) {
    failed = true;
    console.log(`FAIL ${result.jobId}`);
    result.problems.forEach((problem) => console.log(`- ${problem}`));
  } else {
    console.log(`OK ${result.jobId}`);
  }
}

await mkdir(args.outDir, { recursive: true });
await writeFile(path.join(args.outDir, "render-jobs.json"), JSON.stringify({
  ok: !failed,
  failed: results.filter((result) => result.problems.length).length,
  jobs: results.length,
  results,
}, null, 2) + "\n");

process.exit(failed ? 1 : 0);
