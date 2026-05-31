import fs from "node:fs";
import path from "node:path";
import { PATHS } from "../constants.js";
import { fileExists, timestamp } from "./util.js";

/** Top-level paths agent-stack may touch and therefore must back up before writing. */
const BACKUP_TARGETS = [
  PATHS.claudeDir,
  PATHS.claudeMd,
  ".cursor",
  PATHS.agentsMd,
  PATHS.mcpConfig,
  PATHS.commonMistakes,
  PATHS.architectureMap,
  PATHS.claudeIgnore,
];

export function backupDirName(cwd: string): string {
  return path.join(cwd, `.agent-stack.bak.${timestamp()}`);
}

function copyRecursive(src: string, dest: string): void {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

/**
 * Copy every existing agent-stack-owned path into the backup dir.
 * Returns the list of backed-up paths (may be empty on a clean repo).
 */
export function backupExisting(cwd: string, backupDir: string): string[] {
  const backedUp: string[] = [];
  for (const rel of BACKUP_TARGETS) {
    const src = path.join(cwd, rel);
    if (!fileExists(src)) continue;
    copyRecursive(src, path.join(backupDir, rel));
    backedUp.push(rel);
  }
  return backedUp;
}

/** Restore from a backup dir (used by uninstall and rollback). */
export function restoreBackup(cwd: string, backupDir: string): string[] {
  if (!fileExists(backupDir)) return [];
  const restored: string[] = [];
  for (const rel of BACKUP_TARGETS) {
    const src = path.join(backupDir, rel);
    if (!fileExists(src)) continue;
    const dest = path.join(cwd, rel);
    fs.rmSync(dest, { recursive: true, force: true });
    copyRecursive(src, dest);
    restored.push(rel);
  }
  return restored;
}

/** Newest backup dir in cwd, or null. */
export function latestBackup(cwd: string): string | null {
  const dirs = fs
    .readdirSync(cwd, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith(".agent-stack.bak."))
    .map((e) => e.name)
    .sort();
  const last = dirs[dirs.length - 1];
  return last ? path.join(cwd, last) : null;
}
