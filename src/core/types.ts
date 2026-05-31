export type Host = "claude" | "cursor";

export type ProfileName = "code" | "review" | "multimodal" | "research" | "spec" | "max";

export type PackageManager = "pnpm" | "yarn" | "bun" | "npm";

export interface Detection {
  cwd: string;
  hosts: Host[];
  hostEvidence: Record<Host, string[]>;
  isGitRepo: boolean;
  commitCount: number;
  hasCodeowners: boolean;
  packageManager: PackageManager;
  framework: string | null;
  language: string | null;
  /** Heuristic media counts driving the multimodal profile. */
  largeMediaCount: number;
  hasSpecKit: boolean;
  /** Profile the detector recommends, with a confidence 0..1. */
  profile: ProfileName;
  profileConfidence: number;
  existing: {
    claudeMd: { path: string; tokens: number } | null;
    claudeDir: boolean;
    cursorDir: boolean;
    agentsMd: boolean;
    settingsHooks: boolean;
    /** A prior agent-stack install was detected. */
    priorInstall: { version: string; profile: string } | null;
  };
}

export interface ProfileConfig {
  description: string;
  graph: string;
  compression: string;
  caveman: boolean;
  skills: string[];
  agents: string[];
  requires: string[];
  /** External tools this profile activates (keys into integrations/tools.json). */
  tools?: string[];
}

/** How a tool plugs into the host. Drives MCP wiring and coordinator docs. */
export type AdapterIntegration = "path" | "mcp" | "plugin" | "skill";

/**
 * One ordered install attempt. `needs` is the toolchain binary that must be on
 * PATH for this strategy to run (cargo/uv/pipx/pip/bun/claude/npm). `run` is the
 * primary argv; `then` is an optional second argv (e.g. `claude plugin install`
 * after `claude plugin marketplace add`). The installer tries strategies in
 * order and stops at the first whose toolchain is present.
 */
export interface InstallStrategy {
  needs: string;
  run: string[];
  then?: string[];
}

/** An MCP server entry written (merged) into `.mcp.json`. */
export interface McpServerSpec {
  server: string;
  command: string;
  args: string[];
}

/** How to tell whether a tool is already available. */
export type DetectSpec =
  | { kind: "path"; bin: string; verify?: string[] }
  | { kind: "plugin"; name: string }
  | { kind: "skill"; name: string }
  | { kind: "mcp"; server: string };

export interface AdapterDescriptor {
  name: string;
  /** Pinned version, when meaningful (ccusage). Omitted for git/HEAD installs. */
  version?: string;
  /** Source repo (owner/name), for guidance + credits. */
  repo?: string;
  integration: AdapterIntegration;
  detect: DetectSpec;
  install: InstallStrategy[];
  /** MCP server entry to merge into .mcp.json (integration "mcp"). */
  mcp?: McpServerSpec;
  /** Command to refresh this tool's index at SessionStart (external graph backends). */
  refresh?: string[];
  /** One-line coordinator instruction telling the agent when to reach for this tool. */
  role?: string;
  /** Portable to Cursor (CLI or MCP). Claude-Code-only plugins/skills are false. */
  cursor?: boolean;
  /** Shown when auto-install can't finish (missing toolchain / manual step). */
  guidance: string;
  spdx: string;
  permissive: boolean;
}

/** A hook spec returned by an adapter. wire-hooks is the SOLE writer of settings.json. */
export interface HookSpec {
  event: import("../constants.js").HookEvent;
  /** Tool matcher (PreToolUse/PostToolUse). Omit for SessionStart/Stop. */
  matcher?: string;
  command: string;
  /** Human description for the plan output. */
  reason: string;
}

export interface PlannedFile {
  /** Path relative to repo root. */
  path: string;
  contents: string;
  /** Estimated token count for budgeting / plan display. */
  tokens: number;
  host: Host | "shared";
}

export interface Plan {
  detection: Detection;
  targets: Host[];
  profile: ProfileName;
  adapters: AdapterDescriptor[];
  files: PlannedFile[];
  hooks: HookSpec[];
  backupDir: string;
  /** Whether a prior install means this run is a no-op. */
  alreadyInstalled: boolean;
}

export interface InitOptions {
  cwd: string;
  yes: boolean;
  dryRun: boolean;
  targets?: Host[];
  profile?: ProfileName;
  noInstall: boolean;
  allowNoncommercial: boolean;
  overwrite: boolean;
  force: boolean;
  /** Suppress interactive prompts (used by tests / CI). */
  nonInteractive: boolean;
}
