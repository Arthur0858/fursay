#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const siteDirIndex = process.argv.indexOf('--site-dir');
if (siteDirIndex !== -1 && !process.argv[siteDirIndex + 1]) throw new Error('--site-dir requires a path');
const root = siteDirIndex === -1 ? 'fursay-optimized-site' : process.argv[siteDirIndex + 1].replace(/\/$/, '');
const baseUrlIndex = process.argv.indexOf('--base-url');
if (baseUrlIndex !== -1 && !process.argv[baseUrlIndex + 1]) throw new Error('--base-url requires a URL');
const baseUrl = baseUrlIndex === -1 ? '' : process.argv[baseUrlIndex + 1].replace(/\/$/, '');
const failures = [];
async function readResource(file) {
  if (!baseUrl) return readFile(file, 'utf8');
  const path = relative(root, file).split(sep).map(encodeURIComponent).join('/');
  const response = await fetch(`${baseUrl}/${path}`);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
}
async function checkedRead(file) {
  try { return await readResource(file); }
  catch (error) { failures.push(`${file}: unable to read: ${error.message}`); return ''; }
}
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(e => e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]))).flat();
}
const pages = (await files(root)).filter(p => p.endsWith('.html'));
let forms = 0;
for (const page of pages) {
  const html = await checkedRead(page);
  for (const match of html.matchAll(/<form\b[^>]*(?:subscribeForm|subscribe-form|data-subscribe-placement)[^>]*>[\s\S]*?<\/form>/gi)) {
    forms++;
    const form = match[0], note = form.match(/<p class="subscription-note">[\s\S]*?<\/p>/)?.[0] || '';
    const lang = (html.match(/<html\b[^>]*\blang=["'](zh|ar)/i)?.[1] || 'en').toLowerCase();
    const cadence = { en: /occasional, at most one email a week/i, zh: /不定期，最多每週一封/, ar: /رسائل غير منتظمة، بحد أقصى رسالة واحدة في الأسبوع/ }[lang];
    const privacy = { en: '/privacy', zh: '/zh/privacy', ar: '/ar/privacy' }[lang];
    if (!/18\+/.test(note) || !cadence.test(note) || !note.includes(`href="${privacy}"`) || form.indexOf(note) > form.search(/<button\b[^>]*type="submit"/i)) failures.push(`${page}: missing subscription note before submit`);
    if (lang === 'en' && !/chinese only|no English newsletter/i.test(note)) failures.push(`${page}: missing Chinese-only newsletter disclosure`);
    const samplePromise = { en: /first email[^.]*sample[^.]*confirm/i, zh: /確認訂閱後[^。]*第一封[^。]*樣本/, ar: /الرسالة الأولى[^.]*نموذج قصير[^.]*تأكيد الاشتراك/ }[lang];
    if (samplePromise.test(note)) failures.push(`${page}: sample email promise in subscription note`);
  }
  // Inspect human-readable text, JSON-LD and descriptive attributes, not tracking IDs or URLs.
  const copy = [...html.matchAll(/>([^<>]+)</g)].map(m => m[1]).join('\n') + '\n' + [...html.matchAll(/\b(?:content|aria-label)="([^"]*)"/g)].map(m => m[1]).join('\n');
  const withoutLimit = copy.replace(/at most one email a week/gi, '').replace(/最多每週一封/g, '').replace(/بحد أقصى رسالة واحدة في الأسبوع/g, '');
  if (/\bweekly\s+(?:email|newsletter|story pack|pack)|\b(?:email|newsletter|story pack|pack)s?\s+(?:every week|weekly)|每週(?:收到|寄|故事|陪讀|雙語)|(?:الحزمة|حزمة القصة|رسالتنا)\s+الأسبوعية/i.test(withoutLimit)) failures.push(`${page}: weekly delivery promise`);
}
for (const file of (await files(join(root, 'js'))).filter(p => p.endsWith('.js'))) {
  const copy = await checkedRead(file);
  if (/weekly story pack|حزمة القصص الأسبوعية|pack (?:has been|was) delivered/i.test(copy)) failures.push(`${file}: invalid subscription copy`);
}
if (!forms) failures.push('no signup forms found');
console.log(JSON.stringify({ ok: !failures.length, mode: baseUrl ? 'live' : 'local', pages: pages.length, forms, failures }, null, 2));
if (failures.length) process.exitCode = 1;
