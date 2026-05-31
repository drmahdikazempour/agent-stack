import { HOOK_SIGNATURE } from "../constants.js";
import type { AdapterDescriptor, HookSpec } from "../core/types.js";

/**
 * Adapters return hook *specs*; they never edit settings.json themselves.
 * wire-hooks is the sole writer (PRD §12). Every command is tagged with the
 * agent-stack signature so the merger can find and dedupe its own entries.
 */

function tag(cmd: string): string {
  return `${cmd} # ${HOOK_SIGNATURE}`;
}

const HOOKS_BY_ADAPTER: Record<string, HookSpec[]> = {
  rtk: [
    {
      event: "PreToolUse",
      matcher: "Bash",
      command: tag("rtk wrap --stdin"),
      reason: "Compress shell output before it enters context",
    },
  ],
  codegraph: [
    {
      event: "SessionStart",
      command: tag("codegraph refresh --quiet"),
      reason: "Refresh the code graph at session start",
    },
  ],
  "code-review-graph": [
    {
      event: "SessionStart",
      command: tag("code-review-graph refresh --quiet"),
      reason: "Refresh the review graph at session start",
    },
  ],
  ccusage: [
    {
      event: "Stop",
      command: tag("ccusage --json >> .agent-stack/usage.jsonl 2>/dev/null || true"),
      reason: "Append per-turn token usage for measurement",
    },
  ],
};

export function hooksForAdapters(adapters: AdapterDescriptor[]): HookSpec[] {
  const out: HookSpec[] = [];
  for (const a of adapters) {
    for (const h of HOOKS_BY_ADAPTER[a.name] ?? []) out.push(h);
  }
  return out;
}
