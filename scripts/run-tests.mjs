import esbuild from "esbuild";
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = resolve(root, ".test-build");
const outfile = resolve(tempDir, "all.test.cjs");

mkdirSync(tempDir, { recursive: true });

try {
  await esbuild.build({
    entryPoints: [resolve(root, "tests/all.test.ts")],
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node20",
    outfile,
    logLevel: "silent",
  });

  const result = spawnSync(process.execPath, ["--test", outfile], {
    cwd: root,
    stdio: "inherit",
  });
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
