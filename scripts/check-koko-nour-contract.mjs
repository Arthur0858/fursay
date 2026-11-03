import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const root = 'fursay-optimized-site/';
const locales = {
  '': ['Free sample — available now', 'Full product — join the waitlist', 'Get sample now', 'Join waitlist', 'Story · ages 3–6', 'Worksheet · ages 2–8', 'point and say'],
  'zh/': ['免費樣本 — 現在可用', '完整產品 — 加入等候名單', '立即取得樣本', '加入等候名單', '故事・3–6 歲', '學習單・2–8 歲', '指圖說詞'],
  'ar/': ['العينة المجانية — متاحة الآن', 'المنتج الكامل — انضموا إلى قائمة الانتظار', 'احصلوا على العينة الآن', 'انضموا إلى قائمة الانتظار', 'القصة للأعمار 3–6', 'ورقة النشاط للأعمار 2–8', 'أشيروا وقولوا'],
};
for (const [prefix, [sample, product, get, join, story, worksheet, use]] of Object.entries(locales)) {
  for (const path of ['koko.html', 'index.html', 'products/koko-printable.html']) {
    const html = readFileSync(root + prefix + path, 'utf8');
    for (const value of [get, join, ...(path === 'products/koko-printable.html' ? [] : [product, ...(path === 'index.html' ? [] : [sample])])]) assert.ok(html.includes(value), `${prefix}${path}: ${value}`);
    assert.ok(!html.includes(`${sample} · `), `${prefix}${path}: duplicated sample heading`);
    assert.doesNotMatch(html, /I want the full 3-page printable|我想要完整 3 頁可列印包|نريد حزمة كوكو الكاملة من 3 صفحات/i);
  }
  const productPage = readFileSync(root + prefix + 'products/koko-printable.html', 'utf8');
  assert.match(productPage, /<div class="brand-actions"><a[^>]*data-koko-entry="sample"[\s\S]*?<button[^>]*data-koko-entry="product"[\s\S]*?<\/button><\/div>/);
  const world = readFileSync(root + prefix + 'koko.html', 'utf8');
  const sampleActions = world.match(/<div class="koko-sample-actions">([\s\S]*?)<\/div>/)?.[1] || '';
  const source = `${prefix.replace('/', '_')}koko_lead_magnet_printable_interest`;
  assert.match(sampleActions, /koko-sample-download[\s\S]*koko-printable-interest-cta/);
  for (const attribute of ['data-product-interest="koko"', 'data-interest-stage="lead_magnet_printable_interest"', `data-signup-source="${source}"`, 'aria-haspopup="dialog"', 'aria-controls="subscribeModal"']) assert.ok(sampleActions.includes(attribute), `${prefix}koko.html: ${attribute}`);
  for (const path of ['arabic.html', 'index.html']) {
    const html = readFileSync(root + prefix + path, 'utf8');
    for (const value of [story, worksheet, use]) assert.ok(html.includes(value), `${prefix}${path}: ${value}`);
  }
  const html = readFileSync(root + prefix + 'products/noor-worksheet.html', 'utf8');
  for (const value of [worksheet, use, '3–6', '6–8']) assert.ok(html.includes(value), `${prefix}worksheet: ${value}`);
}
for (const [path, values] of [['product-samples/koko-printable.html', locales[''].slice(2, 4)], ['ar/product-samples/noor-worksheet.html', locales['ar/'].slice(5)]]) {
 const html = readFileSync(root + path, 'utf8');
 for (const value of values) assert.ok(html.includes(value), `${path}: ${value}`);
}
console.log('Koko availability and Nour age contract: passed');
