import test from "node:test";
import assert from "node:assert/strict";
import { validateSitemapMaterialDate } from "../scripts/sitemap-material-date.mjs";

const current = "2026-10-10";
const dates = ["2026-09-25", "2026-08-02"];
const check = (release, siteHealth = {}, lastmods = dates) =>
  validateSitemapMaterialDate(release, siteHealth, lastmods, current);

test("fresh build keeps the actual older material date", () => {
  assert.deepEqual(check({ releasedAt: current, materialUpdatedAt: "2026-09-25" }), []);
});
test("missing declared material date in sitemap remains a failure", () => {
  assert.deepEqual(check({ materialUpdatedAt: "2026-09-24" }), ["sitemap_missing_current_material_date:2026-09-24"]);
});
for (const [name, value] of [["null", null], ["empty", ""], ["number", 20260925], ["object", {}]]) {
  test("explicit " + name + " material date cannot use the legacy fallback", () => {
    assert.deepEqual(check({ materialUpdatedAt: value, releasedAt: "2026-09-25" }), ["release_material_date_invalid"]);
  });
}
test("material date requires the complete date format", () => {
  assert.deepEqual(check({ materialUpdatedAt: "2026-9-25" }), ["release_material_date_invalid"]);
});
test("invalid calendar day fails", () => {
  assert.deepEqual(check({ materialUpdatedAt: "2026-02-29" }), ["release_material_date_invalid"]);
});
test("future material date fails even when included in the sitemap", () => {
  assert.deepEqual(check({ materialUpdatedAt: "2099-01-01" }, {}, ["2099-01-01", "2026-08-02"]), ["release_material_date_in_future:" + current]);
});
test("legacy release date fallback remains accepted", () => {
  assert.deepEqual(check({ releasedAt: "2026-09-25" }), []);
});
test("legacy site health date fallback remains accepted", () => {
  assert.deepEqual(check({}, { updatedAt: "2026-09-25" }), []);
});
test("legacy release date still takes precedence over site health", () => {
  assert.deepEqual(check({ releasedAt: "2026-09-24" }, { updatedAt: "2026-09-25" }), ["sitemap_missing_current_material_date:2026-09-24"]);
});
test("legacy absent date keeps its previous behavior", () => {
  assert.deepEqual(check({}), []);
});
test("valid leap day is accepted", () => {
  assert.deepEqual(check({ materialUpdatedAt: "2024-02-29" }, {}, ["2024-02-29", "2026-08-02"]), []);
});
