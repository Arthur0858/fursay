import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import worker from "../src/worker.js";

const ROOT = process.cwd();
const DEFAULT_OUT = "/tmp/fursay-worker-shortlinks";
const PASSTHROUGH_PROBE = {
  source_id: "contract_ep001",
  creator: "contract_creator",
  placement: "contract_placement",
  ref: "contract_ref",
  utm_term: "contract_term",
};
const BLOCKED_PROBE = {
  email: "leak@example.com",
  groups: "bad",
  channel: "bad",
  subscribe: "bad",
  utm_source: "bad_source",
  utm_medium: "bad_medium",
  utm_campaign: "bad_campaign",
  utm_content: "bad_content",
};

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { outDir: DEFAULT_OUT, baseUrl: "" };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--out-dir") parsed.outDir = args[++i];
    if (args[i] === "--base-url") parsed.baseUrl = args[++i].replace(/\/$/, "");
  }
  return parsed;
}

async function readShortlinks(baseUrl) {
  if (baseUrl) {
    const response = await fetch(`${baseUrl}/shortlinks.json`);
    if (!response.ok) throw new Error(`shortlinks.json status ${response.status}`);
    return response.json();
  }
  return JSON.parse(await readFile(resolve(ROOT, "fursay-optimized-site/shortlinks.json"), "utf8"));
}

function probeUrl(origin, path) {
  const url = new URL(path, origin);
  for (const [key, value] of Object.entries({ ...PASSTHROUGH_PROBE, ...BLOCKED_PROBE })) {
    url.searchParams.set(key, value);
  }
  return url;
}

async function fetchShortlink(baseUrl, path) {
  if (baseUrl) {
    return fetch(probeUrl(baseUrl, path), { redirect: "manual" });
  }
  return worker.fetch(new Request(probeUrl("https://fursay.com", path).toString(), {
    method: "GET",
    redirect: "manual",
  }), {});
}

function compareLocation(route, location) {
  const failures = [];
  let actual;
  let expected;
  try {
    actual = new URL(location);
  } catch {
    failures.push(`bad_location:${route.path}:${location || "none"}`);
    return failures;
  }
  try {
    expected = new URL(route.target);
  } catch {
    failures.push(`bad_manifest_target:${route.path}:${route.target || "none"}`);
    return failures;
  }

  if (actual.origin !== expected.origin) failures.push(`bad_origin:${route.path}:${actual.origin}`);
  if (actual.pathname !== expected.pathname) failures.push(`bad_path:${route.path}:${actual.pathname}`);

  for (const [key, value] of Object.entries(route.attribution || {})) {
    if (actual.searchParams.get(key) !== value) {
      failures.push(`bad_attribution:${route.path}:${key}:${actual.searchParams.get(key) || "none"}`);
    }
  }

  for (const key of route.passthroughParams || []) {
    if (actual.searchParams.get(key) !== PASSTHROUGH_PROBE[key]) {
      failures.push(`missing_passthrough:${route.path}:${key}:${actual.searchParams.get(key) || "none"}`);
    }
  }

  for (const key of route.blockedParams || []) {
    if (BLOCKED_PROBE[key] && actual.searchParams.get(key) === BLOCKED_PROBE[key]) {
      failures.push(`blocked_param_overrode:${route.path}:${key}`);
    }
  }

  for (const key of ["subscribe", "utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
    if (actual.searchParams.get(key) !== expected.searchParams.get(key)) {
      failures.push(`target_mismatch:${route.path}:${key}:${actual.searchParams.get(key) || "none"}`);
    }
  }

  return failures;
}

async function main() {
  const args = parseArgs();
  const shortlinks = await readShortlinks(args.baseUrl);
  const failures = [];
  const checks = [];

  if (shortlinks.platform !== "cloudflare-workers-static-assets") failures.push(`bad_platform:${shortlinks.platform || "none"}`);
  if (shortlinks.safety?.ownedAttributionCannotBeOverridden !== true) failures.push("missing_owned_attribution_guard");
  if (!Array.isArray(shortlinks.routes) || shortlinks.routes.length !== 16) {
    failures.push(`bad_route_count:${shortlinks.routes?.length || 0}`);
  }

  for (const route of shortlinks.routes || []) {
    const response = await fetchShortlink(args.baseUrl, route.path);
    const location = response.headers.get("location") || "";
    const routeFailures = [];
    if (response.status !== route.status) routeFailures.push(`bad_status:${route.path}:${response.status}`);
    if (response.headers.get("cache-control") !== route.cacheControl) {
      routeFailures.push(`bad_cache:${route.path}:${response.headers.get("cache-control") || "none"}`);
    }
    routeFailures.push(...compareLocation(route, location));
    failures.push(...routeFailures);
    checks.push({
      path: route.path,
      status: response.status,
      location,
      failed: routeFailures.length,
    });
  }

  await mkdir(args.outDir, { recursive: true });
  const report = {
    ok: failures.length === 0,
    mode: args.baseUrl ? "live" : "local-worker",
    baseUrl: args.baseUrl || "",
    failures,
    checks,
  };
  await writeFile(resolve(args.outDir, "worker-shortlinks.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({
    ok: report.ok,
    mode: report.mode,
    outDir: args.outDir,
    failed: failures.length,
    routes: checks.length,
  }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
