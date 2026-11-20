import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { subscriptionNote } from '../scripts/subscription-note.mjs';

const base = '9af1fd4166569b54c663f1d38f345b73e119f86e';
const site = 'fursay-optimized-site';

test('info pages have one working signup and localized discovery links', () => {
  for (const prefix of ['', '/zh', '/ar']) for (const page of ['about', 'support', 'contact', 'guides']) {
    const file = `${site}${prefix}/${page}.html`;
    const html = readFileSync(file, 'utf8');
    const placement = page === 'guides' ? 'guides_index_end' : `${page}_end`;
    assert.deepEqual([...html.matchAll(/<form\b[^>]*data-subscribe-placement="([^"]+)"/g)].map(m => m[1]), [placement], file);
    assert.match(html, /\/css\/inline-subscribe-20261101\.css/);
    assert.match(html, /\/js\/site-shared-20261111-click-inline\.js/);
    assert.ok(html.includes(`href="${prefix}/products"`), file);
    if (page !== 'guides') assert.ok(html.includes(`href="${prefix}/guides"`), file);
    if (prefix === '/zh') assert.ok(html.includes(subscriptionNote('zh')), file);
    assert.match(html, /\/js\/turnstile-subscribe-20261110-v1\.js/);
  }
});

test('guide articles and booklist source remain identical to the merged baseline', () => {
  const files = execFileSync('git', ['ls-tree', '-r', '--name-only', base, '--', 'scripts/product-booklists.mjs', `${site}/guides/`, `${site}/zh/guides/`, `${site}/ar/guides/`], { encoding: 'utf8' }).trim().split('\n');
  assert.equal(files.length, 37);
  for (const file of files) {
    const original = execFileSync('git', ['show', `${base}:${file}`]);
    assert.deepEqual(readFileSync(file), original, file);
  }
});
