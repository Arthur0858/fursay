import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SITE = "fursay-optimized-site";
const HELPER = "/js/turnstile-subscribe-20261110-v1.js";
const TAG = `<script src="${HELPER}" defer></script>`;

function htmlFiles(dir, prefix = "") {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) return htmlFiles(join(dir, entry.name), rel);
    return entry.name.endsWith(".html") ? [rel] : [];
  });
}

test("every page with a subscribe form loads the Turnstile helper exactly once, after the shared script", () => {
  let formPages = 0;
  for (const rel of htmlFiles(SITE)) {
    const html = readFileSync(join(SITE, rel), "utf8");
    const hasForm = html.includes('id="subscribeModal"') || html.includes("data-subscribe-placement=");
    const count = html.split(TAG).length - 1;
    if (!hasForm) {
      assert.equal(count, 0, `${rel} has no form but loads the helper`);
      continue;
    }
    formPages += 1;
    assert.equal(count, 1, `${rel} must load the helper once`);
    const shared = html.search(/<script src="\/js\/site-shared-20261103-attrsafe(?:-inline)?\.js"><\/script>/);
    assert.ok(shared >= 0 && shared < html.indexOf(TAG), `${rel} helper must follow the shared script`);
    assert.equal(html.includes("challenges.cloudflare.com"), false, `${rel} must not hardcode the Turnstile api.js`);
  }
  assert.ok(formPages >= 60, `expected the modal + inline form pages, got ${formPages}`);
});

test("the helper uses the Fursay newsletter sitekey, explicit render, and the subscribe action", () => {
  const js = readFileSync(join(SITE, HELPER), "utf8");
  assert.match(js, /var SITEKEY = '0x4[A-Za-z0-9_-]{10,}';/);
  assert.match(js, /if \(!SITEKEY \|\| !window\.fetch/);
  assert.match(js, /turnstile\/v0\/api\.js\?render=explicit&onload=onFursayTurnstileLoad/);
  assert.match(js, /var ACTION = 'subscribe';/);
  assert.match(js, /'cf-turnstile-response'/);
  assert.match(js, /\.reset\(id\)/);
  assert.equal(/secret/i.test(js.replace(/TURNSTILE_SECRET_KEY/g, "")), false);
  assert.ok(Buffer.byteLength(js) < 6000);
});
