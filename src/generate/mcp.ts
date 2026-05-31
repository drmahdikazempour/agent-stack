import { PATHS } from "../constants.js";
import type { PlannedFile } from "../core/types.js";
import { estimateTokens } from "../core/token-estimator.js";
import type { GenContext } from "./context.js";

/**
 * MCP config (`.mcp.json`). v1 ships an empty-but-valid scaffold with a comment
 * pointing at Tool Search — we don't auto-wire third-party MCP servers (that's
 * the user's call), but we leave the file ready and documented so the
 * MCP-tool-def budget (≤10K tokens, PRD §8) is something audit can track.
 */
export function generateMcp(_ctx: GenContext): PlannedFile[] {
  const contents = JSON.stringify(
    {
      $schema: "https://modelcontextprotocol.io/schema.json",
      mcpServers: {},
      _agentStack: {
        note: "Add MCP servers here. agent-stack audit tracks the active tool-def budget (≤10K tokens after Tool Search filtering).",
      },
    },
    null,
    2,
  );
  return [
    {
      path: PATHS.mcpConfig,
      contents: contents + "\n",
      tokens: estimateTokens(contents),
      host: "shared",
    },
  ];
}
