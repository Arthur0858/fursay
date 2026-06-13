import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SITE_DIR = resolve(process.cwd(), "fursay-optimized-site");
const DEFAULT_OUT = "/tmp/fursay-content-structure-contract";
const PAGES = [
  {
    path: "/",
    file: "index.html",
    lang: "en",
    footer: ["/", "/koko", "/arabic", "mailto:contact@fursay.com"],
    sections: ["channels", "rhythm", "weekly-pack", "videos", "parents", "faq", "booklist"],
    navAnchors: ["channels", "rhythm", "weekly-pack", "faq"],
    h1Needles: ["story", "phrase"],
  },
  {
    path: "/zh/",
    file: "zh/index.html",
    lang: "zh-TW",
    footer: ["/zh/", "/zh/koko", "/zh/arabic", "mailto:contact@fursay.com"],
    sections: ["channels", "rhythm", "weekly-pack", "videos", "parents", "faq", "booklist"],
    navAnchors: ["channels", "rhythm", "weekly-pack", "faq"],
    h1Needles: ["故事", "一句話"],
  },
  {
    path: "/ar/",
    file: "ar/index.html",
    lang: "ar",
    dir: "rtl",
    footer: ["/ar/", "/ar/koko", "/ar/arabic", "mailto:contact@fursay.com"],
    sections: ["channels", "rhythm", "weekly-pack", "videos", "parents", "faq", "booklist"],
    navAnchors: ["channels", "rhythm", "weekly-pack", "faq"],
    h1Needles: ["قصة", "عبارة"],
  },
  {
    path: "/koko",
    file: "koko.html",
    lang: "en",
    pack: "koko",
    footer: ["/", "/koko", "/arabic", "mailto:contact@fursay.com"],
    sections: ["videos", "learn", "characters", "subscribe", "booklist"],
    navAnchors: ["videos", "learn", "characters", "subscribe"],
    leadSelector: "koko-lead-magnet",
    leadVariant: "weekly-sample-v1",
    sharePack: "koko",
    h1Needles: ["Koko", "Forest"],
  },
  {
    path: "/zh/koko",
    file: "zh/koko.html",
    lang: "zh-TW",
    pack: "koko",
    footer: ["/zh/", "/zh/koko", "/zh/arabic", "mailto:contact@fursay.com"],
    sections: ["videos", "learn", "characters", "subscribe", "booklist"],
    navAnchors: ["videos", "learn", "characters", "subscribe"],
    leadSelector: "koko-lead-magnet",
    leadVariant: "weekly-sample-v1",
    sharePack: "koko",
    h1Needles: ["叩叩", "森林"],
  },
  {
    path: "/ar/koko",
    file: "ar/koko.html",
    lang: "ar",
    dir: "rtl",
    pack: "koko",
    footer: ["/ar/", "/ar/koko", "/ar/arabic", "mailto:contact@fursay.com"],
    sections: ["videos", "learn", "characters", "subscribe", "booklist"],
    navAnchors: ["videos", "learn", "characters", "subscribe"],
    leadSelector: "koko-lead-magnet",
    leadVariant: "weekly-sample-v1",
    sharePack: "koko",
    h1Needles: ["كوكو", "الغابة"],
  },
  {
    path: "/arabic",
    file: "arabic.html",
    lang: "en",
    pack: "noor",
    footer: ["/", "/koko", "/arabic", "mailto:contact@fursay.com"],
    sections: ["episodes", "learn", "characters", "subscribe", "booklist"],
    navAnchors: ["episodes", "learn", "characters", "subscribe"],
    leadSelector: "noor-lead-magnet",
    leadVariant: "weekly-sample-v2",
    sharePack: "noor",
    h1Needles: ["Arabic", "Chinese"],
  },
  {
    path: "/zh/arabic",
    file: "zh/arabic.html",
    lang: "zh-TW",
    pack: "noor",
    footer: ["/zh/", "/zh/koko", "/zh/arabic", "mailto:contact@fursay.com"],
    sections: ["episodes", "learn", "characters", "subscribe", "booklist"],
    navAnchors: ["episodes", "learn", "characters", "subscribe"],
    leadSelector: "noor-lead-magnet",
    leadVariant: "weekly-sample-v2",
    sharePack: "noor",
    h1Needles: ["阿拉伯", "中文"],
  },
  {
    path: "/ar/arabic",
    file: "ar/arabic.html",
    lang: "ar",
    dir: "rtl",
    pack: "noor",
    footer: ["/ar/", "/ar/koko", "/ar/arabic", "mailto:contact@fursay.com"],
    sections: ["episodes", "learn", "characters", "subscribe", "booklist"],
    navAnchors: ["episodes", "learn", "characters", "subscribe"],
    leadSelector: "noor-lead-magnet",
    leadVariant: "weekly-sample-v2",
    sharePack: "noor",
    h1Needles: ["العرب", "الصيني"],
  },
];
const MERGED_TEXT_PATTERNS = [
  /Koko'sForest/,
  /Arabic KidsChinese/,
  /كوكوومغامرة/,
  /العربوكتاب/,
];
const SHARE_LINK_TYPES = ["family", "creator", "share-kit", "whatsapp", "line"];
const SHARE_COPY_TYPES = ["family", "creator"];

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

function attr(tag, name) {
  const match = tag.match(new RegExp(`\\s${name}=(["'])(.*?)\\1`, "i"));
  return match?.[2] || "";
}

function text(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function block(html, tagName) {
  return html.match(new RegExp(`<${tagName}\\b[\\s\\S]*?<\\/${tagName}>`, "i"))?.[0] || "";
}

function tags(html, tagName) {
  return [...html.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, "gi"))].map((match) => match[0]);
}

function hrefs(html) {
  return [...html.matchAll(/<a\b[^>]*\shref=(["'])(.*?)\1/gi)].map((match) => match[2]);
}

function hasId(html, id) {
  return new RegExp(`\\sid=(["'])${id}\\1`, "i").test(html);
}

function unique(values) {
  return [...new Set(values)];
}

function checkPage(page, html) {
  const failures = [];
  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] || "";
  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((match) => text(match[1]));
  const nav = block(html, "nav");
  const footer = block(html, "footer");
  const footerHrefs = hrefs(footer);
  const navHrefs = hrefs(nav);
  const bodyText = text(html);

  if (attr(htmlTag, "lang") !== page.lang) failures.push(`bad_lang:${attr(htmlTag, "lang") || "none"}`);
  if ((page.dir || "") !== attr(htmlTag, "dir")) failures.push(`bad_dir:${attr(htmlTag, "dir") || "none"}`);
  if (h1s.length !== 1) failures.push(`h1_count:${h1s.length}`);
  for (const needle of page.h1Needles || []) {
    if (!h1s[0]?.includes(needle)) failures.push(`h1_missing:${needle}`);
  }
  for (const pattern of MERGED_TEXT_PATTERNS) {
    if (pattern.test(bodyText)) failures.push(`merged_text_pattern:${pattern.source}`);
  }

  for (const id of page.sections || []) {
    if (!hasId(html, id)) failures.push(`missing_section:${id}`);
  }
  for (const id of page.navAnchors || []) {
    if (!navHrefs.includes(`#${id}`)) failures.push(`nav_missing_anchor:${id}`);
    if (!hasId(html, id)) failures.push(`nav_anchor_target_missing:${id}`);
  }
  if (!navHrefs.includes(page.path)) failures.push(`nav_missing_self:${page.path}`);
  for (const href of page.footer || []) {
    if (!footerHrefs.includes(href)) failures.push(`footer_missing:${href}`);
  }

  if (page.leadSelector) {
    const leadOpen = html.match(new RegExp(`<[^>]+class=(["'])[^"']*${page.leadSelector}[^"']*\\1[^>]*>`, "i"))?.[0] || "";
    if (!leadOpen) failures.push(`missing_lead:${page.leadSelector}`);
    if (leadOpen && attr(leadOpen, `data-${page.leadSelector}`) !== page.leadVariant) {
      failures.push(`bad_lead_variant:${attr(leadOpen, `data-${page.leadSelector}`) || "none"}`);
    }
    const leadStart = leadOpen ? html.indexOf(leadOpen) : -1;
    const leadEnd = leadStart >= 0 ? html.indexOf('<a class="campaign-qr-card"', leadStart) : -1;
    const leadBody = leadStart >= 0 && leadEnd > leadStart ? html.slice(leadStart, leadEnd) : "";
    const leadItems = (leadBody.match(/<li\b/gi) || []).length;
    if (leadItems < 6) failures.push(`short_lead_items:${leadItems}`);
  }

  if (page.sharePack) {
    const panelOpen = html.match(new RegExp(`<div\\b[^>]*data-public-share=(["'])${page.sharePack}\\1[^>]*>`, "i"))?.[0] || "";
    if (!panelOpen) failures.push(`missing_share_panel:${page.sharePack}`);
    const panel = panelOpen ? html.slice(html.indexOf(panelOpen), html.indexOf("</div>", html.indexOf(panelOpen)) + 6) : "";
    const linkTypes = unique([...panel.matchAll(/data-public-share-link=(["'])(.*?)\1/gi)].map((match) => match[2])).sort();
    const copyTypes = unique([...panel.matchAll(/data-public-share-copy=(["'])(.*?)\1/gi)].map((match) => match[2])).sort();
    if (linkTypes.join(",") !== [...SHARE_LINK_TYPES].sort().join(",")) failures.push(`bad_share_links:${linkTypes.join(",") || "none"}`);
    if (copyTypes.join(",") !== [...SHARE_COPY_TYPES].sort().join(",")) failures.push(`bad_share_copy:${copyTypes.join(",") || "none"}`);
    if (!panel.includes(`/share/${page.sharePack}`)) failures.push(`share_panel_missing_family_link:${page.sharePack}`);
    if (!panel.includes(`/creator/${page.sharePack}/youtube`)) failures.push(`share_panel_missing_creator_link:${page.sharePack}`);
    if (!panel.includes('rel="noopener"')) failures.push(`share_panel_missing_noopener:${page.sharePack}`);
  }

  return {
    path: page.path,
    ok: failures.length === 0,
    failures,
    data: {
      lang: attr(htmlTag, "lang"),
      dir: attr(htmlTag, "dir"),
      h1: h1s,
      sections: (page.sections || []).filter((id) => hasId(html, id)),
      navHrefs,
      footerHrefs,
    },
  };
}

async function main() {
  const args = parseArgs();
  const results = [];
  for (const page of PAGES) {
    results.push(checkPage(page, await readPage(args.baseUrl, page)));
  }
  const failed = results.filter((result) => !result.ok);
  const report = {
    ok: failed.length === 0,
    mode: args.baseUrl ? "live" : "local",
    baseUrl: args.baseUrl || "",
    failed: failed.map((result) => ({ path: result.path, failures: result.failures })),
    results,
  };
  await mkdir(args.outDir, { recursive: true });
  await writeFile(resolve(args.outDir, "content-structure-contract.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({
    ok: report.ok,
    mode: report.mode,
    outDir: args.outDir,
    failed: failed.length,
    pages: results.length,
  }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
