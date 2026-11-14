import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { productBooklist } from '../scripts/product-booklists.mjs';

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
    assert.match(html, /@media print\{\.booklist-sec,#booklist\{display:none!important\}\}/);
  }
});

const guideGroups = {
  koko: ['english-storytime-without-fluent-english', 'feelings-words-through-stories', 'repetition-without-pressure', 'from-video-to-five-minute-printable', 'koko-feelings-at-bedtime', 'koko-brave-after-a-hard-day'],
  noor: ['chinese-storytime-for-arabic-speaking-families', 'pinyin-and-tones-for-parents', 'three-chinese-words-a-day', 'three-minute-chinese-routine'],
  greetings: ['nour-hello-goodbye-at-the-door'],
  colors: ['nour-colors-at-the-table'],
};
const guideBooks = {
  en: {
    koko: [['The Color Monster', 'amz-0316450014'], ['Have You Filled a Bucket Today?', 'amz-0996099948']],
    noor: [['The Color Monster', 'amz-0316450014'], ['My First Bilingual Picture Book (EN-AR)', 'amz-b0drvxfbmr']],
    greetings: [['The Hello, Goodbye Window', 'amz-0786809140'], ['Hello Hello', 'amz-1452150141']],
    colors: [['Brown Bear, Brown Bear, What Do You See?', 'amz-0805047905'], ['My First Book of Colors', 'amz-0312527748']],
  },
  zh: {
    koko: [['情緒大飯店', 'books-0010985365'], ['我會好好說', 'books-0010960916']],
    noor: [['英阿雙語圖畫書', 'books-0010785383'], ['情緒怪獸', 'books-0010706003']],
    greetings: [['Brown Bear, Brown Bear, What Do You See?', 'books-0010568432'], ['Hello, World!', 'books-0010661414']],
    colors: [['Brown Bear, Brown Bear, What Do You See?', 'books-0010785383'], ['My First Book of Colors', 'books-0010706003']],
  },
};
guideBooks.ar = { ...guideBooks.en, koko: guideBooks.en.noor };
const disclosures = { en: 'Some links may earn a small commission', zh: '部分連結可能帶來少量聯盟佣金', ar: 'قد نحصل على عمولة صغيرة' };
const notes = { en: 'not needed to finish the activity', zh: '完成活動不需要購書', ar: 'وليست مطلوبة لإكمال النشاط' };

test('all guide translations have the specified disclosed books before sources', () => {
  for (const locale of ['en', 'zh', 'ar']) for (const [group, slugs] of Object.entries(guideGroups)) for (const slug of slugs) {
    const file = `fursay-optimized-site/${locale === 'en' ? '' : `${locale}/`}guides/${slug}.html`;
    const html = readFileSync(file, 'utf8');
    const sections = [...html.matchAll(/<section class="booklist-sec" id="booklist">[\s\S]*?<\/section>/g)];
    assert.equal(sections.length, 1, file);
    assert.equal((html.match(/id="booklist"/g) || []).length, 1, file);
    assert.equal((html.match(/class="booklist-sec"/g) || []).length, 1, file);
    const section = sections[0][0];
    assert.ok(html.indexOf(section) < html.indexOf('<section data-guide-sources>'), file);
    assert.match(section, /class="booklist-editorial-note" data-booklist-editorial-note/);
    assert.ok(section.includes(notes[locale]), file);
    assert.ok(section.includes(disclosures[locale]), file);
    const links = [...section.matchAll(/<a href="\/go\/([^\"]+)" rel="sponsored noopener" target="_blank">([^<]+)<\/a>/g)];
    assert.deepEqual(links.map((m) => [m[2], m[1]]), guideBooks[locale][group], file);
    assert.equal((html.match(/rel="sponsored noopener"/g) || []).length, 2, file);
    assert.match(html, /@media print\{\.booklist-sec,#booklist\{display:none!important\}\}/);
  }
});


test('purchase guides select the existing localized book links', () => {
  const pairs = {
    'bilingual-bedtime-books-for-toddlers': {
      en: ['amz-b0drvxfbmr', 'amz-0316450014'],
      zh: ['books-0010785383', 'books-0010706003'],
      ar: ['amz-b0drvxfbmr', 'amz-0316450014'],
    },
    'picture-books-for-naming-feelings': {
      en: ['amz-0316012491', 'amz-1419713108'],
      zh: ['books-0010985365', 'books-0010960916'],
      ar: ['amz-0316012491', 'amz-1419713108'],
    },
  };
  for (const [slug, locales] of Object.entries(pairs)) for (const [locale, expectedLinks] of Object.entries(locales)) {
    const html = productBooklist(locale, 'guide', { slug, world: 'koko' });
    const links = [...html.matchAll(/href="\/go\/([^" ]+)" rel="sponsored noopener"/g)].map((match) => match[1]);
    assert.deepEqual(links, expectedLinks, `${locale}/${slug}`);
    assert.ok(html.includes(disclosures[locale]));
    assert.ok(html.includes(notes[locale]));
  }
});
