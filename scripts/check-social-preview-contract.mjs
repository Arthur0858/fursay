import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const SITE_DIR = resolve(process.cwd(), "fursay-optimized-site");
const DEFAULT_OUT = "/tmp/fursay-social-preview-contract";
const EXPECTED_WIDTH = 1200;
const EXPECTED_HEIGHT = 630;
const PAGES = [
  { path: "/", file: "index.html", image: "https://fursay.com/og-image.png" },
  { path: "/zh/", file: "zh/index.html", image: "https://fursay.com/og-image.png" },
  { path: "/ar/", file: "ar/index.html", image: "https://fursay.com/og-image.png" },
  { path: "/koko", file: "koko.html", image: "https://fursay.com/og-koko.png" },
  { path: "/zh/koko", file: "zh/koko.html", image: "https://fursay.com/og-koko.png" },
  { path: "/ar/koko", file: "ar/koko.html", image: "https://fursay.com/og-koko.png" },
  { path: "/arabic", file: "arabic.html", image: "https://fursay.com/og-noor.png" },
  { path: "/zh/arabic", file: "zh/arabic.html", image: "https://fursay.com/og-noor.png" },
  { path: "/ar/arabic", file: "ar/arabic.html", image: "https://fursay.com/og-noor.png" },
  { path: "/links", file: "links.html", image: "https://fursay.com/og-image.png" },
  { path: "/share-kit", file: "share-kit.html", image: "https://fursay.com/og-image.png" },
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
    const response = await fetch(`${baseUrl}${page.path}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${page.path} status ${response.status}`);
    return response.text();
  }
  return readFile(resolve(SITE_DIR, page.file), "utf8");
}

function attr(tag, name) {
  return tag.match(new RegExp(`${name}=(["'])(.*?)\\1`, "i"))?.[2] || "";
}

function headValue(head, selector) {
  const tags = [...head.matchAll(/<(?:meta|link)\b[^>]*>/gi)].map((match) => match[0]);
  if (selector.type === "title") return head.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "";
  if (selector.type === "meta-property") {
    const tag = tags.find((item) => attr(item, "property").toLowerCase() === selector.name.toLowerCase()) || "";
    return attr(tag, "content");
  }
  if (selector.type === "meta-name") {
    const tag = tags.find((item) => attr(item, "name").toLowerCase() === selector.name.toLowerCase()) || "";
    return attr(tag, "content");
  }
  if (selector.type === "link") {
    const tag = tags.find((item) => attr(item, "rel").toLowerCase() === selector.rel.toLowerCase()) || "";
    return attr(tag, "href");
  }
  return "";
}

async function imageBuffer(baseUrl, imageUrl) {
  const url = new URL(imageUrl);
  if (baseUrl) {
    const response = await fetch(`${baseUrl}${url.pathname}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${url.pathname} status ${response.status}`);
    const contentType = response.headers.get("content-type") || "";
    return { buffer: Buffer.from(await response.arrayBuffer()), contentType };
  }
  return {
    buffer: await readFile(resolve(SITE_DIR, url.pathname.replace(/^\//, ""))),
    contentType: url.pathname.endsWith(".png") ? "image/png" : "",
  };
}

async function main() {
  const args = parseArgs();
  const failures = [];
  const pages = [];
  const imageCache = new Map();

  for (const page of PAGES) {
    const html = await readPage(args.baseUrl, page);
    const head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1] || "";
    const title = headValue(head, { type: "title" });
    const canonical = headValue(head, { type: "link", rel: "canonical" });
    const ogTitle = headValue(head, { type: "meta-property", name: "og:title" });
    const ogDescription = headValue(head, { type: "meta-property", name: "og:description" });
    const ogUrl = headValue(head, { type: "meta-property", name: "og:url" });
    const ogImage = headValue(head, { type: "meta-property", name: "og:image" });
    const ogWidth = headValue(head, { type: "meta-property", name: "og:image:width" });
    const ogHeight = headValue(head, { type: "meta-property", name: "og:image:height" });
    const ogAlt = headValue(head, { type: "meta-property", name: "og:image:alt" });
    const twitterCard = headValue(head, { type: "meta-name", name: "twitter:card" });
    const twitterTitle = headValue(head, { type: "meta-name", name: "twitter:title" });
    const twitterDescription = headValue(head, { type: "meta-name", name: "twitter:description" });
    const twitterImage = headValue(head, { type: "meta-name", name: "twitter:image" });
    const twitterAlt = headValue(head, { type: "meta-name", name: "twitter:image:alt" });

    if (ogImage !== page.image) failures.push(`${page.path}:og_image:${ogImage || "none"}`);
    if (twitterImage !== page.image) failures.push(`${page.path}:twitter_image:${twitterImage || "none"}`);
    if (ogUrl !== canonical) failures.push(`${page.path}:og_url_not_canonical:${ogUrl || "none"}`);
    if (ogWidth !== String(EXPECTED_WIDTH)) failures.push(`${page.path}:og_width:${ogWidth || "none"}`);
    if (ogHeight !== String(EXPECTED_HEIGHT)) failures.push(`${page.path}:og_height:${ogHeight || "none"}`);
    if (twitterCard !== "summary_large_image") failures.push(`${page.path}:twitter_card:${twitterCard || "none"}`);
    if (!ogTitle || !ogDescription || !twitterTitle || !twitterDescription) failures.push(`${page.path}:missing_social_text`);
    if (!ogAlt || !twitterAlt) failures.push(`${page.path}:missing_social_alt`);
    if (ogAlt !== twitterAlt) failures.push(`${page.path}:alt_mismatch`);
    if (ogTitle === title && page.path !== "/share-kit") {
      // Exact title reuse is fine but track it in the artifact; no failure.
    }

    if (!imageCache.has(page.image)) {
      const asset = await imageBuffer(args.baseUrl, page.image);
      const metadata = await sharp(asset.buffer).metadata();
      imageCache.set(page.image, { ...asset, metadata });
    }
    const image = imageCache.get(page.image);
    if (image.contentType && !image.contentType.includes("image/png")) failures.push(`${page.path}:image_content_type:${image.contentType}`);
    if (image.metadata.width !== EXPECTED_WIDTH || image.metadata.height !== EXPECTED_HEIGHT) {
      failures.push(`${page.path}:image_dimensions:${image.metadata.width || 0}x${image.metadata.height || 0}`);
    }

    pages.push({
      path: page.path,
      canonical,
      ogImage,
      twitterImage,
      imageWidth: image.metadata.width,
      imageHeight: image.metadata.height,
      ogAlt,
    });
  }

  await mkdir(args.outDir, { recursive: true });
  const report = {
    ok: failures.length === 0,
    mode: args.baseUrl ? "live" : "local",
    baseUrl: args.baseUrl || "",
    expected: { width: EXPECTED_WIDTH, height: EXPECTED_HEIGHT },
    failures,
    imagesChecked: imageCache.size,
    pages,
  };
  await writeFile(resolve(args.outDir, "social-preview-contract.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({
    ok: report.ok,
    mode: report.mode,
    outDir: args.outDir,
    failed: failures.length,
    pages: pages.length,
    imagesChecked: imageCache.size,
  }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
