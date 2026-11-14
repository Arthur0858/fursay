import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applyGuideStructuredData, guideSlugs } from '../scripts/guide-structured-data.mjs';

test('guide schemas use visible booklist and procedure content and survive regeneration', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fursay-guides-'));
  try {
    for (const locale of ['', 'zh', 'ar']) {
      mkdirSync(join(dir, locale, 'guides'), { recursive: true });
      for (const slug of guideSlugs) {
        const relative = join(locale, 'guides', `${slug}.html`);
        writeFileSync(join(dir, relative), readFileSync(join('fursay-optimized-site', relative)));
      }
    }
    applyGuideStructuredData(dir);
    applyGuideStructuredData(dir);
    let howToCount = 0;
    for (const locale of ['', 'zh', 'ar']) for (const slug of guideSlugs) {
      const file = join(dir, locale, 'guides', `${slug}.html`);
      const html = readFileSync(file, 'utf8');
      const scripts = [...html.matchAll(/<script type="application\/ld\+json"(?: data-guide-structured-data)?>([\s\S]*?)<\/script>/g)];
      const schemas = scripts.map(([, json]) => JSON.parse(json));
      for (const schema of schemas) assert.equal(schema['@context'], 'https://schema.org', file);
      assert.equal((html.match(/data-guide-structured-data/g) || []).length, 1, file);
      const graph = schemas.flatMap(schema => schema['@graph'] || [schema]);
      for (const type of ['Article', 'Organization', 'BreadcrumbList']) assert.ok(graph.some(x => x['@type'] === type), `${file}: ${type}`);
      const items = graph.find(x => x['@type'] === 'ItemList').itemListElement;
      assert.equal(items.length, 2, file);
      const booklist = html.match(/<section class="booklist-sec" id="booklist">[\s\S]*?<\/section>/)[0];
      for (const { item } of items) {
        assert.equal(item['@type'], 'Book'); assert.ok(item.name);
        assert.ok(booklist.includes(item.name.replace(/&/g, '&amp;')) || booklist.includes(item.name), file);
        assert.ok(booklist.includes(new URL(item.url).pathname), file);
      }
      for (const node of graph) {
        if (node['@type'] === 'HowTo') {
          howToCount++; assert.ok(node.name && node.step.length); assert.ok(html.includes(node.name), file);
          for (const step of node.step) { assert.equal(step['@type'], 'HowToStep'); assert.ok(step.text); assert.ok(html.includes(step.text.replace(/&/g, '&amp;')) || html.includes(step.text), file); }
        }
        if (node['@type'] === 'FAQPage') for (const q of node.mainEntity) {
          assert.equal(q['@type'], 'Question'); assert.ok(q.name); assert.equal(q.acceptedAnswer['@type'], 'Answer'); assert.ok(q.acceptedAnswer.text);
        }
      }
    }
    assert.equal(howToCount, 9);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
