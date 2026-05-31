import path from "node:path";
import { PATHS, SPEC } from "../constants.js";
import { audit } from "../audit.js";
import { estimateTokens } from "../core/token-estimator.js";
import { color, sym, readFileSafe } from "../core/util.js";
import { confirm } from "../prompt.js";

/**
 * Apply audit fixes with diff approval (PRD §6 optimize). v1 focuses on the
 * one safe, deterministic fix: trimming a CLAUDE.md that overruns the 800-token
 * budget by dropping its lowest-priority trailing sections. Anything riskier is
 * reported, not auto-edited.
 */
export async function runOptimize(cwd: string, opts: { yes: boolean }): Promise<{ ok: boolean }> {
  const report = audit(cwd);
  const overruns = report.items.filter((i) => !i.ok);
  if (overruns.length === 0) {
    console.log(`${sym.ok} Nothing to optimize — all budgets are within limits.`);
    return { ok: true };
  }

  console.log(color.bold("agent-stack optimize"));
  for (const o of overruns) console.log(`  ${sym.warn} ${o.name}: ${o.detail} (limit ${o.limit})`);
  console.log("");

  const claudeOverrun = overruns.find((o) => o.name.startsWith("CLAUDE.md"));
  if (!claudeOverrun) {
    console.log(color.yellow("No auto-fixable items in v1 (only CLAUDE.md trimming is automated). Edit the flagged files manually."));
    return { ok: false };
  }

  const full = path.join(cwd, PATHS.claudeMd);
  const original = readFileSafe(full);
  if (!original) return { ok: false };

  const trimmed = trimToBudget(original, SPEC.CLAUDE_MD_MAX_TOKENS);
  console.log(color.dim(`Would trim CLAUDE.md: ${estimateTokens(original)} → ${estimateTokens(trimmed)} tokens.`));

  if (!opts.yes) {
    const ok = await confirm("Apply this trim?");
    if (!ok) {
      console.log("Skipped.");
      return { ok: false };
    }
  }
  const { writeFileSync } = await import("node:fs");
  writeFileSync(full, trimmed, "utf8");
  console.log(`${sym.ok} Trimmed CLAUDE.md to ${estimateTokens(trimmed)} tokens.`);
  return { ok: true };
}

/** Drop trailing `## ` sections until under budget, keeping the header + first sections. */
function trimToBudget(md: string, maxTokens: number): string {
  const sections = md.split(/(?=^## )/m);
  while (sections.length > 1 && estimateTokens(sections.join("")) > maxTokens) {
    sections.pop();
  }
  let out = sections.join("").trimEnd() + "\n";
  // Hard fallback: truncate by lines if a single huge section still overruns.
  if (estimateTokens(out) > maxTokens) {
    const lines = out.split("\n");
    while (lines.length > 5 && estimateTokens(lines.join("\n")) > maxTokens) lines.pop();
    out = lines.join("\n") + "\n";
  }
  return out;
}
