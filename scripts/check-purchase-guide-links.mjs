import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GUIDES } from './fursay-editorial-content.mjs';

const guides = {
  'feelings-words-through-stories': ['english-storytime-without-fluent-english', 'repetition-without-pressure', 'picture-books-for-naming-feelings'],
  'koko-feelings-at-bedtime': ['feelings-words-through-stories', 'three-minute-chinese-routine', 'repetition-without-pressure', 'picture-books-for-naming-feelings'],
  'english-storytime-without-fluent-english': ['repetition-without-pressure', 'feelings-words-through-stories', 'bilingual-bedtime-books-for-toddlers'],
  'repetition-without-pressure': ['english-storytime-without-fluent-english', 'from-video-to-five-minute-printable', 'bilingual-bedtime-books-for-toddlers'],
  'chinese-storytime-for-arabic-speaking-families': ['pinyin-and-tones-for-parents', 'three-chinese-words-a-day', 'bilingual-bedtime-books-for-toddlers'],
};
const pages = {
  koko: ['picture-books-for-naming-feelings', [['amz-0316450014', 'amz-0996099948'], ['books-0010985365', 'books-0010960916'], ['amz-0316450014', 'amz-b0drvxfbmr']]],
  arabic: ['bilingual-bedtime-books-for-toddlers', [['amz-0316450014', 'amz-b0drvxfbmr'], ['books-0010785383', 'books-0010706003'], ['amz-b0drvxfbmr', 'amz-0316450014']]],
  'episodes/koko-feelings': ['picture-books-for-naming-feelings', [['amz-0316012491', 'amz-1419713108'], ['books-0010985365', 'books-0010960916'], ['amz-0316012491', 'amz-1419713108']]],
  'episodes/noor-greetings': ['bilingual-bedtime-books-for-toddlers', [['amz-0786809140', 'amz-1452150141'], ['books-0010568432', 'books-0010661414'], ['amz-0786809140', 'amz-1452150141']]],
};
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
for (const [index, locale] of ['en', 'zh', 'ar'].entries()) {
  const prefix = locale === 'en' ? '' : `/${locale}`;
  const read = (path) => readFileSync(`fursay-optimized-site${prefix}/${path}.html`, 'utf8');
  for (const [slug, related] of Object.entries(guides)) {
    const html = read(`guides/${slug}`);
    const section = html.match(/<section class="editorial-related" data-editorial-links>([\s\S]*?)<\/section>/)?.[1];
    assert.ok(section, `${locale}/${slug}: missing related section`);
    for (const target of related) {
      const title = GUIDES.find((guide) => guide.slug === target).title[locale];
      assert.ok(section.includes(`<a href="${prefix}/guides/${target}">${esc(title)}</a>`), `${locale}/${slug}: missing ${target}`);
    }
  }
  for (const [path, [target, existing]] of Object.entries(pages)) {
    const html = read(path);
    const title = GUIDES.find((guide) => guide.slug === target).title[locale];
    assert.ok(html.includes(`<a href="${prefix}/guides/${target}">${esc(title)}</a>`), `${locale}/${path}: missing guide`);
    const anchors = [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>/g)];
    const shops = anchors.filter(([, href]) => /^\/go\/|^https?:\/\/(?:[^/]+\.)?(?:amazon\.[^/]+|books\.com\.tw)(?:\/|$)/i.test(href));
    assert.deepEqual(shops.map(([, href]) => href), existing[index].map((slug) => `/go/${slug}`), `${locale}/${path}: shop links changed`);
    for (const [anchor] of shops) assert.match(anchor, /rel="[^"]*\bsponsored\b/);
  }
}
console.log('Purchase guide links contract passed.');
