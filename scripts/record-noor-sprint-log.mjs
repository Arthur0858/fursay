import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const LOG_FILE = "content/growth/noor-sprint-log.json";
const TRAFFIC_LAUNCH_FILE = "fursay-optimized-site/traffic-launch.json";
const ALLOWED_ENTRY_STATUSES = new Set(["posted", "completed", "skipped", "needs_retry"]);
const EMAIL_VALUE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PRIVATE_WORDS = /\b(email|e-mail|phone|address|subscriber id|subscriberid|mailerlite|name)\b/i;

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    day: 0,
    status: "",
    executedAt: new Date().toISOString(),
    signalObserved: false,
    signalEvidence: "",
    notes: "",
    nextAction: "",
    dryRun: false,
  };
  for (let i = 0; i < args.length; i += 1) {
    const key = args[i];
    if (key === "--day") parsed.day = Number(args[++i]);
    else if (key === "--status") parsed.status = args[++i];
    else if (key === "--executed-at") parsed.executedAt = args[++i];
    else if (key === "--signal-observed") parsed.signalObserved = true;
    else if (key === "--signal-evidence") parsed.signalEvidence = args[++i];
    else if (key === "--notes") parsed.notes = args[++i];
    else if (key === "--next-action") parsed.nextAction = args[++i];
    else if (key === "--dry-run") parsed.dryRun = true;
  }
  return parsed;
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(process.cwd(), path), "utf8"));
}

function fail(message) {
  throw new Error(message);
}

function assertSafeText(label, value) {
  const text = String(value || "");
  if (EMAIL_VALUE.test(text)) fail(`${label} must not contain an email-like value`);
  if (PRIVATE_WORDS.test(text)) fail(`${label} must not contain private identifiers; record only anonymous event/query evidence`);
}

function deriveLogStatus(entries) {
  if (entries.some((entry) => entry.signalObserved === true)) return "signal_observed";
  if (entries.length > 0) return "in_progress";
  return "ready_to_start";
}

async function main() {
  const args = parseArgs();
  if (!Number.isInteger(args.day) || args.day < 1 || args.day > 7) fail("--day must be an integer from 1 to 7");
  if (!ALLOWED_ENTRY_STATUSES.has(args.status)) fail(`--status must be one of: ${[...ALLOWED_ENTRY_STATUSES].join(", ")}`);
  if (args.signalObserved && !args.signalEvidence.trim()) fail("--signal-evidence is required when --signal-observed is set");
  assertSafeText("signalEvidence", args.signalEvidence);
  assertSafeText("notes", args.notes);
  assertSafeText("nextAction", args.nextAction);

  const trafficLaunch = await readJson(TRAFFIC_LAUNCH_FILE);
  const dayPlan = trafficLaunch.activationSprints?.noorFirstSubscriber?.dailyPlan?.find((day) => Number(day.day) === args.day);
  if (!dayPlan) fail(`No Nour sprint daily plan found for day ${args.day}`);

  const log = await readJson(LOG_FILE);
  if (log.piiAllowed !== false) fail("Nour sprint log must keep piiAllowed=false");
  if (!Array.isArray(log.entries)) log.entries = [];

  const entry = {
    day: args.day,
    executedAt: args.executedAt,
    status: args.status,
    signalObserved: args.signalObserved,
    signalEvidence: args.signalEvidence,
    notes: args.notes,
    nextAction: args.nextAction || dayPlan.expectedSignal || "",
  };

  const entries = log.entries.filter((existing) => Number(existing.day) !== args.day);
  entries.push(entry);
  entries.sort((a, b) => Number(a.day) - Number(b.day));
  log.entries = entries;
  log.status = deriveLogStatus(entries);

  const output = JSON.stringify(log, null, 2) + "\n";
  if (!args.dryRun) await writeFile(resolve(process.cwd(), LOG_FILE), output);
  console.log(JSON.stringify({
    ok: true,
    dryRun: args.dryRun,
    logFile: LOG_FILE,
    status: log.status,
    entries: entries.length,
    recorded: entry,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
