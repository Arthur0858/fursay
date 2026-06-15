import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_BASE_URL = "https://fursay.com";
const DEFAULT_OUT_DIR = "/tmp/fursay-smoke-live";

const LIVE_GATES = [
  { command: "node", args: ["scripts/check-fursay-funnel.mjs"] },
  { command: "node", args: ["scripts/check-noor-list-activation.mjs"] },
  { command: "node", args: ["scripts/check-localized-cta-contract.mjs"] },
  { command: "node", args: ["scripts/check-event-tracking-contract.mjs"] },
  { command: "node", args: ["scripts/check-conversion-health-contract.mjs"] },
  { command: "node", args: ["scripts/check-growth-dashboard-contract.mjs"] },
  { command: "node", args: ["scripts/check-event-analytics-contract.mjs"] },
  { command: "node", args: ["scripts/query-event-analytics-report.mjs"], dryRun: true },
  { command: "node", args: ["scripts/check-subscribe-api-contract.mjs"] },
  { command: "node", args: ["scripts/check-content-structure-contract.mjs"] },
  { command: "node", args: ["scripts/check-semantic-funnel-contract.mjs"] },
  { command: "node", args: ["scripts/check-site-structure-contract.mjs"] },
  { command: "node", args: ["scripts/check-hero-preload-contract.mjs"] },
  { command: "node", args: ["scripts/check-visual-layout-contract.mjs"] },
  { command: "node", args: ["scripts/check-web-vitals-contract.mjs"] },
  { command: "node", args: ["scripts/check-internal-links-contract.mjs"] },
  { command: "node", args: ["scripts/check-newsletter-traffic-kit.mjs"] },
  { command: "node", args: ["scripts/check-public-kit-parity.mjs"] },
  { command: "node", args: ["scripts/check-amazon-affiliate-links.mjs"] },
  { command: "node", args: ["scripts/check-worker-shortlinks.mjs"] },
  { command: "node", args: ["scripts/check-structured-data.mjs"] },
  { command: "node", args: ["scripts/check-social-preview-contract.mjs"] },
  { command: "node", args: ["scripts/check-head-metadata.mjs"] },
  { command: "node", args: ["scripts/check-accessibility-contract.mjs"] },
  { command: "node", args: ["scripts/check-discovery-contract.mjs"] },
  { command: "node", args: ["scripts/check-content-growth-contract.mjs"] },
  { command: "node", args: ["scripts/check-episode-landing-contract.mjs"] },
  { command: "node", args: ["scripts/check-monetization-interest-contract.mjs"] },
  { command: "node", args: ["scripts/check-product-readiness-contract.mjs"] },
  { command: "node", args: ["scripts/check-monetization-roadmap-contract.mjs"] },
  { command: "node", args: ["scripts/check-noor-subscriber-readiness.mjs"] },
  { command: "node", args: ["scripts/check-noor-sprint-log.mjs"] },
  { command: "node", args: ["scripts/check-security-headers.mjs"] },
  { command: "node", args: ["scripts/check-release-consistency.mjs"] },
  { command: "node", args: ["scripts/check-doc-manifest-drift.mjs"] },
  { command: "node", args: ["scripts/update-immutable-asset-fingerprints.mjs"], noBaseUrl: true },
  { command: "node", args: ["scripts/check-image-assets.mjs"] },
  { command: "node", args: ["scripts/check-cache-headers.mjs"] },
  { command: "node", args: ["audit-fursay.mjs"], audit: true },
];

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    baseUrl: DEFAULT_BASE_URL,
    outDir: DEFAULT_OUT_DIR,
    retries: 1,
  };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--base-url") parsed.baseUrl = args[++i].replace(/\/$/, "");
    else if (args[i] === "--out-dir") parsed.outDir = args[++i];
    else if (args[i] === "--retries") parsed.retries = Number(args[++i]);
  }
  if (!Number.isInteger(parsed.retries) || parsed.retries < 0) {
    throw new Error("--retries must be a non-negative integer");
  }
  return parsed;
}

function slugFor(gate) {
  return gate.args[0].replace(/^scripts\//, "").replace(/\.mjs$/, "").replace(/^audit-fursay$/, "audit-live");
}

function runGate(gate, args) {
  const gateArgs = [...gate.args];
  const slug = slugFor(gate);
  if (gate.audit) {
    gateArgs.push(args.baseUrl);
  } else {
    if (gate.dryRun) gateArgs.push("--dry-run");
    if (!gate.noBaseUrl) gateArgs.push("--base-url", args.baseUrl);
    gateArgs.push("--out-dir", join(args.outDir, slug));
  }
  const label = [gate.command, ...gateArgs].join(" ");
  let lastStatus = 1;
  for (let attempt = 0; attempt <= args.retries; attempt += 1) {
    console.log(`\n$ ${label}${attempt > 0 ? ` (retry ${attempt}/${args.retries})` : ""}`);
    const result = spawnSync(gate.command, gateArgs, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "inherit",
    });
    lastStatus = result.status || 0;
    if (lastStatus === 0) return { gate: gate.args[0], ok: true, attempts: attempt + 1 };
    if (attempt < args.retries) {
      console.warn(`Live smoke gate failed; retrying once to rule out transient network or browser timing: ${label}`);
    }
  }
  return { gate: gate.args[0], ok: false, attempts: args.retries + 1, status: lastStatus };
}

function main() {
  const args = parseArgs();
  mkdirSync(args.outDir, { recursive: true });
  const results = LIVE_GATES.map((gate) => runGate(gate, args));
  const failed = results.filter((result) => !result.ok);
  const report = {
    ok: failed.length === 0,
    baseUrl: args.baseUrl,
    outDir: args.outDir,
    retries: args.retries,
    gates: results.length,
    failed: failed.length,
    retryRecovered: results.filter((result) => result.ok && result.attempts > 1).length,
    results,
  };
  writeFileSync(join(args.outDir, "smoke-live.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({
    ok: report.ok,
    outDir: report.outDir,
    gates: report.gates,
    failed: report.failed,
    retryRecovered: report.retryRecovered,
  }, null, 2));
  if (!report.ok) process.exit(1);
}

main();
