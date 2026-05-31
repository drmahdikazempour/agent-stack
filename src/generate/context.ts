import type { AdapterDescriptor, AdapterIntegration, Detection, McpServerSpec, ProfileConfig, ProfileName } from "../core/types.js";

/** One active tool, as the coordinator docs present it. */
export interface ActiveTool {
  name: string;
  role: string;
  integration: AdapterIntegration;
  cursor: boolean;
  repo?: string;
}

/** Everything a template needs to render, derived from detection + profile + active stack. */
export interface GenContext {
  cwd: string;
  profileName: ProfileName;
  profile: ProfileConfig;
  language: string;
  framework: string;
  packageManager: string;
  repoName: string;
  graph: string;
  compression: string;
  /** Human-friendly labels for generated docs. */
  graphLabel: string;
  compressionLabel: string;
  /** Terse output mode (caveman) is on. */
  terse: boolean;
  /** Whether Cursor is a target host (gates the .cursor mirror + Cursor wording). */
  targetsCursor: boolean;
  /** Active external tools (excludes measurement-only ccusage from the coordinator list). */
  tools: ActiveTool[];
  /** MCP servers contributed by the active stack, merged into .mcp.json. */
  mcpServers: McpServerSpec[];
  date: string;
}

export function buildContext(
  detection: Detection,
  profileName: ProfileName,
  profile: ProfileConfig,
  adapters: AdapterDescriptor[] = [],
  targets: string[] = [],
): GenContext {
  const tools: ActiveTool[] = adapters
    .filter((a) => a.name !== "ccusage" && a.role)
    .map((a) => ({
      name: a.name,
      role: a.role!,
      integration: a.integration,
      cursor: !!a.cursor,
      repo: a.repo,
    }));
  const mcpServers: McpServerSpec[] = adapters.flatMap((a) => (a.mcp ? [a.mcp] : []));

  return {
    cwd: detection.cwd,
    profileName,
    profile,
    language: detection.language ?? "unknown",
    framework: detection.framework ?? "none detected",
    packageManager: detection.packageManager,
    repoName: detection.cwd.split("/").filter(Boolean).pop() ?? "project",
    graph: profile.graph,
    compression: profile.compression,
    graphLabel:
      profile.graph === "none"
        ? "none"
        : profile.graph === "builtin"
          ? "agent-stack code map (.agent-stack/graph.md)"
          : profile.graph,
    compressionLabel:
      profile.compression === "builtin" ? "agent-stack compress" : profile.compression,
    terse: profile.caveman,
    targetsCursor: targets.includes("cursor"),
    tools,
    mcpServers,
    date: new Date().toISOString().slice(0, 10),
  };
}
