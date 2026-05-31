import fs from "node:fs";
import path from "node:path";
import { PATHS } from "./constants.js";
import { verifyAdapter } from "./adapters/install.js";
import type { AdapterDescriptor } from "./core/types.js";
import { parseFrontmatter } from "./generate/frontmatter.js";
import { countOurHooks } from "./wire-hooks.js";
import { fileExists, readFileSafe } from "./core/util.js";

export interface ActivationCheck {
  name: string;
  ok: boolean;
  detail: string;
}

export interface ActivationReport {
  ok: boolean;
  checks: ActivationCheck[];
}

/**
 * Post-write verification (PRD §3 step 8 / §9.9): confirm each skill loads,
 * each hook is present, each binary is callable. Fail loudly if not.
 */
export function activate(
  cwd: string,
  opts: { adapters: AdapterDescriptor[]; expectedSkills: string[]; expectedHooks: number },
): ActivationReport {
  const checks: ActivationCheck[] = [];

  // 1. Skills load: SKILL.md exists with valid frontmatter (name + description).
  for (const skill of opts.expectedSkills) {
    const p = path.join(cwd, PATHS.claudeSkills, skill, "SKILL.md");
    const raw = readFileSafe(p);
    if (!raw) {
      checks.push({ name: `skill:${skill}`, ok: false, detail: "SKILL.md missing" });
      continue;
    }
    const fm = parseFrontmatter(raw);
    const ok = !!fm.data.name && !!fm.data.description;
    checks.push({
      name: `skill:${skill}`,
      ok,
      detail: ok ? "loads" : "missing name/description in frontmatter",
    });
  }

  // 2. Hooks present in settings.json.
  const hookCount = countOurHooks(cwd);
  checks.push({
    name: "hooks",
    ok: hookCount >= opts.expectedHooks,
    detail: `${hookCount}/${opts.expectedHooks} agent-stack hooks wired`,
  });

  // 3. Adapter binaries callable (skill-only adapters pass trivially).
  for (const a of opts.adapters) {
    const ok = verifyAdapter(a);
    checks.push({
      name: `adapter:${a.name}`,
      ok,
      detail: ok ? "callable" : "binary not on PATH (config written; install to fully activate)",
    });
  }

  // 4. CLAUDE.md exists.
  const claudeMd = fileExists(path.join(cwd, PATHS.claudeMd));
  checks.push({ name: "CLAUDE.md", ok: claudeMd, detail: claudeMd ? "written" : "missing" });

  // Adapter-binary checks are non-fatal (config-only mode is valid); skill,
  // hook, and CLAUDE.md checks are fatal.
  const fatal = checks.filter((c) => !c.name.startsWith("adapter:"));
  return { ok: fatal.every((c) => c.ok), checks };
}

/** Write the install manifest so a re-run can detect prior installs (idempotency). */
export function writeManifest(
  cwd: string,
  data: { version: string; profile: string; targets: string[]; adapters: string[]; backupDir: string },
): void {
  const full = path.join(cwd, PATHS.installedManifest);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(
    full,
    JSON.stringify({ ...data, installedAt: new Date().toISOString() }, null, 2) + "\n",
    "utf8",
  );
}
