import path from "node:path";
import { PATHS } from "../constants.js";
import { detect } from "../core/detect.js";
import { getProfileConfig } from "../core/plan.js";
import { buildContext } from "../generate/context.js";
import { generateCursor } from "../generate/cursor.js";
import { SafeWriter } from "../core/safe-writer.js";
import { color, sym, readJsonSafe } from "../core/util.js";
import type { ProfileName } from "../core/types.js";

/** Regenerate the Cursor mirror from current detection + profile (PRD §6 sync). */
export function runSync(cwd: string): { ok: boolean } {
  const manifest = readJsonSafe<{ profile: string }>(path.join(cwd, PATHS.installedManifest));
  if (!manifest) {
    console.error(`${sym.err} No install found. Run \`agent-stack init\` first.`);
    return { ok: false };
  }
  const detection = detect(cwd);
  const profileName = manifest.profile as ProfileName;
  const profile = getProfileConfig(profileName);
  const ctx = buildContext(detection, profileName, profile);
  const files = generateCursor(ctx);
  const writer = new SafeWriter(cwd);
  const res = writer.writePlanned(files);
  console.log(`${sym.ok} Synced ${res.written.length} Cursor files from CLAUDE.md context.`);
  if (res.failed.length) {
    console.error(`${sym.err} ${res.failed.length} failed.`);
    return { ok: false };
  }
  console.log(color.dim("Restart Cursor to pick up the regenerated rules."));
  return { ok: true };
}
