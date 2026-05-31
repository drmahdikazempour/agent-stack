import { PATHS } from "../constants.js";
import type { PlannedFile } from "../core/types.js";
import { estimateTokens } from "../core/token-estimator.js";
import type { GenContext } from "./context.js";
import { cursorPortableTools } from "./coordinator.js";

function pf(path: string, contents: string): PlannedFile {
  return { path, contents, tokens: estimateTokens(contents), host: "cursor" };
}

/**
 * Cursor mirror: `.cursor/rules/*.mdc` (glob-scoped). AGENTS.md is generated
 * once by the Claude surface (shared coordinator), not here. Only the
 * Cursor-portable tools (CLI + MCP — rtk, code-review-graph, graphify) are
 * referenced; Claude-Code-only plugins/skills (caveman, claude-handoff, gbrain)
 * are intentionally NOT named for Cursor.
 */
function mdc(description: string, globs: string, body: string): string {
  return `---\ndescription: ${description}\nglobs: ${globs}\nalwaysApply: false\n---\n\n${body}\n`;
}

export function generateCursor(ctx: GenContext): PlannedFile[] {
  const files: PlannedFile[] = [];
  const portable = cursorPortableTools(ctx);
  const toolLines = portable.length
    ? portable.map((t) => `- **${t.name}** — ${t.role}`).join("\n") + "\n"
    : "";

  files.push(
    pf(
      `${PATHS.cursorRules}/agent-stack-core.mdc`,
      mdc(
        "agent-stack core conventions for this repo",
        "**/*",
        `# ${ctx.repoName} — core conventions\n\n- Profile: \`${ctx.profileName}\`. Code map: \`.agent-stack/graph.md\`. Compression: \`${ctx.compressionLabel}\`.\n${toolLines}- Find code via the code map / graph and do targeted reads instead of loading whole directories.\n- Compress large command output before letting it into context.\n- Keep responses terse to minimize token cost.\n- See \`AGENTS.md\` for the full convention shared with Claude Code.`,
      ),
    ),
  );

  files.push(
    pf(
      `${PATHS.cursorRules}/agent-stack-${ctx.language.toLowerCase().replace(/[^a-z]/g, "") || "code"}.mdc`,
      mdc(
        `${ctx.language} conventions`,
        ctx.language === "TypeScript" ? "**/*.{ts,tsx}" : "**/*",
        `# ${ctx.language} rules\n\n- Framework: ${ctx.framework}.\n- Match existing style; do not reformat unrelated code.\n- Run the project's own test/lint before claiming done.`,
      ),
    ),
  );

  files.push(
    pf(
      `${PATHS.cursorRules}/agent-stack-architecture.mdc`,
      mdc("Architecture map reference", "**/*", `# Architecture\n\nSee \`ARCHITECTURE_MAP.md\` for structure and \`COMMON_MISTAKES.md\` for known traps.`),
    ),
  );

  files.push(
    pf(
      `${PATHS.cursorRules}/agent-stack-measure.mdc`,
      mdc("How savings are measured", "**/*", `# Measurement\n\nToken usage is tracked via \`ccusage\`. Run \`npx @drmahdikazempour/agent-stack measure --since 7d\` to see savings.`),
    ),
  );

  return files;
}
