import fs from "node:fs";
import path from "node:path";
import { HOOK_SIGNATURE, PATHS } from "./constants.js";
import type { HookSpec } from "./core/types.js";
import { readJsonSafe } from "./core/util.js";

/**
 * The SOLE writer of `.claude/settings.json` hooks (PRD §6, §12).
 *
 * Claude Code's hook schema:
 *   { "hooks": { "<Event>": [ { "matcher": "Tool", "hooks": [ { "type": "command", "command": "..." } ] } ] } }
 *
 * Merge rules:
 *   - Preserve all non-agent-stack entries untouched.
 *   - Dedupe agent-stack entries by command signature.
 *   - Conflict = same event + same matcher + a *different* agent-stack command
 *     for an already-present non-agent-stack command => reported, not clobbered.
 */

interface CommandHook {
  type: "command";
  command: string;
}
interface MatcherGroup {
  matcher?: string;
  hooks: CommandHook[];
}
interface SettingsFile {
  hooks?: Record<string, MatcherGroup[]>;
  [k: string]: unknown;
}

export interface WireResult {
  added: number;
  skipped: number;
  conflicts: { event: string; matcher: string; command: string }[];
}

function isOurs(cmd: string): boolean {
  return cmd.includes(`# ${HOOK_SIGNATURE}`);
}

export function mergeHooks(existing: SettingsFile, specs: HookSpec[]): { settings: SettingsFile; result: WireResult } {
  const settings: SettingsFile = structuredClone(existing);
  settings.hooks ??= {};
  const result: WireResult = { added: 0, skipped: 0, conflicts: [] };

  for (const spec of specs) {
    const groups = (settings.hooks[spec.event] ??= []);
    const matcher = spec.matcher ?? "";

    // Find the matcher group (matcher may be undefined for SessionStart/Stop).
    let group = groups.find((g) => (g.matcher ?? "") === matcher);
    if (!group) {
      group = matcher ? { matcher, hooks: [] } : { hooks: [] };
      groups.push(group);
    }

    const already = group.hooks.find((h) => h.command === spec.command);
    if (already) {
      result.skipped++;
      continue;
    }

    // Conflict: an identical event+matcher already has a *non-ours* command.
    const foreign = group.hooks.find((h) => !isOurs(h.command));
    if (foreign && matcher) {
      result.conflicts.push({ event: spec.event, matcher, command: spec.command });
      // Still add ours alongside — Claude Code runs all hooks in a group; we
      // don't clobber the user's.
    }

    group.hooks.push({ type: "command", command: spec.command });
    result.added++;
  }

  return { settings, result };
}

/** Read existing settings.json, merge specs, and return the merged object (does not write). */
export function planHooks(cwd: string, specs: HookSpec[]): { settings: SettingsFile; result: WireResult } {
  const existing = readJsonSafe<SettingsFile>(path.join(cwd, PATHS.claudeSettings)) ?? {};
  return mergeHooks(existing, specs);
}

/** Merge and write settings.json. Returns the merge result. */
export function wireHooks(cwd: string, specs: HookSpec[]): WireResult {
  const { settings, result } = planHooks(cwd, specs);
  const full = path.join(cwd, PATHS.claudeSettings);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, JSON.stringify(settings, null, 2) + "\n", "utf8");
  return result;
}

/** Count agent-stack-owned hooks currently in settings.json (doctor uses this). */
export function countOurHooks(cwd: string): number {
  const settings = readJsonSafe<SettingsFile>(path.join(cwd, PATHS.claudeSettings));
  if (!settings?.hooks) return 0;
  let n = 0;
  for (const groups of Object.values(settings.hooks)) {
    for (const g of groups) for (const h of g.hooks ?? []) if (isOurs(h.command)) n++;
  }
  return n;
}
