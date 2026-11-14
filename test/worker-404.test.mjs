import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import worker from "../src/worker.js";

const assets = { async fetch(request) {
  const path = new URL(request.url).pathname;
  if (!["/404.html", "/zh/404.html", "/ar/404.html"].includes(path)) return new Response(null, { status: 404 });
  return new Response(await readFile(`fursay-optimized-site${path}`), { headers: { "Content-Type": "text/html" } });
} };

test("missing pages return localized noindex HTML with security headers", async () => {
  for (const [path, heading, lang, prefix] of [
    ["/missing-page", "Page not found", "en", ""],
    ["/zh/missing-page", "找不到頁面", "zh-TW", "/zh"],
    ["/ar/missing-page", "الصفحة غير موجودة", "ar", "/ar"],
    ["/zh/missing-page/", "找不到頁面", "zh-TW", "/zh"],
  ]) {
    const response = await worker.fetch(new Request(`https://fursay.com${path}`), { ASSETS: assets });
    assert.equal(response.status, 404);
    assert.match(response.headers.get("content-type"), /text\/html/i);
    assert.match(response.headers.get("x-robots-tag"), /noindex/i);
    assert.ok(response.headers.get("x-content-type-options"));
    const body = await response.text();
    assert.ok(body.includes(`<html lang="${lang}"`));
    assert.ok(body.includes(`<h1>${heading}</h1>`));
    assert.match(body, /<meta name="robots" content="noindex, follow">/);
    for (const suffix of ["/", "/products", "/guides"]) assert.ok(body.includes(`href="${prefix}${suffix}"`));
    if (lang === "ar") assert.match(body, /dir="rtl"/);
  }
});

test("missing non-HTML assets retain their original response", async () => {
  const response = await worker.fetch(new Request("https://fursay.com/no-such.png"), { ASSETS: assets });
  assert.equal(response.status, 404);
  assert.equal(await response.text(), "");
});
