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
