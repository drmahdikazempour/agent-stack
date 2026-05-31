import fs from "node:fs";
import path from "node:path";
import { PATHS } from "../constants.js";
import { hasBinary, run, readJsonSafe } from "../core/util.js";

export interface UsageSnapshot {
  /** Average input tokens/day over the window. */
  inputTokensPerDay: number;
  /** Raw total tokens in the window, if available. */
  totalTokens: number;
  source: "ccusage" | "local-jsonl" | "unavailable";
  capturedAt: string;
}

/**
 * ccusage adapter — the authoritative, neutral measurement tool (PRD §11).
 * Falls back to the local usage.jsonl our Stop hook appends when the binary
 * isn't installed, and to "unavailable" if neither exists.
 */
export function captureUsage(cwd: string, since?: string): UsageSnapshot {
  const capturedAt = new Date().toISOString();

  if (hasBinary("ccusage")) {
    const args = ["--json"];
    if (since) args.push("--since", since);
    const r = run("ccusage", args, { cwd, timeoutMs: 30_000 });
    if (r.ok) {
      const parsed = safeParse(r.stdout);
      if (parsed) {
        return {
          inputTokensPerDay: parsed.inputPerDay,
          totalTokens: parsed.total,
          source: "ccusage",
          capturedAt,
        };
      }
    }
  }

  // Fallback: our own appended JSONL.
  const jsonl = path.join(cwd, PATHS.stateDir, "usage.jsonl");
  if (fs.existsSync(jsonl)) {
    const lines = fs.readFileSync(jsonl, "utf8").trim().split("\n").filter(Boolean);
    let total = 0;
    let days = new Set<string>();
    for (const line of lines) {
      try {
        const o = JSON.parse(line);
        const tok = Number(o.inputTokens ?? o.input_tokens ?? o.tokens ?? 0);
        total += tok;
        if (o.date) days.add(String(o.date).slice(0, 10));
      } catch {
        /* ignore */
      }
    }
    const dayCount = Math.max(1, days.size);
    return {
      inputTokensPerDay: Math.round(total / dayCount),
      totalTokens: total,
      source: "local-jsonl",
      capturedAt,
    };
  }

  return { inputTokensPerDay: 0, totalTokens: 0, source: "unavailable", capturedAt };
}

function safeParse(stdout: string): { inputPerDay: number; total: number } | null {
  try {
    const o = JSON.parse(stdout);
    // ccusage shapes vary; probe common fields defensively.
    const total = Number(o.totalTokens ?? o.total?.tokens ?? o.totals?.totalTokens ?? 0);
    const days = Array.isArray(o.daily) ? o.daily.length : Array.isArray(o.days) ? o.days.length : 7;
    const input = Number(o.inputTokens ?? o.total?.inputTokens ?? o.totals?.inputTokens ?? total);
    return { inputPerDay: Math.round(input / Math.max(1, days)), total };
  } catch {
    return null;
  }
}

export function readBaseline(cwd: string): UsageSnapshot | null {
  return readJsonSafe<UsageSnapshot>(path.join(cwd, PATHS.baseline));
}

export function writeBaseline(cwd: string, snap: UsageSnapshot): void {
  const full = path.join(cwd, PATHS.baseline);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, JSON.stringify(snap, null, 2) + "\n", "utf8");
}
