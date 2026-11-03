import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/worker.js";

const immutable = "public, max-age=31536000, immutable";

async function asset(path, status) {
  const response = new Response(status === 304 ? null : "asset", {
    status,
    headers: { "Cache-Control": immutable, "Content-Security-Policy": "default-src 'self'" },
  });
  return worker.fetch(new Request(`https://fursay.com${path}`), {
    ASSETS: { fetch: async () => response },
  });
}

test("asset cache headers follow response status and recover at the same URL", async () => {
  for (const status of [200, 206, 304]) {
    assert.equal((await asset("/image.png?v=1", status)).headers.get("Cache-Control"), immutable);
    assert.equal((await asset("/app.js?v=1", status)).headers.get("Cache-Control"), immutable);
  }
  for (const [path, status] of [["/image.png?v=1", 404], ["/app.js?v=1", 404], ["/image.png?v=1", 500]]) {
    const response = await asset(path, status);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
    assert.equal(response.headers.get("Content-Security-Policy"), "default-src 'self'");
  }
  assert.equal((await asset("/image.png?v=1", 200)).headers.get("Cache-Control"), immutable);
  for (const path of ["/image.png", "/app.js?v=1"]) {
    assert.equal((await asset(path, 302)).headers.get("Cache-Control"), "public, max-age=300, must-revalidate");
  }
});

test("HTML asset responses declare UTF-8 for locales and errors", async () => {
  for (const [path, status, contentType] of [
    ["/", 200, "text/html"], ["/zh/", 200, "text/html"],
    ["/ar/", 200, "text/html; charset=UTF-8"],
    ["/missing", 404, "text/html"], ["/missing.png", 404, "text/html"],
    ["/error", 500, "text/html; charset=iso-8859-1"],
  ]) {
    const response = await worker.fetch(new Request(`https://fursay.com${path}`), {
      ASSETS: { fetch: async () => new Response("page", { status, headers: { "Content-Type": contentType } }) },
    });
    assert.equal(response.status, status);
    assert.equal(response.headers.get("Content-Type"), "text/html; charset=utf-8", path);
  }
});

test("text assets gain a missing charset without replacing an existing one", async () => {
  for (const type of ["text/css", "text/javascript", "application/javascript", "application/xml", "text/plain"]) {
    for (const contentType of [type, `${type}; charset=iso-8859-1`]) {
      const response = await worker.fetch(new Request("https://fursay.com/asset"), {
        ASSETS: { fetch: async () => new Response("asset", { headers: { "Content-Type": contentType } }) },
      });
      assert.equal(response.headers.get("Content-Type"), contentType === type ? `${type}; charset=utf-8` : contentType);
    }
  }
});

test("favicon.ico redirects to the existing SVG without fetching assets", async () => {
  const response = await worker.fetch(new Request("https://fursay.com/favicon.ico?v=1"), {
    ASSETS: { fetch: () => { throw new Error("unexpected asset fetch"); } },
  });
  assert.equal(response.status, 301);
  assert.equal(response.headers.get("Location"), "https://fursay.com/favicon.svg?v=1");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
});
