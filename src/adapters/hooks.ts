import { HOOK_SIGNATURE } from "../constants.js";
import type { HookSpec, ProfileConfig } from "../core/types.js";

/**
 * Hooks are derived from the profile and use agent-stack's OWN built-in
 * commands (graph refresh, ccusage logging) rather than fictional third-party
 * binaries. wire-hooks remains the sole writer of settings.json; this module
 * only returns specs. Every command carries the agent-stack signature so the
 * merger can find and dedupe its own entries.
 */

const NPX = "npx -y @drmahdikazempour/agent-stack";

function tag(cmd: string): string {
  return `${cmd} # ${HOOK_SIGNATURE}`;
}

const BUILTIN_GRAPH = new Set(["builtin", ""]);

export function hooksForProfile(profile: ProfileConfig): HookSpec[] {
  const hooks: HookSpec[] = [];

  // Refresh the compact code map at session start (skip for graph: none).
  if (profile.graph && profile.graph !== "none") {
    const cmd = BUILTIN_GRAPH.has(profile.graph)
      ? `${NPX} graph refresh --quiet`
      : `${profile.graph} refresh --quiet`;
    hooks.push({
      event: "SessionStart",
      command: tag(`${cmd} 2>/dev/null || true`),
      reason: "Refresh the code map at session start so the agent greps it instead of reading files",
    });
  }

  // Always log token usage for measurement (neutral ccusage).
  hooks.push({
    event: "Stop",
    command: tag("ccusage --json >> .agent-stack/usage.jsonl 2>/dev/null || true"),
    reason: "Append per-turn token usage for measurement",
  });

  return hooks;
}
