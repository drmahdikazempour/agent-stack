# agent-stack

**Skills-first optimization toolkit for Claude Code (+ Cursor).** One command takes any repo from zero to a fully optimized, profile-matched agent setup — detected, installed, generated, wired, **activated, and measured** — in under two minutes.

```bash
cd my-repo
npx @drmahdikazempour/agent-stack init        # smart defaults
npx @drmahdikazempour/agent-stack init --all  # turn on EVERY feature at once
```

That's the whole install. `init` auto-detects host, repo, and profile; installs the right adapters; generates the full Claude Code surface and the Cursor mirror; merges hooks safely; verifies everything loads; and records a `ccusage` token baseline. It only prompts when the answer is genuinely ambiguous (typically the single `Proceed?` confirm).

---

## Why

The Claude token-optimization ecosystem is fragmented into single-layer point tools — shell-output compressors, context graphs, output styles, measurement, continuity. No tool **composes** them, auto-generates the full agent surface for both hosts, resolves the licensing minefield, merges hooks safely, or gives a neutral before/after.

agent-stack orchestrates the good tools through **pinned, version-locked adapters** and generates everything from **one source of truth, two faces**: an Agent Skills package and an npm CLI. Skills decide *when*; the CLI decides *how*.

## What `init` does (one shot, in order)

1. **Detect** — host(s), repo type, framework, package manager, existing configs, git state.
2. **Plan** — print a one-screen plan (`--dry-run` stops here).
3. **Confirm** — a single `Proceed? [Y/n]` (`--yes` skips it).
4. **Back up** — copy any existing config into `.agent-stack.bak.<ts>/`.
5. **Install** — `ccusage` (the one genuine external, for measurement). Everything else is **built-in** (see below) or used only if you already have the real binary on PATH. `--no-install` skips even ccusage.
6. **Generate** — `CLAUDE.md` (≤800 tokens), 5 skills, subagents, commands, `.claudeignore`, `.cursor/rules/*.mdc`, `AGENTS.md`, MCP scaffold, and the initial code map.
7. **Wire hooks** — a single merged write to `.claude/settings.json` (the hook merger is the *sole* writer).
8. **Activate** — verify each skill loads, each hook is present, each binary is callable. Rolls back on failure.
9. **Baseline** — `ccusage` snapshot stored in `.agent-stack/baseline.json`.
10. **Summarize** — files written, adapters, hooks, baseline, next steps.

## Built-in token cutters

These ship *inside* the package — no external install, nothing fictional. They're what actually reduce tokens:

- **Code map** — `agent-stack graph refresh` writes a compact `.agent-stack/graph.md` (every file → its exported symbols). The agent greps one small file to find where something lives instead of reading whole directories. `graph query <term>` searches it. Refreshed automatically on `SessionStart`.
- **Output compression** — `agent-stack compress` is a stdin→stdout filter that strips ANSI, folds duplicate lines, and head/tail-elides huge output. Pipe noisy commands through it: `npm run build 2>&1 | npx -y @drmahdikazempour/agent-stack compress` (≈60% fewer chars on a 500-line log).
- **`.claudeignore` + ≤800-token CLAUDE.md + summary-only subagents** — structural savings on every turn.
- **Terse mode** (the `max` profile / `--all`) — enforces minimal-word answers.
- **Measurement** — `ccusage` records real usage so savings are measured, never claimed.

## Commands

```
# Setup — run once per repo
npx @drmahdikazempour/agent-stack init [--all] [--yes] [--dry-run] [--targets ...] [--profile ...]
                     [--no-install] [--allow-noncommercial] [--overwrite] [--force]

# Token cutters (standalone / pipes / hooks)
npx @drmahdikazempour/agent-stack compress           # cmd 2>&1 | … compress
npx @drmahdikazempour/agent-stack graph refresh      # rebuild the code map
npx @drmahdikazempour/agent-stack graph query <term> # find a symbol

# Maintenance — post-install, on demand
npx @drmahdikazempour/agent-stack audit                  # token counts + budget report
npx @drmahdikazempour/agent-stack optimize               # apply audit fixes (with approval)
npx @drmahdikazempour/agent-stack doctor                 # lint everything (exit 1 on issues)
npx @drmahdikazempour/agent-stack measure [--since 7d]   # ccusage baseline vs current
npx @drmahdikazempour/agent-stack profile use <name>     # swap profile; regenerate
npx @drmahdikazempour/agent-stack profile show           # show current profile
npx @drmahdikazempour/agent-stack graph use <name>       # swap graph backend
npx @drmahdikazempour/agent-stack handoff write|resume   # continuity files
npx @drmahdikazempour/agent-stack sync                   # regenerate Cursor mirror from CLAUDE.md
npx @drmahdikazempour/agent-stack uninstall              # restore backup, remove generated files
```

## Profiles

A profile bundles a graph backend + compression tool + skill set + hook config. `init` picks one automatically; swap later with `profile use`.

| Profile | Graph | Compression | Auto-picked when |
|---|---|---|---|
| `code` (default) | built-in map | built-in compress | normal code repo |
| `review` | built-in map | built-in | >500 commits **and** CODEOWNERS |
| `multimodal` | built-in map | built-in | ≥5 PDFs/video/large images |
| `spec` | built-in map | built-in | spec-kit / cc-spex detected |
| `research` | none | built-in | `--profile research --allow-noncommercial` |
| `max` | built-in map | built-in + terse | `--all` (everything on at once) |

## Architecture

One repo, two faces, zero duplication:

- **`skills/`** — the Agent Skills package (`stack-bootstrap`, `-doctor`, `-graph-profile`, `-handoff`, `-measure`), installable into Claude Code and Cursor. Only name + ≤1,024-char description loads at startup.
- **`src/`** — the npm CLI: deterministic generation, audits, hook merging, activation. Internal modules mirror the planned package boundaries:
  - `core/` — detect, plan, safe-writer, backup, token estimator, constants.
  - `generate/` — `claude`, `cursor`, `mcp` file builders (typed, dependency-free templates).
  - `adapters/` — thin, version-pinned wrappers (`rtk`, `codegraph`, `ccusage`, …) returning hook *specs*.
  - `wire-hooks.ts` — the **sole** writer of `settings.json` hooks.
  - `activate.ts` — post-write verification chain.
  - `audit.ts` — token-budget linting.
  - `commands/` — `init` + maintenance commands.
- **`integrations/`** — `profiles.json`, `versions.json` (pinned), `licenses.json` (gates `--allow-noncommercial`).

**Zero runtime dependencies** — the CLI ships pure Node, so `npx @drmahdikazempour/agent-stack init` installs in seconds.

## Licensing & what actually installs

- **Repo:** MIT. The graph and compression are **built in** (MIT, in `src/builtin/`).
- **Only auto-installed external:** `ccusage` (MIT) for measurement.
- **Third-party graph/compression tools** (rtk, codegraph, graphify, …) are **detect-only** — used solely if their genuine binary is already on your PATH. agent-stack never installs them by name (those npm names are unrelated packages).
- **Opt-in (`--allow-noncommercial`):** non-permissive tools (`context-mode` ELv2, `token-optimizer` PolyForm Noncommercial) are **never vendored** — only shelled out to at runtime. CI fails if any code under `src/` imports them.

## Development

```bash
npm install
npm run build        # tsup → dist/ (ESM + CJS + d.ts)
npm test             # vitest: unit + golden + e2e init in a tmpdir
npm run typecheck
node bin/agent-stack.js doctor --skills-only   # lint shipped skills
```

Releases are managed with Changesets + GitHub Actions.

## License

MIT — see [LICENSE](LICENSE).
