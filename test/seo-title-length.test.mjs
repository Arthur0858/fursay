import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("priority page titles fit within 60 characters", () => {
  for (const page of ["koko", "arabic", "ar/arabic", "episodes/noor-colors", "episodes/noor-greetings", "guides/three-minute-chinese-routine", "guides/koko-brave-after-a-hard-day", "guides/nour-colors-at-the-table"]) {
    const html = readFileSync(`fursay-optimized-site/${page}.html`, "utf8");
    const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
    assert.ok(title, page);
    assert.ok([...title].length <= 60, `${page}: ${title}`);
    assert.ok(title.endsWith(" | Fursay"), page);
  }
});
