import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** Make a throwaway repo dir under the OS tmp and return its path. */
export function makeTmpRepo(files: Record<string, string> = {}): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-stack-test-"));
  for (const [rel, contents] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, contents, "utf8");
  }
  return dir;
}

export function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

export function read(dir: string, rel: string): string {
  return fs.readFileSync(path.join(dir, rel), "utf8");
}

export function exists(dir: string, rel: string): boolean {
  return fs.existsSync(path.join(dir, rel));
}
