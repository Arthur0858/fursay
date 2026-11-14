import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GUIDES } from '../scripts/fursay-editorial-content.mjs';
import { HANDWRITTEN_GUIDE_SLUGS, writeEditorialBundle } from '../scripts/fursay-editorial-pages.mjs';

test('editorial bundle preserves all handwritten guides and fails when one is missing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fursay-handwritten-'));
  const originalLength = GUIDES.length;
  try {
    cpSync('fursay-optimized-site', dir, { recursive: true });
    writeFileSync(join(dir, 'links.html'), '<meta name="description" content="fixture">');
    const paths = [...HANDWRITTEN_GUIDE_SLUGS].flatMap(slug => ['', 'zh/', 'ar/'].map(prefix => `${prefix}guides/${slug}.html`));
    const before = new Map(paths.map(path => [path, readFileSync(join(dir, path))]));
    for (const slug of HANDWRITTEN_GUIDE_SLUGS) if (!GUIDES.some(guide => guide.slug === slug)) GUIDES.push({ slug, world: 'koko', title: { en: 'test', zh: 'test', ar: 'test' }, description: { en: 'test', zh: 'test', ar: 'test' } });
    // Include handwritten routes in the sitemap to exercise the indexable-page patcher too.
    const sitemap = join(dir, 'sitemap.xml');
    writeFileSync(sitemap, readFileSync(sitemap, 'utf8').replace('</urlset>', `${paths.map(path => `<url><loc>https://fursay.com/${path.replace(/\.html$/, '')}</loc></url>`).join('')}</urlset>`));
    writeEditorialBundle(dir);
    for (const path of paths) assert.deepEqual(readFileSync(join(dir, path)), before.get(path), path);
    unlinkSync(join(dir, paths[0]));
    assert.throws(() => writeEditorialBundle(dir), { code: 'ENOENT' });
  } finally {
    GUIDES.length = originalLength;
    rmSync(dir, { recursive: true, force: true });
  }
});
