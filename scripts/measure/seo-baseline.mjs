import { readFile, writeFile } from 'node:fs/promises';

const help = `Usage: node scripts/measure/seo-baseline.mjs [--out FILE]
Fetch the public site's manifest-selected SEO baseline, with a 500 ms request interval.`;
if (process.argv.includes('--help')) { console.log(help); process.exit(0); }
let out = `/tmp/fursay-seo-${new Date().toISOString().slice(0, 10)}.json`;
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--out' && process.argv[i + 1]) out = process.argv[++i];
  else throw new Error(`Unknown or incomplete option: ${process.argv[i]}`);
}
const manifest = JSON.parse(await readFile(new URL('../../fursay-optimized-site/data/site-structure.json', import.meta.url), 'utf8'));
const keys = ['koko', 'sample-koko', 'episode-koko-feelings', 'guide-koko-feelings-at-bedtime', 'arabic', 'sample-noor', 'episode-noor-colors', 'guide-nour-colors-at-the-table'];
const paths = new Set(['/', '/privacy', '/robots.txt', '/sitemap.xml']);
for (const key of keys) {
  const page = manifest.pages.find(item => item.key === key);
  if (!page) throw new Error(`Missing manifest page: ${key}`);
  for (const route of Object.values(page.localizedRoutes)) paths.add(route);
}
const origin = manifest.site.origin;
let lastRequest = 0;
async function get(url) {
  // Follow redirects manually so every HTTP request respects the interval.
  for (let redirects = 0; redirects <= 10; redirects++) {
    const delay = Math.max(0, 500 - (Date.now() - lastRequest));
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    lastRequest = Date.now();
    const response = await fetch(url, { redirect: 'manual', headers: { 'user-agent': 'fursay-measure/1.0 (technical baseline)' }, signal: AbortSignal.timeout(30000) });
    if ([301, 302, 303, 307, 308].includes(response.status) && response.headers.has('location')) {
      url = new URL(response.headers.get('location'), url).href;
      await response.body?.cancel();
      continue;
    }
    return { response, url, body: await response.text() };
  }
  throw new Error('Too many redirects');
}
function decode(value = '') {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (all, entity) => {
    const named = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' };
    if (entity[0] !== '#') return named[entity.toLowerCase()] ?? all;
    const n = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : all;
  });
}
function attrs(tag) {
  const result = {};
  for (const match of tag.matchAll(/([^\s=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) result[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4] ?? '');
  return result;
}
function parse(html) {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i)?.[1] ?? '';
  const metas = [...head.matchAll(/<meta\b[^>]*>/gi)].map(m => attrs(m[0].slice(5, -1)));
  const links = [...head.matchAll(/<link\b[^>]*>/gi)].map(m => attrs(m[0].slice(5, -1)));
  const meta = name => metas.find(m => m.name?.toLowerCase() === name)?.content ?? null;
  const description = meta('description');
  const root = attrs((html.match(/<html\b[^>]*>/i)?.[0] ?? '').replace(/^<html\b|>$/gi, ''));
  return { title: decode(head.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1]?.trim() ?? '') || null,
    metaDescription: description, metaDescriptionLength: description === null ? null : [...description].length,
    canonical: links.find(l => l.rel?.toLowerCase().split(/\s+/).includes('canonical'))?.href ?? null,
    hreflang: links.filter(l => l.rel?.toLowerCase().split(/\s+/).includes('alternate') && l.hreflang).map(l => ({ lang: l.hreflang, href: l.href ?? null })),
    metaRobots: meta('robots'), htmlLang: root.lang ?? null, htmlDir: root.dir ?? null,
    h1Count: (html.replace(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '').match(/<h1(?:\s|>)/gi) ?? []).length };
}
const results = [];
// Fetch sitemap once, then include the same response in the report.
let sitemap;
try { sitemap = await get(new URL('/sitemap.xml', origin).href); } catch (error) { sitemap = { error: error.message }; }
const locs = sitemap.response?.ok ? new Set([...sitemap.body.matchAll(/<loc\b[^>]*>([^<]*)<\/loc\s*>/gi)].map(m => decode(m[1].trim()))) : null;
for (const path of paths) {
  const requestedUrl = new URL(path, origin).href;
  try {
    const item = path === '/sitemap.xml' ? sitemap : await get(requestedUrl);
    if (item.error) throw new Error(item.error);
    const isHtml = /\b(?:text\/html|application\/xhtml\+xml)\b/i.test(item.response.headers.get('content-type') ?? '');
    results.push({ path, requestedUrl, finalUrl: item.url, status: item.response.status, xRobotsTag: item.response.headers.get('x-robots-tag'), inSitemap: locs ? locs.has(requestedUrl) : null, ...(isHtml ? parse(item.body) : { title: null, metaDescription: null, metaDescriptionLength: null, canonical: null, hreflang: [], metaRobots: null, htmlLang: null, htmlDir: null, h1Count: null }), isHtml });
  } catch (error) { results.push({ path, requestedUrl, error: error.message, inSitemap: locs ? locs.has(requestedUrl) : null }); }
}
await writeFile(out, JSON.stringify({ generatedAt: new Date().toISOString(), sitemapAvailable: Boolean(locs), results }, null, 2) + '\n');
console.table(results.map(r => ({ path: r.path, status: r.status ?? 'error', gaps: r.error ?? (r.isHtml ? [!r.title && 'title', !r.metaDescription && 'description', !r.canonical && 'canonical', !r.htmlLang && 'lang', r.h1Count !== 1 && `h1:${r.h1Count}`, r.inSitemap === false && 'not in sitemap', r.inSitemap === null && 'sitemap unavailable'].filter(Boolean).join(', ') || '—' : 'non-HTML') })));
console.log(`Saved ${out}`);
