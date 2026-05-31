import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Resolve the package root robustly. The integrations/ JSON lives at the
 * package root, but the code that reads it runs from two locations: src/ under
 * vitest, and a flattened dist/ after tsup bundling. Walking up to the dir that
 * contains integrations/versions.json works for both without per-file fragile
 * relative paths.
 */
let cached: string | null = null;

export function packageRoot(): string {
  if (cached) return cached;
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, "integrations", "versions.json"))) {
      cached = dir;
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback: assume two levels up from this file (src/core or dist).
  cached = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  return cached;
}

export function integrationsPath(file: string): string {
  return path.join(packageRoot(), "integrations", file);
}
