import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/worker.js";

const origin = "https://fursay.com";
const assets = { fetch: async request => {
  const path = new URL(request.url).pathname;
  return new Response(path, { status: ["/koko.html", "/zh/index.html", "/ar/index.html"].includes(path) ? 200 : 404 });
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
test("registered shortlinks preserve attribution parameters", async () => {
  for (const [path, destination] of [["/go/koko-printable", "/product-samples/koko-printable"], ["/go/noor-worksheet", "/product-samples/noor-worksheet"], ["/go/printable", "/products"], ["/go/join", "/"], ["/go/youtube", "/"]]) {
    const response = await get(path + "?source_id=abc&utm_source=campaign&email=private");
    const url = new URL(response.headers.get("location"));
    assert.equal(response.status, 302);
    assert.equal(url.pathname, destination);
    assert.equal(url.searchParams.get("source_id"), "abc");
    assert.equal(url.searchParams.has("utm_source"), false);
    assert.equal(url.searchParams.has("email"), false);
    assert.notEqual(url.searchParams.get("utm_content"), "go_unknown");
  }
});
test("trailing slash redirects only existing clean HTML pages", async () => {
  const response = await get("/koko/?utm_source=x");
  assert.equal(response.status, 301); assert.equal(response.headers.get("location"), origin + "/koko?utm_source=x");
  assert.ok(response.headers.get("x-content-type-options"));
  assert.equal((await get("/zh/")).status, 200);
  assert.equal((await get("/nope/")).status, 404);
});
test("directory paths redirect to their trailing slash", async () => {
  for (const path of ["/zh", "/ar"]) {
    for (const search of ["", "?utm_source=x&ref=abc"]) {
      const response = await get(path + search);
      assert.equal(response.status, 301);
      assert.equal(response.headers.get("location"), origin + path + "/" + search);
      assert.ok(response.headers.get("x-content-type-options"));
    }
  }
  assert.equal((await get("/zh/")).status, 200);
  assert.equal((await get("/nope")).status, 404);
});

 test("purchase routes redirect to exact affiliate destinations", async () => {
  const { purchaseRoutes } = await import("../src/purchase-routes.js");
  assert.equal(Object.keys(purchaseRoutes).length, 15);
  for (const [path, destination] of Object.entries(purchaseRoutes)) {
    const response = await get(path + "?tag=unexpected&email=private");
    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), destination);
  }
});

test("live links redirect to the relevant family pages with campaign attribution", async () => {
  for (const [path, target, campaign] of [["/koko-live", "/koko", "koko-live"], ["/noor-live", "/ar/arabic", "noor-live"]]) {
    const response = await worker.fetch(new Request(`https://fursay.com${path}?utm_source=other`), {});
    assert.equal(response.status, 302);
    const location = new URL(response.headers.get("location"));
    assert.equal(location.origin, "https://fursay.com");
    assert.equal(location.pathname, target);
    assert.equal(location.searchParams.get("utm_source"), "youtube");
    assert.equal(location.searchParams.get("utm_medium"), "live");
    assert.equal(location.searchParams.get("utm_campaign"), campaign);
  }
});

test("localized shortlinks preserve registered attribution and select the locale", async () => {
  for (const locale of ["zh", "ar"]) {
    for (const kind of ["join", "sample", "share", "bio", "creator"]) {
      for (const pack of ["koko", "noor"]) {
        const suffixes = kind === "creator" ? ["", "/youtube", "/social", "/newsletter"] : [""];
        for (const suffix of suffixes) {
          const path = `/${kind}/${pack}${suffix}?ref=abc&utm_source=ignored&email=private`;
          const root = new URL((await get(path)).headers.get("location"));
          const response = await get(`/${locale}${path}`);
          const localized = new URL(response.headers.get("location"));
          assert.equal(response.status, 302);
          assert.equal(localized.pathname, `/${locale}${root.pathname}`);
          assert.equal(localized.search, root.search);
          assert.equal(localized.searchParams.get("subscribe"), pack);
          assert.equal(localized.searchParams.get("ref"), "abc");
          assert.equal(localized.searchParams.has("email"), false);
        }
      }
    }
    assert.equal((await get(`/${locale}/sample`)).status, 404);
    assert.equal((await get(`/${locale}/join/unknown`)).status, 404);
  }
});
