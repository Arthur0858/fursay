import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { SHORT_META_DESCRIPTIONS } from "../scripts/short-meta-descriptions.mjs";
import { checkShortDescription } from "../scripts/short-description-contract.mjs";

test("audited sitemap descriptions meet language-specific lower bounds", async () => {
  const sitemap = await readFile("fursay-optimized-site/sitemap.xml", "utf8");
  assert.equal(Object.keys(SHORT_META_DESCRIPTIONS).length, 27);
  for (const path of Object.keys(SHORT_META_DESCRIPTIONS)) {
    assert.ok(sitemap.includes(`<loc>https://fursay.com${path}</loc>`), path);
    const min = path.startsWith("/zh/") ? 80 : 110;
    assert.equal(checkShortDescription(path, "字".repeat(min - 1)).length, 1, path);
    assert.deepEqual(checkShortDescription(path, "字".repeat(min)), [], path);
    const html = await readFile(`fursay-optimized-site${path}.html`, "utf8");
    const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
    assert.ok(description, path);
    assert.deepEqual(checkShortDescription(path, description), [], path);
    for (const selector of ['property="og:description"', 'name="twitter:description"']) {
      assert.ok(html.includes(`${selector} content="${description}"`), `${path}: ${selector}`);
    }
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    const primary = blocks.find((block) => /"description"\s*:/.test(block[1]));
    if (primary) assert.equal(primary[1].match(/"description"\s*:\s*"((?:\\.|[^"\\])*)"/)[1], description, path);
  }
  assert.deepEqual(checkShortDescription('/unlisted', 'short'), []);
});
