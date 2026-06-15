import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const DEFAULT_OUT = "/tmp/fursay-noor-sprint-review";
const REVIEW_SCRIPT = "scripts/review-noor-sprint-report.mjs";
const BASE_LOG_FILE = "content/growth/noor-sprint-log.json";
const REVIEW_COMMAND = "npm run noor:sprint:review";
const NOOR_SOURCE_ID = "noor_first_subscriber_sprint_parent_group";

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { outDir: DEFAULT_OUT };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--out-dir") parsed.outDir = args[++i];
  }
  return parsed;
}

function runReview(args = []) {
  const result = spawnSync("node", [REVIEW_SCRIPT, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
  });
  let json = null;
  try {
    json = JSON.parse(result.stdout);
  } catch {
    json = null;
  }
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    json,
  };
}

async function writeReport(dir, name, report) {
  const path = resolve(dir, name);
  await writeFile(path, JSON.stringify(report, null, 2) + "\n");
  return path;
}

function queriedReport(rows) {
  return {
    ok: true,
    status: "queried",
    piiAllowed: false,
    queries: [
      {
        name: "noor_growth_signals_7d",
        family: "noor_growth_signals",
        windowDays: 7,
        result: {
          ok: true,
          status: 200,
          body: {
            data: rows,
          },
        },
      },
    ],
  };
}

function validateRecorderPair(review, failures, label) {
  const dryRun = review?.recommendedRecorderCommand || "";
  const apply = review?.recommendedRecorderApplyCommand || "";
  if (!dryRun) {
    if (apply) failures.push(`${label}_apply_without_dry_run`);
    return;
  }
  if (!dryRun.includes("--dry-run")) failures.push(`${label}_dry_run_missing_flag`);
  if (!apply) failures.push(`${label}_missing_apply_command`);
  if (apply.includes("--dry-run")) failures.push(`${label}_apply_must_not_be_dry_run`);
  if (review?.recordStatus && !apply.includes(`--status ${review.recordStatus}`)) failures.push(`${label}_apply_missing_record_status`);
  if (dryRun.replace(/\s--dry-run\b/g, "") !== apply) failures.push(`${label}_apply_not_matching_dry_run`);
}

async function main() {
  const args = parseArgs();
  const tmp = await mkdtemp(resolve(tmpdir(), "fursay-noor-review-"));
  const failures = [];

  const packageJson = JSON.parse(await readFile(resolve(process.cwd(), "package.json"), "utf8"));
  const baseLog = JSON.parse(await readFile(resolve(process.cwd(), BASE_LOG_FILE), "utf8"));
  const postedLogPath = await writeReport(tmp, "posted-log.json", {
    ...baseLog,
    status: "in_progress",
    entries: [
      {
        day: 1,
        executedAt: "2026-06-15T00:00:00.000Z",
        status: "posted",
        signalObserved: false,
        signalEvidence: "",
        notes: "shared noor_growth_signals_7d tracked link; waiting for anonymous aggregate report",
        nextAction: "run npm run noor:sprint:review after the event report is available",
      },
    ],
  });
  if (packageJson.scripts?.["noor:sprint:review"] !== `node ${REVIEW_SCRIPT}`) failures.push("missing_noor_sprint_review_package_script");
  if (packageJson.scripts?.["noor:sprint:review"] && REVIEW_COMMAND !== "npm run noor:sprint:review") failures.push("bad_review_command_constant");

  const missing = runReview(["--report", resolve(tmp, "missing-report.json")]);
  if (missing.status !== 0) failures.push("missing_report_should_not_fail");
  if (missing.json?.review?.status !== "pending_report") failures.push(`missing_report_bad_status:${missing.json?.review?.status || "none"}`);
  if (!missing.json?.review?.recommendedRecorderCommand?.includes("--status needs_retry")) failures.push("missing_report_missing_retry_command");
  validateRecorderPair(missing.json?.review, failures, "missing_report");

  const postedMissing = runReview(["--log", postedLogPath, "--report", resolve(tmp, "missing-report.json")]);
  if (postedMissing.status !== 0) failures.push("posted_missing_report_should_not_fail");
  if (postedMissing.json?.review?.status !== "awaiting_report_after_post") failures.push(`posted_missing_report_bad_status:${postedMissing.json?.review?.status || "none"}`);
  if (postedMissing.json?.review?.recordStatus !== "posted") failures.push("posted_missing_report_bad_record_status");
  if (postedMissing.json?.review?.recommendedRecorderCommand) failures.push("posted_missing_report_should_not_recommend_retry_command");

  const pendingPath = await writeReport(tmp, "pending-report.json", {
    ok: true,
    status: "pending_cloudflare_credentials_or_enablement",
    piiAllowed: false,
    queries: [],
  });
  const pending = runReview(["--report", pendingPath]);
  if (pending.status !== 0) failures.push("pending_report_should_not_fail");
  if (pending.json?.review?.status !== "pending_cloudflare_credentials_or_enablement") failures.push(`pending_report_bad_status:${pending.json?.review?.status || "none"}`);
  if (pending.json?.review?.recordStatus !== "needs_retry") failures.push("pending_report_bad_record_status");
  validateRecorderPair(pending.json?.review, failures, "pending_report");

  const postedPending = runReview(["--log", postedLogPath, "--report", pendingPath]);
  if (postedPending.status !== 0) failures.push("posted_pending_report_should_not_fail");
  if (postedPending.json?.review?.status !== "awaiting_report_after_post") failures.push(`posted_pending_report_bad_status:${postedPending.json?.review?.status || "none"}`);
  if (postedPending.json?.review?.recordStatus !== "posted") failures.push("posted_pending_report_bad_record_status");
  if (postedPending.json?.review?.recommendedRecorderCommand) failures.push("posted_pending_report_should_not_recommend_retry_command");

  const signalPath = await writeReport(tmp, "signal-report.json", queriedReport([
    {
      event: "fursay_subscribe_submit_success",
      path: "/arabic",
      pack: "noor",
      source_id: NOOR_SOURCE_ID,
      placement: "parent_group",
      events: 1,
    },
  ]));
  const signal = runReview(["--report", signalPath]);
  if (signal.status !== 0) failures.push("signal_report_should_not_fail");
  if (signal.json?.review?.status !== "subscriber_signal_observed") failures.push(`signal_report_bad_status:${signal.json?.review?.status || "none"}`);
  if (signal.json?.review?.recordStatus !== "completed") failures.push("signal_report_bad_record_status");
  if (!signal.json?.review?.recommendedRecorderCommand?.includes("--signal-observed")) failures.push("signal_report_missing_signal_flag");
  if (!signal.json?.review?.recommendedRecorderCommand?.includes("submit success count 1")) failures.push("signal_report_missing_aggregate_evidence");
  if (!signal.json?.review?.recommendedRecorderApplyCommand?.includes("--signal-observed")) failures.push("signal_report_apply_missing_signal_flag");
  validateRecorderPair(signal.json?.review, failures, "signal_report");

  const engagedPath = await writeReport(tmp, "engaged-report.json", queriedReport([
    {
      event: "fursay_subscribe_open_click",
      path: "/arabic",
      pack: "noor",
      source_id: NOOR_SOURCE_ID,
      placement: "parent_group",
      events: 2,
    },
  ]));
  const engaged = runReview(["--report", engagedPath]);
  if (engaged.status !== 0) failures.push("engaged_report_should_not_fail");
  if (engaged.json?.review?.status !== "placement_engaged_no_subscriber_yet") failures.push(`engaged_report_bad_status:${engaged.json?.review?.status || "none"}`);
  if (engaged.json?.review?.recordStatus !== "completed") failures.push("engaged_report_bad_record_status");
  validateRecorderPair(engaged.json?.review, failures, "engaged_report");

  const zeroPath = await writeReport(tmp, "zero-report.json", queriedReport([]));
  const zero = runReview(["--report", zeroPath]);
  if (zero.status !== 0) failures.push("zero_report_should_not_fail");
  if (zero.json?.review?.status !== "no_signal_for_placement") failures.push(`zero_report_bad_status:${zero.json?.review?.status || "none"}`);
  if (zero.json?.review?.recordStatus !== "needs_retry") failures.push("zero_report_bad_record_status");
  validateRecorderPair(zero.json?.review, failures, "zero_report");

  const piiPath = await writeReport(tmp, "pii-report.json", {
    ok: true,
    status: "queried",
    piiAllowed: false,
    subscriberEmail: "parent@example.com",
    queries: [],
  });
  const pii = runReview(["--report", piiPath]);
  if (pii.status === 0) failures.push("pii_report_should_fail");
  if (!pii.json?.failures?.some((failure) => failure.includes("blocked_private_key") || failure.includes("email_like_value"))) failures.push("pii_report_missing_privacy_failure");

  await mkdir(args.outDir, { recursive: true });
  const report = {
    ok: failures.length === 0,
    outDir: args.outDir,
    tmp,
    failed: failures.length,
    failures,
    checks: [
      "missing_report_pending_review",
      "posted_missing_report_waits",
      "pending_report_retry_review",
      "posted_pending_report_waits",
      "subscriber_signal_review",
      "engaged_without_subscriber_review",
      "zero_signal_review",
      "review_apply_command_pair",
      "pii_report_rejected",
    ],
  };
  await writeFile(resolve(args.outDir, "noor-sprint-review.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({
    ok: report.ok,
    outDir: args.outDir,
    failed: failures.length,
    checks: report.checks.length,
  }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
