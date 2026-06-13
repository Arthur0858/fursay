import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SITE_DIR = resolve(process.cwd(), "fursay-optimized-site");
const DEFAULT_OUT = "/tmp/fursay-accessibility-contract";
const ORIGIN = "https://fursay.com";
const PAGES = [
  { path: "/", file: "index.html" },
  { path: "/zh/", file: "zh/index.html" },
  { path: "/ar/", file: "ar/index.html", rtl: true },
  { path: "/koko", file: "koko.html" },
  { path: "/zh/koko", file: "zh/koko.html" },
  { path: "/ar/koko", file: "ar/koko.html", rtl: true },
  { path: "/arabic", file: "arabic.html" },
  { path: "/zh/arabic", file: "zh/arabic.html" },
  { path: "/ar/arabic", file: "ar/arabic.html", rtl: true },
  { path: "/links", file: "links.html" },
  { path: "/share-kit", file: "share-kit.html" },
  { path: "/creator-kit", file: "creator-kit.html" },
  { path: "/traffic-launch", file: "traffic-launch.html" },
  { path: "/deploy-readiness", file: "deploy-readiness.html" },
  { path: "/episodes/koko-feelings", file: "episodes/koko-feelings.html" },
  { path: "/episodes/noor-colors", file: "episodes/noor-colors.html" },
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

function attr(tag, name) {
  const match = tag.match(new RegExp(`\\s${name}=(["'])(.*?)\\1`, "i"));
  return match?.[2] || "";
}

function hasAttr(tag, name) {
  return new RegExp(`\\s${name}(?:\\s*=|\\s|>|/)`, "i").test(tag);
}

function stripTags(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&times;/gi, "x")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function accessibleName(openTag, body = "") {
  return attr(openTag, "aria-label") || attr(openTag, "title") || stripTags(body);
}

function isExternalHref(href) {
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  try {
    return new URL(href, ORIGIN).origin !== ORIGIN;
  } catch {
    return false;
  }
}

function labelSpans(html) {
  return [...html.matchAll(/<label\b[^>]*>[\s\S]*?<\/label>/gi)]
    .map((match) => ({ start: match.index || 0, end: (match.index || 0) + match[0].length }));
}

function inputHasWrappingLabel(index, labels) {
  return labels.some((label) => index >= label.start && index <= label.end);
}

function checkPage(page, html) {
  const failures = [];
  const counts = {
    images: 0,
    buttons: 0,
    anchors: 0,
    inputs: 0,
    externalBlankLinks: 0,
  };

  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] || "";
  if (page.rtl && attr(htmlTag, "dir") !== "rtl") failures.push(`${page.path}:missing_rtl_dir`);

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    counts.images += 1;
    const tag = match[0];
    if (!hasAttr(tag, "alt")) failures.push(`${page.path}:img_missing_alt:${counts.images}`);
  }

  for (const match of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)) {
    counts.buttons += 1;
    const openTag = `<button${match[1]}>`;
    const name = accessibleName(openTag, match[2]);
    if (!name) failures.push(`${page.path}:button_missing_name:${counts.buttons}`);
    const className = attr(openTag, "class");
    if (className.split(/\s+/).includes("modal-close") && !attr(openTag, "aria-label")) {
      failures.push(`${page.path}:modal_close_missing_aria_label`);
    }
    if (className.split(/\s+/).includes("lang-toggle") && attr(openTag, "aria-expanded") !== "false") {
      failures.push(`${page.path}:lang_toggle_missing_collapsed_state`);
    }
    if (className.split(/\s+/).includes("nav-burger") && !attr(openTag, "aria-label")) {
      failures.push(`${page.path}:nav_burger_missing_aria_label`);
    }
  }

  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    counts.anchors += 1;
    const openTag = `<a${match[1]}>`;
    const href = attr(openTag, "href");
    const name = accessibleName(openTag, match[2]);
    if (!href) failures.push(`${page.path}:anchor_missing_href:${counts.anchors}`);
    if (!name) failures.push(`${page.path}:anchor_missing_name:${counts.anchors}`);
    if (attr(openTag, "target").toLowerCase() === "_blank" && isExternalHref(href)) {
      counts.externalBlankLinks += 1;
      const rel = attr(openTag, "rel").toLowerCase().split(/\s+/);
      if (!rel.includes("noopener") && !rel.includes("noreferrer")) {
        failures.push(`${page.path}:external_blank_missing_noopener:${href}`);
      }
    }
  }

  const labels = labelSpans(html);
  const labelFor = new Set([...html.matchAll(/<label\b[^>]*\sfor=(["'])(.*?)\1[^>]*>/gi)].map((match) => match[2]));
  for (const match of html.matchAll(/<input\b[^>]*>/gi)) {
    counts.inputs += 1;
    const tag = match[0];
    const type = (attr(tag, "type") || "text").toLowerCase();
    if (["hidden", "submit", "button", "reset"].includes(type)) continue;
    const id = attr(tag, "id");
    const labelled = Boolean(attr(tag, "aria-label")) || (id && labelFor.has(id)) || inputHasWrappingLabel(match.index || 0, labels);
    if (!labelled) failures.push(`${page.path}:input_missing_label:${id || counts.inputs}`);
  }

  return { failures, counts };
}

async function main() {
  const args = parseArgs();
  const failures = [];
  const pages = [];

  for (const page of PAGES) {
    const html = await readPage(args.baseUrl, page);
    const result = checkPage(page, html);
    failures.push(...result.failures);
    pages.push({ path: page.path, file: page.file, counts: result.counts });
  }

  await mkdir(args.outDir, { recursive: true });
  const report = {
    ok: failures.length === 0,
    mode: args.baseUrl ? "live" : "local",
    baseUrl: args.baseUrl || "",
    failures,
    pages,
  };
  await writeFile(resolve(args.outDir, "accessibility-contract.json"), JSON.stringify(report, null, 2) + "\n");
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
