import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applyGuideStructuredData, guideSlugs } from '../scripts/guide-structured-data.mjs';

test('guide schemas use visible booklist and procedure content and survive regeneration', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fursay-guides-'));
  try {
    for (const locale of ['', 'zh', 'ar']) {
      mkdirSync(join(dir, locale, 'guides'), { recursive: true });
      for (const slug of guideSlugs) {
        const relative = join(locale, 'guides', `${slug}.html`);
        writeFileSync(join(dir, relative), readFileSync(join('fursay-optimized-site', relative)));
      }
    }
    applyGuideStructuredData(dir);
    applyGuideStructuredData(dir);
    let howToCount = 0;
    for (const locale of ['', 'zh', 'ar']) for (const slug of guideSlugs) {
      const file = join(dir, locale, 'guides', `${slug}.html`);
      const html = readFileSync(file, 'utf8');
      const scripts = [...html.matchAll(/<script type="application\/ld\+json"(?: data-guide-structured-data)?>([\s\S]*?)<\/script>/g)];
      const schemas = scripts.map(([, json]) => JSON.parse(json));
      for (const schema of schemas) assert.equal(schema['@context'], 'https://schema.org', file);
      assert.equal((html.match(/data-guide-structured-data/g) || []).length, 1, file);
      const graph = schemas.flatMap(schema => schema['@graph'] || [schema]);
      for (const type of ['Article', 'Organization', 'BreadcrumbList']) assert.ok(graph.some(x => x['@type'] === type), `${file}: ${type}`);
      const items = graph.find(x => x['@type'] === 'ItemList').itemListElement;
      assert.equal(items.length, 2, file);
      const booklist = html.match(/<section class="booklist-sec" id="booklist">[\s\S]*?<\/section>/)[0];
      for (const { item } of items) {
        assert.equal(item['@type'], 'Book'); assert.ok(item.name);
        assert.ok(booklist.includes(item.name.replace(/&/g, '&amp;')) || booklist.includes(item.name), file);
        assert.ok(booklist.includes(new URL(item.url).pathname), file);
      }
      for (const node of graph) {
        if (node['@type'] === 'HowTo') {
          howToCount++; assert.ok(node.name && node.step.length); assert.ok(html.includes(node.name), file);
          for (const step of node.step) { assert.equal(step['@type'], 'HowToStep'); assert.ok(step.text); assert.ok(html.includes(step.text.replace(/&/g, '&amp;')) || html.includes(step.text), file); }
        }
        if (node['@type'] === 'FAQPage') for (const q of node.mainEntity) {
          assert.equal(q['@type'], 'Question'); assert.ok(q.name); assert.equal(q.acceptedAnswer['@type'], 'Answer'); assert.ok(q.acceptedAnswer.text);
        }
      }
    }
    assert.equal(howToCount, 9);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

const visibleText = value => value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, code) => {
      const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
      if (code[0] === '#') return String.fromCodePoint(code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10));
      return entities[code.toLowerCase()] ?? match;
    }).replace(/\s+/g, ' ').trim();
function checkGuideFaq(html, file) {
    const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
    assert.ok(article, `${file}: missing article`);
    // Exclude the subscription form and related navigation from editorial answers.
    const content = visibleText(article[1].replace(/<section class="inline-subscribe"[\s\S]*?<\/section>/i, ''));
    for (const [, json] of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
      const schema = JSON.parse(json);
      for (const node of schema['@graph'] || [schema]) if (node['@type'] === 'FAQPage') {
        assert.ok(Array.isArray(node.mainEntity) && node.mainEntity.length >= 2 && node.mainEntity.length <= 4, file);
        for (const question of node.mainEntity) {
          assert.equal(question['@type'], 'Question', file);
          assert.equal(question.acceptedAnswer?.['@type'], 'Answer', file);
          for (const text of [question.name, question.acceptedAnswer.text]) {
            assert.ok(typeof text === 'string' && text.trim(), file);
            assert.ok(content.includes(visibleText(text)), `${file}: FAQ text is not visible in the article: ${text}`);
          }
        }
      }
    }
}

test('guide FAQs contain only questions and answers visible in the article', () => {
  const slugs = [...guideSlugs, 'bilingual-bedtime-books-for-toddlers', 'picture-books-for-naming-feelings'];
  for (const locale of ['', 'zh', 'ar']) for (const slug of slugs) {
    const file = join('fursay-optimized-site', locale, 'guides', `${slug}.html`);
    checkGuideFaq(readFileSync(file, 'utf8'), file);
  }
});

test('guide FAQ visibility check rejects text absent from the article', () => {
  const faq = { '@type': 'FAQPage', mainEntity: ['One?', 'Two?'].map(name => ({
    '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text: 'Visible answer.' },
  })) };
  const page = `<article><h2>One?</h2><p>Visible answer.</p><h2>Two?</h2></article><script type="application/ld+json">${JSON.stringify(faq)}</script>`;
  checkGuideFaq(page, 'fixture');
  faq.mainEntity[1].acceptedAnswer.text = 'Invented answer.';
  const invalid = page.replace(JSON.stringify({ ...faq, mainEntity: faq.mainEntity.map(q => ({ ...q, acceptedAnswer: { ...q.acceptedAnswer, text: 'Visible answer.' } })) }), JSON.stringify(faq));
  assert.throws(() => checkGuideFaq(invalid, 'fixture'), /not visible/);
});
