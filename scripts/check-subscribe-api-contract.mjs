import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import worker from "../src/worker.js";

const DEFAULT_OUT = "/tmp/fursay-subscribe-api-contract";
const ORIGIN = "https://fursay.com";
const SECURITY_HEADERS = [
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
  "x-frame-options",
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

function request(path, init = {}) {
  return new Request(`${ORIGIN}${path}`, init);
}

function jsonBody(value) {
  return {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  };
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function checkCommonResponse(failures, label, response, expectedStatus) {
  if (response.status !== expectedStatus) failures.push(`${label}:status:${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) failures.push(`${label}:content_type:${contentType || "none"}`);
  for (const header of SECURITY_HEADERS) {
    if (!response.headers.get(header)) failures.push(`${label}:missing_security_header:${header}`);
  }
  if (response.headers.get("access-control-allow-origin") !== "*") failures.push(`${label}:missing_cors_origin`);
  if (!response.headers.get("access-control-allow-methods")?.includes("POST")) failures.push(`${label}:missing_cors_methods`);
}

async function localFetch(init = {}, env = {}, fetchStub) {
  const originalFetch = globalThis.fetch;
  if (fetchStub) globalThis.fetch = fetchStub;
  try {
    return await worker.fetch(request("/api/subscribe", init), env);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function liveFetch(baseUrl, path, init = {}) {
  return fetch(`${baseUrl}${path}`, init);
}

async function runLocal() {
  const failures = [];
  const checks = [];

  let externalCalls = 0;
  const noExternalFetch = async () => {
    externalCalls += 1;
    return new Response("unexpected", { status: 500 });
  };

  const method = await localFetch({ method: "GET" }, {}, noExternalFetch);
  checkCommonResponse(failures, "method_not_allowed", method, 405);
  checks.push({ name: "method_not_allowed", status: method.status, body: await readJson(method) });

  const options = await worker.fetch(request("/api/subscribe", { method: "OPTIONS" }), {});
  if (options.status !== 200) failures.push(`options:status:${options.status}`);
  if (options.headers.get("access-control-allow-origin") !== "*") failures.push("options:missing_cors_origin");
  for (const header of SECURITY_HEADERS) {
    if (!options.headers.get(header)) failures.push(`options:missing_security_header:${header}`);
  }
  checks.push({ name: "options", status: options.status });

  const invalidJson = await localFetch({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{bad-json",
  }, {}, noExternalFetch);
  checkCommonResponse(failures, "invalid_json", invalidJson, 400);
  checks.push({ name: "invalid_json", status: invalidJson.status, body: await readJson(invalidJson) });

  const invalidEmail = await localFetch({
    method: "POST",
    ...jsonBody({ email: "not-an-email", groups: ["koko"] }),
  }, {}, noExternalFetch);
  checkCommonResponse(failures, "invalid_email", invalidEmail, 400);
  checks.push({ name: "invalid_email", status: invalidEmail.status, body: await readJson(invalidEmail) });

  const missingToken = await localFetch({
    method: "POST",
    ...jsonBody({ email: "family@example.test", groups: ["koko", "noor"] }),
  }, {
    MAILERLITE_GROUP_FURSAY_ALL: "all",
    MAILERLITE_GROUP_KOKO: "koko-group",
    MAILERLITE_GROUP_NOOR: "noor-group",
  }, noExternalFetch);
  checkCommonResponse(failures, "missing_token", missingToken, 500);
  checks.push({ name: "missing_token", status: missingToken.status, body: await readJson(missingToken) });

  let capturedPayload = null;
  const successFetch = async (url, init) => {
    externalCalls += 1;
    capturedPayload = JSON.parse(init.body);
    if (url !== "https://connect.mailerlite.com/api/subscribers") {
      return new Response("bad url", { status: 500 });
    }
    return new Response(JSON.stringify({ data: { id: "sub_1" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  const success = await localFetch({
    method: "POST",
    ...jsonBody({
      email: "  Family@Example.test  ",
      groups: ["koko", "noor", "unknown"],
      child_age: "4",
      region: "TW",
      attribution: {
        signup_source: "test_source",
        landing_path: "/arabic",
        landing_locale: "en",
        utm_source: "newsletter",
        utm_content: "line1\nline2",
        source_id: "episode-001",
      },
    }),
  }, {
    MAILERLITE_API_TOKEN: "secret-token",
    MAILERLITE_GROUP_FURSAY_ALL: "all",
    MAILERLITE_GROUP_KOKO: "koko-group",
    MAILERLITE_GROUP_NOOR: "noor-group",
    MAILERLITE_ENABLE_ATTRIBUTION_FIELDS: "1",
    MAILERLITE_FIELD_SOURCE_ID: "source_id",
  }, successFetch);
  checkCommonResponse(failures, "success", success, 200);
  checks.push({ name: "success", status: success.status, body: await readJson(success), capturedPayload });
  if (capturedPayload?.email !== "Family@Example.test") failures.push(`success:email_not_trimmed:${capturedPayload?.email || "none"}`);
  if ((capturedPayload?.groups || []).join(",") !== "all,koko-group,noor-group") {
    failures.push(`success:bad_groups:${(capturedPayload?.groups || []).join(",") || "none"}`);
  }
  if (capturedPayload?.fields?.utm_content !== "line1 line2") failures.push(`success:bad_sanitized_attribution:${capturedPayload?.fields?.utm_content || "none"}`);
  if (capturedPayload?.fields?.source_id !== "episode-001") failures.push(`success:missing_optional_attribution:${capturedPayload?.fields?.source_id || "none"}`);

  const conflict = await localFetch({
    method: "POST",
    ...jsonBody({ email: "family@example.test", groups: ["koko"] }),
  }, {
    MAILERLITE_API_TOKEN: "secret-token",
    MAILERLITE_GROUP_KOKO: "koko-group",
  }, async () => {
    externalCalls += 1;
    return new Response(JSON.stringify({ message: "already exists" }), { status: 409 });
  });
  checkCommonResponse(failures, "conflict", conflict, 200);
  checks.push({ name: "conflict", status: conflict.status, body: await readJson(conflict) });

  const providerFail = await localFetch({
    method: "POST",
    ...jsonBody({ email: "family@example.test", groups: ["koko"] }),
  }, {
    MAILERLITE_API_TOKEN: "secret-token",
    MAILERLITE_GROUP_KOKO: "koko-group",
  }, async () => {
    externalCalls += 1;
    return new Response("provider details should not leak", { status: 503 });
  });
  checkCommonResponse(failures, "provider_fail", providerFail, 502);
  const providerBody = await readJson(providerFail);
  if (JSON.stringify(providerBody).includes("provider details")) failures.push("provider_fail:leaked_provider_detail");
  checks.push({ name: "provider_fail", status: providerFail.status, body: providerBody });

  if (externalCalls !== 3) failures.push(`external_call_count:${externalCalls}`);
  return { mode: "local-worker", failures, checks };
}

async function runLive(baseUrl) {
  const failures = [];
  const checks = [];

  const options = await liveFetch(baseUrl, "/api/subscribe", { method: "OPTIONS" });
  if (options.status !== 200) failures.push(`options:status:${options.status}`);
  if (options.headers.get("access-control-allow-origin") !== "*") failures.push("options:missing_cors_origin");
  for (const header of SECURITY_HEADERS) {
    if (!options.headers.get(header)) failures.push(`options:missing_security_header:${header}`);
  }
  checks.push({ name: "options", status: options.status });

  const method = await liveFetch(baseUrl, "/api/subscribe", { method: "GET" });
  checkCommonResponse(failures, "method_not_allowed", method, 405);
  checks.push({ name: "method_not_allowed", status: method.status, body: await readJson(method) });

  const invalidJson = await liveFetch(baseUrl, "/api/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{bad-json",
  });
  checkCommonResponse(failures, "invalid_json", invalidJson, 400);
  checks.push({ name: "invalid_json", status: invalidJson.status, body: await readJson(invalidJson) });

  const invalidEmail = await liveFetch(baseUrl, "/api/subscribe", {
    method: "POST",
    ...jsonBody({ email: "not-an-email", groups: ["koko"] }),
  });
  checkCommonResponse(failures, "invalid_email", invalidEmail, 400);
  checks.push({ name: "invalid_email", status: invalidEmail.status, body: await readJson(invalidEmail) });

  return { mode: "live", failures, checks };
}

async function main() {
  const args = parseArgs();
  const result = args.baseUrl ? await runLive(args.baseUrl) : await runLocal();
  const report = {
    ok: result.failures.length === 0,
    mode: result.mode,
    baseUrl: args.baseUrl || "",
    safety: {
      liveModeSubmitsValidEmail: false,
      localModeUsesStubbedMailerLite: true,
      secretsRead: false,
    },
    failures: result.failures,
    checks: result.checks,
  };
  await mkdir(args.outDir, { recursive: true });
  await writeFile(resolve(args.outDir, "subscribe-api-contract.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({
    ok: report.ok,
    mode: report.mode,
    outDir: args.outDir,
    failed: report.failures.length,
    checks: report.checks.length,
  }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
