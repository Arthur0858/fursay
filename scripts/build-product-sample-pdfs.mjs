import { createServer } from "node:http";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { chromium } from "playwright";

const SITE_DIR = resolve(process.cwd(), "fursay-optimized-site");
const DOWNLOAD_DIR = resolve(SITE_DIR, "downloads");
const SAMPLES = [
  {
    path: "/product-samples/koko-printable",
    output: "koko-printable-sample.pdf",
  },
  {
    path: "/product-samples/noor-worksheet",
    output: "noor-worksheet-sample.pdf",
  },
];

function contentType(pathname) {
  const ext = extname(pathname).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".js") return "text/javascript; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".avif") return "image/avif";
  if (ext === ".pdf") return "application/pdf";
  return "application/octet-stream";
}

function resolveAsset(pathname) {
  const clean = pathname === "/" ? "/index.html" : pathname;
  const candidates = [
    resolve(SITE_DIR, `.${clean}/index.html`),
    resolve(SITE_DIR, `.${clean}.html`),
    resolve(SITE_DIR, `.${clean}`),
  ];
  return candidates.find((candidate) => (
    candidate.startsWith(SITE_DIR)
    && existsSync(candidate)
    && statSync(candidate).isFile()
  ));
}

function startServer() {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      const asset = resolveAsset(url.pathname);
      if (!asset) {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("not found");
        return;
      }
      response.writeHead(200, { "content-type": contentType(asset) });
      response.end(await readFile(asset));
    } catch (error) {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end(error instanceof Error ? error.message : String(error));
    }
  });
  return new Promise((resolveServer) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolveServer({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}

async function main() {
  mkdirSync(DOWNLOAD_DIR, { recursive: true });
  const localServer = await startServer();
  const browser = await chromium.launch({ headless: true });
  try {
    for (const sample of SAMPLES) {
      const page = await browser.newPage({ viewport: { width: 816, height: 1056 } });
      await page.goto(`${localServer.baseUrl}${sample.path}?print=1`, {
        waitUntil: "networkidle",
        timeout: 45000,
      });
      await page.pdf({
        path: resolve(DOWNLOAD_DIR, sample.output),
        format: "Letter",
        printBackground: true,
        margin: {
          top: "0.35in",
          right: "0.35in",
          bottom: "0.35in",
          left: "0.35in",
        },
      });
      await page.close();
    }
  } finally {
    await browser.close();
    await new Promise((resolveClose) => localServer.server.close(resolveClose));
  }
  console.log(JSON.stringify({
    ok: true,
    outputDir: "fursay-optimized-site/downloads",
    files: SAMPLES.map((sample) => sample.output),
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
