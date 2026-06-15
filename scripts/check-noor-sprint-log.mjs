import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const SITE_DIR = resolve(process.cwd(), "fursay-optimized-site");
const LOG_FILE = "content/growth/noor-sprint-log.json";
const NEXT_ACTION_SCRIPT = "scripts/next-noor-sprint-action.mjs";
const REVIEW_SCRIPT = "scripts/review-noor-sprint-report.mjs";
const RECORDER_SCRIPT = "scripts/record-noor-sprint-log.mjs";
const NEXT_ACTION_COMMAND = "npm run noor:sprint:next";
const REVIEW_COMMAND = "npm run noor:sprint:review";
const RECORDER_COMMAND = "npm run noor:sprint:log -- --day 1 --status needs_retry --notes \"anonymous aggregate note\" --dry-run";
const DEFAULT_OUT = "/tmp/fursay-noor-sprint-log";
const ALLOWED_STATUSES = new Set(["ready_to_start", "in_progress", "signal_observed", "safe_wait_subscriber_empty"]);
const ALLOWED_ENTRY_STATUSES = new Set(["not_started", "posted", "completed", "skipped", "needs_retry"]);
const REQUIRED_OPERATOR_STEPS = [
  "copy_confirm",
  "open_link_check",
  "record_posted",
  "review_report",
];
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
  if (status.nextActionCommand !== NEXT_ACTION_COMMAND) failures.push(`status_bad_next_action_command:${status.nextActionCommand || "none"}`);
  if (status.reviewCommand !== REVIEW_COMMAND) failures.push(`status_bad_review_command:${status.reviewCommand || "none"}`);
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
  if (!status.nextActionHandoff || typeof status.nextActionHandoff !== "object") failures.push("status_missing_next_action_handoff");
  if (status.nextActionHandoff) {
    const handoff = status.nextActionHandoff;
    if (Number(handoff.day) !== Number(status.summary?.nextDay || 1)) failures.push("handoff_day_mismatch");
    if (!String(handoff.action || "").trim()) failures.push("handoff_missing_action");
    if (!String(handoff.primaryLink || "").startsWith("https://fursay.com/")) failures.push(`handoff_bad_primary_link:${handoff.primaryLink || "none"}`);
    if (!String(handoff.reportQuery || "").trim()) failures.push("handoff_missing_report_query");
    if (!String(handoff.expectedSignal || "").trim()) failures.push("handoff_missing_expected_signal");
    if (!String(handoff.reviewCommand || "").includes(REVIEW_COMMAND)) failures.push("handoff_missing_review_command");
    if (!String(handoff.recorderPostedCommand || "").includes("--status posted")) failures.push("handoff_missing_posted_recorder");
    if (!String(handoff.recorderPostedCommand || "").includes("--dry-run")) failures.push("handoff_posted_recorder_must_be_dry_run");
    if (!String(handoff.recorderDryRunCommand || "").includes("--dry-run")) failures.push("handoff_missing_dry_run_recorder");
    if (!String(handoff.privacyBoundary || "").includes("anonymous aggregate evidence")) failures.push("handoff_missing_privacy_boundary");
    if (Number(handoff.day) === 1 && !String(handoff.copy || "").includes("Free Noor 3-minute story pack")) failures.push("handoff_missing_day_one_copy");
    if (Number(handoff.day) === 1 && !String(handoff.localizedCopy?.ar || "").includes("قصة نور الصينية في 3 دقائق")) failures.push("handoff_missing_day_one_arabic_copy");
  }
  if (!Array.isArray(status.operatorChecklist)) failures.push("status_missing_operator_checklist");
  const operatorStepIds = new Set((status.operatorChecklist || []).map((item) => item.id));
  for (const id of REQUIRED_OPERATOR_STEPS) {
    if (!operatorStepIds.has(id)) failures.push(`status_missing_operator_step:${id}`);
  }
  for (const item of status.operatorChecklist || []) {
    if (!String(item.label || "").trim()) failures.push(`operator_step_missing_label:${item.id || "none"}`);
    if (!String(item.action || "").trim()) failures.push(`operator_step_missing_action:${item.id || "none"}`);
    if (!String(item.evidence || "").trim()) failures.push(`operator_step_missing_evidence:${item.id || "none"}`);
    if (item.id === "record_posted" && !String(item.action || "").includes("--status posted")) failures.push("operator_step_record_posted_missing_command");
    if (item.id === "review_report" && !String(item.action || "").includes(REVIEW_COMMAND)) failures.push("operator_step_review_report_missing_command");
    if (item.id === "review_report" && !String(item.evidence || "").includes("aggregate")) failures.push("operator_step_review_report_missing_aggregate_boundary");
    if (item.id === "copy_confirm" && !String(item.action || "").includes("without adding price")) failures.push("operator_step_copy_confirm_missing_no_price_boundary");
    if (item.id === "open_link_check" && !String(item.evidence || "").includes("source_id")) failures.push("operator_step_open_link_missing_source_id_evidence");
  }
}

function htmlIncludesMetric(html, label, value) {
  const pattern = new RegExp(
    `<dt>\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*</dt>\\s*<dd>\\s*${String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*</dd>`,
    "i",
  );
  return pattern.test(html);
}

async function main() {
  const args = parseArgs();
  const failures = [];
  const log = args.baseUrl ? null : await readLocalLog();
  const status = await readJson(args.baseUrl, "/noor-sprint-status.json");
  const action = await readJson(args.baseUrl, "/noor-sprint-action.json");
  if (!args.baseUrl) validateLog(log, failures);
  if (!args.baseUrl) {
    const packageJson = JSON.parse(await readFile(resolve(process.cwd(), "package.json"), "utf8"));
    if (!(await localFileExists(NEXT_ACTION_SCRIPT))) failures.push("missing_noor_sprint_next_action_script");
    if (!(await localFileExists(REVIEW_SCRIPT))) failures.push("missing_noor_sprint_review_script");
    if (!(await localFileExists(RECORDER_SCRIPT))) failures.push("missing_noor_sprint_recorder_script");
    if (packageJson.scripts?.["noor:sprint:next"] !== `node ${NEXT_ACTION_SCRIPT}`) failures.push("missing_noor_sprint_next_package_script");
    if (packageJson.scripts?.["noor:sprint:review"] !== `node ${REVIEW_SCRIPT}`) failures.push("missing_noor_sprint_review_package_script");
    if (packageJson.scripts?.["noor:sprint:log"] !== `node ${RECORDER_SCRIPT}`) failures.push("missing_noor_sprint_log_package_script");
    const postedDryRun = spawnSync("node", [
      RECORDER_SCRIPT,
      "--day", "1",
      "--status", "posted",
      "--notes", "shared noor_growth_signals_7d tracked link; waiting for anonymous aggregate report",
      "--next-action", "run npm run noor:sprint:review after the event report is available",
      "--dry-run",
    ], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "pipe",
    });
    if (postedDryRun.status !== 0) failures.push(`posted_dry_run_failed:${postedDryRun.stderr || postedDryRun.stdout}`);
  }
  validateStatus(status, log, failures);
  if (action.statusManifest !== status.manifest) failures.push("action_status_manifest_mismatch");
  if (action.statusPage !== status.page) failures.push("action_status_page_mismatch");
  if (action.logSource !== LOG_FILE) failures.push(`action_bad_log_source:${action.logSource || "none"}`);
  if (action.piiAllowed !== false) failures.push("action_pii_allowed_not_false");
  if (action.checkoutEnabled !== false) failures.push("action_checkout_enabled_not_false");
  if (action.paymentLinksAllowed !== false) failures.push("action_payment_links_allowed_not_false");
  if (action.sprint?.pack !== "noor") failures.push(`action_bad_pack:${action.sprint?.pack || "none"}`);
  if (action.sprint?.readinessStatus !== status.readinessStatus) failures.push("action_readiness_mismatch");
  if (action.sprint?.analyticsStatus !== status.analyticsStatus) failures.push("action_analytics_mismatch");
  if (Number(action.nextAction?.day) !== Number(status.nextActionHandoff?.day)) failures.push("action_day_mismatch");
  if (action.nextAction?.primaryLink !== status.nextActionHandoff?.primaryLink) failures.push("action_primary_link_mismatch");
  if (action.nextAction?.reportQuery !== status.nextActionHandoff?.reportQuery) failures.push("action_report_query_mismatch");
  if (!String(action.nextAction?.recorderPostedCommand || "").includes("--status posted")) failures.push("action_missing_posted_recorder");
  if (!String(action.nextAction?.recorderPostedCommand || "").includes("--dry-run")) failures.push("action_posted_recorder_must_be_dry_run");
  if (!String(action.privacy?.boundary || "").includes("anonymous aggregate evidence")) failures.push("action_missing_privacy_boundary");
  scanForPrivateValues(action, failures, "action");
  const html = args.baseUrl
    ? await (await fetch(`${args.baseUrl}/noor-sprint-status`, { cache: "no-store" })).text()
    : await readFile(resolve(SITE_DIR, "noor-sprint-status.html"), "utf8");
  if (!html.includes("data-noor-sprint-privacy")) failures.push("page_missing_privacy_boundary");
  if (!html.includes("Logging boundary")) failures.push("page_missing_logging_boundary_heading");
  if (!html.includes(LOG_FILE)) failures.push("page_missing_log_source");
  if (!html.includes("data-noor-sprint-next-action")) failures.push("page_missing_next_action_handoff");
  if (!html.includes("Day 1 handoff") && !html.includes("handoff")) failures.push("page_missing_handoff_heading");
  if (!html.includes(NEXT_ACTION_COMMAND)) failures.push("page_missing_next_action_command");
  if (!html.includes(REVIEW_COMMAND)) failures.push("page_missing_review_command");
  if (!html.includes("--status posted")) failures.push("page_missing_posted_recorder_command");
  if (!html.includes(RECORDER_COMMAND.replace(/"/g, "&quot;")) && !html.includes(RECORDER_COMMAND)) failures.push("page_missing_recorder_command");
  if (!html.includes("data-noor-sprint-arabic-handoff")) failures.push("page_missing_arabic_handoff");
  if (!html.includes("قصة نور الصينية في 3 دقائق")) failures.push("page_missing_arabic_parent_copy");
  if (!html.includes("Copy Arabic copy")) failures.push("page_missing_arabic_copy_button");
  if (!html.includes("data-noor-sprint-operator-checklist")) failures.push("page_missing_operator_checklist");
  for (const id of REQUIRED_OPERATOR_STEPS) {
    if (!html.includes(`data-noor-sprint-operator-step="${id}"`)) failures.push(`page_missing_operator_step:${id}`);
  }
  if (!html.includes("without adding price")) failures.push("page_operator_checklist_missing_no_price_boundary");
  if (!html.includes("aggregate counts")) failures.push("page_operator_checklist_missing_aggregate_counts_boundary");
  if (!htmlIncludesMetric(html, "Log entries", status.logEntryCount)) failures.push("page_log_entry_count_not_rendered");
  if (!htmlIncludesMetric(html, "Completed days", status.summary?.completedDays)) failures.push("page_completed_days_not_rendered");

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
