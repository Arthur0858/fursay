import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import worker from '../src/worker.js';

for (const bundle of ['site-shared-20261103-events.js', 'site-shared-20261103-events-inline.js']) {
  for (const beaconResult of [true, false, undefined]) {
    test(`${bundle}: sample click with Beacon ${beaconResult}`, () => {
      const source = readFileSync(new URL(`../fursay-optimized-site/js/${bundle}`, import.meta.url), 'utf8');
      const send = source.slice(source.indexOf('function sendAnonymousEvent('), source.indexOf('\nfunction currentUrlAttribution('));
      const click = source.slice(source.indexOf('    var productSampleDownloadLink ='), source.indexOf('    var productSamplePrintButton ='));
      const calls = [], events = [];
      const link = { getAttribute: key => ({ 'data-product-sample-download': 'koko', href: '/download/koko-printable-sample' }[key] || '') };
      const context = { Blob, navigator: beaconResult === undefined ? {} : { sendBeacon: (...args) => { calls.push(['beacon', ...args]); return beaconResult; } }, fetch: (...args) => { calls.push(['fetch', ...args]); return Promise.resolve(); }, event: { target: { closest: () => link } }, normalizePack: x => x, pagePack: () => 'koko', linkUrlAttribution: () => ({}), emitFursayEvent: (name, detail) => { events.push(name); context.sendAnonymousEvent({ event: name, detail }); } };
      runInNewContext(`${send}\n${click}`, context);
      assert.deepEqual(events, ['fursay_product_sample_download_click']);
      const fetches = calls.filter(call => call[0] === 'fetch');
      assert.equal(fetches.length, beaconResult === true ? 0 : 1);
      if (fetches.length) { assert.equal(fetches[0][1], '/api/event'); assert.equal(fetches[0][2].method, 'POST'); assert.equal(fetches[0][2].keepalive, true); }
      assert.equal(calls.filter(call => call[0] === 'beacon').length, beaconResult === undefined ? 0 : 1);
    });
  }
}

test('sample redirect records GET requests, but not HEAD', async () => {
  const points = [];
  const env = { FURSAY_EVENTS: { writeDataPoint: point => points.push(point) } };
  const url = 'https://fursay.com/download/koko-printable-sample?source_id=test';
  const head = await worker.fetch(new Request(url, { method: 'HEAD' }), env);
  assert.equal(head.status, 302);
  assert.equal(points.length, 0);
  const get = await worker.fetch(new Request(url), env);
  assert.equal(get.status, 302);
  assert.equal(get.headers.get('location'), head.headers.get('location'));
  assert.equal(points.length, 1);
  assert.equal(points[0].blobs[0], 'fursay_product_sample_download_request');
});
