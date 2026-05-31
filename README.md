# agent-stack

**Skills-first optimization toolkit for Claude Code (+ Cursor).** One command takes any repo from zero to a fully optimized, profile-matched agent setup — detected, installed, generated, wired, **activated, and measured** — in under two minutes.

```bash
cd my-repo
npx agent-stack init
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
5. **Install adapters** — pinned versions from `integrations/versions.json` (`--no-install` for config-only).
6. **Generate** — `CLAUDE.md` (≤800 tokens), 5 skills, subagents, commands, `.claudeignore`, `.cursor/rules/*.mdc`, `AGENTS.md`, MCP scaffold.
7. **Wire hooks** — a single merged write to `.claude/settings.json` (the hook merger is the *sole* writer).
8. **Activate** — verify each skill loads, each hook is present, each binary is callable. Rolls back on failure.
9. **Baseline** — `ccusage` snapshot stored in `.agent-stack/baseline.json`.
10. **Summarize** — files written, adapters, hooks, baseline, next steps.

## Commands

```
# Setup — run once per repo
npx agent-stack init [--yes] [--dry-run] [--targets ...] [--profile ...]
                     [--no-install] [--allow-noncommercial] [--overwrite] [--force]

# Maintenance — post-install, on demand
npx agent-stack audit                  # token counts + budget report
npx agent-stack optimize               # apply audit fixes (with approval)
npx agent-stack doctor                 # lint everything (exit 1 on issues)
npx agent-stack measure [--since 7d]   # ccusage baseline vs current
npx agent-stack profile use <name>     # swap profile; regenerate
npx agent-stack profile show           # show current profile
npx agent-stack graph use <name>       # swap graph backend
npx agent-stack handoff write|resume   # continuity files
npx agent-stack sync                   # regenerate Cursor mirror from CLAUDE.md
npx agent-stack uninstall              # restore backup, remove generated files
```

## Profiles

A profile bundles a graph backend + compression tool + skill set + hook config. `init` picks one automatically; swap later with `profile use`.

| Profile | Graph | Compression | Auto-picked when |
|---|---|---|---|
| `code` (default) | codegraph (MIT) | rtk (Apache-2.0) | normal code repo |
| `review` | code-review-graph (MIT) | rtk | >500 commits **and** CODEOWNERS |
| `multimodal` | graphify (MIT) | rtk | ≥5 PDFs/video/large images |
| `spec` | codegraph | rtk | spec-kit / cc-spex detected |
| `research` | context-mode (ELv2) | — | `--profile research --allow-noncommercial` |

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

**Zero runtime dependencies** — the CLI ships pure Node, so `npx agent-stack init` installs in seconds.

## Licensing

- **Repo:** MIT.
- **Default install:** MIT / Apache-2.0 adapters only.
- **Opt-in (`--allow-noncommercial`):** non-permissive adapters (`context-mode` ELv2, `token-optimizer` PolyForm Noncommercial) are **never vendored** — only shelled out to at runtime. CI fails if any code under `src/` imports them.

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
