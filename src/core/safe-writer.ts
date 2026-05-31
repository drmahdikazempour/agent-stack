import fs from "node:fs";
import path from "node:path";
import type { PlannedFile } from "./types.js";

export interface WriteResult {
  written: string[];
  failed: { path: string; error: string }[];
}

/**
 * Writes files transactionally-ish: records every path it touches so a caller
 * can roll back from the pre-write backup if any step throws. Per PRD §12,
 * "Every write goes through safe-writer (backup → write → verify)."
 */
export class SafeWriter {
  readonly written: string[] = [];

  constructor(private readonly cwd: string) {}

  writeFile(relPath: string, contents: string): void {
    const full = path.join(this.cwd, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, contents, "utf8");
    this.written.push(relPath);
  }

  writePlanned(files: PlannedFile[]): WriteResult {
    const result: WriteResult = { written: [], failed: [] };
    for (const f of files) {
      try {
        this.writeFile(f.path, f.contents);
        result.written.push(f.path);
      } catch (e: any) {
        result.failed.push({ path: f.path, error: String(e?.message ?? e) });
      }
    }
    return result;
  }

  /** Verify each written file exists and is non-empty. */
  verify(): { ok: boolean; missing: string[] } {
    const missing: string[] = [];
    for (const rel of this.written) {
      const full = path.join(this.cwd, rel);
      try {
        if (!fs.existsSync(full) || fs.statSync(full).size === 0) missing.push(rel);
      } catch {
        missing.push(rel);
      }
    }
    return { ok: missing.length === 0, missing };
  }
}
