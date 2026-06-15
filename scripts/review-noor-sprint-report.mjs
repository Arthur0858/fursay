import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const LOG_FILE = "content/growth/noor-sprint-log.json";
const TRAFFIC_LAUNCH_FILE = "fursay-optimized-site/traffic-launch.json";
const DEFAULT_REPORT = "/tmp/fursay-event-analytics-report/event-analytics-report.json";
const DEFAULT_WINDOW_DAYS = 7;
const SUBMIT_SUCCESS_EVENT = "fursay_subscribe_submit_success";
const NOOR_QUERY_FAMILY = "noor_growth_signals";
const BLOCKED_KEYS = [
  "email",
  "phone",
  "address",
  "subscriberid",
  "mailerlitesubscriberid",
  "subscriberemail",
];
const EMAIL_VALUE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    report: DEFAULT_REPORT,
    windowDays: DEFAULT_WINDOW_DAYS,
  };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--report") parsed.report = args[++i];
    else if (args[i] === "--window-days") parsed.windowDays = Number(args[++i]);
  }
  return parsed;
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(process.cwd(), path), "utf8"));
}

async function readJsonIfExists(path) {
  try {
    await access(resolve(process.cwd(), path));
    return await readJson(path);
  } catch {
    return null;
  }
}

function scanForPrivateValues(value, failures, path = "report") {
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

function resultRows(result) {
  const body = result?.body;
  if (!body) return [];
  if (Array.isArray(body)) return body;
  if (Array.isArray(body.data)) return body.data;
  if (Array.isArray(body.result?.data)) return body.result.data;
  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed.data)) return parsed.data;
    } catch {
      return [];
    }
  }
  return [];
}

function rowEvents(row) {
  const value = Number(row?.events ?? row?.event_count ?? row?.count ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function extractSourceId(url) {
  try {
    return new URL(url).searchParams.get("source_id") || "";
  } catch {
    return "";
  }
}

function rowsFor(report, family, windowDays) {
  return (report?.queries || [])
    .filter((query) => query.family === family && Number(query.windowDays) === Number(windowDays))
    .flatMap((query) => resultRows(query.result));
}

function nextOpenDay(log, sprint) {
  const completedStatuses = new Set(["completed", "skipped"]);
  const entriesByDay = new Map((log.entries || []).map((entry) => [Number(entry.day), entry]));
  return (sprint.dailyPlan || []).find((day) => !completedStatuses.has(entriesByDay.get(Number(day.day))?.status)) || null;
}

function countDayEvents(rows, sourceIds) {
  const ids = new Set(sourceIds.filter(Boolean));
  if (!ids.size) return 0;
  return rows
    .filter((row) => ids.has(row?.source_id))
    .reduce((total, row) => total + rowEvents(row), 0);
}

function countNoorSubmitSuccess(rows) {
  return rows
    .filter((row) => row?.event === SUBMIT_SUCCESS_EVENT && (row?.pack === "noor" || String(row?.source_id || "").startsWith("noor_")))
    .reduce((total, row) => total + rowEvents(row), 0);
}

function shellQuote(value) {
  return `"${String(value).replace(/(["\\$`])/g, "\\$1")}"`;
}

function recorderCommand(day, status, notes, nextAction, signalEvidence = "") {
  const parts = [
    "npm run noor:sprint:log --",
    `--day ${day}`,
    `--status ${status}`,
    `--notes ${shellQuote(notes)}`,
    `--next-action ${shellQuote(nextAction)}`,
  ];
  if (signalEvidence) {
    parts.push("--signal-observed");
    parts.push(`--signal-evidence ${shellQuote(signalEvidence)}`);
  }
  parts.push("--dry-run");
  return parts.join(" ");
}

function buildReview({ log, sprint, report, windowDays }) {
  const day = nextOpenDay(log, sprint);
  if (!day) {
    return {
      status: "complete",
      recommendation: "all_days_recorded",
      recordStatus: "",
      recommendedRecorderCommand: "",
    };
  }

  const sourceIds = [day.link, day.followupLink].map(extractSourceId).filter(Boolean);
  if (!report) {
    return {
      status: "pending_report",
      day: day.day,
      label: day.label,
      sourceIds,
      recommendation: "run_event_report_first",
      recordStatus: "needs_retry",
      recommendedRecorderCommand: recorderCommand(
        day.day,
        "needs_retry",
        `${NOOR_QUERY_FAMILY}_${windowDays}d report missing; no anonymous aggregate signal reviewed`,
        "run npm run report:events after Analytics Engine credentials are available",
      ),
    };
  }

  if (report.status !== "queried") {
    return {
      status: report.status || "pending_analytics_query",
      day: day.day,
      label: day.label,
      sourceIds,
      recommendation: "wait_for_analytics_enablement_or_record_manual_retry",
      recordStatus: "needs_retry",
      recommendedRecorderCommand: recorderCommand(
        day.day,
        "needs_retry",
        `${NOOR_QUERY_FAMILY}_${windowDays}d is ${report.status || "pending"}; no anonymous aggregate signal available`,
        "wait for Analytics Engine report or retry the next planned placement",
      ),
    };
  }

  const rows = rowsFor(report, NOOR_QUERY_FAMILY, windowDays);
  const dayEvents = countDayEvents(rows, sourceIds);
  const submitSuccess = countNoorSubmitSuccess(rows);
  if (submitSuccess > 0) {
    return {
      status: "subscriber_signal_observed",
      day: day.day,
      label: day.label,
      sourceIds,
      dayEvents,
      submitSuccess,
      recommendation: "record_completed_with_signal",
      recordStatus: "completed",
      recommendedRecorderCommand: recorderCommand(
        day.day,
        "completed",
        `${NOOR_QUERY_FAMILY}_${windowDays}d aggregate shows ${submitSuccess} Noor subscribe submit success signal(s)`,
        "prepare Noor newsletter readiness review without enabling checkout",
        `${NOOR_QUERY_FAMILY}_${windowDays}d aggregate submit success count ${submitSuccess}`,
      ),
    };
  }
  if (dayEvents > 0) {
    return {
      status: "placement_engaged_no_subscriber_yet",
      day: day.day,
      label: day.label,
      sourceIds,
      dayEvents,
      submitSuccess,
      recommendation: "record_completed_then_continue_next_day",
      recordStatus: "completed",
      recommendedRecorderCommand: recorderCommand(
        day.day,
        "completed",
        `${NOOR_QUERY_FAMILY}_${windowDays}d aggregate shows ${dayEvents} event(s) for planned source_id`,
        "continue with the next planned Noor sprint placement",
      ),
    };
  }
  return {
    status: "no_signal_for_placement",
    day: day.day,
    label: day.label,
    sourceIds,
    dayEvents,
    submitSuccess,
    recommendation: "record_needs_retry",
    recordStatus: "needs_retry",
    recommendedRecorderCommand: recorderCommand(
      day.day,
      "needs_retry",
      `${NOOR_QUERY_FAMILY}_${windowDays}d aggregate shows 0 events for planned source_id`,
      "retry the same placement once or move to the next planned warm placement",
    ),
  };
}

async function main() {
  const args = parseArgs();
  if (!Number.isInteger(args.windowDays) || args.windowDays < 1) throw new Error("--window-days must be a positive integer");
  const log = await readJson(LOG_FILE);
  const trafficLaunch = await readJson(TRAFFIC_LAUNCH_FILE);
  const report = await readJsonIfExists(args.report);
  const failures = [];
  if (log.piiAllowed !== false) failures.push("log_pii_allowed_not_false");
  if (report) scanForPrivateValues(report, failures);
  const sprint = trafficLaunch.activationSprints?.noorFirstSubscriber || {};
  const review = buildReview({ log, sprint, report, windowDays: args.windowDays });
  const output = {
    ok: failures.length === 0,
    piiAllowed: false,
    reportFile: args.report,
    logFile: LOG_FILE,
    windowDays: args.windowDays,
    review,
    failures,
  };
  console.log(JSON.stringify(output, null, 2));
  if (!output.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
