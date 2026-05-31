import path from "node:path";
import fs from "node:fs";
import { PATHS } from "../constants.js";
import { detect } from "../core/detect.js";
import { profileExists } from "../core/plan.js";
import { runInit } from "./init.js";
import { color, sym, readJsonSafe } from "../core/util.js";
import type { InitOptions, ProfileName } from "../core/types.js";

/** Swap profile and regenerate affected files (re-runs init with --force on the new profile). */
export async function runProfileUse(cwd: string, name: string, baseOpts: Partial<InitOptions> = {}): Promise<{ ok: boolean }> {
  if (!profileExists(name)) {
    console.error(`${sym.err} Unknown profile "${name}". Valid: code, review, multimodal, research, spec.`);
    return { ok: false };
  }
  console.log(`Switching to profile "${name}"…`);
  const res = await runInit({
    cwd,
    yes: true,
    dryRun: false,
    profile: name as ProfileName,
    noInstall: baseOpts.noInstall ?? false,
    allowNoncommercial: baseOpts.allowNoncommercial ?? false,
    overwrite: true,
    force: true,
    nonInteractive: true,
  });
  return { ok: res.ok };
}

/** Swap only the graph backend in the manifest + regenerate. */
export async function runGraphUse(cwd: string, graph: string): Promise<{ ok: boolean }> {
  const manifestPath = path.join(cwd, PATHS.installedManifest);
  const manifest = readJsonSafe<{ profile: string }>(manifestPath);
  if (!manifest) {
    console.error(`${sym.err} No agent-stack install found. Run \`agent-stack init\` first.`);
    return { ok: false };
  }
  // Graph is profile-bound in v1; advise the matching profile swap.
  const map: Record<string, ProfileName> = {
    codegraph: "code",
    "code-review-graph": "review",
    graphify: "multimodal",
  };
  const target = map[graph];
  if (!target) {
    console.error(`${sym.err} Unknown graph "${graph}". Valid: codegraph, code-review-graph, graphify.`);
    return { ok: false };
  }
  console.log(`Graph "${graph}" maps to profile "${target}".`);
  return runProfileUse(cwd, target);
}

export function showProfile(cwd: string): void {
  const manifest = readJsonSafe<{ profile: string; version: string; targets: string[] }>(
    path.join(cwd, PATHS.installedManifest),
  );
  if (!manifest) {
    const d = detect(cwd);
    console.log(`No install yet. Detected profile would be: ${color.cyan(d.profile)} (confidence ${Math.round(d.profileConfidence * 100)}%).`);
    return;
  }
  console.log(`Profile: ${color.cyan(manifest.profile)}  ·  targets: ${manifest.targets.join(", ")}  ·  v${manifest.version}`);
}
