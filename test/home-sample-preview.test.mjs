import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const site = resolve('fursay-optimized-site');
const read = (path) => readFileSync(resolve(site, path), 'utf8');

test('home sample previews and PDFs work without opening signup', () => {
  const worker = readFileSync('src/worker.js', 'utf8');
  for (const home of ['index.html', 'zh/index.html', 'ar/index.html']) {
    const html = read(home);
    for (const [pack, slug] of [['koko', 'koko-printable'], ['noor', 'noor-worksheet']]) {
      const anchor = html.match(new RegExp(`<a\\b[^>]*data-home-sample-link="${pack}"[^>]*>`));
      assert.ok(anchor, `${home}: ${pack} preview`);
      const href = anchor[0].match(/href="([^"]+)"/)[1].replaceAll('&amp;', '&');
      const url = new URL(href, 'https://fursay.com');
      assert.equal(url.pathname, `/product-samples/${slug}`);
      assert.equal(url.searchParams.has('subscribe'), false);
      assert.ok(existsSync(resolve(site, `product-samples/${slug}.html`)));
      assert.match(html, new RegExp(`href="/download/${slug}-sample\\?[^\"]+" download data-product-sample-download="${pack}"`));
      assert.ok(worker.includes(`"/download/${slug}-sample"`));
      assert.ok(existsSync(resolve(site, `downloads/${slug}-sample.pdf`)));
      const preview = read(`product-samples/${slug}.html`);
      assert.doesNotMatch(preview, /class="[^"]*modal-overlay[^\"]*\bopen\b/);

    }
  }
});
