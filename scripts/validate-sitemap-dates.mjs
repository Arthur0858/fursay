// Deployment dates and material modification dates are separate authorities.
// A redeploy must not make unchanged content appear newly edited in the sitemap.
export function validateSitemapDates({ lastmods, expectedCount, releaseDate, currentDate, expectedLastmods }) {
  const failures = [];
  const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || "");
  if (lastmods.length !== expectedCount) failures.push(`sitemap_lastmod_count:${lastmods.length}`);
  if (!validDate(releaseDate)) failures.push(`release_date_invalid:${releaseDate || "none"}`);
  if (lastmods.some((value) => !validDate(value))) failures.push("sitemap_lastmod_invalid");
  if (lastmods.some((value) => value > currentDate)) failures.push(`sitemap_lastmod_in_future:${currentDate}`);
  // Files may share a commit date; compare each page to its own git/build date.
  if (expectedLastmods && (expectedLastmods.length !== lastmods.length
    || lastmods.some((date, index) => date !== expectedLastmods[index]))) {
    failures.push("sitemap_lastmod_not_file_commit_or_build_date");
  }
  return failures;
}
