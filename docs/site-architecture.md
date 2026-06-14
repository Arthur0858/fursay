# Fursay Site Architecture

## Runtime shape

- Cloudflare Workers Static Assets serves files from `fursay-optimized-site` through the `fursay` Worker.
- Clean URLs are canonical: `/koko`, `/zh/koko`, `/ar/koko`; legacy `.html` URLs redirect permanently.
- Shared story visual layers live in `/css/picture-book-base-20260613-base1.css`, `/css/storybook-skin-20260613-inline1.css`, `/css/story-page-common-20260613-css1.css`, and `/css/picture-world-shared-20260613-traffic12.css`.
- Operations and product-validation page styles for `/creator-kit`, `/share-kit`, `/traffic-launch`, `/links`, `/deploy-readiness`, `/conversion-health`, `/monetization-roadmap`, and `/products` live in `/css/picture-world-tools-20260613-products1.css` so the main story pages do not load creator/share/deploy-only rules.
- Home page common styles live in `/css/home-common-20260613-cache1.css`; language-specific homepage overrides live in `/css/home-en-page-20260613-cache1.css`, `/css/home-zh-page-20260613-cache1.css`, and `/css/home-ar-page-20260613-cache1.css`.
- Koko common styles live in `/css/koko-common-20260613-cache1.css`; LTR page-specific overrides live in `/css/koko-en-page-20260613-cache1.css` for `/koko` and `/zh/koko`; RTL page-specific overrides live in `/css/koko-ar-page-20260613-cache1.css` for `/ar/koko`.
- Noor common styles live in `/css/noor-common-20260613-cache1.css`; LTR page-specific overrides live in `/css/noor-ltr-page-20260613-cache1.css` for `/arabic` and `/zh/arabic`.
- Noor RTL page-specific overrides live in `/css/noor-rtl-page-20260613-cache1.css` for `/ar/arabic`.
- Shared interactions live in `/js/site-shared-20260613-commerce4.js`; page HTML should not add inline event handlers.
- Anonymous conversion events post to `/api/event`; the Worker writes sanitized datapoints to the `FURSAY_EVENTS` Analytics Engine dataset `fursay_events` when the Cloudflare account binding is enabled, and falls back to Worker logs without blocking the request.
- Site structure, locales, channels, and shared assets are recorded in `/data/site-structure.json`.
- Immutable CSS/JS fingerprints are recorded in `/data/immutable-asset-fingerprints.json`; after changing any long-cache CSS/JS filename or content, run `npm run assets:fingerprints` and keep `npm run assets:fingerprints:check` clean.
- Deployable image assets must be referenced by site HTML, CSS, JSON, XML, SVG, or text manifests; `scripts/check-image-assets.mjs` fails on unreferenced images.
- Character PNG files are legacy `<picture>` fallbacks. Keep AVIF/WebP as the modern delivery path, and use `scripts/optimize-png-fallbacks.mjs` before release when fallback PNGs are regenerated.

## Edit rules

- Update the current versioned shared CSS for global picture-world styling instead of editing all 9 pages.
- Update the matching versioned page CSS when changing home, Koko, or Noor page-specific styling.
- Update the current versioned shared JS for nav, tabs, reveal effects, and subscribe modal behavior.
- Bump the versioned CSS/JS filename before changing content that is served with `max-age=31536000, immutable`; then regenerate the immutable fingerprint manifest.
- Keep internal links on clean routes, not `.html`.
- Keep sitemap/canonical/hreflang aligned with clean routes.
- Keep Worker cache headers centralized in `src/worker.js`.
- Keep scene art in WebP unless a real page references another format.

## Current public pages

- `/`, `/koko`, `/arabic`
- `/zh/`, `/zh/koko`, `/zh/arabic`
- `/ar/`, `/ar/koko`, `/ar/arabic`
- `/episodes/koko-feelings`, `/zh/episodes/koko-feelings`, `/ar/episodes/koko-feelings`
- `/episodes/noor-colors`, `/zh/episodes/noor-colors`, `/ar/episodes/noor-colors`

## Operations pages

- `/links`, `/creator-kit`, `/share-kit`, `/traffic-launch`, `/deploy-readiness`, `/conversion-health`, and `/monetization-roadmap` are utility surfaces.
- `/conversion-health` renders the anonymous growth dashboard from `/conversion-health.json`; it is `noindex,follow` and must not include real subscriber data or secrets.
- `/monetization-roadmap` renders the interest-validation roadmap from `/monetization-roadmap.json`; it is `noindex,follow` and must keep checkout disabled until product-interest, disclosure, support, and tracking gates are met.
- `/products` and `/zh/products` render public product-interest landing pages from `/products.json`; payment links remain disallowed while `paymentLinksAllowed=false`.
- Event analytics fields are limited to event/page/campaign/pack/affiliate/outbound/interest dimensions plus a numeric `event_count`; email, name, phone, address, token, password, and subscriber payloads are not analytics fields.
- `npm run report:events` is the local conversion report command for Analytics Engine after account enablement. The page-intent query covers subscribe opens, product info clicks, and product-interest clicks so the product funnel can distinguish browsing intent from waitlist intent. Without Cloudflare credentials it writes a pending-status report and does not query external APIs.
- Owned products stay in interest-validation mode until the checkout gate has verified interest clicks, disclosure copy, refund/support copy, and checkout tracking. Payment links are not allowed while `paymentLinksAllowed=false`.
