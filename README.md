<div align="center">

# 🧰 agent-stack

### One command. Everything set up. Activated. Measured.

**A skills-first optimization toolkit for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (+ [Cursor](https://cursor.com)) that takes any repo from zero to a fully optimized, token-efficient agent setup — in under two minutes.**

[![npm version](https://img.shields.io/npm/v/@drmahdikazempour/agent-stack?color=cb3837&logo=npm)](https://www.npmjs.com/package/@drmahdikazempour/agent-stack)
[![CI](https://github.com/drmahdikazempour/agent-stack/actions/workflows/ci.yml/badge.svg)](https://github.com/drmahdikazempour/agent-stack/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A518-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![zero deps](https://img.shields.io/badge/runtime%20deps-0-success)](#-architecture)

```bash
npx @drmahdikazempour/agent-stack init --all
```

</div>

---

## 📖 Table of contents

- [Why agent-stack](#-why-agent-stack)
- [Quick start](#-quick-start)
- [How `init` works](#-how-init-works)
- [Built-in token cutters](#-built-in-token-cutters)
- [Profiles](#-profiles)
- [Command reference](#-command-reference)
- [Architecture](#-architecture)
- [How it cuts tokens](#-how-it-cuts-tokens)
- [Measuring savings](#-measuring-savings)
- [Development](#-development)
- [Roadmap](#-roadmap)
- [FAQ](#-faq)
- [References](#-references)

---

## 💡 Why agent-stack

The Claude token-optimization ecosystem is **fragmented into single-layer point tools** — shell-output compressors, context graphs, output styles, measurement, continuity. None of them _compose_. Setting up a repo today means hand-picking 5–10 tools, reading each install doc, hand-merging hooks, hand-writing `CLAUDE.md`, mirroring to Cursor, and measuring savings yourself.

> [!NOTE]
> **agent-stack does it in one command** — and ships the token-cutting machinery _built in_, so there's nothing fictional to install and nothing to wire by hand.

| Without agent-stack | With agent-stack |
| --- | --- |
| Hand-pick & install 5–10 tools | `npx … init --all` |
| Hand-write `CLAUDE.md` | Generated, ≤ 800 tokens, verified |
| Manually merge `settings.json` hooks | Single safe merge, sole writer |
| Mirror everything to Cursor by hand | Auto-mirrored, kept in sync |
| Guess at savings | Measured with `ccusage` |

---

## 🚀 Quick start

```bash
cd your-repo

# Smart defaults (auto-detects host, profile, package manager):
npx @drmahdikazempour/agent-stack init

# …or turn on EVERYTHING at once (max profile):
npx @drmahdikazempour/agent-stack init --all
```

<details>
<summary><b>What you'll see</b> (click to expand)</summary>

```text
agent-stack v0.2.0

Detected:
  Host: Claude Code + Cursor
  Repo: TypeScript / Next.js / pnpm
  Profile: max (confidence: high)

Will write:
  20 files → claude, cursor
  .claude/settings.json (2 hooks merged)

Proceed? [Y/n] y

  ✓ Adapters: ccusage(installed)
  ✓ Generated 20 files
  ✓ Wired 2 hooks into settings.json
  ✓ All skills load, all hooks present, CLAUDE.md verified
  ✓ Built code map → .agent-stack/graph.md
  ✓ Baseline: 12,340 tokens/day (ccusage, last 7d avg)

Done.
```

</details>

> [!TIP]
> Install it once globally to get the short `agent-stack` command everywhere:
> ```bash
> npm i -g @drmahdikazempour/agent-stack
> agent-stack init --all
> ```

---

## ⚙️ How `init` works

One shot, ten steps, fully reversible. `--dry-run` stops after the plan; `--yes` skips the single confirm.

```text
  detect ─▶ plan ─▶ confirm ─▶ back up ─▶ install ─▶ generate ─▶ wire hooks
                      │                                                │
            --dry-run ┘ (stop)                                         ▼
                                                                   activate
   summarize ◀── baseline ◀── code map ◀───────────────────────────┘  │
                                                          fails ──▶ roll back
```

| # | Step | What happens |
|---|------|--------------|
| 1 | **Detect** | Host(s), repo type, framework, package manager, existing configs, git state |
| 2 | **Plan** | Prints a one-screen plan (`--dry-run` stops here) |
| 3 | **Confirm** | A single `Proceed? [Y/n]` (`--yes` skips) |
| 4 | **Back up** | Copies any existing config into `.agent-stack.bak.<ts>/` |
| 5 | **Install** | `ccusage` only — everything else is built in |
| 6 | **Generate** | `CLAUDE.md`, skills, subagents, commands, `.claudeignore`, Cursor mirror, MCP scaffold |
| 7 | **Wire hooks** | One merged write to `.claude/settings.json` (sole writer, dedupes, never clobbers yours) |
| 8 | **Activate** | Verifies each skill loads, each hook is present, `CLAUDE.md` exists — **rolls back on failure** |
| 9 | **Code map** | Builds the initial `.agent-stack/graph.md` |
| 10 | **Baseline** | Records a `ccusage` token snapshot for later comparison |

---

## 🔧 Built-in token cutters

These ship **inside the package** — no external install, nothing fictional. They are what actually reduce tokens:

### 🗺️ Code map

```bash
agent-stack graph refresh        # rebuild .agent-stack/graph.md
agent-stack graph query <symbol> # find where it's defined
```

A compact index mapping every source file → its exported symbols. The agent **greps one small file** to find where something lives instead of reading whole directories. Refreshed automatically on `SessionStart`. Supports TypeScript/JavaScript, Python, Go, and Rust.

```text
# Code map
_142 files, 906 top-level symbols. Grep this to find a symbol before opening source._

- `src/core/detect.ts`: detect
- `src/wire-hooks.ts`: mergeHooks, wireHooks, planHooks, countOurHooks
- …
```

### 🗜️ Output compression

```bash
npm run build 2>&1 | npx @drmahdikazempour/agent-stack compress
```

A `stdin → stdout` filter that strips ANSI codes, folds duplicate lines (`line  (×42)`), and head/tail-elides huge output — **≈ 60 % fewer characters on a 500-line log**, so noisy commands cost a fraction of the context.

### 🪶 Structural savings (always on)

- **`.claudeignore`** keeps `node_modules`, build output, media, and lockfiles out of context.
- **`CLAUDE.md`** is generated factual-and-tight — **≤ 800 tokens** at startup, verified by `doctor`.
- **Subagents** (`stack-explorer`, `stack-reviewer`) return _conclusions, not file dumps_.
- **Terse mode** (the `max` profile) enforces minimal-word answers.

---

## 🎚️ Profiles

A **profile** bundles a graph backend + compression + skill set + hook config. `init` auto-picks one; swap later with `profile use`.

| Profile | Graph | Compression | Auto-picked when |
|---------|-------|-------------|------------------|
| 🟢 `code` _(default)_ | built-in map | built-in | normal code repo |
| 🔵 `review` | built-in map | built-in | > 500 commits **and** CODEOWNERS |
| 🟣 `multimodal` | built-in map | built-in | ≥ 5 PDFs / video / large images |
| 🟡 `spec` | built-in map | built-in | spec-kit / cc-spex detected |
| ⚪ `research` | none | built-in | `--profile research --allow-noncommercial` |
| 🔴 `max` | external graph + built-in fallback | built-in **+ terse + rtk** | `--all` — full external stack on at once |

```bash
agent-stack profile use review   # swap & regenerate
agent-stack profile show         # current profile
```

---

## 📟 Command reference

<div align="center">

**Setup — run once per repo**

</div>

```bash
agent-stack init [--all] [--yes] [--dry-run] [--targets claude,cursor]
                 [--profile <name>] [--no-install] [--allow-noncommercial]
                 [--overwrite] [--force]
```

<div align="center">

**Token cutters — standalone, in pipes, or via hooks**

</div>

```bash
agent-stack compress                 # cmd 2>&1 | agent-stack compress
agent-stack graph refresh            # rebuild the code map
agent-stack graph query <term>       # find a symbol / file
```

<div align="center">

**Maintenance — post-install, on demand**

</div>

```bash
agent-stack audit                    # token counts + budget report
agent-stack optimize                 # apply audit fixes (with approval)
agent-stack doctor                   # lint everything (exit 1 on issues)
agent-stack measure [--since 7d]     # ccusage baseline vs current
agent-stack profile use <name>       # swap profile; regenerate
agent-stack graph use <name>         # swap to an external graph (if installed)
agent-stack handoff write|resume     # continuity across sessions
agent-stack sync                     # regenerate Cursor mirror from CLAUDE.md
agent-stack uninstall                # restore backup, remove generated files
```

<details>
<summary><b>init flags in detail</b></summary>

| Flag | Effect |
|------|--------|
| `--all` | Full external stack at once (the `max` profile): rtk + code-review-graph + graphify + caveman + claude-handoff + gbrain |
| `--yes` | Skip the single confirm prompt |
| `--dry-run` | Print the plan, write nothing |
| `--targets claude,cursor` | Force the host list (Cursor gets the portable subset: rtk + MCP graph tools) |
| `--profile <name>` | Force a profile (`code` `review` `multimodal` `spec` `research` `max`) |
| `--no-install` | Write configs only; print install guidance instead of installing |
| `--overwrite` | Replace existing files instead of merging (still backs up) |
| `--force` | Re-run even if already installed |

</details>

---

## 🏗️ Architecture

**One source of truth, two faces, zero runtime dependencies.**

```text
                  @drmahdikazempour/agent-stack
   ┌──────────────────────────────────────────────────────┐
   │  CLI  (src/)                                           │
   │    builtin/    graph (code map) · compress             │
   │    generate/   claude · cursor · mcp                   │
   │    wire-hooks  ← sole writer of settings.json          │
   │    activate    ← verify, or roll back on failure       │
   │  skills/       5 Agent Skills                          │
   └───────────────┬──────────────────────┬────────────────┘
            writes  │               mirrors │
                    ▼                       ▼
         🟠 Claude Code              🔵 Cursor
         CLAUDE.md                   .cursor/rules/*.mdc
         .claude/skills · agents     AGENTS.md
         commands · settings.json
         .claudeignore · graph.md
```

> **Skills decide _when_; the CLI decides _how_.** Skills call the CLI under the hood; you normally run `init` once and never touch the CLI again.

<details>
<summary><b>Repository layout</b></summary>

```text
agent-stack/
├── bin/agent-stack.js          # npx entrypoint
├── src/
│   ├── cli.ts                  # arg parsing + command dispatch
│   ├── constants.ts            # all spec values (token budgets, limits)
│   ├── core/                   # detect · plan · safe-writer · backup · token estimator
│   ├── builtin/                # graph (code map) · compress (output compression)
│   ├── generate/               # claude · cursor · mcp · coordinator file builders
│   ├── adapters/               # registry · detect-tools · install · hooks
│   ├── wire-hooks.ts           # SOLE writer of settings.json hooks
│   ├── activate.ts             # post-write verification chain
│   ├── audit.ts                # token-budget linting
│   └── commands/               # init + maintenance commands
├── skills/                     # 5 Agent Skills (stack-bootstrap, -doctor, …)
├── integrations/               # profiles.json · tools.json
├── templates/                  # generation notes
└── test/                       # vitest: unit · golden · e2e init in a tmpdir
```

</details>

---

## 📉 How it cuts tokens

The savings come from changing **what enters the context window**, not from a black box:

```text
   ❌ Before                          ✅ After (agent-stack)
   ─────────────────────────         ─────────────────────────────────
   read 12 files to find       ──▶   grep graph.md → open 1 file
   one function
   paste a 500-line log        ──▶   pipe through compress → ~60% smaller
   verbose CLAUDE.md +         ──▶   ≤800-token CLAUDE.md + .claudeignore
   node_modules noise
```

| Lever | Mechanism | Typical effect |
|-------|-----------|----------------|
| Code map | grep `graph.md` instead of reading files | fewer, smaller file reads |
| Compression | fold/elide large command output | ≈ 60 % fewer chars on big logs |
| `.claudeignore` | exclude junk from context | no `node_modules`/build noise |
| Tight `CLAUDE.md` | factual root ≤ 800 tokens | lower fixed startup cost |
| Subagents | return summaries, not dumps | bounded sub-task context |

---

## 📊 Measuring savings

Savings are **measured, never claimed** — via the neutral [`ccusage`](https://github.com/ryoppippi/ccusage) tool.

```bash
# init already stored a baseline. After ~a week of work:
agent-stack measure --since 7d
```

```text
agent-stack measure (since 7d)

  Current:  7,180 input tokens/day  (ccusage)
  Baseline: 12,340 input tokens/day (captured 2026-05-24)

  −41.8% input-token reduction vs baseline (target ≥ 40%)
```

---

## 🛠️ Development

```bash
git clone https://github.com/drmahdikazempour/agent-stack
cd agent-stack
npm install

npm run build        # tsup → dist/ (ESM + CJS + d.ts)
npm test             # vitest: unit + golden + e2e init in a tmpdir
npm run typecheck
node bin/agent-stack.js doctor --skills-only   # lint shipped skills
```

> [!IMPORTANT]
> **CI** runs typecheck → build → skill lint → tests → a license guard (fails if `src/` imports a non-permissive adapter). **Publishing** is tag-triggered and idempotent (skips if the version is already on npm). Releases use [Changesets](https://github.com/changesets/changesets).

---

## 🗺️ Roadmap

- [x] **v0.1** — one-shot `init`, profiles, hook merger, generators, 5 skills, maintenance commands, tests, CI
- [x] **v0.2** — built-in code map + output compression, `max` profile / `--all`, honest install model, robust publish CI
- [ ] **v0.3** — Claude plugin wrapper, real third-party graph adapters auto-detected, deeper `optimize` codemods
- [ ] **future** — offline LLMLingua/DSPy compression pass, long-term memory tier

---

## ❓ FAQ

<details>
<summary><b>Does it install a bunch of random binaries?</b></summary>

No. Only `ccusage` (the genuine Claude Code usage tool) is auto-installed. Graph and compression are **built in**. Third-party tools are used **only if their real binary is already on your PATH** — never installed by name.
</details>

<details>
<summary><b>Will it clobber my existing CLAUDE.md / settings.json?</b></summary>

No. Everything is backed up to `.agent-stack.bak.<ts>/` first, `CLAUDE.md` is merged, and the hook merger **only adds** its own entries (tagged + deduped) — your hooks are preserved.
</details>

<details>
<summary><b>Is it safe to run twice?</b></summary>

Yes — `init` is idempotent. A matching prior install is a no-op unless you pass `--force`.
</details>

<details>
<summary><b>How do I undo it?</b></summary>

`agent-stack uninstall` restores the pre-init backup and removes the generated files.
</details>

---

## 🙏 Credits & prior art

agent-stack composes a permissive, real tool stack. It **vendors none** of it — its built-in code map and compression are original MIT code that act as the **fallback** when a tool isn't installed. Every integrated tool is MIT or Apache-2.0; nothing non-permissive is wired in. Tools are detected first, then installed via their own toolchains (cargo / uv / pipx / bun / `claude plugin`), with guidance when a toolchain is missing. Full, transparent attribution with licenses and exact install commands lives in **[CREDITS.md](CREDITS.md)** and **[integrations/tools.json](integrations/tools.json)**.

The `max` profile (`init --all`) activates, all at once:

| Tool | License | Integration | Job |
|---|---|---|---|
| [ccusage](https://github.com/ryoppippi/ccusage) | MIT | npm binary | Token-usage measurement (always on) |
| [rtk](https://github.com/rtk-ai/rtk) | Apache-2.0 | PATH binary | Command proxy — cut heavy command output 60-90% |
| [code-review-graph](https://github.com/tirth8205/code-review-graph) | MIT | MCP server | Primary code map (graph with edges + impact radius) |
| [graphify](https://github.com/safishamsi/graphify) | MIT | CLI / skill | Knowledge graph for whole-repo, multi-file-type questions |
| [caveman](https://github.com/JuliusBrussee/caveman) | MIT | Claude Code plugin | Terse-output mode |
| [claude-handoff](https://github.com/willseltzer/claude-handoff) | MIT | Claude Code plugin | Session continuity (`/handoff:*`) |
| [gbrain](https://github.com/garrytan/gbrain) | MIT | Bun CLI / plugin | Persistent cross-session memory |

The generated `CLAUDE.md` and `AGENTS.md` carry a **tool coordinator** that routes each job to the right tool, with the built-ins named as the explicit fallback. Cursor gets only the portable subset (`rtk` + the MCP/CLI graph tools). **Inspiration** (not integrated): [claude-token-optimizer](https://github.com/nadimtuhin/claude-token-optimizer), [superpowers](https://github.com/obra/superpowers), [vercel-labs/skills](https://github.com/vercel-labs/skills), [gstack](https://github.com/garrytan/gstack).

## 🔗 References

- 📦 **npm** — [@drmahdikazempour/agent-stack](https://www.npmjs.com/package/@drmahdikazempour/agent-stack)
- 🐙 **GitHub** — [drmahdikazempour/agent-stack](https://github.com/drmahdikazempour/agent-stack)
- 🙏 **Credits** — [CREDITS.md](CREDITS.md)
- 📚 **Claude Code docs** — [docs.anthropic.com/claude-code](https://docs.anthropic.com/en/docs/claude-code)
- 🤖 **Agent Skills** — [Claude Agent Skills](https://docs.anthropic.com/en/docs/claude-code/skills)
- 📐 **Cursor rules** — [docs.cursor.com](https://docs.cursor.com/context/rules)
- 📊 **ccusage** — [github.com/ryoppippi/ccusage](https://github.com/ryoppippi/ccusage)

---

<div align="center">

**MIT licensed** · Built for people who'd rather ship than wire configs.

_Made with [Claude Code](https://claude.com/claude-code)._

</div>
