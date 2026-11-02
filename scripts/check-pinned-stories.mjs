import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const root = 'fursay-optimized-site/';
const stories = JSON.parse(readFileSync(root + 'data/pinned-stories.json', 'utf8'));
for (const [key, page, episode] of [['koko', 'koko', 'koko-feelings'], ['noor', 'arabic', 'noor-greetings']]) {
  const story = stories[key];
  assert.equal(story.verifiedOn, '2026-11-02');
  assert.equal(story.practiceWords.length, 3);
  for (const locale of ['', 'zh/', 'ar/']) {
    for (const file of [page + '.html', 'episodes/' + episode + '.html']) {
      const html = readFileSync(root + locale + file, 'utf8');
      assert.match(html, new RegExp(`<iframe[^>]+src="https://www.youtube-nocookie.com/embed/${story.videoId}"`));
      assert.doesNotMatch(html, /<iframe[^>]+videoseries\?list=UU/);
      assert.ok(html.includes(`https://www.youtube.com/watch?v=${story.videoId}`));
      assert.ok(html.includes(story.title));
      assert.ok(html.includes(story.length));
      assert.ok(html.includes(story.captionNote));
      assert.ok(html.includes(story.practiceWords.join(', ')));
      if (file.startsWith('episodes/')) {
        const words = [...html.matchAll(/data-episode-word="([^"]+)"/g)].map(m => m[1]);
        assert.deepEqual(words, story.episodeWords || story.practiceWords);
      } else {
        assert.match(html, new RegExp(`href="/${locale}episodes/${episode}"[^>]*class="btn btn-(?:green|orange)"`));
        assert.match(html, /data-youtube-subscribe/);
      }
      assert.doesNotMatch(html, /sub_confirmation=1/);
    }
  }
}
for (const file of ['site-shared-20261102-pinned-watch.js', 'site-shared-20261102-pinned-watch-inline.js']) {
  const js = readFileSync(root + 'js/' + file, 'utf8');
  assert.match(js, /if \(anchor\.hasAttribute\('data-youtube-subscribe'\) &&[^\n]+\) \{\s*url\.searchParams\.set\('sub_confirmation', '1'\)/);
}
console.log('pinned stories contract: ok (12 pages, 2 explicit subscription assets)');
