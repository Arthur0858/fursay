import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const ROOT = resolve(import.meta.dirname, "..");
const CHECKER = join(ROOT, "scripts", "check-noor-list-activation.mjs");

test("activation checker fails closed when every page check raises", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "fursay-noor-activation-fail-closed-"));
  try {
    const result = spawnSync(
      process.execPath,
      [CHECKER, "--base-url", "http://127.0.0.1:9", "--out-dir", outDir],
      { cwd: ROOT, encoding: "utf8", timeout: 120_000 },
    );
    assert.notEqual(result.status, 0, `checker unexpectedly passed:\n${result.stdout}\n${result.stderr}`);
    const report = JSON.parse(await readFile(join(outDir, "noor-list-activation.json"), "utf8"));
    assert.equal(report.ok, false);
    assert.equal(report.failed.length, 3);
    assert.equal(report.errors.length, 3);
    assert.ok(report.results.every((entry) => entry.ok === false));
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});
