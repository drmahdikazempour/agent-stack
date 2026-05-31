import { HOOK_SIGNATURE } from "../constants.js";
import type { AdapterDescriptor, HookSpec, ProfileConfig } from "../core/types.js";

/**
 * Hooks are derived from the profile + active stack. The SessionStart code-map
 * refresh prefers an external graph backend's own refresh command (e.g.
 * `code-review-graph update`) when that tool is active, and falls back to
 * agent-stack's built-in graph otherwise. wire-hooks remains the sole writer of
 * settings.json; this module only returns specs. Every command carries the
 * agent-stack signature so the merger can find and dedupe its own entries.
 */

const NPX = "npx -y @drmahdikazempour/agent-stack";

function tag(cmd: string): string {
  return `${cmd} # ${HOOK_SIGNATURE}`;
}

const BUILTIN_GRAPH = new Set(["builtin", ""]);

/** First active tool that provides a graph refresh command (external backend). */
function externalGraphRefresh(adapters: AdapterDescriptor[]): string | null {
  const g = adapters.find((a) => a.refresh && a.refresh.length > 0);
  return g ? g.refresh!.join(" ") : null;
}

export function hooksForProfile(profile: ProfileConfig, adapters: AdapterDescriptor[] = []): HookSpec[] {
  const hooks: HookSpec[] = [];

  // Refresh the code map at session start (skip for graph: none).
  if (profile.graph && profile.graph !== "none") {
    const external = externalGraphRefresh(adapters);
    const cmd = external
      ? external
      : BUILTIN_GRAPH.has(profile.graph)
        ? `${NPX} graph refresh --quiet`
        : `${profile.graph} refresh --quiet`;
    hooks.push({
      event: "SessionStart",
      command: tag(`${cmd} 2>/dev/null || true`),
      reason: external
        ? `Refresh ${external.split(" ")[0]} index at session start (external graph backend)`
        : "Refresh the code map at session start so the agent greps it instead of reading files",
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
