import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

/** Tiny ANSI color helpers (zero-dep replacement for chalk/picocolors). */
const useColor = process.stdout.isTTY && process.env.NO_COLOR === undefined;
const wrap = (open: number, close: number) => (s: string) =>
  useColor ? `[${open}m${s}[${close}m` : s;
export const color = {
  bold: wrap(1, 22),
  dim: wrap(2, 22),
  red: wrap(31, 39),
  green: wrap(32, 39),
  yellow: wrap(33, 39),
  blue: wrap(34, 39),
  cyan: wrap(36, 39),
  gray: wrap(90, 39),
};

export const sym = {
  ok: color.green("✓"),
  warn: color.yellow("!"),
  err: color.red("✗"),
  arrow: color.dim("←"),
  bullet: "•",
};

export function fileExists(p: string): boolean {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

export function readFileSafe(p: string): string | null {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

export function readJsonSafe<T = unknown>(p: string): T | null {
  const raw = readFileSafe(p);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Resolve a path under the home dir without throwing. */
export function homePath(...segs: string[]): string {
  return path.join(os.homedir(), ...segs);
}

/** Is a binary callable on PATH? */
export function hasBinary(name: string): boolean {
  const cmd = process.platform === "win32" ? "where" : "command -v";
  try {
    execSync(`${cmd} ${name}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export interface RunResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  code: number | null;
}

/** Run a command, capturing output, never throwing. */
export function run(
  file: string,
  args: string[],
  opts: { cwd?: string; timeoutMs?: number } = {},
): RunResult {
  try {
    const stdout = execFileSync(file, args, {
      cwd: opts.cwd,
      timeout: opts.timeoutMs ?? 60_000,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, stdout, stderr: "", code: 0 };
  } catch (e: any) {
    return {
      ok: false,
      stdout: e?.stdout?.toString?.() ?? "",
      stderr: e?.stderr?.toString?.() ?? String(e?.message ?? e),
      code: typeof e?.status === "number" ? e.status : null,
    };
  }
}

export function timestamp(): string {
  return new Date().toISOString().replace(/:/g, "-").replace(/\..+$/, "");
}

/** Count files matching a predicate under a dir, capped for speed. */
export function walkCount(
  root: string,
  predicate: (file: string, size: number) => boolean,
  cap = 5000,
): number {
  let count = 0;
  let seen = 0;
  const skip = new Set(["node_modules", ".git", "dist", "build", ".next", ".agent-stack"]);
  const stack = [root];
  while (stack.length && seen < cap) {
    const dir = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      if (seen >= cap) break;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (!skip.has(ent.name) && !ent.name.startsWith(".agent-stack")) stack.push(full);
      } else if (ent.isFile()) {
        seen++;
        let size = 0;
        try {
          size = fs.statSync(full).size;
        } catch {
          /* ignore */
        }
        if (predicate(ent.name, size)) count++;
      }
    }
  }
  return count;
}
