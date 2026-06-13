#!/usr/bin/env node

import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import sharp from "sharp";

const SITE_DIR = resolve(process.cwd(), "fursay-optimized-site");
const CHARS_DIR = join(SITE_DIR, "images", "chars");
const STORY_HTML = [
  "index.html",
  "zh/index.html",
  "ar/index.html",
  "koko.html",
  "zh/koko.html",
  "ar/koko.html",
  "arabic.html",
  "zh/arabic.html",
  "ar/arabic.html",
];
const MAX_VERTICAL_HEIGHT = 720;
const MAX_HORIZONTAL_WIDTH = 720;
const PNG_QUALITY = 90;

async function fileSize(path) {
  return (await stat(path)).size;
}

function resizeOptions(metadata) {
  return metadata.height >= metadata.width
    ? { height: MAX_VERTICAL_HEIGHT, withoutEnlargement: true }
    : { width: MAX_HORIZONTAL_WIDTH, withoutEnlargement: true };
}

function relativeImageNeedle(file) {
  return `images/chars/${basename(file)}`;
}

async function optimizeCharacterPng(file) {
  const input = join(CHARS_DIR, file);
  const before = await fileSize(input);
  const metadata = await sharp(input).metadata();
  const buffer = await sharp(input)
    .resize(resizeOptions(metadata))
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      palette: true,
      quality: PNG_QUALITY,
      effort: 10,
    })
    .toBuffer();
  await writeFile(input, buffer);
  const after = await fileSize(input);
  const updated = await sharp(input).metadata();
  return {
    file,
    before,
    after,
    saved: before - after,
    width: updated.width,
    height: updated.height,
  };
}

function replaceDimensions(html, srcNeedle, width, height) {
  const escaped = srcNeedle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const imagePattern = new RegExp(
    `<img([^>]+src=["'][^"']*${escaped}["'][^>]*)>`,
    "g",
  );
  return html.replace(imagePattern, (match, attrs) => {
    let updatedAttrs = attrs;
    if (/\swidth=["'][^"']*["']/.test(updatedAttrs)) {
      updatedAttrs = updatedAttrs.replace(/\swidth=["'][^"']*["']/, ` width="${width}"`);
    } else {
      updatedAttrs += ` width="${width}"`;
    }
    if (/\sheight=["'][^"']*["']/.test(updatedAttrs)) {
      updatedAttrs = updatedAttrs.replace(/\sheight=["'][^"']*["']/, ` height="${height}"`);
    } else {
      updatedAttrs += ` height="${height}"`;
    }
    return `<img${updatedAttrs}>`;
  });
}

async function updateHtmlDimensions(results) {
  for (const htmlFile of STORY_HTML) {
    const fullPath = join(SITE_DIR, htmlFile);
    let html = await readFile(fullPath, "utf8");
    for (const result of results) {
      html = replaceDimensions(
        html,
        relativeImageNeedle(result.file),
        result.width,
        result.height,
      );
    }
    await writeFile(fullPath, html);
  }
}

const characterPngs = (await readdir(CHARS_DIR))
  .filter((file) => file.endsWith(".png"))
  .sort();

const results = [];
for (const file of characterPngs) results.push(await optimizeCharacterPng(file));
await updateHtmlDimensions(results);

const before = results.reduce((sum, result) => sum + result.before, 0);
const after = results.reduce((sum, result) => sum + result.after, 0);
console.log(JSON.stringify({
  ok: true,
  files: results.length,
  before,
  after,
  saved: before - after,
  maxVerticalHeight: MAX_VERTICAL_HEIGHT,
  maxHorizontalWidth: MAX_HORIZONTAL_WIDTH,
  pngQuality: PNG_QUALITY,
  results,
}, null, 2));
