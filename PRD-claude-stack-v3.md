# PRD: `agent-stack` — Skills-First Optimization Toolkit for Claude Code (+ Cursor)

**Owner:** [you]
**Status:** Draft v3 (supersedes v2)
**Primary target:** Claude Code
**Secondary target:** Cursor (shared skills, generated rules)
**Distribution:** GitHub + npm; one-shot install via `npx agent-stack init`.

---

## 1. Problem

The Claude token-optimization ecosystem is fragmented into single-layer point solutions: `rtk` (shell output), `caveman` (output style), `codegraph`/`code-review-graph`/`graphify` (context graphs), `alexgreensh/token-optimizer` (audit), `nadimtuhin/claude-token-optimizer` (startup-file compression), `claude-handoff` (continuity), `context-mode` (large-output sandbox), `superpowers` (workflow kernel), `ccusage` (measurement).

No tool composes them. None auto-generates the full Claude Code surface (`CLAUDE.md` + `.claude/skills/` + `.claude/agents/` + `.claude/commands/` + `settings.json` hooks + MCP config) plus the Cursor mirror (`.cursor/rules/*.mdc` + `AGENTS.md`). None resolves the licensing minefield (`context-mode` ELv2, `alexgreensh/token-optimizer` PolyForm Noncommercial can't be vendored into a permissive repo). None merges hook installs safely. None gives a measured before/after via a neutral tool like `ccusage`.

A developer adding Claude Code to a project today has to hand-pick 5–10 tools, read each install doc, manually merge hooks, hand-write `CLAUDE.md`, mirror to Cursor, and measure savings themselves.

## 2. Goal

**One command. Everything set up. Activated. Measured.**

`npx agent-stack init` takes any repo from zero to a fully optimized, profile-matched Claude Code + Cursor setup in under 2 minutes — no follow-up slash commands required for the install. Built natively on the open Agent Skills standard so it works on both hosts without duplication.

**Non-goal:** rebuilding what `rtk` / `caveman` / `codegraph` / `ccusage` already do well. We orchestrate them through pinned, version-locked adapters.

## 3. One-Command Setup (the headline UX)

```bash
cd my-repo
npx agent-stack init
```

That's the whole install. The CLI auto-detects host, repo, and profile, installs every adapter, wires every hook, activates every skill, runs a baseline measurement, and exits with a summary. It only prompts when the answer is genuinely ambiguous (typically zero or one prompt on a normal repo).

### Auto-detection logic

| Decision | How `init` decides | Asks user only if |
|---|---|---|
| **Host targets** | Detect `.claude/`, `~/.claude.json`, `.cursor/`, `~/.cursor/`, `claude` / `cursor` on PATH | Both detected *and* user is in a non-TTY (rare) |
| **Profile** | Repo content scan: `*.pdf`/`*.mp4`/`*.png>50` → `multimodal`; `>500 commits` and PR-heavy → offer `review`; default → `code` | Confidence < 70% on profile |
| **Package manager** | `pnpm-lock.yaml` > `yarn.lock` > `bun.lockb` > `package-lock.json` | Never |
| **Existing `CLAUDE.md`** | Read, hash, back up to `.claude.bak.<ts>/`, merge unique sections | Never (always backs up) |
| **Existing hooks in `settings.json`** | Parse, merge new hook specs, dedupe by command signature | Conflict on identical event + different command |
| **Adapter binaries** (rtk, ccusage, codegraph) | Check PATH; install via `vercel-labs/skills` or pinned `npm i -g`/cargo if missing | Never (auto-installs; `--no-install` to skip) |
| **License posture** | Default = MIT/Apache adapters only | User passes `--allow-noncommercial` |

### What `init` actually does (one shot, in order)

1. **Detect** — host(s), repo type, framework, package manager, existing configs, git state.
2. **Plan** — print a one-screen plan: target hosts, chosen profile, adapters to install, files to write, hooks to merge. (`--dry-run` stops here.)
3. **Confirm** — single `Proceed? [Y/n]` prompt. (`--yes` skips it.)
4. **Back up** — copy any existing `.claude/`, `.cursor/`, `AGENTS.md`, `CLAUDE.md` into `.agent-stack.bak.<ts>/`.
5. **Install adapter binaries** — `rtk`, `ccusage`, `codegraph` (or profile-matched graph), `caveman` skill via `vercel-labs/skills`. Pinned versions from `integrations/versions.json`.
6. **Generate files** — `CLAUDE.md` (≤800 tokens), 5 SKILL.md files, subagents, commands, `.claudeignore`, `.cursor/rules/*.mdc`, `AGENTS.md`, MCP config.
7. **Wire hooks** — single write to `.claude/settings.json` merging all adapter hooks (`PreToolUse`, `SessionStart`, `Stop`).
8. **Activate** — verify each skill loads, each hook fires, each binary is callable. Fail loudly if anything is wrong.
9. **Baseline** — run `ccusage` for current-day token usage; store as `.agent-stack/baseline.json`.
10. **Summarize** — print: files written, adapters installed, hooks wired, baseline tokens, next-step suggestions.

### Example terminal session

```
$ npx agent-stack init

agent-stack v0.1.0

Detected:
  Host: Claude Code (~/.claude.json found) + Cursor (.cursor/ found)
  Repo: TypeScript / Next.js / pnpm
  Profile: code (confidence: high)
  Existing: .claude/ (will back up), CLAUDE.md (487 tokens, will merge)

Will install:
  - codegraph    @ 0.8.2  (MIT)     ← code graph
  - rtk          @ 0.38.4 (Apache)  ← shell-output compression
  - ccusage      @ 15.2.1 (MIT)     ← measurement
  - caveman      @ 1.8.2  (MIT)     ← terse output skill (optional, off by default)
  - 5 skills via vercel-labs/skills (stack-bootstrap, -doctor, -graph-profile, -handoff, -measure)

Will write:
  .claude/CLAUDE.md, .claude/skills/*, .claude/agents/*, .claude/commands/*,
  .claude/settings.json (3 hooks merged), .claudeignore,
  .cursor/rules/*.mdc (4 files), AGENTS.md

Proceed? [Y/n] y

  ✓ Backed up existing config → .agent-stack.bak.2026-05-31T14-22/
  ✓ Installed codegraph, rtk, ccusage
  ✓ Installed 5 skills (cross-agent)
  ✓ Generated 14 files
  ✓ Wired 3 hooks into settings.json
  ✓ All skills load, all hooks fire, all binaries callable
  ✓ Baseline: 12,340 tokens/day (ccusage, last 7d avg)

Done in 1m 47s.

Next:
  • Restart Claude Code / Cursor to pick up the new config
  • Run `npx agent-stack measure --since 7d` after a week to see savings
  • Run `npx agent-stack doctor` anytime to lint
```

### Flags for non-default flows

```
--yes                   skip the single confirm prompt
--dry-run               show the plan, write nothing
--targets claude,cursor force target list (skip auto-detect)
--profile <name>        force profile (skip auto-detect)
--no-install            don't install adapter binaries (just configs)
--allow-noncommercial   enable v2 adapters (context-mode, alexgreensh/token-optimizer)
--overwrite             don't merge existing files; replace them (still backs up)
```

## 4. Architecture: Skills-First, Two Faces

The repo has **two faces from one source**:

1. **Agent Skills package** — `SKILL.md` + `scripts/` + `references/` + `assets/`, installable via `npx skills add` into Claude Code and Cursor. Skills use progressive disclosure: only name + ≤1,024-char description loads at startup; body loads on invocation.
2. **npm CLI** (`agent-stack`) — deterministic file generation, audits, codemods, hook merging, linting. **Skills decide *when*; CLI decides *how*.** Skills call the CLI under the hood; users normally call `init` once and never touch the CLI again.

One source of truth, two distribution paths, zero duplication, fully testable (vitest).

## 5. Profiles

A **profile** is a named bundle of: graph backend + compression tool + skill set + hook config. Picked automatically by `init`; switchable later with `profile use`.

| Profile | Graph | Compression | Auto-picked when |
|---|---|---|---|
| `code` (default) | `codegraph` (MIT) | `rtk` (Apache-2.0) | Normal code repo, no large media |
| `review` | `code-review-graph` (MIT) | `rtk` | PR/review-heavy repo (many PRs, CODEOWNERS) |
| `multimodal` | `graphify` (MIT) | `rtk` | Repo contains PDFs, video, many large images |
| `research` | none | `context-mode` (ELv2, opt-in) | `--profile research` + `--allow-noncommercial` |
| `spec` | `codegraph` | `rtk` | `spec-kit` / `cc-spex` detected, or explicit flag |

## 6. Commands

```
# THE PRIMARY COMMAND — used once per repo
npx agent-stack init [--yes] [--dry-run] [--targets ...] [--profile ...]

# Maintenance commands (used later, on demand)
npx agent-stack audit                       # token counts + report
npx agent-stack optimize                    # apply audit fixes with diff approval
npx agent-stack profile use <name>          # swap profile; regen affected files
npx agent-stack graph use <name>            # swap graph backend
npx agent-stack handoff write|resume        # continuity files
npx agent-stack doctor                      # lint everything
npx agent-stack measure [--since 7d]        # ccusage report
npx agent-stack sync                        # regen Cursor mirror from CLAUDE.md
npx agent-stack uninstall                   # restore backup, remove adapters
```

`init` is the one command users run to set up. Everything else is post-install maintenance.

## 7. Users & Use Cases

- **New project / first-time setup:** `npx agent-stack init` — done.
- **Existing project with custom configs:** `npx agent-stack init` — auto-backs up, merges, done.
- **Switching focus later:** `npx agent-stack profile use review` — swaps codegraph → code-review-graph; regenerates.
- **Multi-IDE team:** `init` covers both; later edits to `CLAUDE.md` propagate via `sync`.
- **Resume work in a session:** `/stack-handoff` skill (post-install).
- **Check savings:** `npx agent-stack measure --since 7d`.

## 8. Success Metrics

| Metric | Target | How measured |
|---|---|---|
| Time from `npx agent-stack init` → fully active config | < 2 min | wall clock |
| Prompts shown on a typical repo (default flow) | ≤ 1 (the confirm) | telemetry-free; observed in fixtures |
| Median input-token reduction (post-`init`, 7 days later) | ≥ 40% | ccusage baseline vs day-7 |
| Hook conflicts after `init` | 0 | `doctor` exit code |
| `CLAUDE.md` startup load after `init` | ≤ 800 tokens | gpt-tokenizer estimate |
| Each shipped `SKILL.md` description | ≤ 1,024 chars (Agent Skills hard limit) | lint in CI |
| Each shipped `SKILL.md` body | ≤ 500 lines / ~5,000 tokens | lint in CI |
| MCP tool defs in active context (post-Tool-Search) | ≤ 10K tokens | `audit` report |
| Skill discovery overhead (all 5 skills metadata) | ≤ 500 tokens | `audit` report |
| `init` idempotency: running twice changes nothing | 100% | integration test |

## 9. Scope

### In scope — v1 (lean MIT core)

1. **One-shot `init`** as specified in §3.
2. **Auto-detect**: host targets, profile, package manager, existing files, hook conflicts.
3. **Auto-install adapter binaries** via `vercel-labs/skills` and pinned package managers; verify each is callable.
4. **Generate** (modeled on `nadimtuhin/claude-token-optimizer` taxonomy):
   - `CLAUDE.md` (≤800 tokens, factual root only)
   - `COMMON_MISTAKES.md`, `ARCHITECTURE_MAP.md`
   - `.claude/skills/{bootstrap,doctor,graph-profile,handoff,measure}/SKILL.md`
   - `.claude/agents/*.md` (1–3 subagents per profile)
   - `.claude/commands/*.md`
   - `.claude/settings.json` (with merged hooks)
   - `.claudeignore`
   - `.cursor/rules/*.mdc` (mirrored, glob-scoped)
   - `AGENTS.md` (shared convention)
5. **Profiles**: `code` and `review` as built-ins.
6. **Wire (default core, MIT/Apache only)**: `codegraph`, `caveman` (opt-in within profile), `rtk`, `superpowers`-inspired commands (trimmed), built-in handoff template, `ccusage` for measurement.
7. **Hook merger** as sole writer of `.claude/settings.json` hooks.
8. **Audit, optimize, doctor, measure, handoff, sync, uninstall** maintenance commands.
9. **Activation verification**: after writing, `init` confirms each skill loads, each hook fires, each binary is callable. Fail loudly if not.
10. **Baseline + post-measurement** via `ccusage`.

### In scope — v2 (opt-in adapters, runtime shell-outs only)

- `mksglu/context-mode` (ELv2; `--profile research`)
- `alexgreensh/token-optimizer` (PolyForm Noncommercial; `audit --deep`)
- `tirth8205/code-review-graph` (MIT but heavier than codegraph) — auto-picked for `review` profile in v2
- `safishamsi/graphify` (MIT) for `multimodal`
- `rhuss/cc-spex` (Apache-2.0) for `spec`
- `garrytan/gbrain` as long-term memory tier
- Offline LLMLingua / DSPy compression pass

### Out of scope (any version)

- Hosted service / telemetry server
- Running LangGraph/DSPy at runtime
- Cursor as primary target (mirror only)
- Vendoring non-permissive code into the repo

## 10. Repository Layout

Follows Agent Skills standard for the skills face; conventional monorepo for the CLI face. Single repo, single `package.json`.

```
agent-stack/
├── package.json
├── bin/
│   └── agent-stack.js              # npx entrypoint
├── skills/                         # Agent Skills face (installable via vercel-labs/skills)
│   ├── stack-bootstrap/
│   │   ├── SKILL.md                # ≤1,024-char description
│   │   ├── scripts/{init,audit,optimize,profile}.ts
│   │   ├── references/{profiles,compatibility}.md
│   │   └── assets/templates/{claude,cursor,shared}/
│   ├── stack-doctor/
│   ├── stack-graph-profile/
│   ├── stack-handoff/
│   └── stack-measure/
├── packages/                       # CLI face (internal, called by skills)
│   ├── core/                       # detect, plan, token estimator, safe writer, backup
│   ├── generate-claude/
│   ├── generate-cursor/
│   ├── generate-mcp/
│   ├── audit/
│   ├── wire-hooks/                 # SOLE owner of settings.json hooks
│   ├── activate/                   # post-write verification (skills load, hooks fire)
│   └── adapters/                   # thin, version-pinned wrappers
│       ├── codegraph/
│       ├── code-review-graph/
│       ├── graphify/
│       ├── rtk/
│       ├── caveman/
│       ├── ccusage/
│       ├── superpowers/
│       └── context-mode/           # v2, ELv2 adapter (runtime shell-out only)
├── integrations/
│   ├── profiles.json               # profile → tool set mapping
│   ├── versions.json               # pinned versions of every adapter
│   └── licenses.json               # gates --allow-noncommercial
├── templates/                      # Handlebars templates
├── .changeset/
├── .github/workflows/              # build/lint/test + Changesets publish
├── turbo.json
├── pnpm-workspace.yaml
└── README.md
```

## 11. Tech Stack

- **Language:** TypeScript (CLI + skill scripts).
- **Bundler:** tsup (ESM + CJS).
- **Monorepo:** pnpm workspaces + Turborepo.
- **Versioning/publish:** Changesets + GitHub Action.
- **Prompt UI:** `@clack/prompts` — used only for the single confirm and rare ambiguity prompts.
- **Templating:** Handlebars (deterministic, easy to lint).
- **Diffing:** `diff` + chalk-rendered patches.
- **Token estimator:** `gpt-tokenizer` for internal budgeting; **`ccusage` for authoritative user-facing measurement**.
- **Tests:** vitest; fixture repos under `__fixtures__/`; golden-file snapshots; an end-to-end `init` test that runs in a clean tmpdir and asserts the full chain (detect → install → write → wire → activate → measure).
- **CI:** lint SKILL.md sizes, description length, hook merge correctness, frontmatter validity; assert idempotency.

## 12. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| `init` fails mid-flow and leaves repo in broken state | Every write goes through `safe-writer` (backup → write → verify); failures trigger automatic rollback from `.agent-stack.bak.<ts>/` |
| Adapter binary install fails (no network, no Rust toolchain for rtk) | Plan stage detects missing toolchains; falls back to config-only mode; tells user exactly what to install |
| Auto-detected profile is wrong | Plan stage shows it; `--profile` overrides; `profile use <name>` later |
| Skill description bloat poisons startup budget | CI lints ≤1,024 chars; total skill metadata budget ≤500 tokens |
| Vendor self-reported reductions don't hold for the user | `measure` shells out to ccusage for neutral before/after |
| Two tools fight over `settings.json` hooks | `wire-hooks` is sole writer; adapters return hook *specs*, never edits |
| ELv2 / PolyForm code accidentally vendored | `integrations/licenses.json` gates inclusion; CI fails on non-permissive imports under `packages/` |
| Community skill vulnerability rate (~26% per recent survey) | Curated allowlist; pin every adapter version; `--allow-unverified` opt-in |
| Caveman terseness adds input cost on light workflows | Off by default in `code` profile; opt-in flag |
| Upstream tools change install commands | Adapters are thin shells; pinned versions; integration test per adapter |
| Anthropic changes SKILL.md spec or Tool Search thresholds | All spec values in `packages/core/constants.ts` |
| User has existing `CLAUDE.md` they don't want clobbered | Default = merge with backup; `--overwrite` explicit |
| Running `init` twice does the wrong thing | Idempotent by design; second run detects existing setup and exits with "nothing to do" unless `--force` |

## 13. License Strategy

- **Repo license:** MIT.
- **v1 default install:** MIT/Apache-2.0 only — `nadimtuhin/claude-token-optimizer` patterns (MIT), `codegraph` (MIT), `caveman` (MIT), `rtk` (Apache-2.0), `superpowers` patterns (MIT), `ccusage` (MIT), `vercel-labs/skills` (MIT), `cc-spex` (Apache-2.0).
- **v2 opt-in adapters (non-vendored, runtime shell-outs only):** `context-mode` (ELv2), `alexgreensh/token-optimizer` (PolyForm Noncommercial). Gated by `--allow-noncommercial`.
- **CI rule:** fails if any package under `packages/` imports from a non-permissive adapter.

## 14. Roadmap

| Week | Deliverable |
|---|---|
| 1–2 | `packages/core` (detect, plan, safe-writer, backup) + `generate-claude` + a *minimal* `init` that writes files and exits. |
| 3 | Adapter framework + `rtk` + `codegraph` adapters; install + verify. |
| 4 | `wire-hooks` (sole settings.json writer) + `activate` (post-write verification chain). |
| 5 | `generate-cursor` + `sync`; full `init` produces both hosts. |
| 6 | `ccusage` adapter + baseline/measure; profile system (`code`, `review`). |
| 7 | `audit` + `optimize` + `doctor` maintenance commands. |
| 8 | 5 skills (`stack-bootstrap`, `-doctor`, `-graph-profile`, `-handoff`, `-measure`); end-to-end test in tmpdir. |
| 9 | Changesets + GH Action; publish **v0.1.0** to npm. |
| 10–12 | v2 adapters: `code-review-graph`, `graphify`, `cc-spex`, `context-mode`, `alexgreensh/token-optimizer`. Publish **v0.2.0**. |

## 15. Open Questions

1. Should `init` auto-restart Claude Code / Cursor at the end? → No (too invasive). Print a "restart to activate" line at the end.
2. What happens if the user runs `init` in a repo with another team member's setup? → Detect via `.agent-stack/installed.json`; offer to migrate or skip.
3. Telemetry? → No. Local-only. `measure` reads ccusage's local JSONL.
4. Bin name on npm: `agent-stack` or `claude-stack`? → `agent-stack` — accurate to cross-agent reality.
5. Should we ship a Claude plugin wrapper around the same repo? → Defer to v0.3.

## 16. What's Different from v2

- **One-command setup is now the headline contract.** Section 3 ("One-Command Setup") is the new spine of the PRD. Everything else either supports it or is explicitly post-install maintenance.
- **Auto-detection table** (host, profile, package manager, existing files, hooks, adapters, license posture) — every decision has a default and a rule for when to ask.
- **Plan → Confirm → Execute flow** with `--dry-run` showing the plan and `--yes` skipping the single confirm.
- **Activation verification** is now a first-class step inside `init` (new `packages/activate`): after writing, the CLI confirms each skill loads, each hook fires, each binary is callable, or it rolls back.
- **Baseline measurement** runs at the end of `init` so the user has a number to compare against later.
- **`uninstall`** added (restores backup, removes adapters) — counterpart to one-shot install.
- **Idempotency** is now a tracked success metric and CI assertion.
- Maintenance commands (`audit`, `optimize`, `profile use`, `handoff`, `measure`, `doctor`, `sync`) reframed as **post-install operations** — explicitly *not* required to finish setup.
