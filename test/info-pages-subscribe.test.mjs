import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { subscriptionNote } from '../scripts/subscription-note.mjs';

const site = 'fursay-optimized-site';

test('info pages have one working signup and localized discovery links', () => {
  for (const prefix of ['', '/zh', '/ar']) for (const page of ['about', 'support', 'contact', 'guides']) {
    const file = `${site}${prefix}/${page}.html`;
    const html = readFileSync(file, 'utf8');
    const placement = page === 'guides' ? 'guides_index_end' : `${page}_end`;
    assert.deepEqual([...html.matchAll(/<form\b[^>]*data-subscribe-placement="([^"]+)"/g)].map(m => m[1]), [placement], file);
    assert.match(html, /\/css\/inline-subscribe-20261101\.css/);
    assert.match(html, /\/js\/site-shared-20261120m-click-inline\.js/);
    assert.ok(html.includes(`href="${prefix}/products"`), file);
    if (page !== 'guides') assert.ok(html.includes(`href="${prefix}/guides"`), file);
    if (prefix === '/zh') assert.ok(html.includes(subscriptionNote('zh')), file);
    assert.match(html, /\/js\/turnstile-subscribe-20261110-v1\.js/);
  }
});

// Snapshot of origin/main (0bdef92). Update deliberately when guide content changes.
// The subscription note is checked separately so its localized copy can evolve.
test('guide articles and booklist source match the reviewed baseline', () => {
  const baseline = JSON.parse(readFileSync('test/info-pages-baseline.json', 'utf8'));
  const files = ['scripts/product-booklists.mjs'];
  for (const dir of ['guides', 'zh/guides', 'ar/guides']) {
    files.push(...readdirSync(`${site}/${dir}`).map(name => `${site}/${dir}/${name}`));
  }
  assert.deepEqual(files.sort(), Object.keys(baseline).sort());
  for (const file of files) {
    let content = readFileSync(file, 'utf8');
    if (file.endsWith('.html')) {
      const notes = [...content.matchAll(/<p class="subscription-note">[\s\S]*?<\/p>/g)];
      assert.equal(notes.length, 1, file);
      const locale = file.includes('/zh/') ? 'zh' : file.includes('/ar/') ? 'ar' : 'en';
      // Arabic main predates the shared note; accept it until the copy is updated.
      const arabicMain = '<p class="subscription-note">للآباء ومقدمي الرعاية البالغين (18+)؛ النشرة البريدية باللغة الصينية فقط، ولا تتوفر نشرة بالعربية أو الإنجليزية. اختاروا عالم القصص الذي ترغبون في تلقي أخباره. رسائل غير منتظمة، بحد أقصى رسالة واحدة في الأسبوع. نستخدم عنوان بريدكم فقط لإرسال هذه الحزم، ويمكنكم إلغاء الاشتراك في أي وقت. <a href="/ar/privacy">الخصوصية</a>.</p>';
      assert.ok(notes[0][0] === subscriptionNote(locale) || (locale === 'ar' && notes[0][0] === arabicMain), file);
      content = content.replace(notes[0][0], '<subscription-note/>');
    }
    assert.equal(createHash('sha256').update(content).digest('hex'), baseline[file], file);
  }
});
