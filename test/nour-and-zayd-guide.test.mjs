import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GUIDES, GUIDE_SLUGS } from '../scripts/fursay-editorial-content.mjs';
import { HANDWRITTEN_GUIDE_SLUGS } from '../scripts/fursay-editorial-pages.mjs';

test('Nour and Zayd guide is registered and links to localized stories and activities', () => {
  const slug = 'nour-and-zayd';
  assert.ok(GUIDE_SLUGS.includes(slug));
  assert.ok(GUIDES.some(guide => guide.slug === slug));
  assert.ok(HANDWRITTEN_GUIDE_SLUGS.has(slug));
  const sitemap = readFileSync('fursay-optimized-site/sitemap.xml', 'utf8');
  for (const prefix of ['', 'zh/', 'ar/']) {
    const html = readFileSync(`fursay-optimized-site/${prefix}guides/${slug}.html`, 'utf8');
    for (const route of ['episodes/noor-greetings', 'episodes/noor-colors', 'guides/nour-hello-goodbye-at-the-door', 'guides/nour-colors-at-the-table']) {
      assert.ok(html.includes(`href="/${prefix}${route}"`), `${prefix}${route}`);
    }
    assert.ok(html.includes('data-subscribe-placement="guide_end"'));
    assert.ok(sitemap.includes(`<loc>https://fursay.com/${prefix}guides/${slug}</loc>`));
    const hub = readFileSync(`fursay-optimized-site/${prefix}guides.html`, 'utf8');
    assert.ok(hub.includes(`href="/${prefix}guides/${slug}"`));
    const schemas = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)].flatMap(([, json]) => JSON.parse(json)['@graph'] || []);
    assert.ok(schemas.some(node => node['@type'] === 'Article' && node.url === `https://fursay.com/${prefix}guides/${slug}`));
  }
});
