#!/usr/bin/env node

import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const root = process.cwd();
const DEFAULT_OUT = "/tmp/fursay-workspace-hygiene";
const GENERATED_DIRS = ["output", "qa-screenshots"];
const ROOT_GENERATED_EXTS = new Set([".bundle", ".jpeg", ".jpg", ".mov", ".mp4", ".png", ".webp", ".zip"]);

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { outDir: DEFAULT_OUT };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--out-dir") parsed.outDir = args[++i];
  }
  return parsed;
}

async function fileSize(filePath) {
  try {
    return (await stat(filePath)).size;
  } catch {
    return 0;
  }
}

async function collectRootGeneratedFiles() {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const extension = extname(entry.name).toLowerCase();
    if (ROOT_GENERATED_EXTS.has(extension)) {
      const filePath = join(root, entry.name);
      files.push({ path: entry.name, bytes: await fileSize(filePath) });
    }
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

async function collectTransferBundles() {
  const transferDir = join(root, "transfer");
  if (!existsSync(transferDir)) return [];
  const entries = await readdir(transferDir, { withFileTypes: true });
  const bundles = [];
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".bundle")) {
      const relativePath = `transfer/${entry.name}`;
      bundles.push({ path: relativePath, bytes: await fileSize(join(root, relativePath)) });
    }
  }
  return bundles.sort((a, b) => a.path.localeCompare(b.path));
}

async function main() {
  const args = parseArgs();
  const failures = [];
  const generatedDirs = [];

  for (const dir of GENERATED_DIRS) {
    const dirPath = join(root, dir);
    if (existsSync(dirPath)) {
      generatedDirs.push(dir);
      failures.push(`generated_dir_present:${dir}`);
    }
  }

  const rootGeneratedFiles = await collectRootGeneratedFiles();
  const transferBundles = await collectTransferBundles();

  for (const file of rootGeneratedFiles) failures.push(`root_generated_file_present:${file.path}`);
  for (const file of transferBundles) failures.push(`transfer_bundle_present:${file.path}`);

  const report = {
    ok: failures.length === 0,
    outDir: args.outDir,
    failed: failures.length,
    failures,
    generatedDirs,
    rootGeneratedFiles,
    transferBundles,
    generatedBytes: [...rootGeneratedFiles, ...transferBundles].reduce((total, file) => total + file.bytes, 0),
  };

  await mkdir(args.outDir, { recursive: true });
  await writeFile(resolve(args.outDir, "workspace-hygiene.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({
    ok: report.ok,
    outDir: report.outDir,
    failed: report.failed,
    generatedDirs: report.generatedDirs.length,
    rootGeneratedFiles: report.rootGeneratedFiles.length,
    transferBundles: report.transferBundles.length,
    generatedBytes: report.generatedBytes,
  }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
