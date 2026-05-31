import { PATHS, TOOL_VERSION } from "../constants.js";
import { detect } from "../core/detect.js";
import { buildPlan } from "../core/plan.js";
import { backupExisting, restoreBackup } from "../core/backup.js";
import { SafeWriter } from "../core/safe-writer.js";
import type { InitOptions, Plan } from "../core/types.js";
import { color, sym } from "../core/util.js";
import { ensureAdapter, type InstallOutcome } from "../adapters/install.js";
import { wireHooks } from "../wire-hooks.js";
import { activate, writeManifest } from "../activate.js";
import { captureUsage, writeBaseline } from "../adapters/ccusage.js";
import { runGraphRefresh } from "./graph.js";
import { confirm } from "../prompt.js";

function printPlan(plan: Plan): void {
  const d = plan.detection;
  console.log("");
  console.log(color.bold(`agent-stack v${TOOL_VERSION}`));
  console.log("");
  console.log(color.bold("Detected:"));
  console.log(`  Host: ${plan.targets.map((h) => (h === "claude" ? "Claude Code" : "Cursor")).join(" + ")}`);
  console.log(`  Repo: ${[d.language, d.framework, d.packageManager].filter(Boolean).join(" / ")}`);
  console.log(
    `  Profile: ${plan.profile} (confidence: ${d.profileConfidence >= 0.8 ? "high" : d.profileConfidence >= 0.6 ? "medium" : "low"})`,
  );
  if (d.existing.claudeMd) console.log(`  Existing: CLAUDE.md (${d.existing.claudeMd.tokens} tokens, will merge)`);
  if (d.existing.claudeDir) console.log(`  Existing: .claude/ (will back up)`);
  console.log("");
  console.log(color.bold("Will set up tools:"));
  for (const a of plan.adapters) {
    const src = a.repo ?? a.version ?? "";
    console.log(`  - ${a.name.padEnd(18)} ${a.integration.padEnd(7)} ${src.padEnd(28)} (${a.spdx})`);
  }
  console.log(`  - ${getProfileSkillCount(plan)} skills (${plan.profile} profile)`);
  console.log("");
  console.log(color.bold("Will write:"));
  const byHost = plan.files.length;
  console.log(`  ${byHost} files → ${plan.targets.join(", ")}`);
  console.log(`  ${PATHS.claudeSettings} (${plan.hooks.length} hooks merged)`);
  console.log("");
}

function getProfileSkillCount(plan: Plan): number {
  return plan.files.filter((f) => f.path.includes(`${PATHS.claudeSkills}/`)).length;
}

export interface InitResult {
  ok: boolean;
  plan: Plan;
  installs: InstallOutcome[];
  filesWritten: number;
  hooksWired: number;
  baselineTokens: number;
  rolledBack: boolean;
  message: string;
}

export async function runInit(opts: InitOptions): Promise<InitResult> {
  // 1. Detect
  const detection = detect(opts.cwd);

  // Guard: research/noncommercial profiles require the flag.
  const planEarly = buildPlan(detection, opts);
  const profileReq = getProfileRequires(planEarly);
  if (profileReq && !opts.allowNoncommercial) {
    return fail(planEarly, `Profile "${planEarly.profile}" requires --allow-noncommercial.`);
  }

  const plan = planEarly;

  // Idempotency: a matching prior install is a no-op unless --force.
  if (plan.alreadyInstalled) {
    console.log(`${sym.ok} agent-stack already set up for profile "${plan.profile}". Nothing to do. (use --force to re-run)`);
    return {
      ok: true,
      plan,
      installs: [],
      filesWritten: 0,
      hooksWired: 0,
      baselineTokens: 0,
      rolledBack: false,
      message: "already installed",
    };
  }

  // 2. Plan
  printPlan(plan);
  if (opts.dryRun) {
    console.log(color.dim("--dry-run: nothing written."));
    return {
      ok: true,
      plan,
      installs: [],
      filesWritten: 0,
      hooksWired: 0,
      baselineTokens: 0,
      rolledBack: false,
      message: "dry-run",
    };
  }

  // 3. Confirm
  if (!opts.yes && !opts.nonInteractive) {
    const proceed = await confirm("Proceed?");
    if (!proceed) return fail(plan, "Aborted by user.");
  }

  // 4. Back up
  const backedUp = backupExisting(opts.cwd, plan.backupDir);
  if (backedUp.length) console.log(`  ${sym.ok} Backed up existing config → ${rel(plan.backupDir)}`);

  const writer = new SafeWriter(opts.cwd);
  try {
    // 5. Install the active tool stack (detect → install-if-missing → guidance)
    const installs: InstallOutcome[] = [];
    for (const a of plan.adapters) {
      installs.push(ensureAdapter(a, { install: !opts.noInstall, cwd: opts.cwd }));
    }
    const installedNames = installs
      .filter((i) => i.status === "installed" || i.status === "present")
      .map((i) => i.adapter);
    console.log(
      `  ${sym.ok} Tools: ${installs.map((i) => `${i.adapter}(${i.status})`).join(", ")}`,
    );
    // Surface clear, deliberate guidance for anything we couldn't fully auto-install.
    const needsHelp = installs.filter((i) => i.guidance && i.status !== "present" && i.status !== "installed");
    if (needsHelp.length) {
      console.log("");
      console.log(color.bold("  Finish installing (run these yourself):"));
      for (const i of needsHelp) console.log(`    ${sym.warn} ${i.adapter}: ${i.guidance}`);
    }

    // 6. Generate files
    const writeRes = writer.writePlanned(plan.files);
    if (writeRes.failed.length) throw new Error(`write failed: ${writeRes.failed[0]!.path}`);
    console.log(`  ${sym.ok} Generated ${writeRes.written.length} files`);

    // 7. Wire hooks (single write, sole writer)
    const wireRes = wireHooks(opts.cwd, plan.hooks);
    writer.written.push(PATHS.claudeSettings);
    console.log(`  ${sym.ok} Wired ${wireRes.added} hooks into settings.json` + (wireRes.conflicts.length ? ` (${wireRes.conflicts.length} coexist with yours)` : ""));

    // verify writes
    const verify = writer.verify();
    if (!verify.ok) throw new Error(`verify failed: ${verify.missing.join(", ")}`);

    // 8. Activate
    const activation = activate(opts.cwd, {
      adapters: plan.adapters,
      expectedSkills: getProfileSkills(plan),
      expectedHooks: plan.hooks.length,
    });
    if (!activation.ok) {
      const failed = activation.checks.filter((c) => !c.ok).map((c) => `${c.name}: ${c.detail}`);
      throw new Error(`activation failed:\n    ${failed.join("\n    ")}`);
    }
    console.log(`  ${sym.ok} All skills load, all hooks present, CLAUDE.md verified`);

    // 8b. Build the initial code map so it's there on the first session.
    if (plan.profile !== "research") {
      runGraphRefresh(opts.cwd, { quiet: true });
      console.log(`  ${sym.ok} Built code map → .agent-stack/graph.md`);
    }

    // 9. Baseline
    const baseline = captureUsage(opts.cwd, "7d");
    writeBaseline(opts.cwd, baseline);
    const baselineMsg =
      baseline.source === "unavailable"
        ? "baseline pending (install ccusage to capture)"
        : `${baseline.inputTokensPerDay.toLocaleString()} tokens/day (${baseline.source})`;
    console.log(`  ${sym.ok} Baseline: ${baselineMsg}`);

    // manifest for idempotency
    writeManifest(opts.cwd, {
      version: TOOL_VERSION,
      profile: plan.profile,
      targets: plan.targets,
      adapters: installedNames,
      backupDir: plan.backupDir,
    });

    // 10. Summarize
    printSummary(plan, writeRes.written.length, wireRes.added, baselineMsg);

    return {
      ok: true,
      plan,
      installs,
      filesWritten: writeRes.written.length,
      hooksWired: wireRes.added,
      baselineTokens: baseline.inputTokensPerDay,
      rolledBack: false,
      message: "ok",
    };
  } catch (e: any) {
    // Automatic rollback from backup (PRD §12).
    console.error(`  ${sym.err} ${color.red(String(e?.message ?? e))}`);
    if (backedUp.length) {
      restoreBackup(opts.cwd, plan.backupDir);
      console.error(`  ${sym.warn} Rolled back to pre-init state from ${rel(plan.backupDir)}`);
    }
    return {
      ok: false,
      plan,
      installs: [],
      filesWritten: 0,
      hooksWired: 0,
      baselineTokens: 0,
      rolledBack: backedUp.length > 0,
      message: String(e?.message ?? e),
    };
  }
}

function printSummary(plan: Plan, files: number, hooks: number, baseline: string): void {
  console.log("");
  console.log(color.green(color.bold("Done.")));
  console.log("");
  console.log("Next:");
  console.log(`  ${sym.bullet} Restart Claude Code / Cursor to pick up the new config`);
  console.log(`  ${sym.bullet} Run ${color.cyan("npx @drmahdikazempour/agent-stack measure --since 7d")} after a week to see savings`);
  console.log(`  ${sym.bullet} Run ${color.cyan("npx @drmahdikazempour/agent-stack doctor")} anytime to lint`);
}

function getProfileSkills(plan: Plan): string[] {
  // Skills are derivable from the planned skill files.
  return plan.files
    .filter((f) => f.path.startsWith(`${PATHS.claudeSkills}/`) && f.path.endsWith("/SKILL.md"))
    .map((f) => f.path.split("/")[2]!)
    .filter(Boolean);
}

function getProfileRequires(plan: Plan): boolean {
  return plan.profile === "research";
}

function rel(p: string): string {
  return p.split("/").pop() ?? p;
}

function fail(plan: Plan, message: string): InitResult {
  console.error(`${sym.err} ${color.red(message)}`);
  return {
    ok: false,
    plan,
    installs: [],
    filesWritten: 0,
    hooksWired: 0,
    baselineTokens: 0,
    rolledBack: false,
    message,
  };
}
