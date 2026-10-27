import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || "")
  && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

// Match the Worker's extensionless HTML routes, retaining localized directories.
export function sitemapFilePath(loc, siteDir) {
  const pathname = decodeURIComponent(new URL(loc).pathname);
  const file = pathname.endsWith("/") ? `${pathname}index.html`
    : /\.[^/]+$/.test(pathname) ? pathname : `${pathname}.html`;
  const absolute = resolve(siteDir, `.${file}`);
  const fromSite = relative(resolve(siteDir), absolute);
  if (isAbsolute(fromSite) || fromSite === ".." || fromSite.startsWith(`..${sep}`)) {
    throw new Error("sitemap_file_outside_site");
  }
  return absolute;
}

export function createSitemapLastmodResolver({
  siteDir,
  repoDir = process.cwd(),
  buildDate = new Date().toISOString().slice(0, 10),
  git = spawnSync,
}) {
  if (!validDate(buildDate)) throw new Error("sitemap_build_date_invalid");
  const cache = new Map();
  return (loc) => {
    const file = sitemapFilePath(loc, siteDir);
    if (!cache.has(file)) {
      let date;
      try {
        const result = git("git", ["log", "-1", "--format=%cs", "--", relative(repoDir, file)], {
          cwd: repoDir,
          encoding: "utf8",
          stdio: "pipe",
        });
        const committed = result.status === 0 ? result.stdout.trim() : "";
        date = validDate(committed) ? committed : buildDate;
      } catch {
        date = buildDate;
      }
      cache.set(file, date);
    }
    return cache.get(file);
  };
}

export function generateSitemapLastmods(sitemap, options) {
  const lastmodFor = createSitemapLastmodResolver(options);
  return sitemap.replace(/<url>[\s\S]*?<\/url>/g, (entry) => {
    const loc = entry.match(/<loc>([^<]+)<\/loc>/)?.[1];
    if (!loc) throw new Error("sitemap_url_missing_loc");
    const lastmod = `<lastmod>${lastmodFor(loc)}</lastmod>`;
    return /<lastmod>[^<]*<\/lastmod>/.test(entry)
      ? entry.replace(/<lastmod>[^<]*<\/lastmod>/, lastmod)
      : entry.replace(/<\/loc>/, `</loc>\n    ${lastmod}`);
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const repoDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
  const siteDir = resolve(repoDir, "fursay-optimized-site");
  const sitemapPath = resolve(siteDir, "sitemap.xml");
  writeFileSync(sitemapPath, generateSitemapLastmods(readFileSync(sitemapPath, "utf8"), { repoDir, siteDir }));
}
