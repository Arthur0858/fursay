import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const DEFAULT_OUT = "/tmp/fursay-analytics-enablement-contract";
const REPORT_SCRIPT = "scripts/query-event-analytics-report.mjs";
const REPORT_COMMAND = "npm run report:events";
const READINESS_COMMAND = "npm run deploy:ready -- --require-cloudflare";
const REVIEW_COMMAND = "npm run noor:sprint:review";
const DATASET = "fursay_events";
const BINDING = "FURSAY_EVENTS";
const REQUIRED_ENV = [
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_ANALYTICS_TOKEN",
];
const BLOCKED_SECRET_ASSIGNMENT = /\b(CLOUDFLARE_API_TOKEN|CLOUDFLARE_ANALYTICS_TOKEN|CLOUDFLARE_ACCOUNT_ID)=\S+/;
const PRIVATE_WORDS = /\b(email|phone|address|subscriber id|subscriberid|mailerlite id|mailerliteid|token value)\b/i;

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { outDir: DEFAULT_OUT };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--out-dir") parsed.outDir = args[++i];
  }
  return parsed;
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(process.cwd(), path), "utf8"));
}

async function readText(path) {
  return readFile(resolve(process.cwd(), path), "utf8");
}

function runReport(outDir) {
  const result = spawnSync("node", [REPORT_SCRIPT, "--dry-run", "--out-dir", outDir], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
  });
  return result;
}

function scanForPrivateKeys(value, failures, path = "report") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanForPrivateKeys(item, failures, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (["email", "phone", "address", "subscriberid", "mailerliteid", "mailerlitesubscriberid", "token"].includes(normalized)) {
        failures.push(`private_key:${path}.${key}`);
      }
      scanForPrivateKeys(child, failures, `${path}.${key}`);
    }
    return;
  }
  if (typeof value === "string" && PRIVATE_WORDS.test(value) && !value.includes("Do not") && !value.includes("must stay aggregate")) {
    failures.push(`private_word:${path}`);
  }
}

async function main() {
  const args = parseArgs();
  const failures = [];
  const warnings = [];
  await mkdir(args.outDir, { recursive: true });

  const packageJson = await readJson("package.json");
  const wrangler = await readJson("wrangler.jsonc");
  const envExample = await readText(".env.example");
  const analyticsRunbook = await readText("docs/analytics-engine-enablement.md");
  const deployRunbook = await readText("docs/cloudflare-deploy-runbook.md");
  const conversionHealth = await readJson("fursay-optimized-site/conversion-health.json");
  const deployReadiness = await readJson("fursay-optimized-site/deploy-readiness.json");

  if (packageJson.scripts?.["report:events"] !== `node ${REPORT_SCRIPT}`) failures.push("package_missing_report_script");
  if (packageJson.scripts?.["analytics:enablement:check"] !== "node scripts/check-analytics-enablement-contract.mjs") {
    failures.push("package_missing_analytics_enablement_check_script");
  }

  for (const name of REQUIRED_ENV) {
    if (!envExample.includes(`${name}=`)) failures.push(`env_example_missing:${name}`);
  }
  if (BLOCKED_SECRET_ASSIGNMENT.test(envExample)) failures.push("env_example_contains_secret_like_cloudflare_value");
  if (!envExample.includes("Keep these unset unless you are running deploy readiness or event reports.")) {
    failures.push("env_example_missing_cloudflare_safety_note");
  }

  const analyticsBinding = (wrangler.analytics_engine_datasets || []).find((item) => item.binding === BINDING);
  if (analyticsBinding && analyticsBinding.dataset !== DATASET) failures.push(`wrangler_bad_analytics_dataset:${analyticsBinding.dataset || "none"}`);
  if (!analyticsBinding && !analyticsRunbook.includes("Do not add `analytics_engine_datasets` back to `wrangler.jsonc`")) {
    failures.push("runbook_missing_do_not_add_binding_boundary");
  }

  for (const [label, text] of [
    ["analytics_runbook", analyticsRunbook],
    ["deploy_runbook", deployRunbook],
  ]) {
    for (const needle of [
      BINDING,
      DATASET,
      REPORT_COMMAND,
      READINESS_COMMAND,
      "CLOUDFLARE_ACCOUNT_ID",
      "CLOUDFLARE_ANALYTICS_TOKEN",
      "Do not print, commit, or publish token values",
    ]) {
      if (!text.includes(needle)) failures.push(`${label}_missing:${needle}`);
    }
  }

  const analyticsReport = conversionHealth.measurement?.analyticsReport || {};
  if (analyticsReport.script !== REPORT_SCRIPT) failures.push("conversion_health_bad_report_script");
  if (analyticsReport.packageScript !== REPORT_COMMAND) failures.push("conversion_health_bad_report_command");
  if (analyticsReport.status !== "pending_cloudflare_credentials_or_enablement") failures.push(`conversion_health_bad_report_status:${analyticsReport.status || "none"}`);
  if (analyticsReport.queryCount !== 12) failures.push(`conversion_health_bad_query_count:${analyticsReport.queryCount || "none"}`);
  if (conversionHealth.measurement?.analyticsSink?.binding !== BINDING) failures.push("conversion_health_bad_binding");
  if (conversionHealth.measurement?.analyticsSink?.dataset !== DATASET) failures.push("conversion_health_bad_dataset");

  const readinessReport = deployReadiness.deployment?.analyticsReport || {};
  if (readinessReport.command !== REPORT_COMMAND) failures.push("deploy_readiness_bad_report_command");
  if (readinessReport.piiAllowed !== false) failures.push("deploy_readiness_report_allows_pii");
  if (!deployReadiness.deployment?.analyticsEnablementHandoff?.successCriteria?.includes("npm run report:events returns status=queried")) {
    failures.push("deploy_readiness_missing_report_success_criteria");
  }

  const dryRun = runReport(args.outDir);
  if (dryRun.status !== 0) failures.push(`dry_run_report_failed:${dryRun.stderr || dryRun.stdout}`);
  let report = {};
  try {
    report = await readJson(resolve(args.outDir, "event-analytics-report.json"));
  } catch (error) {
    failures.push(`dry_run_report_missing_json:${error instanceof Error ? error.message : String(error)}`);
  }

  const handoff = report.enablementHandoff || {};
  if (report.status !== "pending_cloudflare_credentials_or_enablement" && report.status !== "queried") failures.push(`dry_run_bad_status:${report.status || "none"}`);
  if (report.piiAllowed !== false) failures.push("dry_run_report_allows_pii");
  if ((report.queries || []).length !== 12) failures.push(`dry_run_bad_query_count:${(report.queries || []).length}`);
  if (handoff.binding !== BINDING) failures.push(`handoff_bad_binding:${handoff.binding || "none"}`);
  if (handoff.dataset !== DATASET) failures.push(`handoff_bad_dataset:${handoff.dataset || "none"}`);
  if (handoff.reportCommand !== REPORT_COMMAND) failures.push("handoff_bad_report_command");
  if (handoff.readinessCommand !== READINESS_COMMAND) failures.push("handoff_bad_readiness_command");
  if (handoff.noorReviewCommand !== REVIEW_COMMAND) failures.push("handoff_bad_noor_review_command");
  for (const stepId of ["enable_dataset", "provide_credentials", "run_deploy_readiness", "run_event_report", "review_noor_signal"]) {
    if (!(handoff.steps || []).some((step) => step.id === stepId)) failures.push(`handoff_missing_step:${stepId}`);
  }
  if (!handoff.privacyBoundary?.includes("aggregate only")) failures.push("handoff_missing_privacy_boundary");
  scanForPrivateKeys(report, failures);

  if (!process.env.CLOUDFLARE_ACCOUNT_ID) warnings.push("missing_CLOUDFLARE_ACCOUNT_ID");
  if (!process.env.CLOUDFLARE_ANALYTICS_TOKEN && !process.env.CLOUDFLARE_API_TOKEN) warnings.push("missing_CLOUDFLARE_ANALYTICS_TOKEN_or_CLOUDFLARE_API_TOKEN");

  const summary = {
    ok: failures.length === 0,
    outDir: args.outDir,
    failed: failures.length,
    warnings,
    analytics: {
      binding: BINDING,
      dataset: DATASET,
      wranglerBindingConfigured: Boolean(analyticsBinding),
      reportStatus: report.status || "",
      reportQueries: (report.queries || []).length,
      piiAllowed: report.piiAllowed === true,
      handoffSteps: (handoff.steps || []).length,
    },
    failures,
  };
  await writeFile(resolve(args.outDir, "analytics-enablement-contract.json"), JSON.stringify(summary, null, 2) + "\n");
  console.log(JSON.stringify({
    ok: summary.ok,
    outDir: args.outDir,
    failed: summary.failed,
    warnings: summary.warnings.length,
    reportStatus: summary.analytics.reportStatus,
    queries: summary.analytics.reportQueries,
    handoffSteps: summary.analytics.handoffSteps,
  }, null, 2));
  if (!summary.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
