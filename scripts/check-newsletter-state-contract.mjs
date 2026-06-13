#!/usr/bin/env node

import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const ROOT = process.cwd();
const NEWSLETTER_DIR = join(ROOT, "content", "newsletters");
const DEFAULT_OUT = "/tmp/fursay-newsletter-state-contract";
const CHANNELS = new Set(["koko", "arabic"]);
const ARCHIVED_REQUEST_DIRS = ["content/newsletters/archive/obsolete-requests"];
const RUN_STATUSES = new Set([
  "api_preflight_passed",
  "chrome_handoff_ready",
  "chrome_publish_failed",
  "dry_run_passed",
  "failed",
  "prepared",
  "scheduled_by_chrome",
  "synced",
]);
const RUN_MODES = new Set(["api-preflight", "chrome-handoff", "chrome-result", "prepare", "send"]);
const NEWSLETTER_FIELDS = [
  "episodeNo",
  "videoId",
  "subject",
  "preview_text",
  "hero_title",
  "intro",
  "learning_words",
  "parent_activity",
  "video_cta",
  "site_cta",
  "closing",
];
const SECRET_KEY_PATTERN = /(api[_-]?key|token|secret|password)/i;
const ABSOLUTE_PATH_PATTERN = /(^|[\s"'])((\/Users\/)|([A-Za-z]:[\\/]))/;

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { outDir: DEFAULT_OUT };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--out-dir") parsed.outDir = args[++i];
  }
  return parsed;
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(relativePath, failures) {
  const fullPath = join(ROOT, relativePath);
  try {
    return JSON.parse(await readFile(fullPath, "utf8"));
  } catch (error) {
    failures.push(`${relativePath}:invalid_json:${error.message}`);
    return null;
  }
}

async function listFiles(relativeDir, suffix = "") {
  const fullDir = join(ROOT, relativeDir);
  if (!existsSync(fullDir)) return [];
  const entries = await readdir(fullDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && (!suffix || entry.name.endsWith(suffix)))
    .map((entry) => `${relativeDir}/${entry.name}`)
    .sort();
}

function flattenValues(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((item) => flattenValues(item, out));
  else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => flattenValues(item, out));
  }
  return out;
}

function checkPortableStrings(relativePath, value, failures) {
  for (const text of flattenValues(value)) {
    if (ABSOLUTE_PATH_PATTERN.test(text)) failures.push(`${relativePath}:absolute_machine_path`);
  }
}

function checkSecretLikeKeys(relativePath, value, failures, keyPath = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => checkSecretLikeKeys(relativePath, item, failures, [...keyPath, String(index)]));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const childPath = [...keyPath, key];
    if (SECRET_KEY_PATTERN.test(key) && typeof child === "string" && child.trim()) {
      failures.push(`${relativePath}:secret_like_field:${childPath.join(".")}`);
    }
    checkSecretLikeKeys(relativePath, child, failures, childPath);
  }
}

function filenameRunId(relativePath) {
  return basename(relativePath).split("-").slice(-2).join("-").replace(/\.(request|newsletter)\.json$/, "").replace(/\.json$/, "");
}

function checkNewsletter(relativePath, newsletter, failures) {
  for (const field of NEWSLETTER_FIELDS) {
    if (!(field in newsletter)) failures.push(`${relativePath}:missing_field:${field}`);
  }
  if (!Number.isInteger(newsletter.episodeNo) || newsletter.episodeNo < 0) failures.push(`${relativePath}:bad_episodeNo`);
  if (!/^[A-Za-z0-9_-]{6,}$/.test(String(newsletter.videoId || ""))) failures.push(`${relativePath}:bad_videoId`);
  if (!Array.isArray(newsletter.learning_words) || newsletter.learning_words.length !== 3) {
    failures.push(`${relativePath}:learning_words_must_be_3`);
  } else {
    newsletter.learning_words.forEach((word, index) => {
      for (const field of ["term", "pronunciation", "meaning", "example"]) {
        if (!String(word?.[field] || "").trim()) failures.push(`${relativePath}:learning_words_${index}_missing_${field}`);
      }
    });
  }
}

function checkRequest(relativePath, request, failures) {
  if (!CHANNELS.has(request.channel)) failures.push(`${relativePath}:bad_channel:${request.channel || "none"}`);
  if (!request.runId || !basename(relativePath).startsWith(`${request.runId}-`)) failures.push(`${relativePath}:runId_filename_mismatch`);
  const outputPath = String(request.requiredOutputPath || "");
  if (!outputPath.startsWith("content/newsletters/pending/")) failures.push(`${relativePath}:bad_requiredOutputPath:${outputPath || "none"}`);
  if (outputPath && !existsSync(join(ROOT, outputPath))) failures.push(`${relativePath}:required_newsletter_missing:${outputPath}`);
  const episode = request.episode || {};
  if (!Number.isInteger(episode.episodeNo) || episode.episodeNo < 0) failures.push(`${relativePath}:bad_episode_episodeNo`);
  if (!/^[A-Za-z0-9_-]{6,}$/.test(String(episode.videoId || ""))) failures.push(`${relativePath}:bad_episode_videoId`);
  if (!String(episode.videoUrl || "").startsWith("https://www.youtube.com/watch?v=")) failures.push(`${relativePath}:bad_episode_videoUrl`);
}

function checkArchivedRequest(relativePath, request, failures) {
  if (!relativePath.endsWith(".request.json")) failures.push(`${relativePath}:archive_non_request_json`);
  if (!CHANNELS.has(request.channel)) failures.push(`${relativePath}:bad_channel:${request.channel || "none"}`);
  if (!request.runId || !basename(relativePath).startsWith(`${request.runId}-`)) failures.push(`${relativePath}:runId_filename_mismatch`);
  const outputPath = String(request.requiredOutputPath || "");
  if (!outputPath.startsWith("content/newsletters/pending/")) failures.push(`${relativePath}:bad_requiredOutputPath:${outputPath || "none"}`);
  const episode = request.episode || {};
  if (!Number.isInteger(episode.episodeNo) || episode.episodeNo < 0) failures.push(`${relativePath}:bad_episode_episodeNo`);
  if (!/^[A-Za-z0-9_-]{6,}$/.test(String(episode.videoId || ""))) failures.push(`${relativePath}:bad_episode_videoId`);
  if (!String(episode.videoUrl || "").startsWith("https://www.youtube.com/watch?v=")) failures.push(`${relativePath}:bad_episode_videoUrl`);
}

function checkRun(relativePath, run, failures) {
  if (!run.runId || !basename(relativePath).includes(run.runId)) failures.push(`${relativePath}:runId_filename_mismatch`);
  if (!CHANNELS.has(run.channel)) failures.push(`${relativePath}:bad_channel:${run.channel || "none"}`);
  if (run.mode && !RUN_MODES.has(run.mode)) failures.push(`${relativePath}:bad_mode:${run.mode}`);
  if (!RUN_STATUSES.has(run.status)) failures.push(`${relativePath}:bad_status:${run.status || "none"}`);
  if (!String(run.startedAt || "").includes("T")) failures.push(`${relativePath}:missing_startedAt`);
  if (run.finishedAt && !String(run.finishedAt).includes("T")) failures.push(`${relativePath}:bad_finishedAt`);
}

async function checkHandoff(relativePath, handoff, failures) {
  if (!handoff.runId || !basename(relativePath).includes(handoff.runId)) failures.push(`${relativePath}:runId_filename_mismatch`);
  if (!CHANNELS.has(handoff.channel)) failures.push(`${relativePath}:bad_channel:${handoff.channel || "none"}`);
  if (!Number.isInteger(handoff.episodeNo) || handoff.episodeNo < 0) failures.push(`${relativePath}:bad_episodeNo`);
  if (!handoff.email?.subject || !handoff.email?.previewText || !handoff.email?.richTextBody) failures.push(`${relativePath}:missing_email_payload`);
  const mdPath = relativePath.replace(/\.json$/, ".md");
  if (!(await exists(join(ROOT, mdPath)))) failures.push(`${relativePath}:missing_markdown_pair:${mdPath}`);
}

async function main() {
  const args = parseArgs();
  const failures = [];
  const warnings = [];

  for (const dir of ["content/newsletters/pending", "content/newsletters/runs", "content/newsletters/browser-handoff"]) {
    if (!existsSync(join(ROOT, dir))) failures.push(`missing_dir:${dir}`);
  }

  const state = await readJson("content/newsletters/state.json", failures);
  if (state) {
    if (state.version !== 1) failures.push(`state_bad_version:${state.version || "none"}`);
    for (const channel of CHANNELS) {
      const data = state.channels?.[channel];
      if (!data) failures.push(`state_missing_channel:${channel}`);
      else {
        if (!Number.isInteger(data.lastSentEpisodeNo) || data.lastSentEpisodeNo < 0) failures.push(`state_${channel}_bad_lastSentEpisodeNo`);
        if (!Array.isArray(data.episodes)) failures.push(`state_${channel}_episodes_not_array`);
        else {
          const sentMax = Math.max(0, ...data.episodes.filter((episode) => episode.sentAt).map((episode) => episode.episodeNo || 0));
          if ((data.lastSentEpisodeNo || 0) < sentMax) failures.push(`state_${channel}_lastSent_before_sent_episode:${data.lastSentEpisodeNo}<${sentMax}`);
          const videoIds = new Set();
          for (const episode of data.episodes) {
            if (!Number.isInteger(episode.episodeNo) || episode.episodeNo < 0) failures.push(`state_${channel}_bad_episodeNo:${episode.videoId || "unknown"}`);
            if (!/^[A-Za-z0-9_-]{6,}$/.test(String(episode.videoId || ""))) failures.push(`state_${channel}_bad_videoId:${episode.episodeNo || "unknown"}`);
            if (videoIds.has(episode.videoId)) failures.push(`state_${channel}_duplicate_videoId:${episode.videoId}`);
            videoIds.add(episode.videoId);
          }
        }
      }
    }
  }

  const jsonFiles = [
    "content/newsletters/state.json",
    ...(await listFiles("content/newsletters/pending", ".json")),
    ...(await listFiles("content/newsletters/runs", ".json")),
    ...(await listFiles("content/newsletters/browser-handoff", ".json")),
    ...(await Promise.all(ARCHIVED_REQUEST_DIRS.map((dir) => listFiles(dir, ".json")))).flat(),
  ];
  const parsed = new Map();
  for (const relativePath of jsonFiles) {
    const json = await readJson(relativePath, failures);
    if (!json) continue;
    parsed.set(relativePath, json);
    checkPortableStrings(relativePath, json, failures);
    checkSecretLikeKeys(relativePath, json, failures);
  }

  const requestFiles = [...parsed.keys()].filter((file) => file.includes("/pending/") && file.endsWith(".request.json"));
  const newsletterFiles = [...parsed.keys()].filter((file) => file.includes("/pending/") && file.endsWith(".newsletter.json"));
  const runFiles = [...parsed.keys()].filter((file) => file.includes("/runs/"));
  const handoffFiles = [...parsed.keys()].filter((file) => file.includes("/browser-handoff/"));
  const archivedRequestFiles = [...parsed.keys()].filter((file) => ARCHIVED_REQUEST_DIRS.some((dir) => file.startsWith(`${dir}/`)));

  const requestsByOutput = new Map();
  for (const file of requestFiles) {
    const request = parsed.get(file);
    checkRequest(file, request, failures);
    if (request.requiredOutputPath) requestsByOutput.set(request.requiredOutputPath, { file, request });
  }
  for (const file of archivedRequestFiles) checkArchivedRequest(file, parsed.get(file), failures);
  for (const file of newsletterFiles) {
    const newsletter = parsed.get(file);
    checkNewsletter(file, newsletter, failures);
    const request = requestsByOutput.get(file)?.request;
    if (request) {
      if (newsletter.episodeNo !== request.episode?.episodeNo) failures.push(`${file}:episodeNo_request_mismatch`);
      if (newsletter.videoId !== request.episode?.videoId) failures.push(`${file}:videoId_request_mismatch`);
    } else {
      warnings.push(`${file}:newsletter_without_request`);
    }
  }
  for (const file of runFiles) checkRun(file, parsed.get(file), failures);
  for (const file of handoffFiles) await checkHandoff(file, parsed.get(file), failures);

  const report = {
    ok: failures.length === 0,
    outDir: args.outDir,
    failed: failures.length,
    warnings,
    failures,
    counts: {
      requests: requestFiles.length,
      newsletters: newsletterFiles.length,
      runs: runFiles.length,
      handoffs: handoffFiles.length,
      archivedRequests: archivedRequestFiles.length,
    },
  };
  await mkdir(args.outDir, { recursive: true });
  await writeFile(resolve(args.outDir, "newsletter-state-contract.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({
    ok: report.ok,
    outDir: report.outDir,
    failed: report.failed,
    warnings: warnings.length,
    ...report.counts,
  }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
