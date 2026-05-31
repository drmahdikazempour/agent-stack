import fs from "node:fs";
import path from "node:path";
import { PATHS } from "../constants.js";
import { estimateTokens } from "./token-estimator.js";
import type { Detection, Host, PackageManager, ProfileName } from "./types.js";
import {
  fileExists,
  hasBinary,
  homePath,
  readFileSafe,
  readJsonSafe,
  run,
  walkCount,
} from "./util.js";

function detectHosts(cwd: string): { hosts: Host[]; evidence: Record<Host, string[]> } {
  const evidence: Record<Host, string[]> = { claude: [], cursor: [] };

  if (fileExists(path.join(cwd, ".claude"))) evidence.claude.push(".claude/");
  if (fileExists(homePath(".claude.json"))) evidence.claude.push("~/.claude.json");
  if (fileExists(homePath(".claude"))) evidence.claude.push("~/.claude/");
  if (hasBinary("claude")) evidence.claude.push("claude on PATH");

  if (fileExists(path.join(cwd, ".cursor"))) evidence.cursor.push(".cursor/");
  if (fileExists(homePath(".cursor"))) evidence.cursor.push("~/.cursor/");
  if (hasBinary("cursor")) evidence.cursor.push("cursor on PATH");

  const hosts: Host[] = [];
  if (evidence.claude.length) hosts.push("claude");
  if (evidence.cursor.length) hosts.push("cursor");
  // Claude Code is the primary target: if nothing is detected, default to it.
  if (hosts.length === 0) {
    hosts.push("claude");
    evidence.claude.push("default (primary target)");
  }
  return { hosts, evidence };
}

function detectPackageManager(cwd: string): PackageManager {
  if (fileExists(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (fileExists(path.join(cwd, "yarn.lock"))) return "yarn";
  if (fileExists(path.join(cwd, "bun.lockb"))) return "bun";
  return "npm";
}

function detectFramework(cwd: string): { framework: string | null; language: string | null } {
  const pkg = readJsonSafe<{ dependencies?: Record<string, string>; devDependencies?: Record<string, string> }>(
    path.join(cwd, "package.json"),
  );
  let language: string | null = null;
  let framework: string | null = null;
  if (pkg) {
    language = fileExists(path.join(cwd, "tsconfig.json")) ? "TypeScript" : "JavaScript";
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps.next) framework = "Next.js";
    else if (deps.react) framework = "React";
    else if (deps.vue) framework = "Vue";
    else if (deps["@nestjs/core"]) framework = "NestJS";
    else if (deps.express || deps.fastify) framework = "Node/server";
  } else if (fileExists(path.join(cwd, "pyproject.toml")) || fileExists(path.join(cwd, "requirements.txt"))) {
    language = "Python";
  } else if (fileExists(path.join(cwd, "Cargo.toml"))) {
    language = "Rust";
  } else if (fileExists(path.join(cwd, "go.mod"))) {
    language = "Go";
  }
  return { framework, language };
}

function gitInfo(cwd: string): { isGitRepo: boolean; commitCount: number } {
  const inside = run("git", ["rev-parse", "--is-inside-work-tree"], { cwd });
  if (!inside.ok || inside.stdout.trim() !== "true") return { isGitRepo: false, commitCount: 0 };
  const count = run("git", ["rev-list", "--count", "HEAD"], { cwd });
  return { isGitRepo: true, commitCount: count.ok ? parseInt(count.stdout.trim(), 10) || 0 : 0 };
}

function hasCodeowners(cwd: string): boolean {
  return (
    fileExists(path.join(cwd, "CODEOWNERS")) ||
    fileExists(path.join(cwd, ".github", "CODEOWNERS")) ||
    fileExists(path.join(cwd, "docs", "CODEOWNERS"))
  );
}

function hasSpecKit(cwd: string): boolean {
  return (
    fileExists(path.join(cwd, ".spec-kit")) ||
    fileExists(path.join(cwd, "spec-kit.config.json")) ||
    fileExists(path.join(cwd, ".cc-spex"))
  );
}

const MEDIA_RE = /\.(pdf|mp4|mov|avi|mkv|webm)$/i;
const IMAGE_RE = /\.(png|jpe?g|gif|webp|tiff?)$/i;
const LARGE_IMAGE_BYTES = 200 * 1024;

function countLargeMedia(cwd: string): number {
  return walkCount(cwd, (file, size) => {
    if (MEDIA_RE.test(file)) return true;
    if (IMAGE_RE.test(file) && size > LARGE_IMAGE_BYTES) return true;
    return false;
  });
}

/**
 * Choose a profile and a confidence. The PRD says: media → multimodal;
 * >500 commits + PR-heavy → offer review; spec-kit → spec; else code.
 */
function chooseProfile(d: {
  largeMediaCount: number;
  commitCount: number;
  hasCodeowners: boolean;
  hasSpecKit: boolean;
}): { profile: ProfileName; confidence: number } {
  if (d.hasSpecKit) return { profile: "spec", confidence: 0.9 };
  if (d.largeMediaCount >= 5) return { profile: "multimodal", confidence: 0.85 };
  if (d.commitCount > 500 && d.hasCodeowners) return { profile: "review", confidence: 0.6 };
  return { profile: "code", confidence: 0.9 };
}

function detectExisting(cwd: string): Detection["existing"] {
  const claudeMdPath = [path.join(cwd, PATHS.claudeMd), path.join(cwd, PATHS.claudeDir, "CLAUDE.md")].find(
    fileExists,
  );
  const claudeMd =
    claudeMdPath != null
      ? { path: claudeMdPath, tokens: estimateTokens(readFileSafe(claudeMdPath) ?? "") }
      : null;

  const settings = readJsonSafe<{ hooks?: Record<string, unknown> }>(path.join(cwd, PATHS.claudeSettings));
  const settingsHooks = !!settings?.hooks && Object.keys(settings.hooks).length > 0;

  const manifest = readJsonSafe<{ version: string; profile: string }>(path.join(cwd, PATHS.installedManifest));

  return {
    claudeMd,
    claudeDir: fileExists(path.join(cwd, PATHS.claudeDir)),
    cursorDir: fileExists(path.join(cwd, ".cursor")),
    agentsMd: fileExists(path.join(cwd, PATHS.agentsMd)),
    settingsHooks,
    priorInstall: manifest ? { version: manifest.version, profile: manifest.profile } : null,
  };
}

export function detect(cwd: string): Detection {
  const { hosts, evidence } = detectHosts(cwd);
  const { isGitRepo, commitCount } = gitInfo(cwd);
  const codeowners = hasCodeowners(cwd);
  const specKit = hasSpecKit(cwd);
  const largeMediaCount = fs.existsSync(cwd) ? countLargeMedia(cwd) : 0;
  const { framework, language } = detectFramework(cwd);
  const { profile, confidence } = chooseProfile({
    largeMediaCount,
    commitCount,
    hasCodeowners: codeowners,
    hasSpecKit: specKit,
  });

  return {
    cwd,
    hosts,
    hostEvidence: evidence,
    isGitRepo,
    commitCount,
    hasCodeowners: codeowners,
    packageManager: detectPackageManager(cwd),
    framework,
    language,
    largeMediaCount,
    hasSpecKit: specKit,
    profile,
    profileConfidence: confidence,
    existing: detectExisting(cwd),
  };
}
