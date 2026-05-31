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
}

export interface AdapterInstallSpec {
  /**
   * "npm" auto-installs from the real registry. "preinstalled" means agent-stack
   * never installs it (the npm name is unrelated/squatted) — it is only used if
   * the genuine binary is already on PATH. "cargo"/"skill" are legacy install
   * kinds kept for completeness.
   */
  kind: "npm" | "cargo" | "skill" | "preinstalled";
  package: string;
  bin?: string;
}

export interface AdapterDescriptor {
  name: string;
  version: string;
  install: AdapterInstallSpec;
  fallback?: AdapterInstallSpec;
  spdx: string;
  permissive: boolean;
  requires?: string;
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
