import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DEFAULT_OUT = "/tmp/fursay-cache-headers";
const FETCH_TIMEOUT_MS = 15_000;

const CHECKS = [
  {
    path: "/",
    status: 200,
    cacheIncludes: ["public", "max-age=300", "must-revalidate"],
    contentTypeIncludes: "text/html",
  },
  {
    path: "/koko",
    status: 200,
    cacheIncludes: ["public", "max-age=300", "must-revalidate"],
    contentTypeIncludes: "text/html",
  },
  {
    path: "/css/picture-world-shared-20260613-traffic12.css",
    status: 200,
    cacheIncludes: ["public", "max-age=31536000", "immutable"],
    contentTypeIncludes: "text/css",
  },
  {
    path: "/css/picture-world-tools-20260613-products1.css",
    status: 200,
    cacheIncludes: ["public", "max-age=31536000", "immutable"],
    contentTypeIncludes: "text/css",
  },
  {
    path: "/css/home-common-20260613-cache1.css",
    status: 200,
    cacheIncludes: ["public", "max-age=31536000", "immutable"],
    contentTypeIncludes: "text/css",
  },
  {
    path: "/css/picture-book-base-20260613-base1.css",
    status: 200,
    cacheIncludes: ["public", "max-age=31536000", "immutable"],
    contentTypeIncludes: "text/css",
  },
  {
    path: "/css/storybook-skin-20260613-inline1.css",
    status: 200,
    cacheIncludes: ["public", "max-age=31536000", "immutable"],
    contentTypeIncludes: "text/css",
  },
  {
    path: "/css/story-page-common-20260613-css1.css",
    status: 200,
    cacheIncludes: ["public", "max-age=31536000", "immutable"],
    contentTypeIncludes: "text/css",
  },
  {
    path: "/css/noor-ltr-page-20260613-cache1.css",
    status: 200,
    cacheIncludes: ["public", "max-age=31536000", "immutable"],
    contentTypeIncludes: "text/css",
  },
  {
    path: "/css/noor-common-20260613-cache1.css",
    status: 200,
    cacheIncludes: ["public", "max-age=31536000", "immutable"],
    contentTypeIncludes: "text/css",
  },
  {
    path: "/css/noor-rtl-page-20260613-cache1.css",
    status: 200,
    cacheIncludes: ["public", "max-age=31536000", "immutable"],
    contentTypeIncludes: "text/css",
  },
  {
    path: "/css/home-en-page-20260613-cache1.css",
    status: 200,
    cacheIncludes: ["public", "max-age=31536000", "immutable"],
    contentTypeIncludes: "text/css",
  },
  {
    path: "/css/home-zh-page-20260613-cache1.css",
    status: 200,
    cacheIncludes: ["public", "max-age=31536000", "immutable"],
    contentTypeIncludes: "text/css",
  },
  {
    path: "/css/home-ar-page-20260613-cache1.css",
    status: 200,
    cacheIncludes: ["public", "max-age=31536000", "immutable"],
    contentTypeIncludes: "text/css",
  },
  {
    path: "/css/koko-common-20260613-cache1.css",
    status: 200,
    cacheIncludes: ["public", "max-age=31536000", "immutable"],
    contentTypeIncludes: "text/css",
  },
  {
    path: "/css/koko-en-page-20260613-cache1.css",
    status: 200,
    cacheIncludes: ["public", "max-age=31536000", "immutable"],
    contentTypeIncludes: "text/css",
  },
  {
    path: "/css/koko-ar-page-20260613-cache1.css",
    status: 200,
    cacheIncludes: ["public", "max-age=31536000", "immutable"],
    contentTypeIncludes: "text/css",
  },
  {
    path: "/js/site-shared-20260613-commerce3.js",
    status: 200,
    cacheIncludes: ["public", "max-age=31536000", "immutable"],
    contentTypeIncludes: "text/javascript",
  },
  {
    path: "/images/scenes/story-world-home.webp",
    status: 200,
    cacheIncludes: ["public", "max-age=31536000", "immutable"],
    contentTypeIncludes: "image/webp",
  },
  {
    path: "/og-koko.png",
    status: 200,
    cacheIncludes: ["public", "max-age=31536000", "immutable"],
    contentTypeIncludes: "image/png",
  },
  {
    path: "/og-noor.png",
    status: 200,
    cacheIncludes: ["public", "max-age=31536000", "immutable"],
    contentTypeIncludes: "image/png",
  },
  {
    path: "/images/qr/sample-koko.svg",
    status: 200,
    cacheIncludes: ["public", "max-age=31536000", "immutable"],
    contentTypeIncludes: "image/svg+xml",
  },
  {
    path: "/images/qr/sample-noor.svg",
    status: 200,
    cacheIncludes: ["public", "max-age=31536000", "immutable"],
    contentTypeIncludes: "image/svg+xml",
  },
  {
    path: "/images/qr/share-koko.svg",
    status: 200,
    cacheIncludes: ["public", "max-age=31536000", "immutable"],
    contentTypeIncludes: "image/svg+xml",
  },
  {
    path: "/images/qr/share-noor.svg",
    status: 200,
    cacheIncludes: ["public", "max-age=31536000", "immutable"],
    contentTypeIncludes: "image/svg+xml",
  },
  {
    path: "/site-health.json",
    status: 200,
    cacheIncludes: ["public", "max-age=3600"],
    contentTypeIncludes: "application/json",
  },
  {
    path: "/release.json",
    status: 200,
    cacheIncludes: ["public", "max-age=3600"],
    contentTypeIncludes: "application/json",
  },
  {
    path: "/deploy-readiness.json",
    status: 200,
    cacheIncludes: ["public", "max-age=3600"],
    contentTypeIncludes: "application/json",
  },
  {
    path: "/deploy-readiness",
    status: 200,
    cacheIncludes: ["public", "max-age=300", "must-revalidate"],
    contentTypeIncludes: "text/html",
  },
  {
    path: "/campaigns.json",
    status: 200,
    cacheIncludes: ["public", "max-age=3600"],
    contentTypeIncludes: "application/json",
  },
  {
    path: "/creator-kit.json",
    status: 200,
    cacheIncludes: ["public", "max-age=3600"],
    contentTypeIncludes: "application/json",
  },
  {
    path: "/share-kit.json",
    status: 200,
    cacheIncludes: ["public", "max-age=3600"],
    contentTypeIncludes: "application/json",
  },
  {
    path: "/traffic-launch.json",
    status: 200,
    cacheIncludes: ["public", "max-age=3600"],
    contentTypeIncludes: "application/json",
  },
  {
    path: "/links.json",
    status: 200,
    cacheIncludes: ["public", "max-age=3600"],
    contentTypeIncludes: "application/json",
  },
  {
    path: "/video-discovery.json",
    status: 200,
    cacheIncludes: ["public", "max-age=3600"],
    contentTypeIncludes: "application/json",
  },
  {
    path: "/shortlinks.json",
    status: 200,
    cacheIncludes: ["public", "max-age=3600"],
    contentTypeIncludes: "application/json",
  },
  {
    path: "/conversion-health.json",
    status: 200,
    cacheIncludes: ["public", "max-age=3600"],
    contentTypeIncludes: "application/json",
  },
  {
    path: "/products.json",
    status: 200,
    cacheIncludes: ["public", "max-age=3600"],
    contentTypeIncludes: "application/json",
  },
  {
    path: "/creator-kit",
    status: 200,
    cacheIncludes: ["public", "max-age=300", "must-revalidate"],
    contentTypeIncludes: "text/html",
  },
  {
    path: "/share-kit",
    status: 200,
    cacheIncludes: ["public", "max-age=300", "must-revalidate"],
    contentTypeIncludes: "text/html",
  },
  {
    path: "/traffic-launch",
    status: 200,
    cacheIncludes: ["public", "max-age=300", "must-revalidate"],
    contentTypeIncludes: "text/html",
  },
  {
    path: "/links",
    status: 200,
    cacheIncludes: ["public", "max-age=300", "must-revalidate"],
    contentTypeIncludes: "text/html",
  },
  {
    path: "/conversion-health",
    status: 200,
    cacheIncludes: ["public", "max-age=300", "must-revalidate"],
    contentTypeIncludes: "text/html",
  },
  {
    path: "/products",
    status: 200,
    cacheIncludes: ["public", "max-age=300", "must-revalidate"],
    contentTypeIncludes: "text/html",
  },
  {
    path: "/llms.txt",
    status: 200,
    cacheIncludes: ["public", "max-age=3600"],
    contentTypeIncludes: "text/plain",
  },
  {
    path: "/join/koko",
    status: 302,
    cacheIncludes: ["public", "max-age=300", "must-revalidate"],
    locationIncludes: ["/koko", "subscribe=koko", "utm_source=shortlink"],
  },
  {
    path: "/join/noor",
    status: 302,
    cacheIncludes: ["public", "max-age=300", "must-revalidate"],
    locationIncludes: ["/arabic", "subscribe=noor", "utm_source=shortlink"],
  },
  {
    path: "/sample/koko",
    status: 302,
    cacheIncludes: ["public", "max-age=300", "must-revalidate"],
    locationIncludes: ["/koko", "subscribe=koko", "utm_content=sample_koko"],
  },
  {
    path: "/sample/noor",
    status: 302,
    cacheIncludes: ["public", "max-age=300", "must-revalidate"],
    locationIncludes: ["/arabic", "subscribe=noor", "utm_content=sample_noor"],
  },
  {
    path: "/share/koko",
    status: 302,
    cacheIncludes: ["public", "max-age=300", "must-revalidate"],
    locationIncludes: ["/koko", "subscribe=koko", "utm_source=family_share", "utm_medium=share", "utm_content=share_sample_koko"],
  },
  {
    path: "/share/noor",
    status: 302,
    cacheIncludes: ["public", "max-age=300", "must-revalidate"],
    locationIncludes: ["/arabic", "subscribe=noor", "utm_source=family_share", "utm_medium=share", "utm_content=share_sample_noor"],
  },
  {
    path: "/bio/koko",
    status: 302,
    cacheIncludes: ["public", "max-age=300", "must-revalidate"],
    locationIncludes: ["/koko", "subscribe=koko", "utm_source=social_profile", "utm_medium=bio", "utm_content=bio_koko"],
  },
  {
    path: "/bio/noor",
    status: 302,
    cacheIncludes: ["public", "max-age=300", "must-revalidate"],
    locationIncludes: ["/arabic", "subscribe=noor", "utm_source=social_profile", "utm_medium=bio", "utm_content=bio_noor"],
  },
  {
    path: "/creator/koko",
    status: 302,
    cacheIncludes: ["public", "max-age=300", "must-revalidate"],
    locationIncludes: ["/koko", "subscribe=koko", "utm_source=creator_kit", "utm_medium=description", "utm_content=creator_kit_sample"],
  },
  {
    path: "/creator/koko/youtube",
    status: 302,
    cacheIncludes: ["public", "max-age=300", "must-revalidate"],
    locationIncludes: ["/koko", "subscribe=koko", "utm_source=youtube", "utm_medium=description", "utm_content=creator_kit_youtube"],
  },
  {
    path: "/creator/koko/social",
    status: 302,
    cacheIncludes: ["public", "max-age=300", "must-revalidate"],
    locationIncludes: ["/koko", "subscribe=koko", "utm_source=social", "utm_medium=profile", "utm_content=creator_kit_social"],
  },
  {
    path: "/creator/koko/newsletter",
    status: 302,
    cacheIncludes: ["public", "max-age=300", "must-revalidate"],
    locationIncludes: ["/koko", "subscribe=koko", "utm_source=newsletter", "utm_medium=email", "utm_content=creator_kit_newsletter"],
  },
  {
    path: "/creator/noor",
    status: 302,
    cacheIncludes: ["public", "max-age=300", "must-revalidate"],
    locationIncludes: ["/arabic", "subscribe=noor", "utm_source=creator_kit", "utm_medium=description", "utm_content=creator_kit_sample"],
  },
  {
    path: "/creator/noor/youtube",
    status: 302,
    cacheIncludes: ["public", "max-age=300", "must-revalidate"],
    locationIncludes: ["/arabic", "subscribe=noor", "utm_source=youtube", "utm_medium=description", "utm_content=creator_kit_youtube"],
  },
  {
    path: "/creator/noor/social",
    status: 302,
    cacheIncludes: ["public", "max-age=300", "must-revalidate"],
    locationIncludes: ["/arabic", "subscribe=noor", "utm_source=social", "utm_medium=profile", "utm_content=creator_kit_social"],
  },
  {
    path: "/creator/noor/newsletter",
    status: 302,
    cacheIncludes: ["public", "max-age=300", "must-revalidate"],
    locationIncludes: ["/arabic", "subscribe=noor", "utm_source=newsletter", "utm_medium=email", "utm_content=creator_kit_newsletter"],
  },
];

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { outDir: DEFAULT_OUT, baseUrl: "https://fursay.com" };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--out-dir") parsed.outDir = args[++i];
    if (args[i] === "--base-url") parsed.baseUrl = args[++i].replace(/\/$/, "");
  }
  return parsed;
}

async function checkOne(baseUrl, check) {
  const url = new URL(check.path, baseUrl);
  url.searchParams.set("fursay_cache_smoke", String(Date.now()));
  if (/\.(?:css|js|webp|json|txt)$/i.test(check.path)) {
    url.searchParams.delete("fursay_cache_smoke");
  }
  const response = await fetchWithTimeout(url, { redirect: "manual" });
  const cacheControl = response.headers.get("cache-control") || "";
  const contentType = response.headers.get("content-type") || "";
  const location = response.headers.get("location") || "";
  const failures = [];

  if (response.status !== check.status) failures.push(`status:${response.status}`);
  for (const needle of check.cacheIncludes || []) {
    if (!cacheControl.toLowerCase().includes(needle.toLowerCase())) failures.push(`cache_missing:${needle}`);
  }
  if (check.contentTypeIncludes && !contentType.toLowerCase().includes(check.contentTypeIncludes.toLowerCase())) {
    failures.push(`content_type:${contentType || "none"}`);
  }
  for (const needle of check.locationIncludes || []) {
    if (!location.includes(needle)) failures.push(`location_missing:${needle}`);
  }

  return {
    path: check.path,
    ok: failures.length === 0,
    failures,
    data: {
      status: response.status,
      cacheControl,
      contentType,
      location,
    },
  };
}

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function readReleaseExpectations(baseUrl) {
  const response = await fetchWithTimeout(new URL("/release.json", baseUrl), { cache: "no-store" });
  if (!response.ok) throw new Error(`release.json status ${response.status}`);
  return (await response.json()).liveExpectations || {};
}

async function main() {
  const args = parseArgs();
  const results = [];
  for (const check of CHECKS) results.push(await checkOne(args.baseUrl, check));
  const failed = results.filter((result) => !result.ok);
  const expectations = await readReleaseExpectations(args.baseUrl);
  const expectationFailures = [];
  if (expectations.cacheHeaderChecks !== results.length) {
    expectationFailures.push(`release_cache_header_checks:${expectations.cacheHeaderChecks ?? "none"}!=${results.length}`);
  }
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: args.baseUrl,
    ok: failed.length === 0 && expectationFailures.length === 0,
    total: results.length,
    failed: failed.map((result) => ({ path: result.path, failures: result.failures })),
    expectationFailures,
    results,
  };

  await mkdir(args.outDir, { recursive: true });
  await writeFile(join(args.outDir, "fursay-cache-headers.json"), JSON.stringify(report, null, 2) + "\n");
  await writeFile(join(args.outDir, "fursay-cache-headers.md"), [
    "# Fursay Cache Header Check",
    "",
    `- Result: ${report.ok ? "PASS" : "FAIL"}`,
    `- Checks: ${report.total}`,
    `- Failed: ${failed.length + expectationFailures.length}`,
    `- Base URL: ${args.baseUrl}`,
    "",
  ].join("\n"));

  console.log(JSON.stringify({ ok: report.ok, outDir: args.outDir, failed: failed.length + expectationFailures.length }, null, 2));
  return report.ok ? 0 : 1;
}

main().then((code) => process.exit(code)).catch((error) => {
  console.error(error);
  process.exit(1);
});
