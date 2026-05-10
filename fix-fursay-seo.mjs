import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve("fursay-optimized-site");

const pages = [
  {
    file: "index.html",
    canonical: "https://fursay.com/",
    alternates: { en: "https://fursay.com/", "zh-TW": "https://fursay.com/zh/", ar: "https://fursay.com/ar/", "x-default": "https://fursay.com/" },
  },
  {
    file: "zh/index.html",
    canonical: "https://fursay.com/zh/",
    alternates: { en: "https://fursay.com/", "zh-TW": "https://fursay.com/zh/", ar: "https://fursay.com/ar/", "x-default": "https://fursay.com/" },
  },
  {
    file: "ar/index.html",
    canonical: "https://fursay.com/ar/",
    alternates: { en: "https://fursay.com/", "zh-TW": "https://fursay.com/zh/", ar: "https://fursay.com/ar/", "x-default": "https://fursay.com/" },
  },
  {
    file: "koko.html",
    canonical: "https://fursay.com/koko.html",
    alternates: { en: "https://fursay.com/koko.html", "zh-TW": "https://fursay.com/zh/koko.html", ar: "https://fursay.com/ar/koko.html", "x-default": "https://fursay.com/koko.html" },
  },
  {
    file: "zh/koko.html",
    canonical: "https://fursay.com/zh/koko.html",
    alternates: { en: "https://fursay.com/koko.html", "zh-TW": "https://fursay.com/zh/koko.html", ar: "https://fursay.com/ar/koko.html", "x-default": "https://fursay.com/koko.html" },
  },
  {
    file: "ar/koko.html",
    canonical: "https://fursay.com/ar/koko.html",
    alternates: { en: "https://fursay.com/koko.html", "zh-TW": "https://fursay.com/zh/koko.html", ar: "https://fursay.com/ar/koko.html", "x-default": "https://fursay.com/koko.html" },
  },
  {
    file: "arabic.html",
    canonical: "https://fursay.com/arabic.html",
    alternates: { en: "https://fursay.com/arabic.html", "zh-TW": "https://fursay.com/zh/arabic.html", ar: "https://fursay.com/ar/arabic.html", "x-default": "https://fursay.com/arabic.html" },
  },
  {
    file: "zh/arabic.html",
    canonical: "https://fursay.com/zh/arabic.html",
    alternates: { en: "https://fursay.com/arabic.html", "zh-TW": "https://fursay.com/zh/arabic.html", ar: "https://fursay.com/ar/arabic.html", "x-default": "https://fursay.com/arabic.html" },
  },
  {
    file: "ar/arabic.html",
    canonical: "https://fursay.com/ar/arabic.html",
    alternates: { en: "https://fursay.com/arabic.html", "zh-TW": "https://fursay.com/zh/arabic.html", ar: "https://fursay.com/ar/arabic.html", "x-default": "https://fursay.com/arabic.html" },
  },
];

function alternateTags(alternates) {
  return Object.entries(alternates)
    .map(([lang, href]) => `  <link rel="alternate" hreflang="${lang}" href="${href}" />`)
    .join("\n");
}

async function updatePage(page) {
  const file = path.join(root, page.file);
  let html = await fs.readFile(file, "utf8");
  const seo = `  <link rel="canonical" href="${page.canonical}" />\n${alternateTags(page.alternates)}`;

  html = html
    .replace(/^\s*<link\b[^>]*\brel="canonical"[^>]*>\s*$/gm, "")
    .replace(/^\s*<link\b[^>]*\brel="alternate"[^>]*\bhreflang="[^"]+"[^>]*>\s*$/gm, "");

  if (html.includes("  <!-- hreflang -->")) {
    html = html.replace(/  <!-- hreflang -->/, `  <!-- Canonical / hreflang -->\n${seo}`);
  } else {
    html = html.replace(/(<link rel="icon" href="[^"]+" type="image\/svg\+xml" \/>)/, `${seo}\n  $1`);
  }

  await fs.writeFile(file, html);
}

function sitemapUrl(page) {
  const alt = alternateTags(page.alternates).replace(/  <link/g, "    <xhtml:link").replace(/ \/>/g, "/>");
  return `  <url>
    <loc>${page.canonical}</loc>
    <lastmod>2026-05-08</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${page.file === "index.html" ? "1.0" : page.file.endsWith("index.html") ? "0.8" : "0.7"}</priority>
${alt}
  </url>`;
}

async function updateSitemap() {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${pages.map(sitemapUrl).join("\n\n")}
</urlset>
`;
  await fs.writeFile(path.join(root, "sitemap.xml"), sitemap);
}

for (const page of pages) {
  await updatePage(page);
}
await updateSitemap();
