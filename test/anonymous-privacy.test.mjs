import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import worker from '../src/worker.js';

const unsafe = ['fictional.parent@example.invalid', '+1 (202) 555-0199', '資料', 'a'.repeat(65), '2025550199'];
const valid = 'campaign_spring-01';
const sensitiveUrl = 'https://user:pass@fursay.com/guides?contact=fictional.parent%40example.invalid#private';

test('anonymous intake and download filter values before analytics and logs', async () => {
  const points = [], logs = [];
  const originalLog = console.log, originalError = console.error;
  console.log = console.error = (...args) => logs.push(JSON.stringify(args));
  try {
    const env = { FURSAY_EVENTS: { writeDataPoint: point => points.push(point) } };
    for (const value of unsafe) {
      const detail = Object.fromEntries(['source_id','creator','placement','campaign','signup_source','link_text','path','outbound_path'].map(key => [key, value]));
      detail.link_url = sensitiveUrl;
      await worker.fetch(new Request('https://fursay.com/api/event', { method: 'POST', body: JSON.stringify({ event: 'test_event', detail, ts: value }) }), env);
      await worker.fetch(new Request('https://fursay.com/download/koko-printable-sample?source_id=' + encodeURIComponent(value)), env);
    }
    await worker.fetch(new Request('https://fursay.com/api/event', { method: 'POST', body: JSON.stringify({event:'test_event', detail: {source_id:valid, creator:valid, placement:valid, link_url:sensitiveUrl}}) }), env);
    const output = JSON.stringify({points, logs});
    for (const value of unsafe) assert.ok(!output.includes(value));
    assert.ok(!output.includes('fictional.parent'));
    assert.ok(!output.includes('user:pass'));
    assert.ok(points.at(-1).blobs.slice(15, 18).every(value => value === valid));
  } finally { console.log = originalLog; console.error = originalError; }
});

for (const bundle of ['site-shared-20261111-asinfix.js', 'site-shared-20261111-asinfix-inline.js']) {
  test(`${bundle} filters anonymous details and URL attribution`, () => {
    const source = readFileSync(new URL(`../fursay-optimized-site/js/${bundle}`, import.meta.url), 'utf8');
    const helpers = source.slice(source.indexOf('function safeAnonymousSlug('), source.indexOf('function eventContext('));
    const attribution = source.slice(source.indexOf('function currentUrlAttribution('), source.indexOf('function syncChecks('));
    const ctx = { URL, URLSearchParams, window: { location: { search: '', href: 'https://fursay.com/' } } };
    runInNewContext(helpers + attribution, ctx);
    for (const value of unsafe) {
      ctx.window.location.search = '?source_id=' + encodeURIComponent(value) + '&creator=' + encodeURIComponent(value) + '&placement=' + encodeURIComponent(value);
      assert.equal(Object.keys(ctx.currentUrlAttribution()).length, 0);
      assert.equal(Object.keys(ctx.safeAnonymousDetail({source_id:value, creator:value, placement:value})).length, 0);
    }
    ctx.window.location.search = '?source_id=' + valid;
    assert.equal(ctx.currentUrlAttribution().source_id, valid);
    const result = ctx.safeAnonymousDetail({link_url:sensitiveUrl});
    assert.equal(result.link_url, 'https://fursay.com/guides');
    const detail = ctx.safeAnonymousDetail({product_id:'0010985365', outbound_kind:'youtube', link_url:'https://user:pass@fursay.com/products?utm_source=links&utm_medium=social_profile&utm_campaign=product_interest_validation&utm_content=fictional.parent%40example.invalid&email=secret#private'});
    assert.equal(detail.product_id, '0010985365');
    assert.equal(detail.outbound_kind, 'youtube');
    assert.equal(detail.link_url, 'https://fursay.com/products?utm_source=links&utm_medium=social_profile&utm_campaign=product_interest_validation');
    assert.equal(Object.keys(ctx.safeAnonymousDetail({product_id:'2025550199', outbound_kind:'private'})).length, 0);
    assert.equal(ctx.safeAnonymousDetail({link_url:'https://fursay.com/?utm_source=one&utm_source=two'}).link_url, 'https://fursay.com/');
  });
}
