/**
 * Single source of truth for every spec value that an upstream (Anthropic,
 * Agent Skills, Tool Search) might change. Per PRD §12: "All spec values in
 * packages/core/constants.ts."
 */

export const SPEC = {
  /** Agent Skills hard limit on the `description` frontmatter field. */
  SKILL_DESCRIPTION_MAX_CHARS: 1024,
  /** Soft limit we lint a SKILL.md body against. */
  SKILL_BODY_MAX_LINES: 500,
  SKILL_BODY_MAX_TOKENS: 5000,
  /** CLAUDE.md startup-load budget. */
  CLAUDE_MD_MAX_TOKENS: 800,
  /** Combined metadata of all shipped skills must stay under this at startup. */
  SKILL_METADATA_BUDGET_TOKENS: 500,
  /** MCP tool definitions in active context after Tool Search filtering. */
  MCP_ACTIVE_TOOLDEFS_MAX_TOKENS: 10_000,
  /** Heuristic: average characters per token for English + code. */
  CHARS_PER_TOKEN: 4,
} as const;

/** Files agent-stack owns / generates, relative to repo root. */
export const PATHS = {
  claudeDir: ".claude",
  claudeMd: "CLAUDE.md",
  claudeSettings: ".claude/settings.json",
  claudeSkills: ".claude/skills",
  claudeAgents: ".claude/agents",
  claudeCommands: ".claude/commands",
  claudeIgnore: ".claudeignore",
  cursorRules: ".cursor/rules",
  agentsMd: "AGENTS.md",
  mcpConfig: ".mcp.json",
  commonMistakes: "COMMON_MISTAKES.md",
  architectureMap: "ARCHITECTURE_MAP.md",
  stateDir: ".agent-stack",
  installedManifest: ".agent-stack/installed.json",
  baseline: ".agent-stack/baseline.json",
} as const;

export const HOOK_EVENTS = ["PreToolUse", "PostToolUse", "SessionStart", "Stop"] as const;
export type HookEvent = (typeof HOOK_EVENTS)[number];

/** Marker prefix on every hook command agent-stack writes, so we can find & dedupe our own. */
export const HOOK_SIGNATURE = "agent-stack";

export const TOOL_VERSION = "0.3.0";
