function isCalendarDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// A build date is separate from the source-controlled material modification date.
// Old release manifests keep their existing releasedAt/siteHealth fallback.
export function validateSitemapMaterialDate(release, siteHealth, lastmods, currentDate) {
  const explicit = Object.hasOwn(release, "materialUpdatedAt");
  const expected = explicit
    ? release.materialUpdatedAt
    : (release.releasedAt || siteHealth.updatedAt || "");
  const failures = [];
  if (explicit && !isCalendarDate(expected)) return ["release_material_date_invalid"];
  if (explicit && expected > currentDate) failures.push("release_material_date_in_future:" + currentDate);
  if (expected && !new Set(lastmods).has(expected)) {
    failures.push("sitemap_missing_current_material_date:" + expected);
  }
  return failures;
}
