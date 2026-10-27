import assert from "node:assert/strict";
import test from "node:test";
import { validateSitemapDates } from "../scripts/validate-sitemap-dates.mjs";

const content = {
  lastmods: ["2026-08-02", "2026-09-25"],
  expectedCount: 2,
  expectedLastmods: ["2026-08-02", "2026-09-25"],
  releaseDate: "2026-10-03",
  currentDate: "2026-10-03",
};

test("redeploying unchanged files retains their commit dates", () => {
  assert.deepEqual(validateSitemapDates(content), []);
  assert.deepEqual(validateSitemapDates({ ...content, releaseDate: "2026-12-01", currentDate: "2026-12-01" }), []);
});

test("stale file dates still fail", () => {
  assert.ok(validateSitemapDates({ ...content, lastmods: ["2026-08-02", "2026-09-24"] })
    .includes("sitemap_lastmod_not_file_commit_or_build_date"));
});

test("deployment date cannot stand in for a file commit date", () => {
  assert.ok(validateSitemapDates({ ...content, lastmods: ["2026-08-02", content.releaseDate] })
    .includes("sitemap_lastmod_not_file_commit_or_build_date"));
});

test("future lastmods remain rejected", () => {
  assert.ok(validateSitemapDates({ ...content, lastmods: [...content.lastmods, "2026-10-04"], expectedCount: 3 })
    .includes("sitemap_lastmod_in_future:2026-10-03"));
});

test("invalid lastmod and release dates remain rejected", () => {
  const failures = validateSitemapDates({ ...content, lastmods: ["invalid", "2026-09-25"], releaseDate: "invalid" });
  assert.ok(failures.includes("sitemap_lastmod_invalid"));
  assert.ok(failures.includes("release_date_invalid:invalid"));
});

test("files committed together may share a lastmod date", () => {
  assert.deepEqual(validateSitemapDates({
    ...content,
    lastmods: ["2026-09-25", "2026-09-25"],
    expectedLastmods: ["2026-09-25", "2026-09-25"],
  }), []);
});

test("missing sitemap dates still fail the expected page count", () => {
  assert.ok(validateSitemapDates({ ...content, lastmods: ["2026-09-25"] })
    .includes("sitemap_lastmod_count:1"));
});
