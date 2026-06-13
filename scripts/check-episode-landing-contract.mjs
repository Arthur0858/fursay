import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SITE_DIR = resolve(process.cwd(), "fursay-optimized-site");
const DEFAULT_OUT = "/tmp/fursay-episode-landing-contract";
const EPISODES = [
  {
    path: "/episodes/koko-feelings",
    file: "episodes/koko-feelings.html",
    pack: "koko",
    lang: "en",
    campaign: "koko_story_funnel",
    words: ["happy", "sad", "brave"],
    schemaSeries: "Koko's Forest Adventure",
  },
  {
    path: "/zh/episodes/koko-feelings",
    file: "zh/episodes/koko-feelings.html",
    pack: "koko",
    lang: "zh-TW",
    campaign: "koko_story_funnel",
    words: ["happy", "sad", "brave"],
    schemaSeries: "Koko's Forest Adventure",
  },
  {
    path: "/ar/episodes/koko-feelings",
    file: "ar/episodes/koko-feelings.html",
    pack: "koko",
    lang: "ar",
    campaign: "koko_story_funnel",
    words: ["happy", "sad", "brave"],
    schemaSeries: "Koko's Forest Adventure",
  },
  {
    path: "/episodes/noor-colors",
    file: "episodes/noor-colors.html",
    pack: "noor",
    lang: "en",
    campaign: "noor_story_funnel",
    words: ["hong se", "lan se", "lu se"],
    schemaSeries: "Arabic Kids Chinese Picture Book",
  },
  {
    path: "/zh/episodes/noor-colors",
    file: "zh/episodes/noor-colors.html",
    pack: "noor",
    lang: "zh-TW",
    campaign: "noor_story_funnel",
    words: ["hong se", "lan se", "lu se"],
    schemaSeries: "Arabic Kids Chinese Picture Book",
  },
  {
    path: "/ar/episodes/noor-colors",
    file: "ar/episodes/noor-colors.html",
    pack: "noor",
    lang: "ar",
    campaign: "noor_story_funnel",
    words: ["hong se", "lan se", "lu se"],
    schemaSeries: "Arabic Kids Chinese Picture Book",
  },
  {
    path: "/episodes/noor-greetings",
    file: "episodes/noor-greetings.html",
    pack: "noor",
    lang: "en",
    campaign: "noor_story_funnel",
    words: ["ni hao", "zai jian", "xie xie"],
    schemaSeries: "Arabic Kids Chinese Picture Book",
  },
  {
    path: "/zh/episodes/noor-greetings",
    file: "zh/episodes/noor-greetings.html",
    pack: "noor",
    lang: "zh-TW",
    campaign: "noor_story_funnel",
    words: ["ni hao", "zai jian", "xie xie"],
    schemaSeries: "Arabic Kids Chinese Picture Book",
  },
  {
    path: "/ar/episodes/noor-greetings",
    file: "ar/episodes/noor-greetings.html",
    pack: "noor",
    lang: "ar",
    campaign: "noor_story_funnel",
    words: ["ni hao", "zai jian", "xie xie"],
    schemaSeries: "Arabic Kids Chinese Picture Book",
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

async function readText(baseUrl, episode) {
  if (baseUrl) {
    const response = await fetch(`${baseUrl}${episode.path}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${episode.path} status ${response.status}`);
    return response.text();
  }
  return readFile(resolve(SITE_DIR, episode.file), "utf8");
}

async function readJson(baseUrl, pathname) {
  if (baseUrl) {
    const response = await fetch(`${baseUrl}${pathname}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${pathname} status ${response.status}`);
    return response.json();
  }
  return JSON.parse(await readFile(resolve(SITE_DIR, pathname.replace(/^\//, "")), "utf8"));
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`\\s${name}=(["'])(.*?)\\1`, "i"));
  return match?.[2] || "";
}

function jsonLdBlocks(html, failures, path) {
  const blocks = [];
  for (const [index, match] of [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].entries()) {
    try {
      blocks.push(JSON.parse(match[1]));
    } catch (error) {
      failures.push(`${path}:json_ld_parse:${index}:${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return blocks;
}

function hasType(blocks, type) {
  return blocks.some((block) => block?.["@type"] === type || (Array.isArray(block?.["@graph"]) && block["@graph"].some((node) => node?.["@type"] === type)));
}

function firstType(blocks, type) {
  for (const block of blocks) {
    if (block?.["@type"] === type) return block;
    if (Array.isArray(block?.["@graph"])) {
      const node = block["@graph"].find((item) => item?.["@type"] === type);
      if (node) return node;
    }
  }
  return null;
}

function bookLinks(html) {
  return [...html.matchAll(/<a\b[^>]*class=["'][^"']*\bbook-link\b[^"']*["'][^>]*>/gi)].map((match) => match[0]);
}

function checkEpisode(episode, html) {
  const failures = [];
  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] || "";
  if (attr(htmlTag, "lang") !== episode.lang) failures.push(`${episode.path}:html_lang:${attr(htmlTag, "lang") || "none"}`);
  if ((attr(htmlTag, "dir") || "ltr") !== (episode.lang === "ar" ? "rtl" : "ltr")) failures.push(`${episode.path}:html_dir:${attr(htmlTag, "dir") || "ltr"}`);
  const canonical = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i)?.[0] || "";
  if (attr(canonical, "href") !== `https://fursay.com${episode.path}`) failures.push(`${episode.path}:canonical`);
  const alternates = [...html.matchAll(/<link\b[^>]*rel=["']alternate["'][^>]*hreflang=["']([^"']+)["'][^>]*href=["']([^"']+)["'][^>]*>/gi)];
  for (const lang of ["en", "zh-TW", "ar", "x-default"]) {
    if (!alternates.some((match) => match[1] === lang)) failures.push(`${episode.path}:missing_hreflang:${lang}`);
  }
  if (!html.includes(`data-episode-landing="${episode.pack}"`)) failures.push(`${episode.path}:missing_episode_marker`);
  if (!html.includes("youtube-nocookie.com/embed/")) failures.push(`${episode.path}:missing_youtube_embed`);
  if (!html.includes("data-episode-video")) failures.push(`${episode.path}:missing_video_marker`);
  if (!html.includes("data-parent-activity")) failures.push(`${episode.path}:missing_parent_activity`);
  const words = [...html.matchAll(/data-episode-word=["']([^"']+)["']/g)].map((match) => match[1]);
  if (words.length !== 3) failures.push(`${episode.path}:word_count:${words.length}`);
  for (const word of episode.words) {
    if (!words.includes(word)) failures.push(`${episode.path}:missing_word:${word}`);
  }
  if (!html.includes(`data-open-subscribe="${episode.pack}"`)) failures.push(`${episode.path}:missing_subscribe_cta`);
  if (!html.includes(`utm_campaign=${episode.campaign}`)) failures.push(`${episode.path}:missing_campaign`);
  const links = bookLinks(html);
  if (links.length < 2) failures.push(`${episode.path}:book_link_count:${links.length}<2`);
  for (const link of links) {
    const href = attr(link, "href");
    const rel = attr(link, "rel").split(/\s+/).filter(Boolean);
    if (episode.lang === "zh-TW") {
      if (!href.includes("https://www.books.com.tw/exep/assp.php/arthur0858/") || !href.includes("utm_source=arthur0858")) failures.push(`${episode.path}:bad_books_affiliate_link:${href || "none"}`);
    } else if (!href.includes("https://www.amazon.com/dp/") || !href.includes("tag=parenttechche-20")) {
      failures.push(`${episode.path}:bad_amazon_affiliate_link:${href || "none"}`);
    }
    if (!rel.includes("noopener") || !rel.includes("sponsored")) failures.push(`${episode.path}:bad_affiliate_rel:${href || "none"}`);
  }
  if (!/commission|affiliate|sponsored/i.test(html)) failures.push(`${episode.path}:missing_affiliate_disclosure`);
  const blocks = jsonLdBlocks(html, failures, episode.path);
  if (!hasType(blocks, "VideoObject")) failures.push(`${episode.path}:missing_video_object`);
  if (!hasType(blocks, "LearningResource")) failures.push(`${episode.path}:missing_learning_resource`);
  const learning = firstType(blocks, "LearningResource");
  if (learning?.isPartOf?.name !== episode.schemaSeries) failures.push(`${episode.path}:learning_resource_series:${learning?.isPartOf?.name || "none"}`);
  if (!String(learning?.potentialAction?.target || "").includes(`subscribe=${episode.pack}`)) failures.push(`${episode.path}:schema_subscribe_target`);
  return { path: episode.path, ok: failures.length === 0, failures, words, bookLinks: links.length };
}

function hasSitemapRoute(sitemap, route) {
  return sitemap.includes(`<loc>https://fursay.com${route}</loc>`);
}

async function main() {
  const args = parseArgs();
  const pages = [];
  const failures = [];
  for (const episode of EPISODES) {
    const html = await readText(args.baseUrl, episode);
    const page = checkEpisode(episode, html);
    pages.push(page);
    failures.push(...page.failures);
  }

  const release = await readJson(args.baseUrl, "/release.json");
  const siteHealth = await readJson(args.baseUrl, "/site-health.json");
  const videoDiscovery = await readJson(args.baseUrl, "/video-discovery.json");
  const sitemap = args.baseUrl
    ? await fetch(`${args.baseUrl}/sitemap.xml`, { cache: "no-store" }).then((response) => response.text())
    : await readFile(resolve(SITE_DIR, "sitemap.xml"), "utf8");

  if (release.liveExpectations?.episodeLandingPages !== EPISODES.length) failures.push(`release_episode_landing_pages:${release.liveExpectations?.episodeLandingPages || "none"}!=${EPISODES.length}`);
  if (siteHealth.growth?.episodeLandingPages !== EPISODES.length) failures.push(`site_health_episode_landing_pages:${siteHealth.growth?.episodeLandingPages || "none"}!=${EPISODES.length}`);
  const manifestEpisodes = videoDiscovery.episodeLandings || [];
  if (manifestEpisodes.length !== EPISODES.length) failures.push(`video_discovery_episode_landings:${manifestEpisodes.length}!=${EPISODES.length}`);
  for (const episode of EPISODES) {
    if (!manifestEpisodes.some((item) => item.path === episode.path && item.pack === episode.pack)) failures.push(`video_discovery_missing:${episode.path}`);
    if (!hasSitemapRoute(sitemap, episode.path)) failures.push(`sitemap_missing:${episode.path}`);
  }

  await mkdir(args.outDir, { recursive: true });
  const report = {
    ok: failures.length === 0,
    mode: args.baseUrl ? "live" : "local",
    failures,
    episodeLandingPages: EPISODES.length,
    pages,
  };
  await writeFile(resolve(args.outDir, "episode-landing-contract.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ ok: report.ok, mode: report.mode, outDir: args.outDir, failed: failures.length, episodeLandingPages: EPISODES.length }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
