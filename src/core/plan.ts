import fs from "node:fs";
import { TOOL_VERSION } from "../constants.js";
import { integrationsPath } from "./pkg-root.js";
import { adaptersForProfile } from "../adapters/registry.js";
import { hooksForProfile } from "../adapters/hooks.js";
import { buildContext } from "../generate/context.js";
import { generateClaude } from "../generate/claude.js";
import { generateCursor } from "../generate/cursor.js";
import { generateMcp } from "../generate/mcp.js";
import { backupDirName } from "./backup.js";
import type { Detection, InitOptions, Plan, ProfileConfig, ProfileName } from "./types.js";

const profilesJson = JSON.parse(fs.readFileSync(integrationsPath("profiles.json"), "utf8")) as {
  profiles: Record<string, ProfileConfig>;
};

export function getProfileConfig(name: ProfileName): ProfileConfig {
  const p = profilesJson.profiles[name];
  if (!p) throw new Error(`Unknown profile: ${name}`);
  return p;
}

export function profileExists(name: string): name is ProfileName {
  return name in profilesJson.profiles;
}

/** Build the full execution plan from detection + options (pure; writes nothing). */
export function buildPlan(detection: Detection, opts: InitOptions): Plan {
  const profileName: ProfileName = opts.profile ?? detection.profile;
  const profile = getProfileConfig(profileName);

  const targets = opts.targets ?? detection.hosts;

  const adapters = adaptersForProfile(profile.graph, profile.compression, profile.caveman).filter(
    (a) => a.permissive || opts.allowNoncommercial,
  );

  const ctx = buildContext(detection, profileName, profile);

  const files = generateClaude(ctx);
  if (targets.includes("cursor")) files.push(...generateCursor(ctx));
  files.push(...generateMcp(ctx));

  const hooks = hooksForProfile(profile);

  const alreadyInstalled =
    !opts.force &&
    detection.existing.priorInstall != null &&
    detection.existing.priorInstall.profile === profileName;

  return {
    detection,
    targets,
    profile: profileName,
    adapters,
    files,
    hooks,
    backupDir: backupDirName(detection.cwd),
    alreadyInstalled,
  };
}

export { TOOL_VERSION };
