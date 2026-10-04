// Deployment dates and material modification dates are separate authorities.
// A redeploy must not make unchanged content appear newly edited in the sitemap.
export function validateSitemapDates({ lastmods, expectedCount, releaseDate, materialDate, currentDate }) {
  const failures = [];
  const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || "");
  if (lastmods.length !== expectedCount) failures.push(`sitemap_lastmod_count:${lastmods.length}`);
  if (!validDate(releaseDate)) failures.push(`release_date_invalid:${releaseDate || "none"}`);
  if (!validDate(materialDate)) failures.push(`material_date_invalid:${materialDate || "none"}`);
  if (lastmods.some((value) => !validDate(value))) failures.push("sitemap_lastmod_invalid");
  if (lastmods.some((value) => value > currentDate)) failures.push(`sitemap_lastmod_in_future:${currentDate}`);
  const distinctDates = new Set(lastmods);
  if (distinctDates.size < 2) failures.push(`sitemap_lastmod_not_page_specific:${distinctDates.size}`);
  if (materialDate && !distinctDates.has(materialDate)) failures.push(`sitemap_missing_current_material_date:${materialDate}`);
  return failures;
}
