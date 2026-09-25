import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SITE_DIR = resolve(process.cwd(), "fursay-optimized-site");
const DEFAULT_OUT = "/tmp/fursay-accessibility-contract";
const ORIGIN = "https://fursay.com";
const ACCESSIBILITY_STYLESHEET_PATH = "/css/site-accessibility-20260925-v1.css";
const ACCESSIBILITY_SCRIPT_PATH = "/js/modal-accessibility-20260925-v1.js";
const ACCESSIBILITY_STYLESHEET = resolve(SITE_DIR, ACCESSIBILITY_STYLESHEET_PATH.slice(1));
const ACCESSIBILITY_SCRIPT = resolve(SITE_DIR, ACCESSIBILITY_SCRIPT_PATH.slice(1));
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
  { path: "/noor-sprint-status", file: "noor-sprint-status.html" },
  { path: "/deploy-readiness", file: "deploy-readiness.html" },
  { path: "/conversion-health", file: "conversion-health.html" },
  { path: "/monetization-roadmap", file: "monetization-roadmap.html" },
  { path: "/products", file: "products.html" },
  { path: "/zh/products", file: "zh/products.html" },
  { path: "/ar/products", file: "ar/products.html", rtl: true },
  { path: "/products/koko-printable", file: "products/koko-printable.html" },
  { path: "/products/noor-worksheet", file: "products/noor-worksheet.html" },
  { path: "/zh/products/koko-printable", file: "zh/products/koko-printable.html" },
  { path: "/zh/products/noor-worksheet", file: "zh/products/noor-worksheet.html" },
  { path: "/ar/products/koko-printable", file: "ar/products/koko-printable.html", rtl: true },
  { path: "/ar/products/noor-worksheet", file: "ar/products/noor-worksheet.html", rtl: true },
  { path: "/privacy", file: "privacy.html" },
  { path: "/support", file: "support.html" },
  { path: "/zh/privacy", file: "zh/privacy.html" },
  { path: "/zh/support", file: "zh/support.html" },
  { path: "/ar/privacy", file: "ar/privacy.html", rtl: true },
  { path: "/ar/support", file: "ar/support.html", rtl: true },
  { path: "/product-samples/koko-printable", file: "product-samples/koko-printable.html" },
  { path: "/product-samples/noor-worksheet", file: "product-samples/noor-worksheet.html" },
  { path: "/episodes/koko-feelings", file: "episodes/koko-feelings.html" },
  { path: "/zh/episodes/koko-feelings", file: "zh/episodes/koko-feelings.html" },
  { path: "/ar/episodes/koko-feelings", file: "ar/episodes/koko-feelings.html", rtl: true },
  { path: "/episodes/noor-colors", file: "episodes/noor-colors.html" },
  { path: "/zh/episodes/noor-colors", file: "zh/episodes/noor-colors.html" },
  { path: "/ar/episodes/noor-colors", file: "ar/episodes/noor-colors.html", rtl: true },
  { path: "/episodes/noor-greetings", file: "episodes/noor-greetings.html" },
  { path: "/zh/episodes/noor-greetings", file: "zh/episodes/noor-greetings.html" },
  { path: "/ar/episodes/noor-greetings", file: "ar/episodes/noor-greetings.html", rtl: true },
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

async function readAccessibilityAsset(baseUrl, path, localPath, failures, label) {
  if (!baseUrl) return readFile(localPath, "utf8");
  try {
    const response = await fetch(new URL(path, `${baseUrl}/`));
    if (!response.ok) {
      failures.push(`${label}:http_${response.status}`);
      return "";
    }
    return response.text();
  } catch {
    failures.push(`${label}:fetch_failed`);
    return "";
  }
}

function pageForRoute(route) {
  const file = route === "/"
    ? "index.html"
    : route.endsWith("/")
      ? `${route.slice(1)}index.html`
      : `${route.replace(/^\//, "")}.html`;
  return { path: route, file, rtl: route === "/ar/" || route.startsWith("/ar/") };
}

function pageForFile(file) {
  let path;
  if (file === "index.html") path = "/";
  else if (file === "zh/index.html") path = "/zh/";
  else if (file === "ar/index.html") path = "/ar/";
  else path = `/${file.replace(/\.html$/i, "")}`;
  return { path, file, rtl: file.startsWith("ar/") };
}

async function walkHtmlFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolutePath = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walkHtmlFiles(absolutePath, relativePath));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(relativePath);
  }
  return files;
}

async function pagesToCheck(baseUrl) {
  const pages = new Map(PAGES.map((page) => [page.path, page]));
  if (baseUrl) {
    const response = await fetch(`${baseUrl}/sitemap.xml`);
    if (!response.ok) throw new Error(`/sitemap.xml status ${response.status}`);
    const sitemap = await response.text();
    for (const match of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      pages.set(new URL(match[1]).pathname, pageForRoute(new URL(match[1]).pathname));
    }
  } else {
    for (const file of await walkHtmlFiles(SITE_DIR)) {
      const page = pageForFile(file);
      pages.set(page.path, page);
    }
  }
  return [...pages.values()].sort((a, b) => a.path.localeCompare(b.path));
}

function hasId(html, id) {
  if (!id) return false;
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\bid=(['\"])${escaped}\\1`, "i").test(html);
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

  const mainTag = html.match(/<main\b[^>]*>/i)?.[0] || "";
  const mainId = attr(mainTag, "id");
  if (!mainTag || !mainId) failures.push(`${page.path}:missing_main_landmark_id`);
  if (mainTag && attr(mainTag, "tabindex") !== "-1") failures.push(`${page.path}:main_landmark_not_programmatically_focusable`);
  const skipLink = [...html.matchAll(/<a\b[^>]*>/gi)].map((match) => match[0]).find((tag) => attr(tag, "class").split(/\s+/).includes("skip-link"));
  if (!skipLink) failures.push(`${page.path}:missing_skip_link`);
  else if (attr(skipLink, "href") !== `#${mainId}`) failures.push(`${page.path}:skip_link_target_mismatch`);
  if (!html.includes(`href="${ACCESSIBILITY_STYLESHEET_PATH}"`)) failures.push(`${page.path}:missing_accessibility_stylesheet`);
  if (!html.includes(`src="${ACCESSIBILITY_SCRIPT_PATH}"`)) failures.push(`${page.path}:missing_modal_accessibility_script`);

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
    if (className.split(/\s+/).includes("lang-toggle") && !hasId(html, attr(openTag, "aria-controls"))) {
      failures.push(`${page.path}:lang_toggle_control_target_missing`);
    }
    if (className.split(/\s+/).includes("nav-burger") && !attr(openTag, "aria-label")) {
      failures.push(`${page.path}:nav_burger_missing_aria_label`);
    }
    if (className.split(/\s+/).includes("nav-burger")) {
      if (attr(openTag, "aria-expanded") !== "false") failures.push(`${page.path}:nav_burger_missing_collapsed_state`);
      if (!hasId(html, attr(openTag, "aria-controls"))) failures.push(`${page.path}:nav_burger_control_target_missing`);
    }
  }

  const dialogTag = [...html.matchAll(/<[a-z][^>]*>/gi)].map((match) => match[0]).find((tag) => attr(tag, "id") === "subscribeModal");
  if (dialogTag) {
    if (attr(dialogTag, "role") !== "dialog") failures.push(`${page.path}:subscribe_modal_missing_dialog_role`);
    if (attr(dialogTag, "aria-modal") !== "true") failures.push(`${page.path}:subscribe_modal_missing_aria_modal`);
    if (attr(dialogTag, "aria-hidden") !== "true") failures.push(`${page.path}:subscribe_modal_initially_exposed`);
    if (!hasId(html, attr(dialogTag, "aria-labelledby"))) failures.push(`${page.path}:subscribe_modal_missing_label_target`);
    if (!hasId(html, attr(dialogTag, "aria-describedby"))) failures.push(`${page.path}:subscribe_modal_missing_description_target`);
    const dialogStart = html.indexOf(dialogTag);
    const dialogContent = html.slice(dialogStart);
    const hasLiveStatus = [...dialogContent.matchAll(/<[a-z][^>]*>/gi)].map((match) => match[0]).some((tag) => {
      const isStatusNode = attr(tag, "id") === "sub-msg" || attr(tag, "class").split(/\s+/).includes("modal-note");
      return isStatusNode && attr(tag, "role") === "status" && attr(tag, "aria-live") === "polite";
    });
    if (!hasLiveStatus) failures.push(`${page.path}:subscribe_status_not_live`);
    for (const trigger of [...html.matchAll(/<(?:a|button)\b[^>]*>/gi)].map((match) => match[0]).filter((tag) => /\bdata-(?:open-subscribe|product-interest)\s*=/.test(tag))) {
      if (attr(trigger, "aria-haspopup") !== "dialog" || attr(trigger, "aria-controls") !== "subscribeModal") {
        failures.push(`${page.path}:subscribe_trigger_missing_dialog_relationship`);
      }
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

  const accessibilityScript = await readAccessibilityAsset(
    args.baseUrl,
    ACCESSIBILITY_SCRIPT_PATH,
    ACCESSIBILITY_SCRIPT,
    failures,
    "accessibility_script_unavailable",
  );
  const accessibilityStylesheet = await readAccessibilityAsset(
    args.baseUrl,
    ACCESSIBILITY_STYLESHEET_PATH,
    ACCESSIBILITY_STYLESHEET,
    failures,
    "accessibility_stylesheet_unavailable",
  );
  if (!accessibilityScript.includes("target.focus({ preventScroll: true })")
    || !accessibilityScript.includes("a.skip-link")) {
    failures.push("skip_link_does_not_move_focus_to_main_content");
  }
  if (!accessibilityStylesheet.includes(".skip-link:focus")
    || !accessibilityStylesheet.includes("prefers-reduced-motion: reduce")) {
    failures.push("accessibility_styles_missing_focus_or_reduced_motion");
  }

  for (const page of await pagesToCheck(args.baseUrl)) {
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
