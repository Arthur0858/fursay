import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Restrict post-processing to the existing guides, including when new guides are added.
export const guideSlugs = [
  'chinese-storytime-for-arabic-speaking-families', 'english-storytime-without-fluent-english',
  'feelings-words-through-stories', 'from-video-to-five-minute-printable',
  'koko-brave-after-a-hard-day', 'koko-feelings-at-bedtime', 'nour-colors-at-the-table',
  'nour-hello-goodbye-at-the-door', 'pinyin-and-tones-for-parents',
  'repetition-without-pressure', 'three-chinese-words-a-day', 'three-minute-chinese-routine',
];
const procedures = new Set(['koko-feelings-at-bedtime', 'nour-colors-at-the-table', 'nour-hello-goodbye-at-the-door']);
const marker = 'data-guide-structured-data';

function textContent(value) {
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return value.replace(/<[^>]*>/g, '').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, code) => {
    if (code[0] === '#') return String.fromCodePoint(code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10));
    return entities[code.toLowerCase()] ?? match;
  }).replace(/\s+/g, ' ').trim();
}

export function applyGuideStructuredData(siteDir) {
  for (const locale of ['', 'zh', 'ar']) for (const slug of guideSlugs) {
    const path = join(siteDir, locale, 'guides', `${slug}.html`);
    let html = readFileSync(path, 'utf8');
    const booklist = html.match(/<section class="booklist-sec" id="booklist">[\s\S]*?<\/section>/)?.[0];
    if (!booklist) throw new Error(`Missing booklist: ${path}`);
    const books = [...booklist.matchAll(/<a href="(\/go\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
    if (books.length !== 2) throw new Error(`Expected two book links: ${path}`);
    const graph = [{ '@type': 'ItemList', itemListElement: books.map(([, url, name], i) => ({
      '@type': 'ListItem', position: i + 1, item: { '@type': 'Book', name: textContent(name), url: new URL(url, 'https://fursay.com').href },
    })) }];
    if (procedures.has(slug)) {
      const tool = html.match(/<section class="guide-tool"[\s\S]*?<\/section>/)?.[0];
      const name = tool?.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1];
      const list = tool?.match(/<ol>([\s\S]*?)<\/ol>/)?.[1];
      const steps = [...(list || '').matchAll(/<li>([\s\S]*?)<\/li>/g)].map(([, step]) => ({ '@type': 'HowToStep', text: textContent(step) }));
      if (!name || !steps.length) throw new Error(`Missing guide steps: ${path}`);
      graph.push({ '@type': 'HowTo', name: textContent(name), step: steps });
    }
    const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
    const script = `<script type="application/ld+json" ${marker}>${json}</script>`;
    html = html.replace(new RegExp(`<script type="application/ld\\+json" ${marker}>[\\s\\S]*?<\\/script>`, 'g'), '');
    if (!html.includes('</body>')) throw new Error(`Missing body: ${path}`);
    writeFileSync(path, html.replace('</body>', `${script}</body>`));
  }
}
