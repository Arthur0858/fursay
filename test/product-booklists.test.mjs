import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const expected = {
  en: { hub: ['amz-0316450014', 'amz-b0drvxfbmr'], sample: ['amz-0316450014', 'amz-0316012491'], guide: ['amz-0316450014', 'amz-0996099948'] },
  zh: { hub: ['books-0010985365', 'books-0010785383'], sample: ['books-0010985365', 'books-0010960916'], guide: ['books-0010985365', 'books-0010960916'] },
  ar: { hub: ['amz-0316450014', 'amz-b0drvxfbmr'], sample: ['amz-0316450014', 'amz-0316012491'], guide: ['amz-0316450014', 'amz-b0drvxfbmr'] },
};
const routes = { hub: ['products'], sample: ['product-samples/koko-printable', 'products/koko-printable'], guide: ['guides/english-storytime-without-fluent-english'] };

test('target pages have one disclosed booklist with the intended short URLs', () => {
  for (const [locale, contexts] of Object.entries(expected)) for (const [context, paths] of Object.entries(routes)) for (const path of paths) {
    const file = `fursay-optimized-site/${locale === 'en' ? '' : `${locale}/`}${path}.html`;
    const html = readFileSync(file, 'utf8');
    const sections = [...html.matchAll(/<section class="booklist-sec" id="booklist">[\s\S]*?<\/section>/g)];
    assert.equal(sections.length, 1, file);
    assert.match(sections[0][0], /class="booklist-editorial-note"/);
    assert.match(sections[0][0], /class="booklist-note"/);
    const sponsored = [...html.matchAll(/<a\b[^>]*rel="sponsored noopener"[^>]*>/g)];
    assert.equal(sponsored.length, 2, file);
    assert.deepEqual(sponsored.map((m) => m[0].match(/href="\/go\/([^\"]+)"/)?.[1]).sort(), [...contexts[context]].sort(), file);
    assert.equal((sections[0][0].match(/rel="sponsored noopener"/g) || []).length, 2, file);
  }
});
