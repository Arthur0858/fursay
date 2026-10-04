import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { chromium } from "playwright";

const SITE = resolve(import.meta.dirname, "../fursay-optimized-site");
const PAGES = [
  ...["", "zh/", "ar/"].flatMap((prefix) => ["", "koko", "arabic"].map((slug) => ({
    path: `/${prefix}${slug}`, dialog: true,
    lang: prefix === "zh/" ? "zh-TW" : prefix === "ar/" ? "ar" : "en",
  }))),
  ...["", "zh/", "ar/"].map((prefix) => ({
    path: `/${prefix}privacy`, dialog: false,
    lang: prefix === "zh/" ? "zh-TW" : prefix === "ar/" ? "ar" : "en",
  })),
];
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".json": "application/json" };

// Deliberately local-only: no remote base URL, Worker, credentials, or API forwarding.
async function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
      if (req.method !== "GET" || path.startsWith("/api/")) {
        res.writeHead(405).end();
        return;
      }
      const base = resolve(SITE, `.${path}`);
      if (base !== SITE && !base.startsWith(`${SITE}${sep}`)) {
        res.writeHead(403).end();
        return;
      }
      for (const candidate of [base, `${base}.html`, resolve(base, "index.html")]) {
        if (await stat(candidate).then((entry) => entry.isFile(), () => false)) {
          res.writeHead(200, { "content-type": TYPES[extname(candidate)] || "application/octet-stream" });
          res.end(await readFile(candidate));
          return;
        }
      }
      res.writeHead(404).end();
    } catch {
      res.writeHead(500).end();
    }
  });
  await new Promise((done, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", done);
  });
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

async function focused(locator) {
  await locator.page().waitForFunction((element) => document.activeElement === element, await locator.elementHandle());
}

async function frames(page) {
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
}

export async function checkPage(browser, origin, spec) {
  const context = await browser.newContext({ viewport: { width: spec.width || 1280, height: 900 }, serviceWorkers: "block" });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const result = { ...spec, checks: [], failures: [], blockedExternal: 0, mockedEvents: 0, subscriptionRequests: 0 };
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // Routing disables the HTTP cache. Every context starts with fresh cookies/storage.
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === "/api/subscribe") {
      result.subscriptionRequests += 1;
      await route.abort();
    } else if (url.origin !== origin) {
      result.blockedExternal += 1;
      await route.abort();
    } else if (url.pathname === "/api/event") {
      result.mockedEvents += 1;
      await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
    } else if (request.method() !== "GET" || url.pathname.startsWith("/api/")) {
      errors.push(`Unexpected local request: ${request.method()} ${url.pathname}`);
      await route.abort();
    } else {
      await route.continue();
    }
  });
  await context.routeWebSocket("**/*", (socket) => socket.close());
  async function check(name, action) {
    try {
      await action();
      result.checks.push(name);
    } catch (error) {
      result.failures.push(`${name}: ${error.message}`);
      console.error(`  ${name}: ${error.message}`);
    }
  }
  try {
    assert.equal((await page.goto(`${origin}${spec.path}`, { waitUntil: "load" })).status(), 200);
    await check("locale and direction", async () => {
      assert.equal(await page.locator("html").getAttribute("lang"), spec.lang);
      assert.equal(await page.locator("html").evaluate((el) => getComputedStyle(el).direction), spec.lang === "ar" ? "rtl" : "ltr");
    });
    await check("skip-link keyboard focus and next Tab", async () => {
      await page.keyboard.press("Tab");
      const skip = page.locator("a.skip-link");
      await focused(skip);
      await page.waitForFunction((el) => {
        const box = el.getBoundingClientRect();
        return box.top >= 0 && box.left >= 0 && box.bottom <= innerHeight;
      }, await skip.elementHandle());
      const main = page.locator(await skip.getAttribute("href"));
      await page.keyboard.press("Enter");
      await focused(main);
      await page.keyboard.press("Tab");
      assert.ok(await main.evaluate((el) => {
        const first = [...document.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')]
          .find((target) => (el.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING)
            && target.tabIndex >= 0 && !target.disabled && !target.closest("[inert]")
            && target.getClientRects().length && getComputedStyle(target).visibility !== "hidden");
        return Boolean(first) && document.activeElement === first;
      }), "Tab after skip must continue from main, including text-only main landmarks");
    });
    if (spec.dialog) {
      const overlay = page.locator("#subscribeModal");
      let opener = page.locator("[data-open-subscribe]").first();
      const close = overlay.locator("[data-close-subscribe]");
      const email = overlay.locator('input[type="email"]');
      const order = [close, email, ...await overlay.locator('input[name="groups"], input[name="channel"]').all(), overlay.locator('[type="submit"]')];
      const originalInert = await page.locator("body > *").evaluateAll((elements) => elements.map((el) => el.hasAttribute("inert")));
      async function open() {
        await opener.focus();
        await page.keyboard.press("Enter");
        await focused(email);
        assert.equal(await overlay.getAttribute("aria-hidden"), "false");
      }
      async function closed() {
        await focused(opener);
        assert.equal(await overlay.getAttribute("aria-hidden"), "true");
        assert.ok(!(await overlay.evaluate((el) => el.classList.contains("open"))));
        assert.equal(await page.getByRole("dialog").count(), 0, "closed dialog must leave accessibility tree");
        assert.equal(await page.locator("body").evaluate((el) => el.style.overflow), "");
      }
      await check("initial ARIA and dialog relationships", async () => {
        assert.equal(await overlay.getAttribute("aria-hidden"), "true");
        assert.equal(await page.getByRole("dialog").count(), 0);
        assert.equal(await opener.getAttribute("aria-haspopup"), "dialog");
        assert.equal(await opener.getAttribute("aria-controls"), "subscribeModal");
        assert.equal(await overlay.getAttribute("aria-modal"), "true");
        for (const attr of ["aria-labelledby", "aria-describedby"]) {
          const target = page.locator(`#${await overlay.getAttribute(attr)}`);
          assert.equal(await target.count(), 1);
          assert.ok((await target.innerText()).trim());
        }
        const status = overlay.locator('[role="status"]').first();
        assert.equal(await status.getAttribute("aria-live"), "polite");
        assert.equal(await status.getAttribute("aria-atomic"), "true");
        assert.ok(await close.getAttribute("aria-label"));
      });
      await check("keyboard open and full forward/reverse Tab cycles", async () => {
        await open();
        assert.equal(await page.getByRole("dialog").count(), 1);
        assert.equal(await page.locator("body").evaluate((el) => el.style.overflow), "hidden");
        // Start at email, visit every expected control and cross both boundaries twice.
        let index = 1;
        for (const key of ["Tab", "Shift+Tab"]) {
          for (let i = 0; i < order.length * 2; i += 1) {
            index = (index + (key === "Tab" ? 1 : order.length - 1)) % order.length;
            await page.keyboard.press(key);
            await focused(order[index]);
          }
        }
        const checkbox = order[2];
        await page.keyboard.press("Tab");
        await focused(checkbox);
        const checked = await checkbox.isChecked();
        await page.keyboard.press("Space");
        assert.equal(await checkbox.isChecked(), !checked, "keyboard must toggle pack choice");
        assert.ok(await checkbox.evaluate((el) => getComputedStyle(el.closest("label")).outlineStyle !== "none"), "checkbox must have a visible focus cue");
        await page.keyboard.press("Space");
      });
      await check("background focus, pointer and accessibility isolation", async () => {
        // A real background button above the overlay proves inert blocks pointer events,
        // independently of the overlay's visual hit area. It exists before reopening.
        await page.keyboard.press("Escape");
        await closed();
        await page.evaluate(() => {
          const probe = document.createElement("button");
          probe.id = "a11y-background-probe";
          probe.textContent = "A11Y_BACKGROUND_PROBE";
          probe.style.cssText = "position:fixed;left:0;top:0;width:100px;height:40px;z-index:2147483647";
          probe.onclick = () => { probe.dataset.clicked = "true"; };
          document.body.append(probe);
          const inert = document.createElement("div");
          inert.id = "a11y-existing-inert";
          inert.inert = true;
          document.body.append(inert);
        });
        await open();
        assert.ok(await page.locator("#a11y-background-probe").evaluate((el) => el.inert));
        await opener.evaluate((el) => el.focus());
        await focused(email);
        const cdp = await context.newCDPSession(page);
        const tree = await cdp.send("Accessibility.getFullAXTree");
        await cdp.detach();
        assert.ok(!tree.nodes.some((node) => !node.ignored && node.name?.value === "A11Y_BACKGROUND_PROBE"), "background must leave Chromium accessibility tree");
        await page.mouse.click(20, 20);
        // The click can dismiss via the backdrop, but must never activate the background.
        assert.equal(await page.locator("#a11y-background-probe").getAttribute("data-clicked"), null);
        await page.keyboard.press("Escape");
        await closed();
        assert.ok(await page.locator("#a11y-existing-inert").evaluate((el) => el.inert), "preserve pre-existing inert state");
        assert.ok(!(await page.locator("#a11y-background-probe").evaluate((el) => el.inert)));
        await page.locator("#a11y-background-probe").click();
        assert.equal(await page.locator("#a11y-background-probe").getAttribute("data-clicked"), "true");
        await page.evaluate(() => {
          document.getElementById("a11y-background-probe").remove();
          document.getElementById("a11y-existing-inert").remove();
        });
      });
      // Keep later closure cases independent even if an isolation assertion failed.
      await page.evaluate(() => {
        document.getElementById("a11y-background-probe")?.remove();
        document.getElementById("a11y-existing-inert")?.remove();
      });
      await page.keyboard.press("Escape");
      await frames(page);
      for (const method of ["Escape", "close button", "backdrop"]) {
        await check(`${method} closes and restores opener focus`, async () => {
          await open();
          await overlay.locator(".modal-title").click();
          assert.equal(await overlay.getAttribute("aria-hidden"), "false", "inside click must not close");
          if (method === "Escape") await page.keyboard.press("Escape");
          else if (method === "close button") {
            await close.focus();
            await page.keyboard.press("Enter");
          } else await overlay.click({ position: { x: 4, y: 4 } });
          await closed();
          assert.deepEqual(await page.locator("body > *").evaluateAll((elements) => elements.map((el) => el.hasAttribute("inert"))), originalInert);
        });
      }
      await check("return focus follows the current opener", async () => {
        opener = page.locator("[data-open-subscribe]").nth(1);
        await open();
        await page.keyboard.press("Escape");
        await closed();
      });
      opener = page.locator("[data-open-subscribe]").first();
      await check("rapid close/reopen preserves focus ownership", async () => {
        await open();
        // Flush the class MutationObserver between close/open, before its pending RAF.
        // This deterministically exercises the race without timing-based sleeps.
        await page.evaluate(async () => {
          for (let i = 0; i < 3; i += 1) {
            window.closeSubscribeModal();
            await Promise.resolve();
            window.openSubscribeModal("koko");
            await Promise.resolve();
          }
        });
        await frames(page);
        await focused(email);
        assert.equal(await overlay.getAttribute("aria-hidden"), "false");
        await page.keyboard.press("Escape");
        await closed();
        assert.deepEqual(await page.locator("body > *").evaluateAll((elements) => elements.map((el) => el.hasAttribute("inert"))), originalInert);
      });
      await check("rapid reopen honors a new trigger", async () => {
        await open();
        await page.evaluate(async () => {
          window.closeSubscribeModal();
          await Promise.resolve();
          const next = document.querySelectorAll("[data-open-subscribe]")[1];
          next.focus();
          next.click();
          await Promise.resolve();
        });
        await frames(page);
        await focused(email);
        opener = page.locator("[data-open-subscribe]").nth(1);
        await page.keyboard.press("Escape");
        await closed();
      });
    }
    await frames(page);
    await check("no subscription or runtime errors", async () => {
      assert.equal(result.subscriptionRequests, 0, "must never submit a subscription");
      assert.deepEqual(errors, []);
    });
  } catch (error) {
    result.failures.push(`page setup: ${error.message}`);
  } finally {
    await context.close();
  }
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  assert.ok(args.length === 0 || (args.length === 2 && args[0] === "--out-dir" && args[1]), "Usage: node scripts/check-accessibility-browser.mjs [--out-dir PATH] (local only)");
  const outDir = resolve(args[1] || "/tmp/fursay-accessibility-browser");
  await mkdir(outDir, { recursive: true });
  const report = { ok: false, mode: "local", browser: "", pages: [], failures: [] };
  let server;
  let browser;
  try {
    const local = await startServer();
    server = local.server;
    browser = await chromium.launch({ headless: true });
    report.browser = browser.version();
    for (const spec of PAGES) {
      const result = await checkPage(browser, local.origin, spec);
      report.pages.push(result);
      report.failures.push(...result.failures.map((failure) => `${spec.path}: ${failure}`));
      console.log(`${result.failures.length ? "FAIL" : "PASS"} ${spec.path}: ${result.checks.length} checks`);
    }
    report.ok = report.failures.length === 0;
  } catch (error) {
    report.failures.push(error.message);
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise((done) => server.close(done));
    await writeFile(resolve(outDir, "accessibility-browser.json"), `${JSON.stringify(report, null, 2)}\n`);
  }
  console.log(JSON.stringify({ ok: report.ok, pages: report.pages.length, failed: report.failures.length, outDir }));
  if (!report.ok) process.exitCode = 1;
}

if (resolve(process.argv[1] || "") === import.meta.filename) await main();
