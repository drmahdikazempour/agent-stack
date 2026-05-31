import type { Detection, ProfileConfig, ProfileName } from "../core/types.js";

/** Everything a template needs to render, derived from detection + profile. */
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
  date: string;
}

export function buildContext(
  detection: Detection,
  profileName: ProfileName,
  profile: ProfileConfig,
): GenContext {
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
    date: new Date().toISOString().slice(0, 10),
  };
}
