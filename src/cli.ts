import process from "node:process";
import { TOOL_VERSION } from "./constants.js";
import type { Host, InitOptions, ProfileName } from "./core/types.js";
import { color } from "./core/util.js";
import { runInit } from "./commands/init.js";
import { runDoctor } from "./commands/doctor.js";
import { runAudit } from "./commands/audit.js";
import { runMeasure } from "./commands/measure.js";
import { runHandoff } from "./commands/handoff.js";
import { runProfileUse, runGraphUse, showProfile } from "./commands/profile.js";
import { runSync } from "./commands/sync.js";
import { runUninstall } from "./commands/uninstall.js";
import { runOptimize } from "./commands/optimize.js";
import { runCompress } from "./commands/compress.js";
import { runGraphRefresh, runGraphQuery } from "./commands/graph.js";

interface Parsed {
  command: string;
  positionals: string[];
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): Parsed {
  const [command = "help", ...rest] = argv;
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]!;
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = rest[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positionals.push(arg);
    }
  }
  return { command, positionals, flags };
}

function asList(v: string | boolean | undefined): string[] | undefined {
  if (typeof v !== "string") return undefined;
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

const HELP = `${color.bold(`agent-stack v${TOOL_VERSION}`)} — skills-first optimization toolkit for Claude Code (+ Cursor)

${color.bold("Setup (run once per repo):")}
  agent-stack init [flags]            detect, install, generate, wire, activate, baseline

${color.bold("Token-cutting built-ins (work standalone, in pipes, or via hooks):")}
  agent-stack compress                compress piped output  (cmd 2>&1 | agent-stack compress)
  agent-stack graph refresh           rebuild the compact code map (.agent-stack/graph.md)
  agent-stack graph query <term>      find where a symbol/file lives in the map

${color.bold("Maintenance:")}
  agent-stack audit                   token counts + budget report
  agent-stack optimize                apply audit fixes (with approval)
  agent-stack doctor                  lint everything (exit 1 on failures)
  agent-stack measure [--since 7d]    ccusage report (baseline vs current)
  agent-stack profile use <name>      swap profile; regenerate
  agent-stack profile show            show current profile
  agent-stack graph use <name>        swap to an external graph backend (if installed)
  agent-stack handoff write|resume    continuity files
  agent-stack sync                    regenerate Cursor mirror from CLAUDE.md
  agent-stack uninstall               restore backup, remove generated files

${color.bold("init flags:")}
  --all                  turn on EVERY feature at once (the 'max' profile)
  --yes                  skip the confirm prompt
  --dry-run              show the plan, write nothing
  --targets claude,cursor force target list
  --profile <name>       force profile (code|review|multimodal|spec|research|max)
  --no-install           don't install ccusage (configs only)
  --allow-noncommercial  enable opt-in adapters (context-mode, token-optimizer)
  --overwrite            replace existing files instead of merging (still backs up)
  --force                re-run even if already installed
`;

export async function main(argv = process.argv.slice(2)): Promise<number> {
  const { command, positionals, flags } = parseArgs(argv);
  const cwd = process.cwd();

  switch (command) {
    case "init": {
      // --all turns on everything at once (the `max` profile).
      const profileFlag = flags.all ? "max" : ((flags.profile as ProfileName | undefined) || undefined);
      const opts: InitOptions = {
        cwd,
        yes: !!flags.yes,
        dryRun: !!flags["dry-run"],
        targets: asList(flags.targets) as Host[] | undefined,
        profile: profileFlag,
        noInstall: !!flags["no-install"],
        allowNoncommercial: !!flags["allow-noncommercial"],
        overwrite: !!flags.overwrite,
        force: !!flags.force,
        nonInteractive: !!flags.yes && !process.stdin.isTTY,
      };
      const res = await runInit(opts);
      return res.ok ? 0 : 1;
    }
    case "audit":
      return runAudit(cwd).ok ? 0 : 1;
    case "optimize":
      return (await runOptimize(cwd, { yes: !!flags.yes })).ok ? 0 : 1;
    case "doctor":
      return runDoctor(cwd, { skillsOnly: !!flags["skills-only"] }).ok ? 0 : 1;
    case "measure":
      return runMeasure(cwd, (flags.since as string) || "7d").ok ? 0 : 1;
    case "profile": {
      const sub = positionals[0];
      if (sub === "use") return (await runProfileUse(cwd, positionals[1] ?? "", { allowNoncommercial: !!flags["allow-noncommercial"], noInstall: !!flags["no-install"] })).ok ? 0 : 1;
      showProfile(cwd);
      return 0;
    }
    case "graph": {
      const sub = positionals[0];
      if (sub === "use") return (await runGraphUse(cwd, positionals[1] ?? "")).ok ? 0 : 1;
      if (sub === "query") return runGraphQuery(cwd, positionals[1] ?? "").ok ? 0 : 1;
      // "refresh" (default): rebuild the built-in code map.
      return runGraphRefresh(cwd, { quiet: !!flags.quiet }).ok ? 0 : 1;
    }
    case "handoff": {
      const mode = positionals[0] === "resume" ? "resume" : "write";
      return runHandoff(cwd, mode).ok ? 0 : 1;
    }
    case "compress": {
      const maxLines = flags["max-lines"] ? parseInt(flags["max-lines"] as string, 10) : undefined;
      return runCompress({ maxLines, stats: !!flags.stats, file: flags.file as string | undefined });
    }
    case "sync":
      return runSync(cwd).ok ? 0 : 1;
    case "uninstall":
      return (await runUninstall(cwd, { yes: !!flags.yes })).ok ? 0 : 1;
    case "version":
    case "--version":
    case "-v":
      console.log(TOOL_VERSION);
      return 0;
    case "help":
    case "--help":
    case "-h":
      console.log(HELP);
      return 0;
    default:
      console.error(`Unknown command: ${command}\n`);
      console.log(HELP);
      return 1;
  }
}
