import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pages = [
  ["en", "fursay-optimized-site/privacy.html", "Spam Protection", "We do not send the Turnstile result to MailerLite"],
  ["zh", "fursay-optimized-site/zh/privacy.html", "垃圾訂閱防護", "我們不會把 Turnstile 驗證結果傳送給 MailerLite"],
  ["ar", "fursay-optimized-site/ar/privacy.html", "الحماية من الاشتراكات الآلية", "لا نرسل نتيجة Turnstile إلى MailerLite"],
];

for (const [locale, file, heading, mailerLiteBoundary] of pages) {
  test(`privacy page ${locale} discloses Cloudflare Turnstile`, () => {
    const html = readFileSync(resolve(root, file), "utf8");
    assert.match(html, /Cloudflare Turnstile/);
    assert.ok(html.includes(heading), `missing heading: ${heading}`);
    assert.ok(html.includes('datetime="2026-11-10"'), "missing updated date");
    assert.ok(html.includes('"dateModified":"2026-11-10"'), "missing schema dateModified");
    assert.ok(html.includes('href="https://www.cloudflare.com/privacypolicy/"'), "missing Cloudflare privacy policy link");
    assert.ok(html.includes('href="https://www.cloudflare.com/turnstile-privacy-policy/"'), "missing Turnstile addendum link");
    assert.ok(html.includes(mailerLiteBoundary), "missing MailerLite boundary");
    assert.match(html, /\bIP\b/);
  });
}
