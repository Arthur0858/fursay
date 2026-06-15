import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { chromium } from "playwright";

const SITE_DIR = resolve(process.cwd(), "fursay-optimized-site");
const DOWNLOAD_DIR = resolve(SITE_DIR, "downloads");
const MANIFEST_PATH = resolve(process.cwd(), "data/product-sample-pdfs.json");
const SAMPLES = [
  {
    path: "/product-samples/koko-printable",
    source: "product-samples/koko-printable.html",
    output: "koko-printable-sample.pdf",
  },
  {
    path: "/product-samples/noor-worksheet",
    source: "product-samples/noor-worksheet.html",
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

function readManifest() {
  if (!existsSync(MANIFEST_PATH)) return { samples: {} };
  try {
    return JSON.parse(String(readFileSync(MANIFEST_PATH)));
  } catch {
    return { samples: {} };
  }
}

async function sourceHash(sample) {
  const sourcePath = resolve(SITE_DIR, sample.source);
  if (!existsSync(sourcePath)) return "";
  const source = await readFile(sourcePath);
  return createHash("sha256").update(source).digest("hex");
}

async function main() {
  mkdirSync(DOWNLOAD_DIR, { recursive: true });
  mkdirSync(resolve(process.cwd(), "data"), { recursive: true });
  const manifest = readManifest();
  const samplesWithHashes = await Promise.all(SAMPLES.map(async (sample) => ({
    ...sample,
    hash: await sourceHash(sample),
  })));
  const pending = samplesWithHashes.filter((sample) => {
    const outputPath = resolve(DOWNLOAD_DIR, sample.output);
    if (!existsSync(outputPath)) return true;
    if (!sample.hash) return false;
    return manifest.samples?.[sample.output]?.sourceHash !== sample.hash;
  });
  if (!pending.length) {
    console.log(JSON.stringify({
      ok: true,
      outputDir: "fursay-optimized-site/downloads",
      generated: [],
      existing: samplesWithHashes.map((sample) => sample.output),
    }, null, 2));
    return;
  }
  const localServer = await startServer();
  const browser = await chromium.launch({ headless: true });
  try {
    for (const sample of pending) {
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
  const nextManifest = {
    updatedAt: new Date().toISOString(),
    samples: Object.fromEntries(samplesWithHashes.map((sample) => {
      const outputPath = resolve(DOWNLOAD_DIR, sample.output);
      return [sample.output, {
        source: sample.source,
        sourceHash: sample.hash,
        bytes: existsSync(outputPath) ? statSync(outputPath).size : 0,
      }];
    })),
  };
  await writeFile(MANIFEST_PATH, JSON.stringify(nextManifest, null, 2) + "\n");
  console.log(JSON.stringify({
    ok: true,
    outputDir: "fursay-optimized-site/downloads",
    generated: pending.map((sample) => sample.output),
    existing: samplesWithHashes.filter((sample) => !pending.includes(sample)).map((sample) => sample.output),
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
