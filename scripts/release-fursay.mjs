import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const stamp = new Date().toISOString().replace(/[:.]/g, "-");

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    baseUrl: "https://fursay.com",
    skipDeploy: false,
    skipLive: false,
    pushGit: false,
    checkOnly: false,
  };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--base-url") parsed.baseUrl = args[++i].replace(/\/$/, "");
    if (args[i] === "--skip-deploy") parsed.skipDeploy = true;
    if (args[i] === "--skip-live") parsed.skipLive = true;
    if (args[i] === "--push-git") parsed.pushGit = true;
    if (args[i] === "--check-only") parsed.checkOnly = true;
  }
  if (parsed.checkOnly) {
    parsed.skipDeploy = true;
    parsed.skipLive = true;
    parsed.pushGit = false;
  }
  return parsed;
}

function run(command, args, options = {}) {
  const label = [command, ...args].join(" ");
  console.log(`\n$ ${label}`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });
  if (result.status !== 0) {
    if (options.capture) {
      if (result.stdout) process.stdout.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
    }
    throw new Error(`Command failed: ${label}`);
  }
  return result.stdout || "";
}

function ensureOutDir(path) {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

function gitRemote() {
  const result = spawnSync("git", ["remote", "get-url", "origin"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
  });
  return result.status === 0 ? result.stdout.trim() : "";
}

function gitValue(args, fallback = "") {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
  });
  return result.status === 0 ? result.stdout.trim() : fallback;
}

function taipeiDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeReleaseManifest() {
  const siteDir = resolve(process.cwd(), "fursay-optimized-site");
  const siteStructure = readJson(resolve(siteDir, "data/site-structure.json"));
  const css = siteStructure.sharedAssets?.css?.find((asset) => asset.includes("picture-world-shared-")) || "";
  const js = siteStructure.sharedAssets?.js?.[0] || "";
  const manifest = {
    site: "Fursay",
    origin: "https://fursay.com",
    platform: "cloudflare-workers-static-assets",
    releasedAt: taipeiDateString(),
    source: {
      branch: gitValue(["branch", "--show-current"], "unknown"),
      commit: gitValue(["rev-parse", "--short", "HEAD"], "unknown"),
      summary: gitValue(["log", "-1", "--pretty=%s"], "unknown"),
    },
    deployment: {
      workerName: "fursay",
      assetsBinding: "ASSETS",
      releaseCommand: "node scripts/release-fursay.mjs",
    },
    funnels: {
      koko: {
        campaign: "koko_story_funnel",
        join: "https://fursay.com/join/koko",
        sample: "https://fursay.com/sample/koko",
        deepLink: "https://fursay.com/koko?subscribe=koko&utm_source=shortlink&utm_medium=direct&utm_campaign=koko_story_funnel&utm_content=join_koko",
      },
      noor: {
        campaign: "noor_story_funnel",
        join: "https://fursay.com/join/noor",
        sample: "https://fursay.com/sample/noor",
        deepLink: "https://fursay.com/arabic?subscribe=noor&utm_source=shortlink&utm_medium=direct&utm_campaign=noor_story_funnel&utm_content=join_noor",
      },
    },
    assets: { css, js },
    qualityGates: [
      "scripts/check-fursay-funnel.mjs",
      "scripts/check-noor-list-activation.mjs",
      "scripts/check-cache-headers.mjs",
      "audit-fursay.mjs",
    ],
    liveExpectations: {
      pages: 9,
      funnelChecks: 17,
      cacheHeaderChecks: 12,
      badAuditCount: 0,
      liveSmokeCallsMailerLite: false,
    },
  };
  writeFileSync(resolve(siteDir, "release.json"), JSON.stringify(manifest, null, 2) + "\n");
}

async function main() {
  const args = parseArgs();
  const outRoot = `/tmp/fursay-release-${stamp}`;
  ensureOutDir(outRoot);

  writeReleaseManifest();

  run("node", ["--check", "src/worker.js"]);
  run("node", ["--check", "scripts/check-fursay-funnel.mjs"]);
  run("node", ["--check", "scripts/check-noor-list-activation.mjs"]);
  run("node", ["--check", "scripts/check-cache-headers.mjs"]);

  run("node", ["scripts/check-fursay-funnel.mjs", "--out-dir", join(outRoot, "funnel-local")]);
  run("node", ["scripts/check-noor-list-activation.mjs", "--out-dir", join(outRoot, "noor-local")]);

  if (!args.skipDeploy) {
    run("npx", ["wrangler", "deploy"]);
  }

  if (!args.skipLive) {
    run("node", ["scripts/check-fursay-funnel.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "funnel-live")]);
    run("node", ["scripts/check-noor-list-activation.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "noor-live")]);
    run("node", ["scripts/check-cache-headers.mjs", "--base-url", args.baseUrl, "--out-dir", join(outRoot, "cache-live")]);
    const auditOut = join(outRoot, "audit-live.json");
    const auditJson = run("node", ["audit-fursay.mjs", args.baseUrl], { capture: true });
    writeFileSync(auditOut, auditJson);
    const pages = JSON.parse(auditJson);
    const bad = pages.filter((page) => (
      page.status >= 400
      || page.brokenImages?.length
      || page.externalBlankNoNoopener?.length
      || page.bodyOverflow
      || page.consoleMessages?.some((message) => message.type === "error")
      || page.failedRequests?.length
      || page.badStatuses?.length
    ));
    if (bad.length) throw new Error(`Live audit found ${bad.length} bad page(s); see ${auditOut}`);
    console.log(`Live audit passed: ${pages.length} pages, badCount 0 (${auditOut})`);
  }

  if (args.pushGit) {
    const remote = gitRemote();
    if (!remote) {
      throw new Error("No git remote named origin is configured; cannot push.");
    }
    run("git", ["push"]);
  }

  console.log(`\nRelease checks completed. Artifacts: ${outRoot}`);
}

main().catch((error) => {
  console.error(`\nRelease failed: ${error.message}`);
  process.exit(1);
});
