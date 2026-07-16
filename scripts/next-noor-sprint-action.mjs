import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const LOG_FILE = "content/growth/noor-sprint-log.json";
const TRAFFIC_LAUNCH_FILE = "fursay-optimized-site/traffic-launch.json";

async function readJson(path) {
  return JSON.parse(await readFile(resolve(process.cwd(), path), "utf8"));
}

function variantForDay(sprint, day) {
  const link = day.link || "";
  return (sprint.copyVariants || []).find((variant) => variant.link === link || variant.storyLink === link)
    || (sprint.copyVariants || []).find((variant) => variant.placement && link.includes(`placement=${variant.placement}`))
    || null;
}

function shellQuote(value) {
  return `"${String(value || "").replace(/(["\\$`])/g, "\\$1")}"`;
}

function recorderCommand(day, reportQuery) {
  const note = `checked ${reportQuery || "noor_growth_signals_7d"} aggregate only`;
  return [
    "npm run noor:sprint:log --",
    `--day ${day}`,
    "--status needs_retry",
    `--notes ${shellQuote(note)}`,
    `--next-action ${shellQuote("wait for aggregate signal or retry the next planned placement")}`,
    "--dry-run",
  ].join(" ");
}

function postedRecorderCommand(day, reportQuery) {
  const note = `shared ${reportQuery || "noor_growth_signals_7d"} tracked link; waiting for anonymous aggregate report`;
  return [
    "npm run noor:sprint:log --",
    `--day ${day}`,
    "--status posted",
    `--notes ${shellQuote(note)}`,
    `--next-action ${shellQuote("run npm run noor:sprint:review after the event report is available")}`,
    "--dry-run",
  ].join(" ");
}

function postedRecorderApplyCommand(day, reportQuery) {
  const note = `shared ${reportQuery || "noor_growth_signals_7d"} tracked link; waiting for anonymous aggregate report`;
  return [
    "npm run noor:sprint:log --",
    `--day ${day}`,
    "--status posted",
    `--notes ${shellQuote(note)}`,
    `--next-action ${shellQuote("run npm run noor:sprint:review after the event report is available")}`,
  ].join(" ");
}

async function main() {
  const trafficLaunch = await readJson(TRAFFIC_LAUNCH_FILE);
  const log = await readJson(LOG_FILE);
  const sprint = trafficLaunch.activationSprints?.noorFirstSubscriber || {};
  const entries = Array.isArray(log.entries) ? log.entries : [];
  const closedDays = new Set(entries
    .filter((entry) => ["completed", "skipped"].includes(entry.status))
    .map((entry) => Number(entry.day)));
  const nextDay = (sprint.dailyPlan || []).find((day) => !closedDays.has(Number(day.day)));
  if (!nextDay) {
    console.log(JSON.stringify({
      ok: true,
      status: "sprint_plan_complete",
      message: "All Nour sprint days are completed or skipped. Review subscriber signal before changing newsletter readiness.",
    }, null, 2));
    return;
  }
  const variant = variantForDay(sprint, nextDay);
  const output = {
    ok: true,
    status: log.status || "ready_to_start",
    logFile: LOG_FILE,
    next: {
      day: nextDay.day,
      label: nextDay.label,
      action: nextDay.action,
      link: nextDay.link,
      followupLink: nextDay.followupLink || "",
      reportQuery: nextDay.reportQuery,
      expectedSignal: nextDay.expectedSignal,
      copyVariant: variant ? {
        id: variant.id,
        label: variant.label,
        placement: variant.placement,
        copy: variant.copy,
        localizedCopy: variant.localizedCopy || {},
      } : null,
      primaryShareCopy: variant?.localizedCopy?.ar || variant?.copy || "",
      recorderPostedCommand: postedRecorderCommand(nextDay.day, nextDay.reportQuery),
      recorderPostedApplyCommand: postedRecorderApplyCommand(nextDay.day, nextDay.reportQuery),
      recorderDryRunCommand: recorderCommand(nextDay.day, nextDay.reportQuery),
    },
    safety: {
      piiAllowed: false,
      recordOnly: "anonymous aggregate event evidence, source_id, placement, public URL, and non-identifying notes",
      blocked: ["email", "name", "phone", "address", "subscriberId", "mailerLiteSubscriberId"],
    },
  };
  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
