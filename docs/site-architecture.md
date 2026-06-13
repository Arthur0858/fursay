# Fursay Site Architecture

## Runtime shape

- Cloudflare Workers Static Assets serves files from `fursay-optimized-site` through the `fursay` Worker.
- Clean URLs are canonical: `/koko`, `/zh/koko`, `/ar/koko`; legacy `.html` URLs redirect permanently.
- Shared visual layers live in `/css/picture-book-base-20260613-base1.css`, `/css/storybook-skin-20260613-inline1.css`, `/css/story-page-common-20260613-css1.css`, and `/css/picture-world-shared-20260613-traffic11.css`.
- Operations utility page styles for `/creator-kit`, `/share-kit`, `/traffic-launch`, `/links`, and `/deploy-readiness` live in `/css/picture-world-tools-20260613-ops1.css` so the main story pages do not load creator/share/deploy-only rules.
- Home page common styles live in `/css/home-common-20260613-css1.css`; language-specific homepage overrides live in `/css/home-en-page-20260613-inline1.css`, `/css/home-zh-page-20260613-inline1.css`, and `/css/home-ar-page-20260613-inline1.css`.
- Koko LTR page-specific shared styles live in `/css/koko-en-page-20260613-inline1.css` for `/koko` and `/zh/koko`; Koko RTL page-specific shared styles live in `/css/koko-ar-page-20260613-inline1.css` for `/ar/koko`.
- Noor LTR page-specific shared styles live in `/css/noor-ltr-page-20260613-inline1.css` for `/arabic` and `/zh/arabic`.
- Noor RTL page-specific shared styles live in `/css/noor-rtl-page-20260613-inline1.css` for `/ar/arabic`.
- Shared interactions live in `/js/site-shared-20260613-commerce1.js`; page HTML should not add inline event handlers.
- Site structure, locales, channels, and shared assets are recorded in `/data/site-structure.json`.
- Deployable image assets must be referenced by site HTML, CSS, JSON, XML, SVG, or text manifests; `scripts/check-image-assets.mjs` fails on unreferenced images.
- Character PNG files are legacy `<picture>` fallbacks. Keep AVIF/WebP as the modern delivery path, and use `scripts/optimize-png-fallbacks.mjs` before release when fallback PNGs are regenerated.

## Edit rules

- Update the current versioned shared CSS for global picture-world styling instead of editing all 9 pages.
- Update the matching versioned page CSS when changing home, Koko, or Noor page-specific styling.
- Update the current versioned shared JS for nav, tabs, reveal effects, and subscribe modal behavior.
- Keep internal links on clean routes, not `.html`.
- Keep sitemap/canonical/hreflang aligned with clean routes.
- Keep Worker cache headers centralized in `src/worker.js`.
- Keep scene art in WebP unless a real page references another format.

## Current public pages

- `/`, `/koko`, `/arabic`
- `/zh/`, `/zh/koko`, `/zh/arabic`
- `/ar/`, `/ar/koko`, `/ar/arabic`
