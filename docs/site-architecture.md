# Fursay Site Architecture

## Runtime shape

- Cloudflare Worker serves static assets from `fursay-optimized-site`.
- Clean URLs are canonical: `/koko`, `/zh/koko`, `/ar/koko`; legacy `.html` URLs redirect permanently.
- Shared visual layers live in `/css/picture-book-base-20260613-base1.css`, `/css/storybook-skin-20260613-inline1.css`, and `/css/picture-world-shared-20260612-traffic10.css`.
- Home page-specific shared styles live in `/css/home-en-page-20260613-inline1.css`, `/css/home-zh-page-20260613-inline1.css`, and `/css/home-ar-page-20260613-inline1.css`.
- Koko page-specific shared styles live in `/css/koko-en-page-20260613-inline1.css`, `/css/koko-zh-page-20260613-inline1.css`, and `/css/koko-ar-page-20260613-inline1.css`.
- Noor LTR page-specific shared styles live in `/css/noor-ltr-page-20260613-inline1.css` for `/arabic` and `/zh/arabic`.
- Noor RTL page-specific shared styles live in `/css/noor-rtl-page-20260613-inline1.css` for `/ar/arabic`.
- Shared interactions live in `/js/site-shared-20260613-attribution1.js`; page HTML should not add inline event handlers.
- Site structure, locales, channels, and shared assets are recorded in `/data/site-structure.json`.

## Edit rules

- Update the current versioned shared CSS for global picture-world styling instead of editing all 9 pages.
- Update the matching versioned page CSS when changing home, Koko, or Noor page-specific styling.
- Update the current versioned shared JS for nav, tabs, reveal effects, and subscribe modal behavior.
- Keep internal links on clean routes, not `.html`.
- Keep sitemap/canonical/hreflang aligned with clean routes.
- Keep Worker cache headers centralized in `src/worker.js`.

## Current public pages

- `/`, `/koko`, `/arabic`
- `/zh/`, `/zh/koko`, `/zh/arabic`
- `/ar/`, `/ar/koko`, `/ar/arabic`
