import { writeFile } from 'node:fs/promises';

const help = `Usage: node scripts/measure/css-waterfall.mjs [--out FILE] [--runs N] [--slow3g] [URL ...]
Each run uses a fresh mobile context: a cache-disabled navigation, a cache-filling navigation, then a warm navigation.`;
if (process.argv.includes('--help')) { console.log(help); process.exit(0); }
let out = `/tmp/fursay-css-${new Date().toISOString().slice(0, 10)}.json`, runs = 3, slow3g = false;
const urls = [];
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === '--out' && process.argv[i + 1]) out = process.argv[++i];
  else if (arg === '--runs' && process.argv[i + 1]) runs = Number(process.argv[++i]);
  else if (arg === '--slow3g') slow3g = true;
  else if (!arg.startsWith('-')) urls.push(new URL(arg, 'https://fursay.com').href);
  else throw new Error(`Unknown or incomplete option: ${arg}`);
}
if (!Number.isInteger(runs) || runs < 1) throw new Error('--runs must be a positive integer');
if (!urls.length) urls.push(...['/', '/zh/', '/ar/', '/koko', '/arabic', '/guides/koko-feelings-at-bedtime', '/products', '/product-samples/noor-worksheet'].map(path => new URL(path, 'https://fursay.com').href));
const { chromium } = await import('playwright');
const browser = await chromium.launch();
const results = [];
function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
try {
  for (const url of urls) {
    const pageResult = { url, runs: [] };
    results.push(pageResult);
    for (let run = 1; run <= runs; run++) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      if (slow3g) await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: 500 * 1024 / 8, uploadThroughput: 500 * 1024 / 8, connectionType: 'cellular3g' });
      await page.addInitScript(() => {
        window.__fursayVitals = { fcp: null, lcp: null };
        try { const observer = new PerformanceObserver(list => { for (const entry of list.getEntries()) if (entry.name === 'first-contentful-paint') window.__fursayVitals.fcp = entry.startTime; }); observer.observe({ type: 'paint', buffered: true }); window.__fursayPaintObserver = observer; } catch {}
        try { const observer = new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__fursayVitals.lcp = entry.startTime; }); observer.observe({ type: 'largest-contentful-paint', buffered: true }); window.__fursayLcpObserver = observer; } catch {}
      });
      let recording = false, requests = new Map(), navigationStart = null;
      cdp.on('Network.requestWillBeSent', event => {
        if (!recording) return;
        if (event.type === 'Stylesheet') requests.set(event.requestId, { url: event.request.url, start: event.timestamp, end: null, transferSize: null, encodedSize: null, decodedSize: null, contentEncoding: null, cacheControl: null, fromDiskCache: false, fromServiceWorker: false });
      });
      // The first document request is the navigation time origin, independent of private Playwright frame IDs.
      cdp.on('Network.requestWillBeSent', event => { if (recording && event.type === 'Document' && navigationStart === null) navigationStart = event.timestamp; });
      cdp.on('Network.responseReceived', event => {
        const item = recording && requests.get(event.requestId); if (!item) return;
        const headers = Object.fromEntries(Object.entries(event.response.headers).map(([key, value]) => [key.toLowerCase(), value]));
        item.contentEncoding = headers['content-encoding'] ?? null; item.cacheControl = headers['cache-control'] ?? null;
        item.fromDiskCache = event.response.fromDiskCache ?? false; item.fromServiceWorker = event.response.fromServiceWorker ?? false;
      });
      cdp.on('Network.dataReceived', event => { const item = recording && requests.get(event.requestId); if (item) item.decodedSize = (item.decodedSize ?? 0) + event.dataLength; });
      cdp.on('Network.loadingFinished', event => { const item = recording && requests.get(event.requestId); if (item) { item.end = event.timestamp; item.transferSize = event.encodedDataLength; } });
      cdp.on('Network.loadingFailed', event => { const item = recording && requests.get(event.requestId); if (item) { item.end = event.timestamp; item.error = event.errorText; } });
      async function measure(cacheDisabled) {
        await cdp.send('Network.setCacheDisabled', { cacheDisabled });
        requests = new Map(); navigationStart = null; recording = true;
        await page.coverage.startCSSCoverage({ resetOnNavigation: true });
        try {
          await page.goto(url, { waitUntil: 'load', timeout: 60000 });
          // load can precede paint and observer delivery, especially with a warm cache.
          await page.waitForFunction(() => window.__fursayVitals.fcp !== null && window.__fursayVitals.lcp !== null, null, { timeout: 2000 }).catch(() => {});
          const performance = await page.evaluate(() => {
            for (const entry of window.__fursayPaintObserver?.takeRecords() ?? []) if (entry.name === 'first-contentful-paint') window.__fursayVitals.fcp = entry.startTime;
            for (const entry of window.__fursayLcpObserver?.takeRecords() ?? []) window.__fursayVitals.lcp = entry.startTime;
            const nav = performance.getEntriesByType('navigation')[0];
            return { fcp: window.__fursayVitals.fcp, lcp: window.__fursayVitals.lcp, domContentLoaded: nav?.domContentLoadedEventEnd ?? null, load: nav?.loadEventEnd ?? null,
              resources: performance.getEntriesByType('resource').filter(e => e.initiatorType === 'link' || e.initiatorType === 'css').map(e => ({ url: e.name, encodedSize: e.encodedBodySize, decodedSize: e.decodedBodySize, renderBlockingStatus: e.renderBlockingStatus ?? null })) };
          });
          const coverage = (await page.coverage.stopCSSCoverage()).map(entry => {
            const totalBytes = Buffer.byteLength(entry.text ?? '', 'utf8');
            const usedBytes = entry.ranges.reduce((sum, range) => sum + Buffer.byteLength((entry.text ?? '').slice(range.start, range.end), 'utf8'), 0);
            return { url: entry.url, usedBytes, totalBytes };
          });
          recording = false;
          const stylesheets = [...requests.values()].map(item => {
            const resource = performance.resources.find(r => r.url === item.url);
            return { ...item, start: navigationStart === null ? null : (item.start - navigationStart) * 1000, end: item.end === null || navigationStart === null ? null : (item.end - navigationStart) * 1000, encodedSize: resource?.encodedSize ?? null, decodedSize: resource?.decodedSize || item.decodedSize, renderBlockingStatus: resource?.renderBlockingStatus ?? null };
          });
          delete performance.resources;
          return { finalUrl: page.url(), performance, stylesheets, coverage, totalCssTransferBytes: stylesheets.reduce((sum, item) => sum + (item.transferSize ?? 0), 0), totalCssEncodedBytes: stylesheets.reduce((sum, item) => sum + (item.encodedSize ?? 0), 0), totalCssDecodedBytes: stylesheets.reduce((sum, item) => sum + (item.decodedSize ?? 0), 0), coverageUsedBytes: coverage.reduce((sum, item) => sum + item.usedBytes, 0), coverageTotalBytes: coverage.reduce((sum, item) => sum + item.totalBytes, 0) };
        } catch (error) { recording = false; await page.coverage.stopCSSCoverage().catch(() => {}); return { error: error.message }; }
      }
      try {
        const cold = await measure(true);
        await cdp.send('Network.setCacheDisabled', { cacheDisabled: false });
        // The disabled-cache load does not populate cache; seed it explicitly before measuring warm.
        await page.goto(url, { waitUntil: 'load', timeout: 60000 });
        const warm = await measure(false);
        pageResult.runs.push({ run, cold, warm });
      } catch (error) { pageResult.runs.push({ run, error: error.message }); }
      finally { await context.close(); }
    }
  }
} finally { await browser.close(); }
await writeFile(out, JSON.stringify({ generatedAt: new Date().toISOString(), profile: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, slow3g }, runs, results }, null, 2) + '\n');
console.table(results.flatMap(result => ['cold', 'warm'].map(mode => ({ url: result.url, cache: mode, samples: result.runs.filter(r => r[mode] && !r[mode].error).length, fcpMs: median(result.runs.map(r => r[mode]?.performance?.fcp)), lcpMs: median(result.runs.map(r => r[mode]?.performance?.lcp)), loadMs: median(result.runs.map(r => r[mode]?.performance?.load)), cssTransferBytes: median(result.runs.map(r => r[mode]?.totalCssTransferBytes)), cssUsedBytes: median(result.runs.map(r => r[mode]?.coverageUsedBytes)), cssTotalBytes: median(result.runs.map(r => r[mode]?.coverageTotalBytes)) }))));
console.log(`Saved ${out}`);
