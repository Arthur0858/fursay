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
const PRIVATE_PROBE = {
  name: "Ada Parent",
  phone: "+15550123456",
  address: "1 Private Street",
  token: "secret-token",
  secret: "private-secret",
  subscriberId: "sub_123",
  mailerLiteSubscriberId: "ml_456",
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

async function readWorkerRoutes() {
  const source = await readFile(resolve(ROOT, "src/worker.js"), "utf8");
  const block = source.match(/const routes = \{([\s\S]*?)\n  \};\n  const route = routes/)?.[1] || "";
  const passthroughBlock = source.match(/const SHORTLINK_PASSTHROUGH_PARAMS = \[([^\]]+)\]/)?.[1] || "";
  const passthroughParams = [...passthroughBlock.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  const routes = [];
  for (const match of block.matchAll(/"([^"]+)":\s*\{([\s\S]*?)\n    \}/g)) {
    const body = match[2];
    const value = (key) => body.match(new RegExp(`${key}:\\s*"([^"]+)"`))?.[1] || "";
    routes.push({
      path: match[1],
      target: value("target"),
      pack: value("pack"),
      source: value("source") || "shortlink",
      medium: value("medium") || "direct",
      campaign: value("campaign"),
      content: value("content"),
    });
  }
  return { routes, passthroughParams };
}

function compareWorkerSourceToManifest(workerData, shortlinks) {
  const failures = [];
  const workerRoutes = new Map(workerData.routes.map((route) => [route.path, route]));
  const manifestRoutes = new Map((shortlinks.routes || []).map((route) => [route.path, route]));
  const manifestPassthrough = shortlinks.safety?.passthroughParams || [];

  if (workerRoutes.size !== manifestRoutes.size) {
    failures.push(`worker_route_count:${workerRoutes.size}!=${manifestRoutes.size}`);
  }
  for (const key of manifestPassthrough) {
    if (!workerData.passthroughParams.includes(key)) failures.push(`worker_missing_passthrough_param:${key}`);
  }
  for (const key of workerData.passthroughParams) {
    if (!manifestPassthrough.includes(key)) failures.push(`worker_extra_passthrough_param:${key}`);
  }
  for (const [path, manifestRoute] of manifestRoutes.entries()) {
    const workerRoute = workerRoutes.get(path);
    if (!workerRoute) {
      failures.push(`worker_missing_route:${path}`);
      continue;
    }
    if (workerRoute.target !== manifestRoute.targetPath) failures.push(`worker_target_mismatch:${path}:${workerRoute.target || "none"}`);
    if (workerRoute.pack !== manifestRoute.pack) failures.push(`worker_pack_mismatch:${path}:${workerRoute.pack || "none"}`);
    if (workerRoute.source !== manifestRoute.attribution?.utm_source) failures.push(`worker_source_mismatch:${path}:${workerRoute.source || "none"}`);
    if (workerRoute.medium !== manifestRoute.attribution?.utm_medium) failures.push(`worker_medium_mismatch:${path}:${workerRoute.medium || "none"}`);
    if (workerRoute.campaign !== manifestRoute.attribution?.utm_campaign) failures.push(`worker_campaign_mismatch:${path}:${workerRoute.campaign || "none"}`);
    if (workerRoute.content !== manifestRoute.attribution?.utm_content) failures.push(`worker_content_mismatch:${path}:${workerRoute.content || "none"}`);
  }
  for (const path of workerRoutes.keys()) {
    if (!manifestRoutes.has(path)) failures.push(`worker_extra_route:${path}`);
  }
  return failures;
}

function probeUrl(origin, path) {
  const url = new URL(path, origin);
  for (const [key, value] of Object.entries({ ...PASSTHROUGH_PROBE, ...BLOCKED_PROBE, ...PRIVATE_PROBE })) {
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

  for (const key of route.blockedPrivateParams || []) {
    if (actual.searchParams.has(key)) failures.push(`private_param_leaked:${route.path}:${key}`);
    const value = PRIVATE_PROBE[key] || BLOCKED_PROBE[key] || "";
    if (value && actual.toString().includes(encodeURIComponent(value))) {
      failures.push(`private_value_leaked:${route.path}:${key}`);
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
  const blockedPrivateParams = shortlinks.safety?.blockedPrivateParams || [];
  for (const key of Object.keys(PRIVATE_PROBE)) {
    if (!blockedPrivateParams.includes(key)) failures.push(`manifest_missing_blocked_private_param:${key}`);
  }
  if (!Array.isArray(shortlinks.routes) || shortlinks.routes.length !== 16) {
    failures.push(`bad_route_count:${shortlinks.routes?.length || 0}`);
  }
  if (!args.baseUrl) {
    const workerData = await readWorkerRoutes();
    failures.push(...compareWorkerSourceToManifest(workerData, shortlinks));
  }

  for (const route of shortlinks.routes || []) {
    for (const key of Object.keys(PRIVATE_PROBE)) {
      if (!(route.blockedPrivateParams || []).includes(key)) failures.push(`route_missing_blocked_private_param:${route.path}:${key}`);
    }
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
