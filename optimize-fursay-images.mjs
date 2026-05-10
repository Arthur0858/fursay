import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve("fursay-optimized-site");
const charsDir = path.join(root, "images", "chars");
const characterFiles = (await fs.readdir(charsDir))
  .filter((file) => file.endsWith(".png"))
  .sort();
const dimensions = new Map();

async function fileSize(file) {
  const stat = await fs.stat(file);
  return stat.size;
}

function formatBytes(bytes) {
  return `${Math.round(bytes / 1024)} KB`;
}

async function optimizeImage(file) {
  const input = path.join(charsDir, file);
  const parsed = path.parse(file);
  const webp = path.join(charsDir, `${parsed.name}.webp`);
  const avif = path.join(charsDir, `${parsed.name}.avif`);

  const image = sharp(input, { animated: false }).rotate();
  await image.clone().webp({ quality: 78, effort: 6, smartSubsample: true }).toFile(webp);
  await image.clone().avif({ quality: 52, effort: 7 }).toFile(avif);

  return {
    file,
    png: await fileSize(input),
    webp: await fileSize(webp),
    avif: await fileSize(avif),
  };
}

function pictureFor(src, alt, className, loading, fetchpriority) {
  const prefix = src.replace(/[^/]+$/, "");
  const name = path.basename(src, ".png");
  const size = dimensions.get(`${name}.png`);
  const attrs = [
    `src="${src}"`,
    `alt="${alt}"`,
    className ? `class="${className}"` : "",
    loading ? `loading="${loading}"` : "",
    fetchpriority ? `fetchpriority="${fetchpriority}"` : "",
    size ? `width="${size.width}"` : "",
    size ? `height="${size.height}"` : "",
  ].filter(Boolean).join(" ");

  return `<picture>
          <source srcset="${prefix}${name}.avif" type="image/avif">
          <source srcset="${prefix}${name}.webp" type="image/webp">
          <img ${attrs}>
        </picture>`;
}

async function updateHtml(file) {
  const htmlPath = path.join(root, file);
  let html = await fs.readFile(htmlPath, "utf8");

  html = html
    .replace(/<link rel="preload" as="image" href="([^"]*images\/chars\/[^"]+)\.png" \/>/g,
      `<link rel="preload" as="image" href="$1.avif" type="image/avif" />`)
    .replace(/(img \{ max-width: 100%; height: auto; display: block; \})/,
      `$1\n    picture { display: block; }`)
    .replace(/<img\b([^>]*?)\bsrc="([^"]*images\/chars\/[^"]+\.png)"([^>]*)\/?>/g,
      (_match, before, src, after) => {
        const attrs = `${before} ${after}`;
        const attr = (name) => attrs.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? "";
        return pictureFor(src, attr("alt"), attr("class"), attr("loading"), attr("fetchpriority"));
      });

  await fs.writeFile(htmlPath, html);
}

const results = [];
for (const file of characterFiles) {
  dimensions.set(file, await sharp(path.join(charsDir, file)).metadata());
  results.push(await optimizeImage(file));
}

for (const file of [
  "index.html",
  "koko.html",
  "arabic.html",
  "zh/index.html",
  "zh/koko.html",
  "zh/arabic.html",
  "ar/index.html",
  "ar/koko.html",
  "ar/arabic.html",
]) {
  await updateHtml(file);
}

console.log("Character image optimization");
for (const result of results) {
  const webpSaving = Math.round((1 - result.webp / result.png) * 100);
  const avifSaving = Math.round((1 - result.avif / result.png) * 100);
  console.log(`${result.file}: PNG ${formatBytes(result.png)} -> WebP ${formatBytes(result.webp)} (${webpSaving}% smaller), AVIF ${formatBytes(result.avif)} (${avifSaving}% smaller)`);
}
