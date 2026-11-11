import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const site = 'fursay-optimized-site';

test('greetings recommendations point to the matching disclosed affiliate books', () => {
  for (const locale of ['', 'ar/']) {
    const html = read(`${site}/${locale}episodes/noor-greetings.html`);
    for (const [title, asin] of [['The Hello, Goodbye Window', '0786809140'], ['Hello Hello', '1452150141']]) {
      const card = html.split('<article class="book-card">').find((part) => part.includes(title));
      assert.ok(card, `${locale} missing ${title}`);
      assert.match(card.split('</article>')[0], new RegExp(`https://www\\.amazon\\.com/dp/${asin}\\?tag=parenttechche-20"[^>]*rel="sponsored noopener"`));
    }
    assert.doesNotMatch(html, /0545560519|054515734X/);
  }
});

test('current event allowlists accept the replacement IDs and exclude the dead IDs', () => {
  for (const path of ['src/worker.js', `${site}/js/site-shared-20261111-asinfix.js`, `${site}/js/site-shared-20261111-asinfix-inline.js`]) {
    const source = read(path);
    for (const asin of ['0786809140', '1452150141']) assert.ok(source.includes(`'${asin}'`), `${path}: ${asin}`);
    assert.doesNotMatch(source, /0545560519|054515734X/);
  }
});
