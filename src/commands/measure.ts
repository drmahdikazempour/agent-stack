import { captureUsage, readBaseline } from "../adapters/ccusage.js";
import { color, sym } from "../core/util.js";

/** ccusage-backed measurement: baseline vs recent, with % input-token reduction. */
export function runMeasure(cwd: string, since = "7d"): { ok: boolean; reductionPct: number | null } {
  console.log(color.bold(`agent-stack measure (since ${since})`));
  console.log("");

  const baseline = readBaseline(cwd);
  const current = captureUsage(cwd, since);

  if (current.source === "unavailable") {
    console.log(`  ${sym.warn} No usage data yet. Install ccusage (\`npm i -g ccusage\`) and work a few sessions.`);
    return { ok: false, reductionPct: null };
  }

  console.log(`  Current:  ${current.inputTokensPerDay.toLocaleString()} input tokens/day  (${current.source})`);

  if (!baseline || baseline.source === "unavailable" || baseline.inputTokensPerDay === 0) {
    console.log(`  ${sym.warn} No baseline to compare against. (init stores one in .agent-stack/baseline.json)`);
    return { ok: true, reductionPct: null };
  }

  console.log(`  Baseline: ${baseline.inputTokensPerDay.toLocaleString()} input tokens/day  (captured ${baseline.capturedAt.slice(0, 10)})`);

  const reduction = ((baseline.inputTokensPerDay - current.inputTokensPerDay) / baseline.inputTokensPerDay) * 100;
  const pct = Math.round(reduction * 10) / 10;
  const sign = pct >= 0 ? "−" : "+";
  const label = pct >= 40 ? color.green : pct >= 0 ? color.yellow : color.red;
  console.log("");
  console.log(`  ${label(`${sign}${Math.abs(pct)}%`)} input-token reduction vs baseline (target ≥ 40%)`);
  return { ok: true, reductionPct: pct };
}
