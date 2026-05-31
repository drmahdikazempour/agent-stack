import fs from "node:fs";
import path from "node:path";
import { PATHS } from "../constants.js";
import { latestBackup, restoreBackup } from "../core/backup.js";
import { color, sym, readJsonSafe } from "../core/util.js";
import { confirm } from "../prompt.js";

const OWNED = [
  PATHS.claudeMd,
  PATHS.architectureMap,
  PATHS.commonMistakes,
  PATHS.claudeIgnore,
  PATHS.mcpConfig,
  PATHS.agentsMd,
  PATHS.claudeSkills,
  PATHS.claudeAgents,
  PATHS.claudeCommands,
  PATHS.cursorRules,
];

/** Counterpart to install: restore the pre-init backup and remove agent-stack files. */
export async function runUninstall(cwd: string, opts: { yes: boolean }): Promise<{ ok: boolean }> {
  const manifest = readJsonSafe<{ backupDir?: string }>(path.join(cwd, PATHS.installedManifest));
  const backup = manifest?.backupDir && fs.existsSync(manifest.backupDir) ? manifest.backupDir : latestBackup(cwd);

  if (!opts.yes) {
    const ok = await confirm(
      backup
        ? `Restore from backup ${path.basename(backup)} and remove agent-stack files?`
        : "Remove all agent-stack files? (no backup found)",
    );
    if (!ok) {
      console.log("Aborted.");
      return { ok: false };
    }
  }

  // Remove what we generated.
  for (const rel of OWNED) {
    fs.rmSync(path.join(cwd, rel), { recursive: true, force: true });
  }
  fs.rmSync(path.join(cwd, PATHS.stateDir), { recursive: true, force: true });

  // Restore prior config if we have a backup.
  if (backup) {
    const restored = restoreBackup(cwd, backup);
    console.log(`${sym.ok} Restored ${restored.length} path(s) from ${path.basename(backup)}.`);
  }

  console.log(`${sym.ok} agent-stack uninstalled.`);
  console.log(color.dim("Note: globally-installed adapter binaries (rtk, ccusage…) were left in place; remove them with your package manager if desired."));
  return { ok: true };
}
