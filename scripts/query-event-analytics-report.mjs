import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SITE_DIR = resolve(process.cwd(), "fursay-optimized-site");
const DEFAULT_OUT = "/tmp/fursay-event-analytics-report";
const DATASET = "fursay_events";
const PRIMARY_WINDOW_DAYS = 7;
const COMPARISON_WINDOWS_DAYS = [7, 30];
const QA_ISOLATION_STARTED_AT = "2026-06-28T14:15:00.000Z";
const CLEAN_DECISION_WINDOW_DAYS = 30;
const PAGE_INTENT_EVENTS = [
  "fursay_subscribe_open_click",
  "fursay_product_info_click",
  "fursay_product_interest_click",
  "fursay_product_sample_download_click",
];
const PRODUCT_SIGNAL_EVENTS = {
  productInfoClicks: "fursay_product_info_click",
  productSampleDownloads: "fursay_product_sample_download_click",
  productInterestClicks: "fursay_product_interest_click",
  subscriberSignals: "fursay_subscribe_submit_success",
};
const DECISION_TRAFFIC_FILTER = [
  "lower(blob7) NOT LIKE '%contract%'",
  "lower(blob7) NOT LIKE '%test%'",
  "lower(blob16) NOT LIKE '%contract%'",
  "lower(blob16) NOT LIKE '%test%'",
  "lower(blob16) NOT LIKE 'fursay_qa_%'",
  "lower(blob18) NOT IN ('contract', 'test', 'qa')",
].join(" AND ");

function windowQueries(days) {
  return [
    {
      name: `event_totals_${days}d`,
      family: "event_totals",
      windowDays: days,
      description: `Top anonymous event types in the last ${days} days.`,
      sql: `SELECT blob1 AS event, SUM(_sample_interval * double1) AS events FROM ${DATASET} WHERE timestamp >= NOW() - INTERVAL '${days}' DAY AND ${DECISION_TRAFFIC_FILTER} GROUP BY event ORDER BY events DESC LIMIT 50 FORMAT JSON`,
    },
    {
      name: `subscribe_funnel_by_pack_${days}d`,
      family: "subscribe_funnel_by_pack",
      windowDays: days,
      description: `Subscribe open and submit events split by Koko/Noor pack in the last ${days} days.`,
      sql: `SELECT blob1 AS event, blob6 AS pack, SUM(_sample_interval * double1) AS events FROM ${DATASET} WHERE timestamp >= NOW() - INTERVAL '${days}' DAY AND ${DECISION_TRAFFIC_FILTER} AND blob1 IN ('fursay_subscribe_open_click','fursay_subscribe_modal_open','fursay_subscribe_submit_attempt','fursay_subscribe_submit_success','fursay_subscribe_submit_failure') GROUP BY event, pack ORDER BY event, events DESC FORMAT JSON`,
    },
    {
      name: `page_intent_${days}d`,
      family: "page_intent",
      windowDays: days,
      description: `Subscription, product info, sample download, and product-interest intent by landing path in the last ${days} days.`,
      sql: `SELECT blob2 AS path, blob1 AS event, blob6 AS pack, blob13 AS product_interest, blob14 AS interest_stage, blob16 AS source_id, blob17 AS creator, blob18 AS placement, SUM(_sample_interval * double1) AS events FROM ${DATASET} WHERE timestamp >= NOW() - INTERVAL '${days}' DAY AND ${DECISION_TRAFFIC_FILTER} AND blob1 IN (${PAGE_INTENT_EVENTS.map((event) => `'${event}'`).join(",")}) GROUP BY path, event, pack, product_interest, interest_stage, source_id, creator, placement ORDER BY events DESC LIMIT 100 FORMAT JSON`,
    },
    {
      name: `affiliate_interest_${days}d`,
      family: "affiliate_interest",
      windowDays: days,
      description: `Affiliate clicks by market and product id in the last ${days} days.`,
      sql: `SELECT blob8 AS market, blob9 AS product_id, SUM(_sample_interval * double1) AS events FROM ${DATASET} WHERE timestamp >= NOW() - INTERVAL '${days}' DAY AND ${DECISION_TRAFFIC_FILTER} AND blob1 = 'fursay_affiliate_click' GROUP BY market, product_id ORDER BY events DESC LIMIT 100 FORMAT JSON`,
    },
    {
      name: `outbound_destinations_${days}d`,
      family: "outbound_destinations",
      windowDays: days,
      description: `Outbound clicks by host and path in the last ${days} days.`,
      sql: `SELECT blob10 AS outbound_host, blob11 AS outbound_path, SUM(_sample_interval * double1) AS events FROM ${DATASET} WHERE timestamp >= NOW() - INTERVAL '${days}' DAY AND ${DECISION_TRAFFIC_FILTER} AND blob1 = 'fursay_outbound_click' GROUP BY outbound_host, outbound_path ORDER BY events DESC LIMIT 100 FORMAT JSON`,
    },
    {
      name: `noor_growth_signals_${days}d`,
      family: "noor_growth_signals",
      windowDays: days,
      description: `Noor-specific subscriber, story-pack, PDF sample, and worksheet validation signals in the last ${days} days.`,
      sql: `SELECT blob1 AS event, blob2 AS path, blob6 AS pack, blob7 AS signup_source, blob13 AS product_interest, blob14 AS interest_stage, blob16 AS source_id, blob17 AS creator, blob18 AS placement, SUM(_sample_interval * double1) AS events FROM ${DATASET} WHERE timestamp >= NOW() - INTERVAL '${days}' DAY AND ${DECISION_TRAFFIC_FILTER} AND (blob6 = 'noor' OR blob13 = 'noor' OR blob2 LIKE '%arabic%' OR blob2 LIKE '%noor%' OR blob16 LIKE 'noor_%') AND blob1 IN ('fursay_subscribe_open_click','fursay_subscribe_modal_open','fursay_subscribe_submit_attempt','fursay_subscribe_submit_success','fursay_product_info_click','fursay_product_interest_click','fursay_product_sample_download_click') GROUP BY event, path, pack, signup_source, product_interest, interest_stage, source_id, creator, placement ORDER BY events DESC LIMIT 100 FORMAT JSON`,
    },
  ];
}

const QUERIES = COMPARISON_WINDOWS_DAYS.flatMap(windowQueries);

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

function resultRows(result) {
  const body = result?.body;
  if (!body) return [];
  if (Array.isArray(body)) return body;
  if (Array.isArray(body.data)) return body.data;
  if (Array.isArray(body.result?.data)) return body.result.data;
  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed.data)) return parsed.data;
    } catch {
      return [];
    }
  }
  return [];
}

function rowEvents(row) {
  const value = Number(row?.events ?? row?.event_count ?? row?.count ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function rowsFor(queryReports, windowDays, family = "") {
  return queryReports
    .filter((query) => query.windowDays === windowDays && (!family || query.family === family))
    .flatMap((query) => resultRows(query.result));
}

function signalCount(queryReports, windowDays, pack, eventName) {
  return rowsFor(queryReports, windowDays)
    .filter((row) => {
      if (row?.event !== eventName) return false;
      if (row?.pack === pack) return true;
      if (row?.product_interest === pack) return true;
      return false;
    })
    .reduce((total, row) => total + rowEvents(row), 0);
}

function sourceIdCount(queryReports, windowDays, sourceIds) {
  const ids = new Set(sourceIds.filter(Boolean));
  if (!ids.size) return 0;
  return rowsFor(queryReports, windowDays, "noor_growth_signals")
    .filter((row) => ids.has(row?.source_id))
    .reduce((total, row) => total + rowEvents(row), 0);
}

function sourceAttributionCount(queryReports, windowDays, pack) {
  return rowsFor(queryReports, windowDays, "page_intent")
    .filter((row) => {
      if (row?.pack === pack || row?.product_interest === pack) return true;
      return String(row?.source_id || "").startsWith(`${pack}_`);
    })
    .reduce((total, row) => total + rowEvents(row), 0);
}

function buildDecisionScoreboard(conversionHealth, queryReports, canQuery) {
  const products = conversionHealth.monetization?.ownedProducts?.products || [];
  const windows = COMPARISON_WINDOWS_DAYS;
  const pending = !canQuery;
  const cleanWindowReadyAt = new Date(new Date(QA_ISOLATION_STARTED_AT).getTime() + CLEAN_DECISION_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const cleanWindowComplete = Date.now() >= cleanWindowReadyAt.getTime();
  const productScorecards = products.map((product) => {
    const thresholds = product.validationPlan?.minimumSignals || {};
    const countsByWindow = Object.fromEntries(windows.map((days) => {
      const counts = pending ? {
        productInfoClicks: null,
        productSampleDownloads: null,
        productInterestClicks: null,
        subscriberSignals: null,
        sourceAttributionEvents: null,
      } : {
        productInfoClicks: signalCount(queryReports, days, product.pack, PRODUCT_SIGNAL_EVENTS.productInfoClicks),
        productSampleDownloads: signalCount(queryReports, days, product.pack, PRODUCT_SIGNAL_EVENTS.productSampleDownloads),
        productInterestClicks: signalCount(queryReports, days, product.pack, PRODUCT_SIGNAL_EVENTS.productInterestClicks),
        subscriberSignals: signalCount(queryReports, days, product.pack, PRODUCT_SIGNAL_EVENTS.subscriberSignals),
        sourceAttributionEvents: sourceAttributionCount(queryReports, days, product.pack),
      };
      const thresholdMet = !pending
        && counts.productInfoClicks >= (thresholds.productInfoClicks || 0)
        && counts.productInterestClicks >= (thresholds.productInterestClicks || 0)
        && counts.subscriberSignals >= (thresholds.subscriberSignals || 0);
      return [String(days), {
        ...counts,
        status: pending
          ? "pending_analytics_query"
          : thresholdMet && cleanWindowComplete
            ? "threshold_met"
            : thresholdMet
              ? "threshold_met_pending_clean_window"
              : "below_threshold",
      }];
    }));
    return {
      id: product.id,
      pack: product.pack,
      label: product.label,
      thresholds: {
        productInfoClicks: thresholds.productInfoClicks || 0,
        productSampleDownloads: thresholds.productSampleDownloads || 0,
        productInterestClicks: thresholds.productInterestClicks || 0,
        subscriberSignals: thresholds.subscriberSignals || 0,
      },
      countsByWindow,
      reportQueries: ["page_intent", "subscribe_funnel_by_pack", "noor_growth_signals"],
      acceptedPreRevenueSignals: ["productSampleDownloads", "productInterestClicks", "sourceAttributionEvents", "subscriberSignals"],
      revenueClaimFields: ["purchases", "revenue_usd"],
      nextDecision: product.validationPlan?.nextDecision || "",
    };
  });

  const noorVariants = conversionHealth.growth?.noorSprintVariants || [];
  const noorCountsByWindow = Object.fromEntries(windows.map((days) => {
    const subscriberSignals = pending
      ? null
      : signalCount(queryReports, days, "noor", PRODUCT_SIGNAL_EVENTS.subscriberSignals);
    return [String(days), {
      subscriberSignals,
      status: pending
        ? "pending_analytics_query"
        : subscriberSignals >= (conversionHealth.growth?.noorSubscriberSignalGoal || 1) && cleanWindowComplete
          ? "subscriber_signal_received"
          : subscriberSignals >= (conversionHealth.growth?.noorSubscriberSignalGoal || 1)
            ? "subscriber_signal_received_pending_clean_window"
          : "waiting_for_first_real_subscriber_signal",
    }];
  }));
  const noorSprintVariants = noorVariants.map((variant) => ({
    id: variant.id,
    label: variant.label,
    placement: variant.placement,
    sourceId: variant.sourceId,
    storySourceId: variant.storySourceId || "",
    link: variant.link,
    storyLink: variant.storyLink || "",
    countsByWindow: Object.fromEntries(windows.map((days) => [String(days), {
      events: pending ? null : sourceIdCount(queryReports, days, [variant.sourceId, variant.storySourceId]),
      status: pending ? "pending_analytics_query" : "queried",
    }])),
  }));

  return {
    status: pending ? "pending_analytics_query" : "queried",
    piiAllowed: false,
    windows,
    dataQuality: {
      decisionTraffic: "qa_excluded",
      qaExclusionFilter: DECISION_TRAFFIC_FILTER,
      automationTrafficPolicy: "Contract, test, and fursay_qa_* source_id traffic is excluded from monetization threshold decisions.",
      caveat: "Historical unmarked automation events can remain in the dataset until a clean collection window has elapsed.",
      qaIsolationStartedAt: QA_ISOLATION_STARTED_AT,
      cleanWindowDays: CLEAN_DECISION_WINDOW_DAYS,
      cleanWindowReadyAt: cleanWindowReadyAt.toISOString(),
      cleanWindowComplete,
    },
    unlockPolicy: conversionHealth.monetization?.ownedProducts?.validationDashboard?.unlockPolicy || "",
    revenueClaimPolicy: "Sample downloads, product-interest clicks, source_id/placement aggregates, and subscriber signals are pre-revenue validation only; purchases and revenue_usd are the only revenue claim fields.",
    productSignalEvents: PRODUCT_SIGNAL_EVENTS,
    products: productScorecards,
    noorFirstSubscriber: {
      goal: conversionHealth.growth?.noorSubscriberSignalGoal || 1,
      readinessStatus: conversionHealth.growth?.noorReadinessStatus || "",
      countsByWindow: noorCountsByWindow,
      reportQuery: "noor_growth_signals",
    },
    noorSprintVariants,
  };
}

function buildEnablementHandoff(conversionHealth, canQuery) {
  const analyticsReport = conversionHealth.measurement?.analyticsReport || {};
  const analyticsSink = conversionHealth.measurement?.analyticsSink || {};
  const requiredEnv = Array.isArray(analyticsReport.requiredEnv) && analyticsReport.requiredEnv.length
    ? analyticsReport.requiredEnv
    : ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_ANALYTICS_TOKEN"];
  return {
    status: canQuery ? "queried" : "pending_cloudflare_credentials_or_enablement",
    piiAllowed: false,
    dataset: analyticsReport.dataset || DATASET,
    binding: analyticsSink.binding || "FURSAY_EVENTS",
    dashboardUrl: analyticsSink.enablementUrl || "",
    reportCommand: analyticsReport.packageScript || "npm run report:events",
    readinessCommand: "npm run deploy:ready -- --require-cloudflare",
    noorReviewCommand: "npm run noor:sprint:review",
    blockedBy: canQuery ? [] : [
      "pending_cloudflare_dashboard_enablement",
      "missing_cloudflare_account_or_analytics_token",
    ],
    requiredEnv,
    privacyBoundary: "Report rows and sprint notes must stay aggregate only; do not record email, name, phone, address, subscriber IDs, MailerLite IDs, or token values.",
    steps: [
      {
        id: "enable_dataset",
        label: "Enable Analytics Engine dataset",
        action: `Enable dataset ${analyticsReport.dataset || DATASET} for Worker binding ${analyticsSink.binding || "FURSAY_EVENTS"}.`,
        evidence: "Cloudflare dashboard accepts the dataset and the Worker can deploy with the analytics binding.",
      },
      {
        id: "provide_credentials",
        label: "Provide query credentials locally or in CI",
        action: `Set ${requiredEnv.join(" plus ")} without printing or committing token values.`,
        evidence: "credentialsPresent.accountId and credentialsPresent.analyticsToken are both true in the report JSON.",
      },
      {
        id: "run_deploy_readiness",
        label: "Run deploy readiness with Cloudflare requirements",
        action: "npm run deploy:ready -- --require-cloudflare",
        evidence: "deploy-readiness reports analyticsReport.ready=true and no Cloudflare credential failures.",
      },
      {
        id: "run_event_report",
        label: "Run the 7-day / 30-day event report",
        action: analyticsReport.packageScript || "npm run report:events",
        evidence: "event-analytics-report.json status=queried, queries=12, and decisionScoreboard.status=queried.",
      },
      {
        id: "review_noor_signal",
        label: "Review Noor subscriber signal",
        action: "npm run noor:sprint:review",
        evidence: "Noor review uses noor_growth_signals_7d aggregate rows and records only non-identifying signal evidence.",
      },
    ],
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
  if (conversionHealth.measurement?.analyticsReport?.windowDays !== PRIMARY_WINDOW_DAYS) failures.push("manifest_bad_report_window");
  if ((conversionHealth.measurement?.analyticsReport?.comparisonWindows || []).join(",") !== COMPARISON_WINDOWS_DAYS.join(",")) failures.push("manifest_bad_comparison_windows");
  if (conversionHealth.measurement?.analyticsReport?.queries?.length !== QUERIES.length) failures.push("manifest_bad_report_query_count");
  const pageIntent = QUERIES.find((query) => query.family === "page_intent" && query.windowDays === PRIMARY_WINDOW_DAYS);
  for (const eventName of PAGE_INTENT_EVENTS) {
    if (!pageIntent?.sql.includes(eventName)) failures.push(`page_intent_missing_event:${eventName}`);
    if (!conversionHealth.events?.includes(eventName)) failures.push(`manifest_missing_page_intent_event:${eventName}`);
  }
  for (const query of QUERIES) {
    if (!query.sql.includes(DECISION_TRAFFIC_FILTER)) failures.push(`query_missing_decision_traffic_filter:${query.name}`);
  }
  for (const days of COMPARISON_WINDOWS_DAYS) {
    if (!QUERIES.some((query) => query.name === `noor_growth_signals_${days}d`)) failures.push(`missing_noor_growth_query:${days}`);
  }
  const noorGrowth = QUERIES.find((query) => query.name === `noor_growth_signals_${PRIMARY_WINDOW_DAYS}d`);
  for (const expected of ["blob16 AS source_id", "blob17 AS creator", "blob18 AS placement", "blob16 LIKE 'noor_%'"]) {
    if (!noorGrowth?.sql.includes(expected)) failures.push(`noor_growth_query_missing_variant_attribution:${expected}`);
  }

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

  const decisionScoreboard = buildDecisionScoreboard(conversionHealth, queryReports, canQuery);
  const enablementHandoff = buildEnablementHandoff(conversionHealth, canQuery);
  if (decisionScoreboard.piiAllowed !== false) failures.push("decision_scoreboard_pii_allowed");
  if (decisionScoreboard.dataQuality?.decisionTraffic !== "qa_excluded") failures.push("decision_scoreboard_missing_qa_exclusion");
  if (decisionScoreboard.products.length !== (conversionHealth.monetization?.ownedProducts?.products || []).length) failures.push("decision_scoreboard_product_count_mismatch");
  if (decisionScoreboard.noorSprintVariants.length !== (conversionHealth.growth?.noorSprintVariants || []).length) failures.push("decision_scoreboard_noor_variant_count_mismatch");
  for (const product of decisionScoreboard.products) {
    if (!product.thresholds.productInfoClicks) failures.push(`decision_scoreboard_missing_info_threshold:${product.id}`);
    if (!product.thresholds.productInterestClicks) failures.push(`decision_scoreboard_missing_interest_threshold:${product.id}`);
    if (!product.thresholds.subscriberSignals) failures.push(`decision_scoreboard_missing_subscriber_threshold:${product.id}`);
    for (const eventName of Object.values(PRODUCT_SIGNAL_EVENTS)) {
      if (!conversionHealth.events?.includes(eventName)) failures.push(`decision_scoreboard_unknown_signal_event:${eventName}`);
    }
  }
  if (!decisionScoreboard.noorFirstSubscriber.goal) failures.push("decision_scoreboard_missing_noor_goal");
  if (enablementHandoff.piiAllowed !== false) failures.push("enablement_handoff_pii_allowed");
  if (enablementHandoff.dataset !== DATASET) failures.push("enablement_handoff_bad_dataset");
  if (enablementHandoff.binding !== "FURSAY_EVENTS") failures.push("enablement_handoff_bad_binding");
  if (!enablementHandoff.dashboardUrl.includes("/workers/analytics-engine")) failures.push("enablement_handoff_missing_dashboard_url");
  if (enablementHandoff.reportCommand !== "npm run report:events") failures.push("enablement_handoff_bad_report_command");
  if (!enablementHandoff.readinessCommand.includes("--require-cloudflare")) failures.push("enablement_handoff_missing_strict_readiness");
  if (enablementHandoff.steps.length !== 5) failures.push("enablement_handoff_step_count");
  for (const id of ["enable_dataset", "provide_credentials", "run_deploy_readiness", "run_event_report", "review_noor_signal"]) {
    if (!enablementHandoff.steps.some((step) => step.id === id)) failures.push(`enablement_handoff_missing_step:${id}`);
  }
  if (!enablementHandoff.privacyBoundary.includes("aggregate only")) failures.push("enablement_handoff_missing_aggregate_boundary");
  for (const forbidden of ["email", "name", "phone", "address", "subscriber IDs", "MailerLite IDs", "token values"]) {
    if (!enablementHandoff.privacyBoundary.includes(forbidden)) failures.push(`enablement_handoff_missing_privacy_term:${forbidden}`);
  }

  const status = canQuery ? "queried" : "pending_cloudflare_credentials_or_enablement";
  const report = {
    ok: failures.length === 0,
    status,
    generatedAt: new Date().toISOString(),
    source: release.source,
    dataset: DATASET,
    windowDays: PRIMARY_WINDOW_DAYS,
    comparisonWindows: COMPARISON_WINDOWS_DAYS,
    credentialsPresent: {
      accountId: Boolean(accountId),
      analyticsToken: Boolean(token),
    },
    piiAllowed: false,
    note: canQuery
      ? "Queried Cloudflare Analytics Engine SQL API."
      : "No Analytics Engine query was attempted; provide CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_ANALYTICS_TOKEN after enabling the dataset.",
    dataQuality: {
      decisionTraffic: "qa_excluded",
      qaExclusionFilter: DECISION_TRAFFIC_FILTER,
      automationTrafficPolicy: "Automated contract and deployment smoke events are excluded from decision queries when they carry contract/test/fursay_qa source markers.",
      caveat: "Use a clean 7-day and 30-day collection window after QA isolation before changing checkout or paid-product status.",
      qaIsolationStartedAt: QA_ISOLATION_STARTED_AT,
      cleanWindowDays: CLEAN_DECISION_WINDOW_DAYS,
      cleanWindowReadyAt: new Date(new Date(QA_ISOLATION_STARTED_AT).getTime() + CLEAN_DECISION_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    },
    enablementHandoff,
    decisionScoreboard,
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
