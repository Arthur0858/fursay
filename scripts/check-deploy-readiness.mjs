import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = process.cwd();

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    requireRemote: args.includes("--require-remote"),
    requireCloudflare: args.includes("--require-cloudflare"),
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(ROOT, path), "utf8"));
}

async function readText(path) {
  return readFile(resolve(ROOT, path), "utf8");
}

function gitValue(args) {
  const result = spawnSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: "pipe",
  });
  return result.status === 0 ? result.stdout.trim() : "";
}

function addIssue(list, ok, code, detail = "") {
  if (!ok) list.push(detail ? `${code}:${detail}` : code);
}

async function main() {
  const args = parseArgs();
  const failures = [];
  const warnings = [];
  const packageJson = await readJson("package.json");
  const wrangler = await readJson("wrangler.jsonc");
  const workflow = await readText(".github/workflows/deploy-worker.yml");
  const deployRunbook = await readText("docs/cloudflare-deploy-runbook.md");
  const branch = gitValue(["branch", "--show-current"]);
  const commit = gitValue(["rev-parse", "--short", "HEAD"]);
  const remote = gitValue(["remote", "get-url", "origin"]);
  const hasCloudflareToken = Boolean(process.env.CLOUDFLARE_API_TOKEN);
  const hasCloudflareAccount = Boolean(process.env.CLOUDFLARE_ACCOUNT_ID);

  addIssue(failures, packageJson.scripts?.check === "node scripts/release-fursay.mjs --check-only", "package_bad_check_script");
  addIssue(failures, packageJson.scripts?.deploy === "node scripts/release-fursay.mjs", "package_bad_deploy_script");
  addIssue(failures, packageJson.scripts?.["deploy:ready"] === "node scripts/check-deploy-readiness.mjs", "package_bad_deploy_ready_script");
  addIssue(failures, packageJson.scripts?.["smoke:live"]?.includes("audit-fursay.mjs https://fursay.com"), "package_bad_live_smoke_script");
  addIssue(failures, Boolean(packageJson.devDependencies?.wrangler), "package_missing_wrangler");
  addIssue(failures, Boolean(packageJson.devDependencies?.playwright), "package_missing_playwright");

  addIssue(failures, wrangler.name === "fursay", "wrangler_bad_name", wrangler.name || "none");
  addIssue(failures, wrangler.main === "src/worker.js", "wrangler_bad_main", wrangler.main || "none");
  addIssue(failures, wrangler.assets?.directory === "./fursay-optimized-site", "wrangler_bad_assets_directory", wrangler.assets?.directory || "none");
  addIssue(failures, wrangler.assets?.binding === "ASSETS", "wrangler_bad_assets_binding", wrangler.assets?.binding || "none");
  addIssue(failures, wrangler.assets?.run_worker_first === true, "wrangler_must_run_worker_first");

  for (const needle of [
    "npm run deploy:ready",
    "npm run check",
    "npm run deploy",
    "CLOUDFLARE_API_TOKEN",
    "CLOUDFLARE_ACCOUNT_ID",
    "npx playwright install --with-deps chromium",
    "concurrency:",
    "actions/upload-artifact@v4",
    "/tmp/fursay-release-*",
    "retention-days: 14",
  ]) {
    addIssue(failures, workflow.includes(needle), "workflow_missing", needle);
  }

  for (const needle of [
    "Cloudflare Workers Static Assets",
    "CLOUDFLARE_API_TOKEN",
    "CLOUDFLARE_ACCOUNT_ID",
    "npm run deploy:ready -- --require-remote",
    "npm run deploy:ready -- --require-cloudflare",
    "fursay-release-evidence-${{ github.run_id }}",
    "fail-closed",
    "npm run smoke:live",
    "/deploy-readiness.json",
    "/share-kit.json",
    "/traffic-launch.json",
    "/shortlinks.json",
    "never secret values",
  ]) {
    addIssue(failures, deployRunbook.includes(needle), "deploy_runbook_missing", needle);
  }

  if (!remote) {
    const issue = "git_missing_origin_remote";
    (args.requireRemote ? failures : warnings).push(issue);
  }
  if (!hasCloudflareToken) {
    const issue = "missing_CLOUDFLARE_API_TOKEN";
    (args.requireCloudflare ? failures : warnings).push(issue);
  }
  if (!hasCloudflareAccount) {
    const issue = "missing_CLOUDFLARE_ACCOUNT_ID";
    (args.requireCloudflare ? failures : warnings).push(issue);
  }

  const report = {
    ok: failures.length === 0,
    strict: {
      requireRemote: args.requireRemote,
      requireCloudflare: args.requireCloudflare,
    },
    source: { branch, commit },
    deployment: {
      platform: "cloudflare-workers-static-assets",
      workerName: wrangler.name || "",
      assetsBinding: wrangler.assets?.binding || "",
      releaseCommand: packageJson.scripts?.deploy || "",
      localGateCommand: "npm run check",
      workflow: ".github/workflows/deploy-worker.yml",
      runbook: "docs/cloudflare-deploy-runbook.md",
      hasOriginRemote: Boolean(remote),
      hasCloudflareToken,
      hasCloudflareAccount,
    },
    failures,
    warnings,
  };

  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
