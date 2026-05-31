import fs from "node:fs";
import path from "node:path";
import { PATHS, SPEC } from "./constants.js";
import { estimateTokens } from "./core/token-estimator.js";
import { parseFrontmatter } from "./generate/frontmatter.js";
import { fileExists, readFileSafe, readJsonSafe } from "./core/util.js";

export interface AuditItem {
  name: string;
  ok: boolean;
  value: number | string;
  limit: number | string;
  detail: string;
}

export interface AuditReport {
  items: AuditItem[];
  ok: boolean;
}

function lineCount(s: string): number {
  return s.split("\n").length;
}

/** Audit token budgets and Agent Skills limits (PRD §8 success metrics). */
export function audit(cwd: string): AuditReport {
  const items: AuditItem[] = [];

  // CLAUDE.md ≤ 800 tokens.
  const claudeMd = readFileSafe(path.join(cwd, PATHS.claudeMd));
  if (claudeMd != null) {
    const t = estimateTokens(claudeMd);
    items.push({
      name: "CLAUDE.md startup load",
      ok: t <= SPEC.CLAUDE_MD_MAX_TOKENS,
      value: t,
      limit: SPEC.CLAUDE_MD_MAX_TOKENS,
      detail: `${t} tokens (est.)`,
    });
  }

  // Each SKILL.md: description ≤ 1024 chars, body ≤ 500 lines; total metadata budget.
  const skillsDir = path.join(cwd, PATHS.claudeSkills);
  let metadataTokens = 0;
  if (fileExists(skillsDir)) {
    for (const ent of fs.readdirSync(skillsDir, { withFileTypes: true })) {
      if (!ent.isDirectory()) continue;
      const p = path.join(skillsDir, ent.name, "SKILL.md");
      const raw = readFileSafe(p);
      if (!raw) continue;
      const { data, body } = parseFrontmatter(raw);
      const desc = data.description ?? "";
      metadataTokens += estimateTokens(`${data.name ?? ""} ${desc}`);
      items.push({
        name: `skill:${ent.name} description`,
        ok: desc.length <= SPEC.SKILL_DESCRIPTION_MAX_CHARS,
        value: desc.length,
        limit: SPEC.SKILL_DESCRIPTION_MAX_CHARS,
        detail: `${desc.length} chars`,
      });
      const lines = lineCount(body);
      items.push({
        name: `skill:${ent.name} body`,
        ok: lines <= SPEC.SKILL_BODY_MAX_LINES,
        value: lines,
        limit: SPEC.SKILL_BODY_MAX_LINES,
        detail: `${lines} lines`,
      });
    }
    items.push({
      name: "skill metadata budget",
      ok: metadataTokens <= SPEC.SKILL_METADATA_BUDGET_TOKENS,
      value: metadataTokens,
      limit: SPEC.SKILL_METADATA_BUDGET_TOKENS,
      detail: `${metadataTokens} tokens across all skills`,
    });
  }

  // MCP tool-def budget (best-effort: count declared servers' tool defs unknown,
  // so we report the config size as a proxy and flag if a server is configured).
  const mcp = readJsonSafe<{ mcpServers?: Record<string, unknown> }>(path.join(cwd, PATHS.mcpConfig));
  if (mcp) {
    const serverCount = Object.keys(mcp.mcpServers ?? {}).length;
    items.push({
      name: "MCP servers configured",
      ok: true,
      value: serverCount,
      limit: "—",
      detail:
        serverCount === 0
          ? "none (no tool-def cost)"
          : `${serverCount} server(s); ensure active tool defs ≤ ${SPEC.MCP_ACTIVE_TOOLDEFS_MAX_TOKENS} tokens after Tool Search`,
    });
  }

  return { items, ok: items.every((i) => i.ok) };
}
