import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import worker from "../src/worker.js";

const DEFAULT_OUT = "/tmp/fursay-security-headers";
const SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "x-frame-options": "SAMEORIGIN",
};
const CHECKS = [
  { name: "home_html", path: "/", method: "GET", status: 200 },
  { name: "story_html", path: "/koko", method: "GET", status: 200 },
  { name: "manifest_json", path: "/release.json", method: "GET", status: 200 },
  { name: "css_asset", path: "/css/picture-world-shared-20260613-traffic11.css", method: "GET", status: 200 },
  { name: "image_asset", path: "/og-koko.png", method: "GET", status: 200 },
  { name: "shortlink_redirect", path: "/join/koko", method: "GET", status: 302 },
  { name: "html_clean_redirect", path: "/koko.html", method: "GET", status: 301 },
  { name: "api_preflight", path: "/api/subscribe", method: "OPTIONS", status: 200 },
  {
    name: "api_fail_closed",
    path: "/api/subscribe",
    method: "POST",
    status: 400,
    body: JSON.stringify({ email: "invalid", groups: ["koko"] }),
    headers: { "content-type": "application/json" },
  },
];

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { outDir: DEFAULT_OUT, baseUrl: "" };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--out-dir") parsed.outDir = args[++i];
    if (args[i] === "--base-url") parsed.baseUrl = args[++i].replace(/\/$/, "");
  }
  return parsed;
}

function mockAssetResponse(request) {
  const url = new URL(request.url);
  const headers = new Headers();
  if (url.pathname.endsWith(".css")) headers.set("content-type", "text/css; charset=utf-8");
  else if (url.pathname.endsWith(".png")) headers.set("content-type", "image/png");
  else if (url.pathname.endsWith(".json")) headers.set("content-type", "application/json; charset=utf-8");
  else headers.set("content-type", "text/html; charset=utf-8");
  return new Response(url.pathname.endsWith(".json") ? "{}" : "ok", { status: 200, headers });
}

async function fetchCheck(baseUrl, check) {
  const requestInit = {
    method: check.method,
    headers: check.headers || {},
    body: check.body,
    redirect: "manual",
  };
  if (baseUrl) return fetch(`${baseUrl}${check.path}`, requestInit);

  const request = new Request(`https://fursay.com${check.path}`, requestInit);
  return worker.fetch(request, {
    ASSETS: {
      fetch: mockAssetResponse,
    },
  });
}

function checkCors(name, response, failures) {
  if (!name.startsWith("api_")) return;
  if (response.headers.get("access-control-allow-origin") !== "*") failures.push(`${name}:missing_cors_origin`);
  if (!response.headers.get("access-control-allow-methods")?.includes("POST")) failures.push(`${name}:missing_cors_methods`);
  if (!response.headers.get("access-control-allow-headers")?.includes("Content-Type")) failures.push(`${name}:missing_cors_headers`);
}

async function main() {
  const args = parseArgs();
  const failures = [];
  const checks = [];

  for (const check of CHECKS) {
    const response = await fetchCheck(args.baseUrl, check);
    const responseFailures = [];
    if (response.status !== check.status) responseFailures.push(`bad_status:${response.status}`);
    for (const [header, expected] of Object.entries(SECURITY_HEADERS)) {
      if (response.headers.get(header) !== expected) {
        responseFailures.push(`bad_${header}:${response.headers.get(header) || "none"}`);
      }
    }
    checkCors(check.name, response, responseFailures);
    failures.push(...responseFailures.map((failure) => `${check.name}:${failure}`));
    checks.push({
      name: check.name,
      path: check.path,
      method: check.method,
      status: response.status,
      failed: responseFailures.length,
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
  await writeFile(resolve(args.outDir, "security-headers.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({
    ok: report.ok,
    mode: report.mode,
    outDir: args.outDir,
    failed: failures.length,
    checks: checks.length,
  }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
