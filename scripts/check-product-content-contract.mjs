import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd(), "fursay-optimized-site");
const OUT = "/tmp/fursay-product-content-contract";
const LOCALES = [{ prefix: "", code: "en" }, { prefix: "/zh", code: "zh" }, { prefix: "/ar", code: "ar" }];
const PRODUCTS = ["koko-printable", "noor-worksheet"];
const FORBIDDEN = [
  /presale preparation/i, /checkoutenabled/i, /paymentlinksallowed/i, /publicprice/i,
  /review-required/i, /checkout/i, /public price/i, /payment link/i,
  /預售準備/, /結帳/, /公開價格/, /付款連結/, /قيد المراجعة/, /البيع المسبق/, /سعر معلن/, /رابط دفع/,
];

function parseArgs() { const result = { baseUrl: "", outDir: OUT }; const values = process.argv.slice(2); for (let i = 0; i < values.length; i += 1) { if (values[i] === "--base-url") result.baseUrl = values[++i].replace(/\/$/, ""); if (values[i] === "--out-dir") result.outDir = values[++i]; } return result; }
function fileFor(path) { return path === "/" ? "index.html" : `${path.replace(/^\//, "")}.html`; }
async function get(baseUrl, path) { if (baseUrl) { const response = await fetch(`${baseUrl}${path}`, { headers: { "User-Agent": "Fursay-product-content-contract/1.0" } }); return { status: response.status, text: await response.text() }; } try { return { status: 200, text: await readFile(resolve(ROOT, fileFor(path)), "utf8") }; } catch { return { status: 404, text: "" }; } }
function visible(html) { return html.replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim(); }
function meta(html, name) { return [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => match[0]).find((tag) => new RegExp(`name=["']${name}["']`, "i").test(tag))?.match(/content=["']([^"']*)/i)?.[1] || ""; }

async function run() {
  const options = parseArgs(), failures = [], details = [];
  await mkdir(options.outDir, { recursive: true });
  for (const locale of LOCALES) {
    const hubPath = `${locale.prefix}/products`; const hub = await get(options.baseUrl, hubPath); const hubText = visible(hub.text.match(/<main\b[^>]*>[\s\S]*?<\/main>/i)?.[0] || hub.text);
    if (hub.status !== 200) failures.push(`${hubPath}:status:${hub.status}`);
    if (meta(hub.text, "robots").includes("noindex")) failures.push(`${hubPath}:noindex`);
    for (const pattern of FORBIDDEN) if (pattern.test(hubText)) failures.push(`${hubPath}:unfinished_public_wording:${pattern}`);
    for (const slug of PRODUCTS) {
      const path = `${locale.prefix}/products/${slug}`, response = await get(options.baseUrl, path), html = response.text;
      const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || html, text = visible(main);
      if (response.status !== 200) failures.push(`${path}:status:${response.status}`);
      if (meta(html, "robots").includes("noindex")) failures.push(`${path}:noindex`);
      if (!html.includes('name="google-adsense-account" content="ca-pub-4093856660317740"')) failures.push(`${path}:adsense_meta`);
      for (const pattern of FORBIDDEN) if (pattern.test(text)) failures.push(`${path}:unfinished_public_wording:${pattern}`);
      const guideHtml = html.match(/<section class="brand-section product-use-guide"[\s\S]*?<\/section>/i)?.[0] || "";
      const guideText = visible(guideHtml); const latin = (guideText.match(/[A-Za-z]+(?:[-'][A-Za-z]+)*/g) || []).length; const han = (guideText.match(/[\u3400-\u9fff]/g) || []).length; const arabic = (guideText.match(/[\u0600-\u06ff]+/g) || []).length;
      if ((guideHtml.match(/<h3>/g) || []).length < 5) failures.push(`${path}:use_sections_under_5`);
      if (locale.code === "en" && (latin < 300 || latin > 500)) failures.push(`${path}:use_guide_english_words:${latin}`);
      if (locale.code === "zh" && han < 450) failures.push(`${path}:use_guide_han_chars:${han}`);
      if (locale.code === "ar" && arabic < 220) failures.push(`${path}:use_guide_arabic_words:${arabic}`);
      const sampleIndex = html.indexOf("data-product-sample-download="); const interestIndex = html.indexOf("data-product-interest=");
      if (sampleIndex < 0 || interestIndex < 0 || sampleIndex > interestIndex) failures.push(`${path}:free_sample_not_primary`);
      if (!html.includes(`href="${locale.prefix}/support"`) && !(locale.prefix === "" && html.includes('href="/support"'))) failures.push(`${path}:support_link`);
      details.push({ path, latin, han, arabic, useSections: (guideHtml.match(/<h3>/g) || []).length });
    }
  }
  const result = { ok: failures.length === 0, mode: options.baseUrl ? "live" : "local", baseUrl: options.baseUrl, pages: 9, details, failures };
  await writeFile(resolve(options.outDir, "product-content-contract.json"), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ ok: result.ok, mode: result.mode, failed: failures.length, pages: result.pages }, null, 2));
  if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
}
run().catch((error) => { console.error(error); process.exit(1); });
