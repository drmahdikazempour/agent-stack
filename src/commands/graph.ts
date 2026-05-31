import fs from "node:fs";
import path from "node:path";
import { PATHS } from "../constants.js";
import { buildGraph, renderGraphMarkdown } from "../builtin/graph.js";
import { color, sym, readFileSafe } from "../core/util.js";

const GRAPH_FILE = path.posix.join(PATHS.stateDir, "graph.md");

/** `agent-stack graph refresh` — regenerate the compact code map. */
export function runGraphRefresh(cwd: string, opts: { quiet?: boolean } = {}): { ok: boolean } {
  const result = buildGraph(cwd);
  const md = renderGraphMarkdown(result);
  const full = path.join(cwd, GRAPH_FILE);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, md, "utf8");
  if (!opts.quiet) {
    console.log(`${sym.ok} Code map → ${GRAPH_FILE} (${result.fileCount} files, ${result.symbolCount} symbols)`);
  }
  return { ok: true };
}

/** `agent-stack graph query <term>` — grep the map for a symbol/file. */
export function runGraphQuery(cwd: string, term: string): { ok: boolean } {
  const full = path.join(cwd, GRAPH_FILE);
  let md = readFileSafe(full);
  if (md == null) {
    runGraphRefresh(cwd, { quiet: true });
    md = readFileSafe(full) ?? "";
  }
  if (!term) {
    console.error(`${sym.err} Usage: agent-stack graph query <symbol-or-path>`);
    return { ok: false };
  }
  const needle = term.toLowerCase();
  const hits = md.split("\n").filter((l) => l.startsWith("- ") && l.toLowerCase().includes(needle));
  if (hits.length === 0) {
    console.log(color.dim(`No matches for "${term}".`));
    return { ok: true };
  }
  for (const h of hits.slice(0, 50)) console.log(h);
  if (hits.length > 50) console.log(color.dim(`… and ${hits.length - 50} more`));
  return { ok: true };
}
