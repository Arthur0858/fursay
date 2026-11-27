import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GUIDES, GUIDE_SLUGS } from '../scripts/fursay-editorial-content.mjs';
import { HANDWRITTEN_GUIDE_SLUGS, editorialSitemapEntries } from '../scripts/fursay-editorial-pages.mjs';

test('tone marks guide answers the question and is registered in each locale', () => {
  const slug = 'do-you-write-tone-marks';
  assert.ok(GUIDES.some(g => g.slug === slug));
  assert.ok(GUIDE_SLUGS.includes(slug) && HANDWRITTEN_GUIDE_SLUGS.has(slug));
  const entries = editorialSitemapEntries((url) => url);
  const answers = [/Yes: when writing Pinyin/, /要：如果寫拼音作為發音參考/, /نعم: عند كتابة Pinyin/];
  for (const [i, prefix] of ['', 'zh/', 'ar/'].entries()) {
    const path = `${prefix}guides/${slug}`;
    const html = readFileSync(`fursay-optimized-site/${path}.html`, 'utf8');
    assert.match(html, answers[i]);
    assert.ok(entries.includes(`https://fursay.com/${path}`));
    for (const related of ['pinyin-and-tones-for-parents', 'three-chinese-words-a-day', 'three-minute-chinese-routine']) assert.ok(html.includes(`/${prefix}guides/${related}`));
    const schema = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
    assert.equal(schema['@graph'][0].mainEntityOfPage['@id'], `https://fursay.com/${path}`);
    assert.ok(html.includes(`data-guide-slug="${slug}"`));
  }
});
