import { createServer } from "node:http";
import { readFile, stat, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, extname, sep } from "node:path";
import { chromium } from "playwright";

const beforeRoot = resolve(process.argv[2]);
const afterRoot = resolve(process.argv[3]);
const out = resolve(process.argv[4]);
await mkdir(out, { recursive: true });
const hash = (data) => createHash("sha256").update(data).digest("hex");
const checker = await readFile(resolve(afterRoot, "scripts/check-visual-layout-contract.mjs"), "utf8");
const homes = ["/", "/zh/", "/ar/"];
const pages = [
  { path: "/", file: "index.html", lang: "en" },
  { path: "/zh/", file: "zh/index.html", lang: "zh-TW" },
  { path: "/ar/", file: "ar/index.html", lang: "ar", rtl: true },
];
const viewports = [900, 901, 980, 981].map(width => ({ name: `w${width}`, width, height: 900 }));
const selectedCases = pages.flatMap(spec => viewports.map(viewport => ({ spec, viewport, kind: "bounded-home-collision" })));
const target = path => homes.includes(path);
const softwareRaster = process.argv[5] === "software";
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".avif": "image/avif", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".json": "application/json" };
async function serve(root) {
  const site = resolve(root, "fursay-optimized-site");
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://127.0.0.1");
      if (request.method !== "GET" || url.pathname.startsWith("/api/")) return void response.writeHead(405).end();
      let path = decodeURIComponent(url.pathname);
      if (path.endsWith("/")) path += "index.html";
      if (!extname(path)) path += ".html";
      const file = resolve(site, `.${path}`);
      if (!file.startsWith(`${site}${sep}`) || !(await stat(file)).isFile()) return void response.writeHead(404).end();
      response.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
      response.end(await readFile(file));
    } catch { response.writeHead(404).end(); }
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}
const servers = [await serve(beforeRoot), await serve(afterRoot)];
const report = { purpose: "Decorative camel visibility and all adjacent h1/CTA/badge/sprites/bounds; no glyph-occlusion or pixel equality claim", generatedAt: new Date().toISOString(), beforeRoot, afterRoot, fontMode: "fallback-external-blocked", normalFont: "unknown-no-trusted-local-fixture", softwareRaster, selectedCases: selectedCases.map(({spec,viewport}) => `${spec.path}:${viewport.name}`), officialCheckerSha256: hash(checker), runnerSha256: hash(await readFile(import.meta.filename)), candidateCssSha256: hash(await readFile(resolve(afterRoot, "fursay-optimized-site/css/desktop-hero-layout-20261003-v1.css"))), browser: "", cases: [], failures: [] };
let browser;
try {
  browser = await chromium.launch({ headless: true, args: softwareRaster ? ["--disable-gpu"] : [] });
  report.browser = browser.version();
  for (const { spec, viewport, kind } of selectedCases) {
    const pair = { path: spec.path, lang: spec.lang, viewport, kind, failures: [] };
    for (const [index, stage] of ["before", "after"].entries()) {
      const { origin } = servers[index];
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, isMobile: !!viewport.isMobile, deviceScaleFactor: viewport.deviceScaleFactor || 1, reducedMotion: "reduce", serviceWorkers: "block" });
      const requests = { blockedExternal: 0, mockedEvents: 0, blockedSubscriptions: 0 };
      await context.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.origin !== origin) { requests.blockedExternal++; await route.abort(); }
        else if (url.pathname === "/api/subscribe") { requests.blockedSubscriptions++; await route.abort(); }
        else if (url.pathname === "/api/event") { requests.mockedEvents++; await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }); }
        else await route.continue();
      });
      await context.routeWebSocket("**/*", (socket) => socket.close());
      const page = await context.newPage();
      try {
        const response = await page.goto(`${origin}${spec.path}`, { waitUntil: "load" });
        if (response.status() !== 200) throw new Error(`HTTP ${response.status()} ${spec.path}`);
        await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}" });
        await page.evaluate(async () => {
          for (const image of document.images) image.loading = "eager";
          await document.fonts.ready;
          await Promise.race([
            Promise.all([...document.images].map((image) => image.decode().catch(() => {}))),
            new Promise((done) => setTimeout(done, 5000)),
          ]);
          await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
        });
        const measured = await page.evaluate(() => {
          const rect = (element) => element.getBoundingClientRect().toJSON();
          const visible = (element) => { const r = rect(element); const s = getComputedStyle(element); return r.width > 1 && r.height > 1 && s.display !== "none" && s.visibility !== "hidden" && Number(s.opacity) > 0.01; };
          const h1 = document.querySelector("h1");
          const style = getComputedStyle(h1);
          const hero = document.querySelector(".hero,.brand-hero");
          const ctas = [...document.querySelectorAll(".hero .hero-buttons a,.hero .hero-buttons button,.hero [data-open-subscribe],.brand-hero .brand-btn")].filter(visible).map((element) => {
            const r = rect(element); const center = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
            return { text: element.textContent.trim(), rect: r, hitCenter: !!center && (center === element || element.contains(center)), labelClipped: element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1 };
          });
          const sprites = [...document.querySelectorAll("body.world-home .hero > .hero-float")].filter(visible).map((element, order) => {
            const image = element.querySelector("img"); const r = rect(image); const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(r.width)); canvas.height = Math.max(1, Math.round(r.height));
            const ctx = canvas.getContext("2d", { willReadFrequently: true }); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            return { name: element.className, rect: r, z: Number(getComputedStyle(element).zIndex) || 0, order, width: canvas.width, height: canvas.height, pixels: ctx.getImageData(0, 0, canvas.width, canvas.height).data };
          });
          const opaqueAt = (sprite, x, y) => {
            const sx = Math.floor((x - sprite.rect.x) * sprite.width / sprite.rect.width), sy = Math.floor((y - sprite.rect.y) * sprite.height / sprite.rect.height);
            return sx >= 0 && sy >= 0 && sx < sprite.width && sy < sprite.height && sprite.pixels[(sy * sprite.width + sx) * 4 + 3] >= 128;
          };
          const characters = sprites.map((sprite) => {
            let opaque = 0, occluded = 0;
            for (let y = 0; y < sprite.height; y++) for (let x = 0; x < sprite.width; x++) {
              if (sprite.pixels[(y * sprite.width + x) * 4 + 3] < 128) continue;
              opaque++;
              const px = sprite.rect.x + (x + .5) * sprite.rect.width / sprite.width, py = sprite.rect.y + (y + .5) * sprite.rect.height / sprite.height;
              if (sprites.some((other) => (other.z > sprite.z || other.z === sprite.z && other.order > sprite.order) && opaqueAt(other, px, py))) occluded++;
            }
            return { name: sprite.name, rect: sprite.rect, z: sprite.z, opaquePixels: opaque, occludedOpaquePixels: occluded, occludedFraction: opaque ? occluded / opaque : 0 };
          });
          return { lang: document.documentElement.lang, dir: document.documentElement.dir || "ltr", h1: { rect: rect(h1), fontSize: style.fontSize, lineHeight: style.lineHeight, letterSpacing: style.letterSpacing, fontFamily: style.fontFamily }, hero: hero ? rect(hero) : null, ctas, characters, horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - innerWidth) };
        });
        measured.roleTextCollisions = await page.evaluate(() => {
          const h1 = document.querySelector("h1");
          const buttons = [...document.querySelectorAll(".hero .hero-buttons a,.hero .hero-buttons button,.hero [data-open-subscribe]")];
          const roots = [{ kind: "h1", element: h1 }, ...buttons.map((element, index) => ({ kind: `cta:${index}`, element }))];
          return [...document.querySelectorAll("body.world-home .hero > .hero-float")].filter(element => {
            const r = element.getBoundingClientRect(), s = getComputedStyle(element);
            return r.width > 1 && r.height > 1 && s.display !== "none" && s.visibility !== "hidden";
          }).map(element => {
            const image = element.querySelector("img"), r = image.getBoundingClientRect();
            const canvas = document.createElement("canvas"); canvas.width = Math.round(r.width); canvas.height = Math.round(r.height);
            const ctx = canvas.getContext("2d", { willReadFrequently: true }); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            const areas = roots.map(({kind, element: textRoot}) => {
              const walker = document.createTreeWalker(textRoot, NodeFilter.SHOW_TEXT), letters = []; let node;
              while (node = walker.nextNode()) for (let i = 0; i < node.length; i++) {
                if (!node.textContent[i].trim()) continue;
                const range = document.createRange(); range.setStart(node, i); range.setEnd(node, i + 1);
                const box = range.getBoundingClientRect(); let opaque = 0;
                for (let y = Math.max(0, Math.floor(box.top - r.top)); y < Math.min(canvas.height, Math.ceil(box.bottom - r.top)); y++)
                  for (let x = Math.max(0, Math.floor(box.left - r.left)); x < Math.min(canvas.width, Math.ceil(box.right - r.left)); x++)
                    if (pixels[(y * canvas.width + x) * 4 + 3] >= 128) opaque++;
                if (opaque) letters.push({ text: node.textContent[i], rect: box.toJSON(), opaqueRolePixels: opaque });
              }
              return { kind, letters, rangeAlphaPixels: letters.reduce((sum, letter) => sum + letter.opaqueRolePixels, 0) };
            });
            return { name: element.className, rect: r.toJSON(), areas, h1RangeAlphaPixels: areas[0].rangeAlphaPixels, ctaRangeAlphaPixels: areas.slice(1).reduce((sum, area) => sum + area.rangeAlphaPixels, 0) };
          });
        });
        measured.camelVisibility = await page.evaluate(() => {
          const container = document.querySelector("body.world-home .hero > .hero-float.float-4");
          const image = container.querySelector("img"), rect = image.getBoundingClientRect();
          const badge = document.querySelector(".hero-badge"), badgeRect = badge.getBoundingClientRect();
          const style = getComputedStyle(container), badgeStyle = getComputedStyle(badge);
          const visible = rect.width > 1 && rect.height > 1 && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > .01;
          let opaquePixels = 0, badgeBoxAlphaPixels = 0;
          if (visible) {
            const canvas = document.createElement("canvas"); canvas.width = Math.round(rect.width); canvas.height = Math.round(rect.height);
            const ctx = canvas.getContext("2d", { willReadFrequently: true }); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
              if (pixels[(y * canvas.width + x) * 4 + 3] < 128) continue;
              opaquePixels++;
              const px = rect.left + (x + .5) * rect.width / canvas.width, py = rect.top + (y + .5) * rect.height / canvas.height;
              if (px >= badgeRect.left && px < badgeRect.right && py >= badgeRect.top && py < badgeRect.bottom) badgeBoxAlphaPixels++;
            }
          }
          return { visible, display: style.display, decorativeAlt: image.getAttribute("alt"), rect: rect.toJSON(), opaquePixels, badgeBoxAlphaPixels,
            badge: { text: badge.textContent.trim(), rect: badgeRect.toJSON(), background: badgeStyle.backgroundColor, visible: badgeRect.width > 1 && badgeRect.height > 1 && badgeStyle.visibility !== "hidden" && badgeStyle.display !== "none" } };
        });
        const cdp = await context.newCDPSession(page);
        await cdp.send("DOM.enable"); await cdp.send("CSS.enable");
        const dom = await cdp.send("DOM.getDocument"); const node = await cdp.send("DOM.querySelector", { nodeId: dom.root.nodeId, selector: "h1" });
        measured.renderedFonts = (await cdp.send("CSS.getPlatformFontsForNode", { nodeId: node.nodeId })).fonts;
        await cdp.detach();
        // Warm the compositor before the bounded visual review screenshot.
        await page.screenshot({ animations: "disabled" });
        await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
        const screenshot = await page.screenshot({ animations: "disabled" });
        measured.screenshotSha256 = hash(screenshot);
        const capture = viewport.width === 901 || viewport.width === 980;
        if (capture) {
          const name = `${spec.path.replace(/^\/+|\/+$/g, "").replace(/\//g, "-") || "home"}-${viewport.name}-${stage}.png`;
          await writeFile(resolve(out, name), screenshot); measured.screenshot = name;
        }
        measured.htmlSha256 = hash(await readFile(resolve(index === 0 ? beforeRoot : afterRoot, "fursay-optimized-site", spec.file)));
        measured.requests = requests; pair[stage] = measured;
      } finally { await context.close(); }
    }
    const { before, after } = pair;
    if (after.horizontalOverflow > 1) pair.failures.push(`horizontal-overflow:${after.horizontalOverflow}`);
    if (after.lang !== spec.lang || (spec.rtl && after.dir !== "rtl")) pair.failures.push("locale-direction");
    if (after.requests.blockedSubscriptions) pair.failures.push("subscription-request");
    if (viewport.width <= 900 || !target(spec.path)) {
      if (JSON.stringify(before.h1) !== JSON.stringify(after.h1) || JSON.stringify(before.ctas) !== JSON.stringify(after.ctas)) pair.failures.push("unchanged-layout-metrics-diff");
    }
    if (target(spec.path) && viewport.width >= 901) {
      if (!after.ctas.length) pair.failures.push("missing-primary-cta");
      for (const [index, cta] of after.ctas.entries()) {
        const mustFit = viewport.height >= 900 || index === 0;
        if (mustFit && (cta.rect.top < 0 || cta.rect.bottom > viewport.height || cta.rect.left < 0 || cta.rect.right > viewport.width || !cta.hitCenter)) pair.failures.push(`cta-not-fully-visible:${index}:${Math.round(cta.rect.bottom)}`);
        if (cta.labelClipped) pair.failures.push(`cta-label-clipped:${index}`);
      }
      const centeredBand = viewport.width <= 980;
      const camel = after.characters.find((sprite) => sprite.name.includes("float-4"));
      if (centeredBand) {
        if (after.camelVisibility.visible || after.camelVisibility.display !== "none" || camel) pair.failures.push("centered-band-camel-not-hidden");
        if (after.camelVisibility.decorativeAlt !== "") pair.failures.push("hidden-camel-is-not-decorative");
      } else {
        if (!after.camelVisibility.visible || !camel || camel.opaquePixels === 0 || camel.occludedOpaquePixels > 0) pair.failures.push(`visible-camel-occluded-or-missing:${camel?.occludedOpaquePixels ?? "missing"}`);
        const r = after.camelVisibility.rect, h = after.hero;
        if (r.left < h.left || r.right > h.right || r.top < h.top || r.bottom > h.bottom || r.left < 0 || r.right > viewport.width || r.top < 0 || r.bottom > viewport.height) pair.failures.push("visible-camel-out-of-bounds");
      }
      if (!after.camelVisibility.badge.visible) pair.failures.push("badge-not-visible");
      if (after.camelVisibility.badgeBoxAlphaPixels) pair.failures.push(`camel-badge-collision:${after.camelVisibility.badgeBoxAlphaPixels}`);
    }
    if (viewport.width >= 901) {
      const camel = after.roleTextCollisions.find(role => role.name.includes("float-4"));
      if (viewport.width <= 980) {
        if (camel) pair.failures.push("hidden-camel-still-has-text-geometry");
      } else if (!camel || camel.h1RangeAlphaPixels || camel.ctaRangeAlphaPixels) pair.failures.push(`camel-text-collision:${camel?.h1RangeAlphaPixels}:${camel?.ctaRangeAlphaPixels}`);
      for (const role of after.roleTextCollisions.filter(role => !role.name.includes("float-4"))) {
        const oldRole = before.roleTextCollisions.find(old => old.name === role.name);
        if (role.h1RangeAlphaPixels > (oldRole?.h1RangeAlphaPixels || 0) || role.ctaRangeAlphaPixels > (oldRole?.ctaRangeAlphaPixels || 0)) pair.failures.push(`new-other-role-text-collision:${role.name}`);
      }
    }
    if (JSON.stringify(before.camelVisibility.badge) !== JSON.stringify(after.camelVisibility.badge)) pair.failures.push("badge-content-or-layout-changed");
    if (viewport.width <= 900 || viewport.width >= 981) {
      if (JSON.stringify(before.camelVisibility) !== JSON.stringify(after.camelVisibility)) pair.failures.push("outside-band-camel-visibility-changed");
      for (const key of ["h1", "ctas", "hero", "characters", "roleTextCollisions", "renderedFonts"])
        if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) pair.failures.push(`unchanged-${key}-diff`);
    }
    report.cases.push(pair);
    report.failures.push(...pair.failures.map((failure) => `${spec.path}:${viewport.name}:${failure}`));
    await writeFile(resolve(out, "matrix.json"), JSON.stringify(report, null, 2) + "\n");
    if (report.cases.length % 20 === 0) console.log(`Cases ${report.cases.length}/${selectedCases.length}; failures ${report.failures.length}`);
  }
} finally {
  if (browser) await browser.close();
  for (const { server } of servers) await new Promise((done) => server.close(done));
  report.finishedAt = new Date().toISOString(); report.ok = report.cases.length === selectedCases.length && report.failures.length === 0;
  await writeFile(resolve(out, "matrix.json"), JSON.stringify(report, null, 2) + "\n");
}
console.log(JSON.stringify({ ok: report.ok, pairs: report.cases.length, failures: report.failures }));
process.exitCode = report.ok ? 0 : 1;
