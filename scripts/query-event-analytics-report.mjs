import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SITE_DIR = resolve(process.cwd(), "fursay-optimized-site");
const DEFAULT_OUT = "/tmp/fursay-event-analytics-report";
const DATASET = "fursay_events";
const WINDOW_DAYS = 7;
const QUERIES = [
  {
    name: "event_totals",
    description: "Top anonymous event types in the last 7 days.",
    sql: `SELECT blob1 AS event, SUM(_sample_interval * double1) AS events FROM ${DATASET} WHERE timestamp >= NOW() - INTERVAL '${WINDOW_DAYS}' DAY GROUP BY event ORDER BY events DESC LIMIT 50 FORMAT JSON`,
  },
  {
    name: "subscribe_funnel_by_pack",
    description: "Subscribe open and submit events split by Koko/Noor pack.",
    sql: `SELECT blob1 AS event, blob6 AS pack, SUM(_sample_interval * double1) AS events FROM ${DATASET} WHERE timestamp >= NOW() - INTERVAL '${WINDOW_DAYS}' DAY AND blob1 IN ('fursay_subscribe_open_click','fursay_subscribe_modal_open','fursay_subscribe_submit_attempt','fursay_subscribe_submit_success','fursay_subscribe_submit_failure') GROUP BY event, pack ORDER BY event, events DESC FORMAT JSON`,
  },
  {
    name: "page_intent",
    description: "Subscription and product-interest intent by landing path.",
    sql: `SELECT blob2 AS path, blob1 AS event, blob6 AS pack, SUM(_sample_interval * double1) AS events FROM ${DATASET} WHERE timestamp >= NOW() - INTERVAL '${WINDOW_DAYS}' DAY AND blob1 IN ('fursay_subscribe_open_click','fursay_product_interest_click') GROUP BY path, event, pack ORDER BY events DESC LIMIT 100 FORMAT JSON`,
  },
  {
    name: "affiliate_interest",
    description: "Affiliate clicks by market and product id.",
    sql: `SELECT blob8 AS market, blob9 AS product_id, SUM(_sample_interval * double1) AS events FROM ${DATASET} WHERE timestamp >= NOW() - INTERVAL '${WINDOW_DAYS}' DAY AND blob1 = 'fursay_affiliate_click' GROUP BY market, product_id ORDER BY events DESC LIMIT 100 FORMAT JSON`,
  },
  {
    name: "outbound_destinations",
    description: "Outbound clicks by host and path.",
    sql: `SELECT blob10 AS outbound_host, blob11 AS outbound_path, SUM(_sample_interval * double1) AS events FROM ${DATASET} WHERE timestamp >= NOW() - INTERVAL '${WINDOW_DAYS}' DAY AND blob1 = 'fursay_outbound_click' GROUP BY outbound_host, outbound_path ORDER BY events DESC LIMIT 100 FORMAT JSON`,
  },
];

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    outDir: DEFAULT_OUT,
    requireLive: args.includes("--require-live"),
    dryRun: args.includes("--dry-run"),
  };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--out-dir") parsed.outDir = args[++i];
  }
  return parsed;
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(SITE_DIR, path), "utf8"));
}

async function runSql(accountId, token, sql) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "text/plain; charset=utf-8",
    },
    body: sql,
  });
  const text = await response.text();
  let body = text;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return {
    ok: response.ok,
    status: response.status,
    body,
  };
}

async function main() {
  const args = parseArgs();
  const release = await readJson("release.json");
  const conversionHealth = await readJson("conversion-health.json");
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
  const token = process.env.CLOUDFLARE_ANALYTICS_TOKEN || process.env.CLOUDFLARE_API_TOKEN || "";
  const canQuery = Boolean(accountId && token && !args.dryRun);
  const failures = [];

  if (conversionHealth.measurement?.analyticsSink?.dataset !== DATASET) failures.push("bad_dataset");
  if (conversionHealth.measurement?.analyticsSink?.blobFields?.length !== release.liveExpectations?.eventAnalyticsBlobFields) failures.push("blob_field_count_mismatch");
  if (conversionHealth.measurement?.analyticsSink?.doubleFields?.length !== release.liveExpectations?.eventAnalyticsDoubleFields) failures.push("double_field_count_mismatch");
  if (conversionHealth.measurement?.analyticsReport?.script !== "scripts/query-event-analytics-report.mjs") failures.push("manifest_missing_report_script");
  if (conversionHealth.measurement?.analyticsReport?.windowDays !== WINDOW_DAYS) failures.push("manifest_bad_report_window");
  if (conversionHealth.measurement?.analyticsReport?.queries?.length !== QUERIES.length) failures.push("manifest_bad_report_query_count");

  const queryReports = [];
  if (canQuery) {
    for (const query of QUERIES) {
      const result = await runSql(accountId, token, query.sql);
      queryReports.push({ ...query, result });
      if (!result.ok) failures.push(`query_failed:${query.name}:${result.status}`);
    }
  } else if (args.requireLive) {
    failures.push(accountId ? "missing_cloudflare_analytics_token" : "missing_cloudflare_account_id");
  } else {
    queryReports.push(...QUERIES.map((query) => ({ ...query, result: null })));
  }

  const status = canQuery ? "queried" : "pending_cloudflare_credentials_or_enablement";
  const report = {
    ok: failures.length === 0,
    status,
    generatedAt: new Date().toISOString(),
    source: release.source,
    dataset: DATASET,
    windowDays: WINDOW_DAYS,
    credentialsPresent: {
      accountId: Boolean(accountId),
      analyticsToken: Boolean(token),
    },
    piiAllowed: false,
    note: canQuery
      ? "Queried Cloudflare Analytics Engine SQL API."
      : "No Analytics Engine query was attempted; provide CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_ANALYTICS_TOKEN after enabling the dataset.",
    failures,
    queries: queryReports,
  };

  await mkdir(args.outDir, { recursive: true });
  await writeFile(resolve(args.outDir, "event-analytics-report.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    outDir: args.outDir,
    queries: QUERIES.length,
    queried: canQuery,
    failed: failures.length,
  }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
