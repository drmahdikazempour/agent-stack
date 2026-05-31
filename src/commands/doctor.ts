import path from "node:path";
import fs from "node:fs";
import { PATHS } from "../constants.js";
import { audit } from "../audit.js";
import { planHooks } from "../wire-hooks.js";
import { hooksForAdapters } from "../adapters/hooks.js";
import { adaptersForProfile } from "../adapters/registry.js";
import { getProfileConfig } from "../core/plan.js";
import { color, sym, fileExists, readJsonSafe } from "../core/util.js";
import { parseFrontmatter } from "../generate/frontmatter.js";
import { SPEC } from "../constants.js";

export interface DoctorResult {
  ok: boolean;
  failures: string[];
}

/** Lint everything (PRD §6). Exit code 0 = clean (used as the hook-conflict metric). */
export function runDoctor(cwd: string, opts: { skillsOnly?: boolean } = {}): DoctorResult {
  const failures: string[] = [];
  console.log(color.bold("agent-stack doctor"));
  console.log("");

  // Skill frontmatter + size lint (works on the repo's own skills/ too).
  const skillRoots = [path.join(cwd, PATHS.claudeSkills), path.join(cwd, "skills")];
  for (const root of skillRoots) {
    if (!fileExists(root)) continue;
    for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
      if (!ent.isDirectory()) continue;
      const p = path.join(root, ent.name, "SKILL.md");
      if (!fileExists(p)) continue;
      const { data, body } = parseFrontmatter(fs.readFileSync(p, "utf8"));
      const descLen = (data.description ?? "").length;
      const lines = body.split("\n").length;
      if (!data.name) failures.push(`${ent.name}: missing 'name' in frontmatter`);
      if (!data.description) failures.push(`${ent.name}: missing 'description'`);
      if (descLen > SPEC.SKILL_DESCRIPTION_MAX_CHARS)
        failures.push(`${ent.name}: description ${descLen} > ${SPEC.SKILL_DESCRIPTION_MAX_CHARS} chars`);
      if (lines > SPEC.SKILL_BODY_MAX_LINES)
        failures.push(`${ent.name}: body ${lines} > ${SPEC.SKILL_BODY_MAX_LINES} lines`);
      report(`skill:${ent.name}`, descLen <= SPEC.SKILL_DESCRIPTION_MAX_CHARS && lines <= SPEC.SKILL_BODY_MAX_LINES && !!data.name && !!data.description, `desc ${descLen}c, body ${lines}L`);
    }
  }

  if (opts.skillsOnly) {
    console.log("");
    return finish(failures);
  }

  // Token budgets via audit.
  const report_ = audit(cwd);
  for (const item of report_.items) {
    report(item.name, item.ok, item.detail);
    if (!item.ok) failures.push(`${item.name}: ${item.detail} (limit ${item.limit})`);
  }

  // Hook conflicts: re-merge our profile's hook specs against current settings.
  const manifest = readJsonSafe<{ profile: string }>(path.join(cwd, PATHS.installedManifest));
  if (manifest) {
    try {
      const profile = getProfileConfig(manifest.profile as any);
      const adapters = adaptersForProfile(profile.graph, profile.compression, profile.caveman);
      const specs = hooksForAdapters(adapters);
      const { result } = planHooks(cwd, specs);
      const ok = result.conflicts.length === 0;
      report("hook conflicts", ok, `${result.conflicts.length} conflict(s)`);
      if (!ok) failures.push(`${result.conflicts.length} hook conflict(s)`);
    } catch {
      /* profile gone; skip */
    }
  }

  console.log("");
  return finish(failures);
}

function report(name: string, ok: boolean, detail: string): void {
  console.log(`  ${ok ? sym.ok : sym.err} ${name.padEnd(34)} ${color.dim(detail)}`);
}

function finish(failures: string[]): DoctorResult {
  if (failures.length === 0) {
    console.log(color.green("All checks passed."));
    return { ok: true, failures };
  }
  console.log(color.red(`${failures.length} issue(s):`));
  for (const f of failures) console.log(`  ${sym.err} ${f}`);
  console.log(color.dim("Run `npx @drmahdikazempour/agent-stack optimize` to auto-fix where possible."));
  return { ok: false, failures };
}
