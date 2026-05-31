import path from "node:path";
import { PATHS } from "../constants.js";
import type { AdapterDescriptor } from "../core/types.js";
import { fileExists, hasBinary, homePath, readJsonSafe, run } from "../core/util.js";

/**
 * Is a tool already available? Detection is integration-aware:
 *  - path:   binary on PATH (the verify args are advisory, not required, to
 *            avoid false negatives when a tool errors outside a project).
 *  - plugin: a Claude Code plugin is installed (`claude plugin list` or the
 *            plugins dir under ~/.claude).
 *  - skill:  a skill dir exists under ~/.claude, or its CLI is on PATH.
 *  - mcp:    its server key is present in the repo's .mcp.json.
 */
export function isToolPresent(adapter: AdapterDescriptor, cwd: string): boolean {
  const d = adapter.detect;
  switch (d.kind) {
    case "path":
      return hasBinary(d.bin);
    case "plugin":
      return pluginInstalled(d.name);
    case "skill":
      return skillInstalled(d.name) || hasBinary(d.name);
    case "mcp":
      return mcpServerPresent(cwd, d.server);
  }
}

function pluginInstalled(name: string): boolean {
  if (hasBinary("claude")) {
    const r = run("claude", ["plugin", "list"], { timeoutMs: 15_000 });
    if (r.ok && new RegExp(`(^|[^\\w-])${escapeRe(name)}([^\\w-]|$)`, "m").test(r.stdout)) return true;
  }
  // Fallback: look for the plugin under the Claude plugins dir.
  return (
    fileExists(homePath(".claude", "plugins", name)) ||
    fileExists(homePath(".claude", "plugins", "marketplaces", name))
  );
}

function skillInstalled(name: string): boolean {
  return fileExists(homePath(".claude", "skills", name)) || fileExists(homePath(".claude", "plugins", name));
}

function mcpServerPresent(cwd: string, server: string): boolean {
  const mcp = readJsonSafe<{ mcpServers?: Record<string, unknown> }>(path.join(cwd, PATHS.mcpConfig));
  return !!mcp?.mcpServers && server in mcp.mcpServers;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
