import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SITE_DIR = resolve(process.cwd(), "fursay-optimized-site");
const LOG_FILE = "content/growth/noor-sprint-log.json";
const RECORDER_SCRIPT = "scripts/record-noor-sprint-log.mjs";
const RECORDER_COMMAND = "npm run noor:sprint:log -- --day 1 --status needs_retry --notes \"anonymous aggregate note\" --dry-run";
const DEFAULT_OUT = "/tmp/fursay-noor-sprint-log";
const ALLOWED_STATUSES = new Set(["ready_to_start", "in_progress", "signal_observed", "safe_wait_subscriber_empty"]);
const ALLOWED_ENTRY_STATUSES = new Set(["not_started", "completed", "skipped", "needs_retry"]);
const BLOCKED_KEYS = [
  "email",
  "name",
  "phone",
  "address",
  "subscriberid",
  "mailerlitesubscriberid",
  "subscriberemail",
];
const EMAIL_VALUE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { outDir: DEFAULT_OUT, baseUrl: "" };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--out-dir") parsed.outDir = args[++i];
    if (args[i] === "--base-url") parsed.baseUrl = args[++i].replace(/\/$/, "");
  }
  return parsed;
}

async function readJson(baseUrl, pathname) {
  if (baseUrl) {
    const response = await fetch(`${baseUrl}${pathname}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${pathname} status ${response.status}`);
    return response.json();
  }
  return JSON.parse(await readFile(resolve(SITE_DIR, pathname.replace(/^\//, "")), "utf8"));
}

async function readLocalLog() {
  return JSON.parse(await readFile(resolve(process.cwd(), LOG_FILE), "utf8"));
}

async function localFileExists(path) {
  try {
    await access(resolve(process.cwd(), path));
    return true;
  } catch {
    return false;
  }
}

function scanForPrivateValues(value, failures, path = "log") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanForPrivateValues(item, failures, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (BLOCKED_KEYS.includes(normalizedKey)) failures.push(`blocked_private_key:${path}.${key}`);
      scanForPrivateValues(child, failures, `${path}.${key}`);
    }
    return;
  }
  if (typeof value === "string" && EMAIL_VALUE.test(value)) failures.push(`email_like_value:${path}`);
}

function validateLog(log, failures) {
  if (log.site !== "Fursay") failures.push(`log_bad_site:${log.site || "none"}`);
  if (log.pack !== "noor") failures.push(`log_bad_pack:${log.pack || "none"}`);
  if (log.piiAllowed !== false) failures.push("log_pii_allowed_not_false");
  if (!ALLOWED_STATUSES.has(log.status)) failures.push(`log_bad_status:${log.status || "none"}`);
  if (!Array.isArray(log.entries)) failures.push("log_entries_not_array");
  if (!Array.isArray(log.logFields) || !log.logFields.includes("signalEvidence")) failures.push("log_missing_signal_evidence_field");
  const blockedFields = new Set(log.privacy?.blockedFields || []);
  for (const key of ["email", "name", "phone", "address", "subscriberId", "mailerLiteSubscriberId"]) {
    if (!blockedFields.has(key)) failures.push(`log_missing_blocked_field:${key}`);
  }
  scanForPrivateValues(log, failures);

  const seenDays = new Set();
  for (const entry of log.entries || []) {
    const day = Number(entry.day);
    if (!Number.isInteger(day) || day < 1 || day > 7) failures.push(`entry_bad_day:${entry.day || "none"}`);
    if (seenDays.has(day)) failures.push(`entry_duplicate_day:${day}`);
    seenDays.add(day);
    if (!ALLOWED_ENTRY_STATUSES.has(entry.status)) failures.push(`entry_bad_status:${day}:${entry.status || "none"}`);
    if (entry.signalObserved === true && !String(entry.signalEvidence || "").trim()) failures.push(`entry_missing_signal_evidence:${day}`);
  }
}

function validateStatus(status, log, failures) {
  if (status.logSource !== LOG_FILE) failures.push(`status_bad_log_source:${status.logSource || "none"}`);
  if (status.recorderCommand !== RECORDER_COMMAND) failures.push(`status_bad_recorder_command:${status.recorderCommand || "none"}`);
  if (status.piiAllowed !== false) failures.push("status_pii_allowed_not_false");
  if (status.privacy?.piiAllowed !== false) failures.push("status_privacy_pii_allowed_not_false");
  if (status.privacy?.boundaryConfirmed !== true) failures.push("status_privacy_boundary_not_confirmed");
  if (log) {
    if (status.logStatus !== log.status) failures.push(`status_log_status_mismatch:${status.logStatus || "none"}!=${log.status || "none"}`);
    if (status.logEntryCount !== (log.entries || []).length) failures.push(`status_log_entry_count_mismatch:${status.logEntryCount || 0}`);
  }
  if ((status.days || []).length !== 7) failures.push(`status_day_count:${(status.days || []).length}`);
  if (status.summary?.totalDays !== 7) failures.push(`status_total_days:${status.summary?.totalDays || "none"}`);
  const completed = (status.days || []).filter((day) => day.status === "completed").length;
  const skipped = (status.days || []).filter((day) => day.status === "skipped").length;
  const signalObserved = (status.days || []).some((day) => day.signalObserved === true);
  if (status.summary?.completedDays !== completed) failures.push("status_completed_days_mismatch");
  if (status.summary?.skippedDays !== skipped) failures.push("status_skipped_days_mismatch");
  if (status.summary?.subscriberSignalObserved !== signalObserved) failures.push("status_signal_observed_mismatch");
}

async function main() {
  const args = parseArgs();
  const failures = [];
  const log = args.baseUrl ? null : await readLocalLog();
  const status = await readJson(args.baseUrl, "/noor-sprint-status.json");
  if (!args.baseUrl) validateLog(log, failures);
  if (!args.baseUrl) {
    const packageJson = JSON.parse(await readFile(resolve(process.cwd(), "package.json"), "utf8"));
    if (!(await localFileExists(RECORDER_SCRIPT))) failures.push("missing_noor_sprint_recorder_script");
    if (packageJson.scripts?.["noor:sprint:log"] !== `node ${RECORDER_SCRIPT}`) failures.push("missing_noor_sprint_log_package_script");
  }
  validateStatus(status, log, failures);
  const html = args.baseUrl
    ? await (await fetch(`${args.baseUrl}/noor-sprint-status`, { cache: "no-store" })).text()
    : await readFile(resolve(SITE_DIR, "noor-sprint-status.html"), "utf8");
  if (!html.includes("data-noor-sprint-privacy")) failures.push("page_missing_privacy_boundary");
  if (!html.includes("Logging boundary")) failures.push("page_missing_logging_boundary_heading");
  if (!html.includes(LOG_FILE)) failures.push("page_missing_log_source");
  if (!html.includes(RECORDER_COMMAND.replace(/"/g, "&quot;")) && !html.includes(RECORDER_COMMAND)) failures.push("page_missing_recorder_command");

  await mkdir(args.outDir, { recursive: true });
  const report = {
    ok: failures.length === 0,
    mode: args.baseUrl ? "live" : "local",
    failures,
    log: {
      source: LOG_FILE,
      status: status.logStatus || "",
      entries: status.logEntryCount || 0,
      completedDays: status.summary?.completedDays || 0,
      skippedDays: status.summary?.skippedDays || 0,
      subscriberSignalObserved: status.summary?.subscriberSignalObserved === true,
    },
  };
  await writeFile(resolve(args.outDir, "noor-sprint-log.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({
    ok: report.ok,
    mode: report.mode,
    outDir: args.outDir,
    failed: failures.length,
    entries: report.log.entries,
    completedDays: report.log.completedDays,
    subscriberSignalObserved: report.log.subscriberSignalObserved,
  }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
