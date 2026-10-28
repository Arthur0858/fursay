import assert from "node:assert/strict";
import { relative, resolve } from "node:path";
import test from "node:test";
import {
  createSitemapLastmodResolver,
  generateSitemapLastmods,
  sitemapFilePath,
} from "../scripts/generate-sitemap-lastmods.mjs";

const repoDir = resolve("test-fixture-repo");
const siteDir = resolve(repoDir, "fursay-optimized-site");
const buildDate = "2026-10-27";

test("sitemap URLs resolve to each served HTML file, including localized roots", () => {
  for (const [path, file] of [
    ["/", "index.html"],
    ["/arabic", "arabic.html"],
    ["/zh/", "zh/index.html"],
    ["/ar/arabic", "ar/arabic.html"],
    ["/guides/story-time", "guides/story-time.html"],
    ["/arabic.html", "arabic.html"],
  ]) {
    assert.equal(sitemapFilePath(`https://fursay.com${path}`, siteDir), resolve(siteDir, file));
  }
});

test("sitemap generation uses individual git dates and preserves other XML content", () => {
  const dates = new Map([
    [relative(repoDir, resolve(siteDir, "index.html")), "2026-08-02"],
    [relative(repoDir, resolve(siteDir, "ar/arabic.html")), "2026-09-25"],
  ]);
  const calls = [];
  const git = (command, args, options) => {
    calls.push(args);
    assert.equal(command, "git");
    assert.equal(options.cwd, repoDir);
    assert.deepEqual(args.slice(0, 4), ["log", "-1", "--format=%cs", "--"]);
    return { status: 0, stdout: `${dates.get(args[4]) || ""}\n` };
  };
  const input = `<urlset>
  <url><loc>https://fursay.com/</loc><lastmod>2000-01-01</lastmod><priority>1.0</priority></url>
  <url><loc>https://fursay.com/ar/arabic</loc><xhtml:link href="https://fursay.com/arabic"/></url>
  <url><loc>https://fursay.com/new-page</loc><lastmod>2000-01-01</lastmod></url>
</urlset>`;
  const output = generateSitemapLastmods(input, { repoDir, siteDir, buildDate, git });
  assert.deepEqual([...output.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((match) => match[1]),
    ["2026-08-02", "2026-09-25", buildDate]);
  assert.match(output, /<priority>1\.0<\/priority>/);
  assert.match(output, /<xhtml:link href="https:\/\/fursay\.com\/arabic"\/>/);
  assert.equal(calls.length, 3);
});

test("git errors, unavailable history and invalid dates fall back to the build date", () => {
  for (const result of [
    { status: 0, stdout: "" },
    { status: 1, stdout: "" },
    { status: null, error: new Error("git unavailable") },
    { status: 0, stdout: "not-a-date" },
    { status: 0, stdout: "2026-13-01" },
    { status: 0, stdout: "2026-02-30" },
  ]) {
    const lastmodFor = createSitemapLastmodResolver({ repoDir, siteDir, buildDate, git: () => result });
    assert.equal(lastmodFor("https://fursay.com/arabic"), buildDate);
  }
  const lastmodFor = createSitemapLastmodResolver({ repoDir, siteDir, buildDate, git: () => { throw new Error("spawn failed"); } });
  assert.equal(lastmodFor("https://fursay.com/arabic"), buildDate);
});

test("an unchanged tracked file keeps its commit date across builds and is cached per file", () => {
  let calls = 0;
  const git = () => { calls += 1; return { status: 0, stdout: "2026-09-25\n" }; };
  const lastmodFor = createSitemapLastmodResolver({ repoDir, siteDir, buildDate, git });
  assert.equal(lastmodFor("https://fursay.com/arabic"), "2026-09-25");
  assert.equal(lastmodFor("https://fursay.com/arabic.html"), "2026-09-25");
  assert.equal(calls, 1);
  assert.equal(createSitemapLastmodResolver({ repoDir, siteDir, buildDate: "2026-12-01", git })("https://fursay.com/arabic"), "2026-09-25");
});
