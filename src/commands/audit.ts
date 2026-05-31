import { audit } from "../audit.js";
import { color, sym } from "../core/util.js";

/** Print the token-budget audit report (PRD §6 audit). */
export function runAudit(cwd: string): { ok: boolean } {
  const report = audit(cwd);
  console.log(color.bold("agent-stack audit"));
  console.log("");
  for (const item of report.items) {
    console.log(
      `  ${item.ok ? sym.ok : sym.err} ${item.name.padEnd(34)} ${color.dim(`${item.detail} (limit ${item.limit})`)}`,
    );
  }
  console.log("");
  console.log(report.ok ? color.green("Within all budgets.") : color.yellow("Some budgets exceeded — run `agent-stack optimize`."));
  return { ok: report.ok };
}
