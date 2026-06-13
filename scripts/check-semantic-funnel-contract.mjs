import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SITE_DIR = resolve(process.cwd(), "fursay-optimized-site");
const DEFAULT_OUT = "/tmp/fursay-semantic-funnel-contract";
const PAGES = [
  { path: "/", file: "index.html", locale: "en", market: "amazon", packs: ["koko", "noor"] },
  { path: "/zh/", file: "zh/index.html", locale: "zh-TW", market: "books", packs: ["koko", "noor"] },
  { path: "/ar/", file: "ar/index.html", locale: "ar", market: "amazon", packs: ["koko", "noor"] },
  { path: "/koko", file: "koko.html", locale: "en", market: "amazon", pack: "koko" },
  { path: "/zh/koko", file: "zh/koko.html", locale: "zh-TW", market: "books", pack: "koko" },
  { path: "/ar/koko", file: "ar/koko.html", locale: "ar", market: "amazon", pack: "koko" },
  { path: "/arabic", file: "arabic.html", locale: "en", market: "amazon", pack: "noor" },
  { path: "/zh/arabic", file: "zh/arabic.html", locale: "zh-TW", market: "books", pack: "noor" },
  { path: "/ar/arabic", file: "ar/arabic.html", locale: "ar", market: "amazon", pack: "noor" },
];
const PACKS = {
  koko: {
    campaign: "koko_story_funnel",
    storyWorld: "https://fursay.com/koko",
    sampleShortlink: "https://fursay.com/sample/koko",
    leadClass: "koko-lead-magnet",
    leadAttr: "data-koko-lead-magnet",
    leadVariant: "weekly-sample-v1",
    promiseNeedles: ["weekly", "story", "pack"],
    zhPromiseNeedles: ["每週", "故事"],
    arPromiseNeedles: ["الأسبوعية"],
  },
  noor: {
    campaign: "noor_story_funnel",
    storyWorld: "https://fursay.com/arabic",
    sampleShortlink: "https://fursay.com/sample/noor",
    leadClass: "noor-lead-magnet",
    leadAttr: "data-noor-lead-magnet",
    leadVariant: "weekly-sample-v2",
    promiseNeedles: ["3-minute", "story", "pack"],
    zhPromiseNeedles: ["3 分鐘", "故事"],
    arPromiseNeedles: ["3 دقائق", "قصة"],
  },
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

function localFile(pathname) {
  if (pathname === "/") return "index.html";
  if (/\.[^/]+$/.test(pathname)) return pathname.replace(/^\//, "");
  if (pathname.endsWith("/")) return `${pathname.slice(1)}index.html`;
  return `${pathname.slice(1)}.html`;
}

async function readText(baseUrl, pathname, file = "") {
  if (baseUrl) {
    const response = await fetch(`${baseUrl}${pathname}`);
    if (!response.ok) throw new Error(`${pathname} status ${response.status}`);
    return response.text();
  }
  return readFile(resolve(SITE_DIR, file || localFile(pathname)), "utf8");
}

async function readJson(baseUrl, pathname) {
  return JSON.parse(await readText(baseUrl, pathname));
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`\\s${name}=(["'])(.*?)\\1`, "i"));
  return match?.[2] || "";
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(html) {
  return decodeEntities(html)
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function h1Text(html) {
  return stripTags(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "");
}

function structuredDataBlocks(html, failures, pagePath) {
  const blocks = [];
  const matches = [...html.matchAll(/<script\b([^>]*)type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (let i = 0; i < matches.length; i += 1) {
    try {
      blocks.push(JSON.parse(matches[i][2]));
    } catch (error) {
      failures.push(`${pagePath}:json_ld_parse:${i}:${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return blocks;
}

function ctaMatches(html) {
  const matches = [];
  const pattern = /<(a|button)\b([^>]*\sdata-open-subscribe=(["'])(.*?)\3[^>]*)>([\s\S]*?)<\/\1>/gi;
  for (const match of html.matchAll(pattern)) {
    const openTag = `<${match[1]}${match[2]}>`;
    matches.push({
      tag: match[1],
      pack: attr(openTag, "data-open-subscribe"),
      source: attr(openTag, "data-signup-source"),
      href: attr(openTag, "href"),
      text: stripTags(match[5]),
    });
  }
  return matches;
}

function leadBlock(html, pack) {
  const config = PACKS[pack];
  const open = html.match(new RegExp(`<[^>]+class=(["'])[^"']*\\b${config.leadClass}\\b[^"']*\\1[^>]*>`, "i"))?.[0] || "";
  if (!open) return { open: "", text: "", items: 0 };
  const start = html.indexOf(open);
  const nextShare = html.indexOf('<div class="public-share-panel"', start);
  const end = nextShare > start ? nextShare : html.indexOf("</section>", start);
  const block = html.slice(start, end > start ? end : undefined);
  return { open, text: stripTags(block), items: (block.match(/<li\b/gi) || []).length };
}

function textHasAll(text, needles) {
  const normalized = text.toLowerCase();
  return needles.every((needle) => normalized.includes(needle.toLowerCase()));
}

function textHasAny(text, needles) {
  const normalized = text.toLowerCase();
  return needles.some((needle) => normalized.includes(needle.toLowerCase()));
}

function localeNeedles(pack, locale) {
  if (locale === "zh-TW") return PACKS[pack].zhPromiseNeedles;
  if (locale === "ar") return PACKS[pack].arPromiseNeedles;
  return PACKS[pack].promiseNeedles;
}

function sampleSchemaBlock(blocks, pack) {
  return blocks.find((block) => block?.["@type"] === "ItemList" && block?.potentialAction?.["@type"] === "SubscribeAction" && String(block?.potentialAction?.target || "").includes(`subscribe=${pack}`));
}

function checkPage(spec, html, manifests) {
  const failures = [];
  const pagePacks = spec.pack ? [spec.pack] : spec.packs;
  const campaigns = manifests.campaigns.campaigns || {};
  const shareKit = manifests.shareKit.packs || {};
  const creatorKit = manifests.creatorKit.packs || {};
  const videoDiscovery = manifests.videoDiscovery.channels || {};
  const ctas = ctaMatches(html);
  const blocks = structuredDataBlocks(html, failures, spec.path);
  const bodyText = stripTags(html);
  const title = h1Text(html);

  for (const cta of ctas) {
    if (!pagePacks.includes(cta.pack)) failures.push(`${spec.path}:cta_wrong_pack:${cta.pack || "none"}`);
    if (!cta.source) failures.push(`${spec.path}:cta_missing_source:${cta.text || cta.pack}`);
    if (cta.source && !campaigns[cta.pack]?.ctaSources?.includes(cta.source)) {
      failures.push(`${spec.path}:cta_source_not_registered:${cta.pack}:${cta.source}`);
    }
    if (!textHasAll(`${cta.text} ${title}`, [cta.pack === "koko" ? "koko" : "noor"]) && spec.locale === "en") {
      failures.push(`${spec.path}:cta_copy_missing_pack:${cta.pack}:${cta.text || "none"}`);
    }
  }

  for (const pack of pagePacks) {
    const config = PACKS[pack];
    const campaign = campaigns[pack] || {};
    if (campaign.campaign !== config.campaign) failures.push(`${spec.path}:campaign_id:${pack}:${campaign.campaign || "none"}`);
    if (campaign.shortlinks?.sample !== config.sampleShortlink) failures.push(`${spec.path}:campaign_sample:${pack}:${campaign.shortlinks?.sample || "none"}`);
    if (shareKit[pack]?.sampleShortlink !== config.sampleShortlink) failures.push(`${spec.path}:share_kit_sample:${pack}:${shareKit[pack]?.sampleShortlink || "none"}`);
    if (creatorKit[pack]?.sampleShortlink !== config.sampleShortlink) failures.push(`${spec.path}:creator_kit_sample:${pack}:${creatorKit[pack]?.sampleShortlink || "none"}`);
    if (videoDiscovery[pack]?.subscribeShortlink !== config.sampleShortlink) failures.push(`${spec.path}:video_discovery_sample:${pack}:${videoDiscovery[pack]?.subscribeShortlink || "none"}`);
    if (!campaign.copyKit?.shortHeadline || !textHasAll(campaign.copyKit.shortHeadline, localeNeedles(pack, "en").slice(0, 2))) {
      failures.push(`${spec.path}:campaign_headline_weak:${pack}`);
    }

    if (spec.pack === pack) {
      const lead = leadBlock(html, pack);
      if (!lead.open) failures.push(`${spec.path}:missing_lead:${pack}`);
      if (lead.open && attr(lead.open, config.leadAttr) !== config.leadVariant) {
        failures.push(`${spec.path}:lead_variant:${pack}:${attr(lead.open, config.leadAttr) || "none"}`);
      }
      if (lead.items < 6) failures.push(`${spec.path}:lead_item_count:${pack}:${lead.items}`);
      if (!textHasAll(`${lead.text} ${bodyText}`, localeNeedles(pack, spec.locale))) {
        failures.push(`${spec.path}:lead_promise_missing:${pack}`);
      }
      const schema = sampleSchemaBlock(blocks, pack);
      if (!schema) {
        failures.push(`${spec.path}:missing_sample_schema:${pack}`);
      } else {
        if (!textHasAll(`${schema.name || ""} ${schema.description || ""}`, localeNeedles(pack, spec.locale))) {
          failures.push(`${spec.path}:schema_promise_missing:${pack}`);
        }
        const expectedTarget = new URL(`https://fursay.com${spec.path}`);
        expectedTarget.searchParams.set("subscribe", pack);
        expectedTarget.searchParams.set("utm_source", "structured_data");
        expectedTarget.searchParams.set("utm_medium", "site");
        expectedTarget.searchParams.set("utm_campaign", config.campaign);
        expectedTarget.searchParams.set("utm_content", `${pack}_sample_pack_schema`);
        if (schema.potentialAction?.target !== expectedTarget.toString()) {
          failures.push(`${spec.path}:schema_target_mismatch:${pack}:${schema.potentialAction?.target || "none"}`);
        }
      }
    }
  }

  if (spec.market === "books" && !textHasAll(bodyText, ["博客來", "回饋"])) {
    failures.push(`${spec.path}:affiliate_disclosure_weak:${spec.market}`);
  }
  if (spec.market === "amazon" && spec.locale === "ar" && !textHasAny(bodyText, ["عمولة", "تابعة"])) {
    failures.push(`${spec.path}:affiliate_disclosure_weak:${spec.market}`);
  }
  if (spec.market === "amazon" && spec.locale !== "ar" && !textHasAny(bodyText, ["commission", "affiliate", "sponsored"])) {
    failures.push(`${spec.path}:affiliate_disclosure_weak:${spec.market}`);
  }

  return {
    path: spec.path,
    ok: failures.length === 0,
    failures,
    ctas: ctas.map(({ pack, source, text }) => ({ pack, source, text })),
  };
}

async function main() {
  const args = parseArgs();
  const manifests = {
    campaigns: await readJson(args.baseUrl, "/campaigns.json"),
    shareKit: await readJson(args.baseUrl, "/share-kit.json"),
    creatorKit: await readJson(args.baseUrl, "/creator-kit.json"),
    videoDiscovery: await readJson(args.baseUrl, "/video-discovery.json"),
  };
  const results = [];
  for (const page of PAGES) {
    const html = await readText(args.baseUrl, page.path, page.file);
    results.push(checkPage(page, html, manifests));
  }
  const failures = results.flatMap((result) => result.failures);
  await mkdir(args.outDir, { recursive: true });
  const report = {
    ok: failures.length === 0,
    mode: args.baseUrl ? "live" : "local",
    baseUrl: args.baseUrl || "",
    failures,
    results,
  };
  await writeFile(resolve(args.outDir, "semantic-funnel-contract.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({
    ok: report.ok,
    mode: report.mode,
    outDir: args.outDir,
    failed: failures.length,
    pages: results.length,
    ctas: results.reduce((sum, result) => sum + result.ctas.length, 0),
  }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
