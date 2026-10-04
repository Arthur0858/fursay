import assert from "node:assert/strict";
import test from "node:test";
import { validateSitemapDates } from "../scripts/validate-sitemap-dates.mjs";

const content = {
  lastmods: ["2026-08-02", "2026-09-25"],
  expectedCount: 2,
  materialDate: "2026-09-25",
  releaseDate: "2026-10-03",
  currentDate: "2026-10-03",
};

test("redeploying unchanged material does not require today's sitemap lastmod", () => {
  assert.deepEqual(validateSitemapDates(content), []);
  assert.deepEqual(validateSitemapDates({ ...content, releaseDate: "2026-12-01", currentDate: "2026-12-01" }), []);
});

test("stale material dates still fail", () => {
  assert.ok(validateSitemapDates({ ...content, lastmods: ["2026-08-02", "2026-09-24"] })
    .includes("sitemap_missing_current_material_date:2026-09-25"));
});

test("deployment date cannot stand in for the canonical material date", () => {
  assert.ok(validateSitemapDates({ ...content, lastmods: ["2026-08-02", content.releaseDate] })
    .includes("sitemap_missing_current_material_date:2026-09-25"));
});

test("future lastmods remain rejected", () => {
  assert.ok(validateSitemapDates({ ...content, lastmods: [...content.lastmods, "2026-10-04"], expectedCount: 3 })
    .includes("sitemap_lastmod_in_future:2026-10-03"));
});

test("invalid lastmod, release and material dates remain rejected", () => {
  const failures = validateSitemapDates({ ...content, lastmods: ["invalid", "2026-09-25"], releaseDate: "invalid", materialDate: "" });
  assert.ok(failures.includes("sitemap_lastmod_invalid"));
  assert.ok(failures.includes("release_date_invalid:invalid"));
  assert.ok(failures.includes("material_date_invalid:none"));
});

test("page-specific dates are required", () => {
  assert.ok(validateSitemapDates({ ...content, lastmods: ["2026-09-25", "2026-09-25"] })
    .includes("sitemap_lastmod_not_page_specific:1"));
});

test("missing sitemap dates still fail the expected page count", () => {
  assert.ok(validateSitemapDates({ ...content, lastmods: ["2026-09-25"] })
    .includes("sitemap_lastmod_count:1"));
});
