import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/worker.js";

const origin = "https://fursay.com";
const assets = { fetch: async request => {
  const path = new URL(request.url).pathname;
  return new Response(path, { status: ["/koko.html", "/zh/index.html"].includes(path) ? 200 : 404 });
} };
const get = path => worker.fetch(new Request(origin + path), { ASSETS: assets });
test("go root and unknown routes carry owned attribution", async () => {
  for (const [path, content] of [["/go", "go_root"], ["/go/", "go_root"], ["/go/x", "go_unknown"]]) {
    const response = await get(path + "?source_id=abc&utm_source=bad&email=private");
    const url = new URL(response.headers.get("location"));
    assert.equal(response.status, 302); assert.equal(url.pathname, "/");
    assert.equal(url.searchParams.get("utm_source"), "shortlink");
    assert.equal(url.searchParams.get("utm_content"), content);
    assert.equal(url.searchParams.get("source_id"), "abc");
    assert.equal(url.searchParams.has("email"), false);
  }
});
test("go sample and newsletter routes", async () => {
  const sample = await get("/GO/Koko-Sample/?creator=friend");
  assert.equal(sample.status, 302);
  const url = new URL(sample.headers.get("location"));
  assert.equal(url.pathname, "/download/koko-printable-sample");
  assert.equal(url.searchParams.get("creator"), "friend");
  for (const [alias, route] of [["/go/koko-newsletter", "/join/koko"], ["/go/koko", "/join/koko"], ["/go/noor-newsletter", "/join/noor"], ["/go/noor", "/join/noor"]]) {
    assert.equal((await get(alias + "?ref=abc")).headers.get("location"), (await get(route + "?ref=abc")).headers.get("location"));
  }
  assert.equal(new URL((await get("/go/noor-sample")).headers.get("location")).pathname, "/download/noor-worksheet-sample");
});
test("trailing slash redirects only existing clean HTML pages", async () => {
  const response = await get("/koko/?utm_source=x");
  assert.equal(response.status, 301); assert.equal(response.headers.get("location"), origin + "/koko?utm_source=x");
  assert.ok(response.headers.get("x-content-type-options"));
  assert.equal((await get("/zh/")).status, 200);
  assert.equal((await get("/nope/")).status, 404);
});
