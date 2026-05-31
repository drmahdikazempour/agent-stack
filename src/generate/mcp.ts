import path from "node:path";
import { PATHS } from "../constants.js";
import type { McpServerSpec, PlannedFile } from "../core/types.js";
import { estimateTokens } from "../core/token-estimator.js";
import { readJsonSafe } from "../core/util.js";
import type { GenContext } from "./context.js";

interface McpFile {
  $schema?: string;
  mcpServers?: Record<string, { command: string; args?: string[] }>;
  _agentStack?: { note: string };
  [k: string]: unknown;
}

/**
 * Generate `.mcp.json` by MERGING the active stack's MCP servers into whatever
 * the repo already has — we never clobber a user-defined server (same
 * non-destructive discipline as wire-hooks for settings.json). Tools whose
 * integration is "mcp" (e.g. code-review-graph) contribute their server entry;
 * an empty stack still produces a valid, documented scaffold.
 */
export function generateMcp(ctx: GenContext): PlannedFile[] {
  const existing = readJsonSafe<McpFile>(path.join(ctx.cwd, PATHS.mcpConfig)) ?? {};
  const merged: McpFile = structuredClone(existing);
  merged.$schema ??= "https://modelcontextprotocol.io/schema.json";
  merged.mcpServers ??= {};

  for (const server of ctx.mcpServers) {
    // Preserve a user's existing entry for the same key; only add if absent.
    if (!(server.server in merged.mcpServers)) {
      merged.mcpServers[server.server] = { command: server.command, args: server.args };
    }
  }

  merged._agentStack = {
    note: "agent-stack manages the servers it added (e.g. code-review-graph); your own entries are preserved. audit tracks the active tool-def budget (≤10K tokens after Tool Search filtering).",
  };

  const contents = JSON.stringify(merged, null, 2);
  return [
    {
      path: PATHS.mcpConfig,
      contents: contents + "\n",
      tokens: estimateTokens(contents),
      host: "shared",
    },
  ];
}

/** Pull the MCP server specs out of the active adapter set. */
export function mcpServersFrom(adapters: { mcp?: McpServerSpec }[]): McpServerSpec[] {
  return adapters.flatMap((a) => (a.mcp ? [a.mcp] : []));
}
