import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = process.cwd();
const SITE_DIR = resolve(ROOT, "fursay-optimized-site");
const DEFAULT_OUT = "/tmp/fursay-structured-data";
const ORIGIN = "https://fursay.com/";
const KOKO_CHANNEL = "https://www.youtube.com/@KokosForest";
const NOOR_CHANNEL = "https://www.youtube.com/@ArabicKidsChinese";
const REQUIRED_SITE_LANGUAGES = ["ar", "en", "zh-TW"];
const HOME_PAGES = [
  { path: "/", file: "index.html" },
  { path: "/zh/", file: "zh/index.html" },
  { path: "/ar/", file: "ar/index.html" },
];
const STORY_PAGES = [
  { path: "/koko", file: "koko.html", pack: "koko", locale: "en" },
  { path: "/zh/koko", file: "zh/koko.html", pack: "koko", locale: "zh-TW" },
  { path: "/ar/koko", file: "ar/koko.html", pack: "koko", locale: "ar" },
  { path: "/arabic", file: "arabic.html", pack: "noor", locale: "en" },
  { path: "/zh/arabic", file: "zh/arabic.html", pack: "noor", locale: "zh-TW" },
  { path: "/ar/arabic", file: "ar/arabic.html", pack: "noor", locale: "ar" },
];
const PRESALE_PAGES = [
  { path: "/products/koko-printable", file: "products/koko-printable.html" },
  { path: "/products/noor-worksheet", file: "products/noor-worksheet.html" },
  { path: "/zh/products/koko-printable", file: "zh/products/koko-printable.html" },
  { path: "/zh/products/noor-worksheet", file: "zh/products/noor-worksheet.html" },
  { path: "/ar/products/koko-printable", file: "ar/products/koko-printable.html" },
  { path: "/ar/products/noor-worksheet", file: "ar/products/noor-worksheet.html" },
];
const POLICY_PAGES = [
  { path: "/privacy", file: "privacy.html" },
  { path: "/support", file: "support.html" },
  { path: "/zh/privacy", file: "zh/privacy.html" },
  { path: "/zh/support", file: "zh/support.html" },
  { path: "/ar/privacy", file: "ar/privacy.html" },
  { path: "/ar/support", file: "ar/support.html" },
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

async function readPage(baseUrl, page) {
  if (baseUrl) {
    const response = await fetch(`${baseUrl}${page.path}`);
    if (!response.ok) throw new Error(`${page.path} status ${response.status}`);
    return response.text();
  }
  return readFile(resolve(SITE_DIR, page.file), "utf8");
}

async function readJson(baseUrl, path) {
  if (baseUrl) {
    const response = await fetch(`${baseUrl}${path}`);
    if (!response.ok) throw new Error(`${path} status ${response.status}`);
    return response.json();
  }
  return JSON.parse(await readFile(resolve(SITE_DIR, path.replace(/^\//, "")), "utf8"));
}

function structuredDataBlocks(html, pagePath, failures) {
  const blocks = [];
  const matches = [...html.matchAll(/<script\b([^>]*)type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (let index = 0; index < matches.length; index += 1) {
    try {
      blocks.push(JSON.parse(matches[index][2]));
    } catch (error) {
      failures.push(`json_ld_parse:${pagePath}:${index}:${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return blocks;
}

function nodes(block) {
  return Array.isArray(block?.["@graph"]) ? block["@graph"] : [block];
}

function hasType(blocks, type) {
  return blocks.some((block) => nodes(block).some((node) => node?.["@type"] === type));
}

function firstType(blocks, type) {
  for (const block of blocks) {
    for (const node of nodes(block)) {
      if (node?.["@type"] === type) return node;
    }
  }
  return null;
}

function requireIncludes(failures, list, value, code) {
  if (!Array.isArray(list) || !list.includes(value)) failures.push(code);
}

function checkHome(page, blocks, failures) {
  if (blocks.length !== 1) failures.push(`home_json_ld_count:${page.path}:${blocks.length}`);
  if (blocks[0]?.["@context"] !== "https://schema.org") failures.push(`home_context:${page.path}:${blocks[0]?.["@context"] || "none"}`);
  if (!Array.isArray(blocks[0]?.["@graph"]) || blocks[0]["@graph"].length !== 4) failures.push(`home_graph_count:${page.path}:${blocks[0]?.["@graph"]?.length || 0}`);
  for (const type of ["Organization", "WebSite", "EducationalOrganization", "FAQPage"]) {
    if (!hasType(blocks, type)) failures.push(`home_missing_type:${page.path}:${type}`);
  }
  const organization = firstType(blocks, "Organization");
  const website = firstType(blocks, "WebSite");
  const educationalOrganization = firstType(blocks, "EducationalOrganization");
  const faq = firstType(blocks, "FAQPage");

  if (organization?.["@id"] !== "https://fursay.com/#organization") failures.push(`home_org_id:${page.path}:${organization?.["@id"] || "none"}`);
  if (organization?.name !== "Fursay") failures.push(`home_org_name:${page.path}:${organization?.name || "none"}`);
  if (organization?.url !== ORIGIN) failures.push(`home_org_url:${page.path}:${organization?.url || "none"}`);
  if (organization?.logo?.["@type"] !== "ImageObject") failures.push(`home_org_logo_type:${page.path}:${organization?.logo?.["@type"] || "none"}`);
  if (organization?.logo?.url !== "https://fursay.com/og-image.png") failures.push(`home_org_logo_url:${page.path}:${organization?.logo?.url || "none"}`);
  requireIncludes(failures, organization?.sameAs, KOKO_CHANNEL, `home_org_same_as_koko:${page.path}`);
  requireIncludes(failures, organization?.sameAs, NOOR_CHANNEL, `home_org_same_as_noor:${page.path}`);
  if (organization?.founder?.["@type"] !== "Person" || !organization?.founder?.name) failures.push(`home_org_founder:${page.path}`);

  if (website?.["@id"] !== "https://fursay.com/#website") failures.push(`home_website_id:${page.path}:${website?.["@id"] || "none"}`);
  if (website?.url !== ORIGIN) failures.push(`home_website_url:${page.path}:${website?.url || "none"}`);
  if (website?.publisher?.["@id"] !== organization?.["@id"]) failures.push(`home_website_publisher:${page.path}:${website?.publisher?.["@id"] || "none"}`);
  const languages = Array.isArray(website?.inLanguage) ? [...website.inLanguage].sort() : [];
  if (languages.join(",") !== REQUIRED_SITE_LANGUAGES.join(",")) failures.push(`home_website_languages:${page.path}:${languages.join(",") || "none"}`);
  if (website?.potentialAction?.["@type"] !== "SearchAction") failures.push(`home_website_search_action:${page.path}:${website?.potentialAction?.["@type"] || "none"}`);
  if (!String(website?.potentialAction?.target || "").includes("{search_term_string}")) failures.push(`home_website_search_target:${page.path}`);
  if (website?.potentialAction?.["query-input"] !== "required name=search_term_string") failures.push(`home_website_query_input:${page.path}`);

  if (educationalOrganization?.["@id"] !== "https://fursay.com/#edorg") failures.push(`home_edorg_id:${page.path}:${educationalOrganization?.["@id"] || "none"}`);
  if (educationalOrganization?.name !== "Fursay") failures.push(`home_edorg_name:${page.path}:${educationalOrganization?.name || "none"}`);
  if (educationalOrganization?.url !== ORIGIN) failures.push(`home_edorg_url:${page.path}:${educationalOrganization?.url || "none"}`);
  const offers = educationalOrganization?.hasOfferCatalog?.itemListElement;
  if (!Array.isArray(offers) || offers.length !== 2) failures.push(`home_offer_count:${page.path}:${offers?.length || 0}`);
  for (const offer of offers || []) {
    if (offer?.["@type"] !== "Offer") failures.push(`home_offer_type:${page.path}:${offer?.["@type"] || "none"}`);
    if (offer?.price !== "0") failures.push(`home_offer_price:${page.path}:${offer?.name || "none"}:${offer?.price || "none"}`);
    if (offer?.priceCurrency !== "USD") failures.push(`home_offer_currency:${page.path}:${offer?.name || "none"}:${offer?.priceCurrency || "none"}`);
  }
  if (!Array.isArray(faq?.mainEntity) || faq.mainEntity.length < 4) failures.push(`home_faq_too_short:${page.path}`);
  for (const [index, item] of (faq?.mainEntity || []).entries()) {
    if (item?.["@type"] !== "Question") failures.push(`home_faq_question_type:${page.path}:${index}`);
    if (!item?.name) failures.push(`home_faq_question_missing:${page.path}:${index}`);
    if (item?.acceptedAnswer?.["@type"] !== "Answer") failures.push(`home_faq_answer_type:${page.path}:${index}`);
    if (!item?.acceptedAnswer?.text) failures.push(`home_faq_answer_missing:${page.path}:${index}`);
  }
}

function checkStory(page, blocks, videoDiscovery, failures) {
  const channel = videoDiscovery.channels?.[page.pack];
  if (!channel) {
    failures.push(`missing_video_channel:${page.pack}`);
    return;
  }
  if (blocks.length !== 3) failures.push(`story_json_ld_count:${page.path}:${blocks.length}`);
  for (const type of ["TVSeries", "ItemList", "FAQPage"]) {
    if (!hasType(blocks, type)) failures.push(`story_missing_type:${page.path}:${type}`);
  }

  const series = firstType(blocks, "TVSeries");
  const samplePack = blocks.find((block) => block?.["@type"] === "ItemList" && block?.potentialAction?.["@type"] === "SubscribeAction");
  const faq = firstType(blocks, "FAQPage");
  const canonical = channel.localizedStoryWorlds?.[page.locale];
  const campaign = page.pack === "koko" ? "koko_story_funnel" : "noor_story_funnel";
  const expectedAction = new URL(canonical);
  expectedAction.searchParams.set("subscribe", page.pack);
  expectedAction.searchParams.set("utm_source", "structured_data");
  expectedAction.searchParams.set("utm_medium", "site");
  expectedAction.searchParams.set("utm_campaign", campaign);
  expectedAction.searchParams.set("utm_content", `${page.pack}_sample_pack_schema`);

  if (series?.name !== channel.title) failures.push(`story_series_name:${page.path}:${series?.name || "none"}`);
  if (series?.url !== canonical) failures.push(`story_series_url:${page.path}:${series?.url || "none"}`);
  requireIncludes(failures, series?.sameAs, channel.storyWorld, `story_same_as_story_world:${page.path}`);
  requireIncludes(failures, series?.sameAs, channel.youtubeChannel, `story_same_as_channel:${page.path}`);
  requireIncludes(failures, series?.sameAs, channel.youtubeVideos, `story_same_as_videos:${page.path}`);
  requireIncludes(failures, series?.sameAs, channel.youtubePlaylists, `story_same_as_playlists:${page.path}`);
  if (series?.subjectOf?.["@type"] !== "ItemList") failures.push(`story_playlist_type:${page.path}:${series?.subjectOf?.["@type"] || "none"}`);
  if (series?.subjectOf?.name !== channel.playlistName) failures.push(`story_playlist_name:${page.path}:${series?.subjectOf?.name || "none"}`);
  if (series?.subjectOf?.url !== channel.youtubeVideos) failures.push(`story_playlist_url:${page.path}:${series?.subjectOf?.url || "none"}`);
  if (series?.subjectOf?.sameAs !== channel.youtubePlaylists) failures.push(`story_playlist_same_as:${page.path}:${series?.subjectOf?.sameAs || "none"}`);
  if (series?.subjectOf?.identifier !== channel.uploadsPlaylistId) failures.push(`story_playlist_identifier:${page.path}:${series?.subjectOf?.identifier || "none"}`);
  if (series?.subjectOf?.potentialAction?.["@type"] !== "WatchAction") failures.push(`story_playlist_action:${page.path}`);
  if (series?.subjectOf?.potentialAction?.target?.["@type"] !== "EntryPoint") failures.push(`story_playlist_entrypoint:${page.path}`);
  if (series?.subjectOf?.potentialAction?.target?.urlTemplate !== channel.playlistEmbed) {
    failures.push(`story_playlist_embed:${page.path}:${series?.subjectOf?.potentialAction?.target?.urlTemplate || "none"}`);
  }

  if (samplePack?.potentialAction?.target !== expectedAction.toString()) {
    failures.push(`story_sample_action:${page.path}:${samplePack?.potentialAction?.target || "none"}`);
  }
  if (!samplePack?.url?.includes(`subscribe=${page.pack}`)) failures.push(`story_sample_missing_subscribe:${page.path}`);
  if (!samplePack?.url?.includes(`utm_campaign=${campaign}`)) failures.push(`story_sample_missing_campaign:${page.path}`);
  if (!Array.isArray(samplePack?.itemListElement) || samplePack.itemListElement.length !== 3) failures.push(`story_sample_item_count:${page.path}`);
  if (!Array.isArray(faq?.mainEntity) || faq.mainEntity.length < 3) failures.push(`story_faq_too_short:${page.path}`);
}

async function main() {
  const args = parseArgs();
  const failures = [];
  const pages = [];
  const videoDiscovery = await readJson(args.baseUrl, "/video-discovery.json");

  for (const page of HOME_PAGES) {
    const html = await readPage(args.baseUrl, page);
    const blocks = structuredDataBlocks(html, page.path, failures);
    checkHome(page, blocks, failures);
    pages.push({ path: page.path, jsonLdBlocks: blocks.length });
  }
  for (const page of STORY_PAGES) {
    const html = await readPage(args.baseUrl, page);
    const blocks = structuredDataBlocks(html, page.path, failures);
    checkStory(page, blocks, videoDiscovery, failures);
    pages.push({ path: page.path, jsonLdBlocks: blocks.length });
  }
  for (const page of PRESALE_PAGES) {
    const html = await readPage(args.baseUrl, page);
    const blocks = structuredDataBlocks(html, page.path, failures);
    for (const type of ["WebPage", "Product", "FAQPage"]) {
      if (!hasType(blocks, type)) failures.push(`presale_missing_type:${page.path}:${type}`);
    }
    const product = firstType(blocks, "Product");
    if (product?.offers) failures.push(`presale_unreviewed_offer:${page.path}`);
    if (product?.potentialAction?.["@type"] !== "DownloadAction") failures.push(`presale_download_action:${page.path}`);
    pages.push({ path: page.path, jsonLdBlocks: blocks.length });
  }
  for (const page of POLICY_PAGES) {
    const html = await readPage(args.baseUrl, page);
    const blocks = structuredDataBlocks(html, page.path, failures);
    if (!hasType(blocks, "WebPage")) failures.push(`policy_missing_webpage:${page.path}`);
    pages.push({ path: page.path, jsonLdBlocks: blocks.length });
  }

  await mkdir(args.outDir, { recursive: true });
  const report = {
    ok: failures.length === 0,
    mode: args.baseUrl ? "live" : "local",
    baseUrl: args.baseUrl || "",
    failures,
    pages,
  };
  await writeFile(resolve(args.outDir, "structured-data.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({
    ok: report.ok,
    mode: report.mode,
    outDir: args.outDir,
    failed: failures.length,
    pages: pages.length,
  }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
