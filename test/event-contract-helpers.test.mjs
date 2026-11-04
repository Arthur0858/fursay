import test from 'node:test';
import assert from 'node:assert/strict';
import { expectedEventSlug, expectedEventUrl } from '../scripts/event-contract-helpers.mjs';

test('relative download URLs and attribution match anonymous event filtering', () => {
  const url = '/download/koko-printable-sample?source_id=home_koko_printable_pdf&creator=fursay&placement=home_weekly_pack&utm_source=valid&utm_medium=Invalid&email=private';
  assert.equal(expectedEventUrl(url), 'https://fursay.com/download/koko-printable-sample?utm_source=valid');
  assert.equal(expectedEventSlug('home_koko_printable_pdf'), 'home_koko_printable_pdf');
  for (const invalid of ['Invalid', 'private@example.com', '2025550199', 'a'.repeat(65)]) assert.equal(expectedEventSlug(invalid), '');
  assert.equal(expectedEventUrl('/download?utm_source=one&utm_source=two'), 'https://fursay.com/download');
});
