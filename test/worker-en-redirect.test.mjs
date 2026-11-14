import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/worker.js";

const origin = "https://fursay.com";
const assets = { fetch: async request => {
  const path = new URL(request.url).pathname;
  return new Response(path === "/404.html" ? "Page not found" : path, { status: ["/zh/index.html", "/404.html"].includes(path) ? 200 : 404 });
} };
const get = path => worker.fetch(new Request(origin + path), { ASSETS: assets });

test("English locale root redirects to the homepage with security headers", async () => {
  for (const [path, location] of [["/en", "/"], ["/en/", "/"], ["/en/?utm_source=x", "/?utm_source=x"]]) {
    const response = await get(path);
    assert.equal(response.status, 301);
    assert.equal(response.headers.get("location"), origin + location);
    assert.ok(response.headers.get("x-content-type-options"));
  }
});

test("other locale and English subpaths retain asset handling", async () => {
  assert.equal((await get("/zh/")).status, 200);
  const response = await get("/en/example");
  assert.equal(response.status, 404);
  assert.match(await response.text(), /Page not found/);
});
