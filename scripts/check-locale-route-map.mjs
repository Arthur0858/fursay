import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { localeRoutes, localeRoute } from "./locale-route-map.mjs";

const root = resolve("fursay-optimized-site");
const failures = [];
const glossary = JSON.parse(readFileSync("data/character-glossary.json", "utf8"));
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(dir, entry.name)) : entry.name.endsWith(".html") ? [join(dir, entry.name)] : []);
}
function routeFor(file) {
  const path = `/${relative(root, file).replace(/\\/g, "/")}`;
  return path.replace(/index\.html$/, "").replace(/\.html$/, "");
}
function fileFor(route) {
  const path = join(root, route.replace(/^\//, ""));
  return [route.endsWith("/") ? join(path, "index.html") : `${path}.html`, join(path, "index.html")].find(existsSync);
}
function visible(html) {
  return html.replace(/<(script|style|head|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ").replace(/<!--([\s\S]*?)-->/g, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/\s+/g, " ");
}
for (const locale of ["zh", "ar"]) for (const slug of ["koko-printable", "noor-worksheet"]) {
  const route = localeRoute("sample", slug, locale);
  if (!fileFor(route)) failures.push(`${route}: missing sample page`);
}
for (const file of walk(root)) {
  const html = readFileSync(file, "utf8");
  const route = routeFor(file);
  const text = visible(html);
  if (text.includes("可可")) failures.push(`${route}: visible 可可`);
  if (/noor|nour|arabic/i.test(route) && /\b(?:ni\s+hao|zai\s+jian|xie\s+xie)\b/i.test(text)) failures.push(`${route}: toneless pinyin`);
  const links = [...html.matchAll(/<a\b([^>]*)>\s*(EN|中文|عربي)\s*<\/a>/gi)];
  const switches = links.filter(m => /\bhref\s*=/.test(m[1]));
  if (new Set(switches.map(m => m[2])).size === 3) {
    const base = route.replace(/^\/(?:zh|ar)(?=\/|$)/, "") || "/";
    const match = Object.entries(localeRoutes).flatMap(([kind, resources]) => Object.entries(resources).map(([resource, value]) => ({ kind, resource, value }))).find(item => item.value === base);
    for (const link of switches) {
      const locale = { EN: "en", 中文: "zh", عربي: "ar" }[link[2]];
      const href = link[1].match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
      const expected = match ? localeRoute(match.kind, match.resource, locale) : `${locale === "en" ? "" : `/${locale}`}${base}`;
      if (href !== expected) failures.push(`${route}: ${link[2]} href ${href}, expected ${expected}`);
      if (!href || !fileFor(href.split(/[?#]/)[0])) failures.push(`${route}: missing switch target ${href}`);
    }
  }
  if (/^\/(zh|ar)\/product-samples\//.test(route)) {
    if (route.endsWith("koko-printable")) {
      for (const phrase of ["I feel worried", glossary.characters.koko["zh-Hant"]]) if (!text.includes(phrase)) failures.push(`${route}: missing learning content ${phrase}`);
    } else if (route.endsWith("noor-worksheet")) {
      for (const phrase of Object.values(glossary.chinese).slice(0, 3)) {
        const [characters, ...pinyin] = phrase.split(" ");
        if (!text.includes(characters) || !text.includes(pinyin.join(" "))) failures.push(`${route}: missing learning content ${phrase}`);
      }
    }
  }
}
if (failures.length) { console.error(failures.join("\n")); process.exitCode = 1; }
else console.log("Locale route map checks passed.");
