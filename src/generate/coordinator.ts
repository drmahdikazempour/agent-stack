import type { ActiveTool, GenContext } from "./context.js";

/**
 * The coordinator section — the heart of the stack. It tells the agent which
 * tool to reach for, for which job, in precise Claude Code terms (skills,
 * plugins, MCP servers, hooks). Built-ins are named as the explicit fallback so
 * the agent stays productive when a tool isn't installed. Rendered into both
 * CLAUDE.md and AGENTS.md from the same active-stack data.
 */
export function coordinatorSection(ctx: GenContext): string {
  if (ctx.tools.length === 0) {
    return `## Context tooling (active)
- **Code map** — \`.agent-stack/graph.md\`: grep it to find where a symbol lives before opening files.
- **Compression** — pipe large command output through \`npx -y @drmahdikazempour/agent-stack compress\`.
- **Measurement** — \`ccusage\` logs token usage per turn to \`.agent-stack/usage.jsonl\`.
`;
  }

  const lines = ctx.tools.map((t) => `- **${t.name}** — ${t.role}`);
  return `## Tool coordinator (route each job to the right tool)

The full stack is active. Reach for the right tool first; the built-ins below are the fallback when a tool isn't installed.

${lines.join("\n")}

### Built-in fallbacks (used only when the matching tool above is absent)
- **Code map** — \`.agent-stack/graph.md\` (grep before reading) backs up code-review-graph / graphify.
- **Compression** — \`npx -y @drmahdikazempour/agent-stack compress\` backs up rtk for piped output.
- **Measurement** — \`ccusage\` logs token usage per turn to \`.agent-stack/usage.jsonl\`.
`;
}

/** Cursor-portable subset only: CLI + MCP tools. Claude-Code-only plugins/skills are excluded. */
export function cursorPortableTools(ctx: GenContext): ActiveTool[] {
  return ctx.tools.filter((t) => t.cursor);
}
