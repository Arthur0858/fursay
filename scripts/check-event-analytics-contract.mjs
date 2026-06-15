import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import worker from "../src/worker.js";

const DEFAULT_OUT = "/tmp/fursay-event-analytics-contract";
const ORIGIN = "https://fursay.com";
const REQUIRED_BLOBS = 18;
const REQUIRED_DOUBLES = 1;
const PRIVATE_NEEDLES = ["event-contract@example.com", "Ada Parent", "phone", "address", "secret-token"];

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { outDir: DEFAULT_OUT, baseUrl: "" };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--out-dir") parsed.outDir = args[++i];
    if (args[i] === "--base-url") parsed.baseUrl = args[++i].replace(/\/$/, "");
  }
  return parsed;
}

function request(init = {}) {
  return new Request(`${ORIGIN}/api/event`, init);
}

function downloadRequest(path) {
  return new Request(`${ORIGIN}${path}`, {
    method: "GET",
    redirect: "manual",
  });
}

function jsonBody(value) {
  return {
    method: "POST",
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

function sampleEvent() {
  return {
    event: "fursay_contract_ping",
    ts: "2026-06-14T00:00:00.000Z",
    detail: {
      path: "/conversion-health",
      locale: "en",
      page_pack: "ops",
      campaign: "conversion_health",
      pack: "noor",
      signup_source: "contract_test",
      market: "amazon",
      product_id: "B000000000",
      outbound_host: "www.youtube.com",
      outbound_path: "/@ArabicKidsChinese",
      link_content: "YouTube",
      copy_kind: "dashboard",
      product_interest: "noor-worksheet-pack",
      interest_stage: "waitlist",
      source_id: "noor_first_subscriber_sprint_direct_dm",
      creator: "fursay",
      placement: "direct_dm",
      email: "event-contract@example.com",
      name: "Ada Parent",
      secret: "secret-token",
    },
  };
}

function commonResponseFailures(label, response, body) {
  const failures = [];
  if (response.status !== 200) failures.push(`${label}:status:${response.status}`);
  if (body.success !== true) failures.push(`${label}:success_not_true`);
  if (!["analytics_engine", "worker_logs"].includes(body.sink)) failures.push(`${label}:bad_sink:${body.sink || "none"}`);
  if (response.headers.get("access-control-allow-origin") !== "*") failures.push(`${label}:missing_cors_origin`);
  if (!response.headers.get("x-content-type-options")) failures.push(`${label}:missing_security_header`);
  return failures;
}

function privateNeedles(value) {
  const text = JSON.stringify(value || {});
  return PRIVATE_NEEDLES.filter((needle) => text.includes(needle));
}

async function runLocal() {
  const failures = [];
  const checks = [];

  const fallbackResponse = await worker.fetch(request(jsonBody(sampleEvent())), {});
  const fallbackBody = await readJson(fallbackResponse);
  failures.push(...commonResponseFailures("fallback", fallbackResponse, fallbackBody));
  if (fallbackBody.sink !== "worker_logs") failures.push(`fallback:sink:${fallbackBody.sink || "none"}`);
  checks.push({ name: "fallback_without_binding", status: fallbackResponse.status, body: fallbackBody });

  const dataPoints = [];
  const analyticsResponse = await worker.fetch(request(jsonBody(sampleEvent())), {
    FURSAY_EVENTS: {
      writeDataPoint(point) {
        dataPoints.push(point);
      },
    },
  });
  const analyticsBody = await readJson(analyticsResponse);
  failures.push(...commonResponseFailures("analytics", analyticsResponse, analyticsBody));
  if (analyticsBody.sink !== "analytics_engine") failures.push(`analytics:sink:${analyticsBody.sink || "none"}`);
  if (dataPoints.length !== 1) failures.push(`analytics:data_point_count:${dataPoints.length}`);
  const point = dataPoints[0] || {};
  if ((point.blobs || []).length !== REQUIRED_BLOBS) failures.push(`analytics:blob_count:${(point.blobs || []).length}`);
  if ((point.doubles || []).length !== REQUIRED_DOUBLES) failures.push(`analytics:double_count:${(point.doubles || []).length}`);
  if ((point.indexes || []).length !== 1) failures.push(`analytics:index_count:${(point.indexes || []).length}`);
  if (point.doubles?.[0] !== 1) failures.push(`analytics:bad_counter:${point.doubles?.[0]}`);
  if (point.blobs?.[0] !== "fursay_contract_ping") failures.push(`analytics:bad_event_blob:${point.blobs?.[0] || "none"}`);
  if (point.blobs?.[1] !== "/conversion-health") failures.push(`analytics:bad_path_blob:${point.blobs?.[1] || "none"}`);
  if (point.blobs?.[10] !== "/@ArabicKidsChinese") failures.push(`analytics:bad_outbound_path_blob:${point.blobs?.[10] || "none"}`);
  if (point.blobs?.[15] !== "noor_first_subscriber_sprint_direct_dm") failures.push(`analytics:bad_source_id_blob:${point.blobs?.[15] || "none"}`);
  if (point.blobs?.[16] !== "fursay") failures.push(`analytics:bad_creator_blob:${point.blobs?.[16] || "none"}`);
  if (point.blobs?.[17] !== "direct_dm") failures.push(`analytics:bad_placement_blob:${point.blobs?.[17] || "none"}`);
  const privateValues = privateNeedles(point);
  if (privateValues.length) failures.push(`analytics:private_values:${privateValues.join(",")}`);
  checks.push({ name: "analytics_engine_binding", status: analyticsResponse.status, body: analyticsBody, dataPoint: point });

  const invalid = await worker.fetch(request(jsonBody({ event: "", detail: {} })), {
    FURSAY_EVENTS: {
      writeDataPoint(point) {
        dataPoints.push(point);
      },
    },
  });
  const invalidBody = await readJson(invalid);
  if (invalid.status !== 400) failures.push(`invalid_event:status:${invalid.status}`);
  if (invalidBody.success !== false) failures.push("invalid_event:success_not_false");
  checks.push({ name: "invalid_event", status: invalid.status, body: invalidBody });

  const downloadPoints = [];
  const trackedDownload = await worker.fetch(downloadRequest("/download/noor-worksheet-sample?source_id=noor_first_subscriber_sprint_pdf_sample_followup&creator=fursay&placement=pdf_sample_followup"), {
    FURSAY_EVENTS: {
      writeDataPoint(point) {
        downloadPoints.push(point);
      },
    },
  });
  const downloadLocation = trackedDownload.headers.get("location") || "";
  if (trackedDownload.status !== 302) failures.push(`tracked_download:status:${trackedDownload.status}`);
  if (!downloadLocation.includes("/downloads/noor-worksheet-sample.pdf")) failures.push(`tracked_download:location:${downloadLocation || "none"}`);
  if (downloadPoints.length !== 1) failures.push(`tracked_download:data_point_count:${downloadPoints.length}`);
  const downloadPoint = downloadPoints[0] || {};
  if (downloadPoint.blobs?.[0] !== "fursay_product_sample_download_click") failures.push(`tracked_download:event:${downloadPoint.blobs?.[0] || "none"}`);
  if (downloadPoint.blobs?.[1] !== "/download/noor-worksheet-sample") failures.push(`tracked_download:path:${downloadPoint.blobs?.[1] || "none"}`);
  if (downloadPoint.blobs?.[5] !== "noor") failures.push(`tracked_download:pack:${downloadPoint.blobs?.[5] || "none"}`);
  if (downloadPoint.blobs?.[12] !== "noor") failures.push(`tracked_download:product_interest:${downloadPoint.blobs?.[12] || "none"}`);
  if (downloadPoint.blobs?.[13] !== "direct_pdf_sample") failures.push(`tracked_download:interest_stage:${downloadPoint.blobs?.[13] || "none"}`);
  if (downloadPoint.blobs?.[15] !== "noor_first_subscriber_sprint_pdf_sample_followup") failures.push(`tracked_download:source_id:${downloadPoint.blobs?.[15] || "none"}`);
  if (downloadPoint.blobs?.[16] !== "fursay") failures.push(`tracked_download:creator:${downloadPoint.blobs?.[16] || "none"}`);
  if (downloadPoint.blobs?.[17] !== "pdf_sample_followup") failures.push(`tracked_download:placement:${downloadPoint.blobs?.[17] || "none"}`);
  const downloadPrivateValues = privateNeedles(downloadPoint);
  if (downloadPrivateValues.length) failures.push(`tracked_download:private_values:${downloadPrivateValues.join(",")}`);
  checks.push({ name: "tracked_sample_download_redirect", status: trackedDownload.status, location: downloadLocation, dataPoint: downloadPoint });

  return { mode: "local-worker", failures, checks };
}

async function runLive(baseUrl) {
  const failures = [];
  const checks = [];
  const response = await fetch(`${baseUrl}/api/event`, jsonBody(sampleEvent()));
  const body = await readJson(response);
  failures.push(...commonResponseFailures("live_analytics", response, body));
  if (!["analytics_engine", "worker_logs"].includes(body.sink)) failures.push(`live_analytics:sink:${body.sink || "none"}`);
  checks.push({ name: "live_anonymous_event_sink", status: response.status, body });

  const trackedDownload = await fetch(`${baseUrl}/download/noor-worksheet-sample?source_id=contract_pdf_sample&creator=fursay&placement=contract`, {
    redirect: "manual",
  });
  const location = trackedDownload.headers.get("location") || "";
  if (trackedDownload.status !== 302) failures.push(`live_tracked_download:status:${trackedDownload.status}`);
  if (!location.includes("/downloads/noor-worksheet-sample.pdf")) failures.push(`live_tracked_download:location:${location || "none"}`);
  checks.push({ name: "live_tracked_sample_download_redirect", status: trackedDownload.status, location });
  return { mode: "live", failures, checks };
}

async function main() {
  const args = parseArgs();
  const result = args.baseUrl ? await runLive(args.baseUrl) : await runLocal();
  await mkdir(args.outDir, { recursive: true });
  const report = {
    ok: result.failures.length === 0,
    mode: result.mode,
    baseUrl: args.baseUrl || "",
    failures: result.failures,
    checks: result.checks,
    analyticsContract: {
      binding: "FURSAY_EVENTS",
      dataset: "fursay_events",
      liveSinkAllowed: ["analytics_engine", "worker_logs"],
      blobCount: REQUIRED_BLOBS,
      doubleCount: REQUIRED_DOUBLES,
      piiAllowed: false,
    },
  };
  await writeFile(resolve(args.outDir, "event-analytics-contract.json"), JSON.stringify(report, null, 2) + "\n");
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
