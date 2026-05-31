# Credits & prior art

agent-stack stands on the shoulders of the Claude Code token-optimization ecosystem. This file is a transparent record of every project agent-stack integrates or was inspired by, how it relates, and under what license.

> **Transparency notes**
> - agent-stack **does not vendor** (copy in) any third-party code. Its built-in code map and output compression are original MIT code in [`src/builtin/`](src/builtin/), and act as the **fallback** when an external tool isn't installed.
> - Every integrated tool below is **permissive** (MIT / Apache-2.0). There is no consent gate and nothing non-permissive is wired in.
> - Tools are **detected first**; a missing one is installed via its own toolchain (cargo / uv / pipx / bun / `claude plugin`). When no toolchain is available, agent-stack prints the tool's own install command as guidance and never silently runs a `curl | sh` one-liner.
> - All commands in [`integrations/tools.json`](integrations/tools.json) were transcribed from each repo's own `INSTALL.md` / `README` / `.mcp.json` — not guessed.

## Integrated stack (the `max` profile / `init --all`)

| Project | License | Integration | How agent-stack uses it |
|---|---|---|---|
| [ryoppippi/ccusage](https://github.com/ryoppippi/ccusage) | MIT | npm binary | Always installed; neutral source of truth for token-usage baselines and `measure` reports. |
| [rtk-ai/rtk](https://github.com/rtk-ai/rtk) | Apache-2.0 | PATH binary | Command proxy — route heavy git/npm/build/test output through it to cut 60-90% of tokens. Composes with the built-in `compress`. Installed via `cargo install --git` (never crates.io `rtk`, a different project). |
| [tirth8205/code-review-graph](https://github.com/tirth8205/code-review-graph) | MIT | MCP server | Primary code map — its MCP server (`uvx code-review-graph serve`) is merged into `.mcp.json`; the SessionStart hook runs `code-review-graph update`. Replaces the built-in regex code map when present. |
| [safishamsi/graphify](https://github.com/safishamsi/graphify) | MIT | CLI / skill | Knowledge graph for whole-repo, multi-file-type questions. PyPI package is `graphifyy`; CLI stays `graphify`. |
| [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman) | MIT | Claude Code plugin | Terse-output mode. Installed via `claude plugin marketplace add` + `claude plugin install`. |
| [willseltzer/claude-handoff](https://github.com/willseltzer/claude-handoff) | MIT | Claude Code plugin | Session continuity (`/handoff:create`, `/handoff:resume`). |
| [garrytan/gbrain](https://github.com/garrytan/gbrain) | MIT | Bun CLI / plugin | Persistent cross-session memory. Requires Bun; an embedding API key enables vector search (keyword search works without). |

**Cursor portability:** only `rtk` and the MCP/CLI graph tools (`code-review-graph`, `graphify`) are referenced in the Cursor mirror. The Claude Code plugins (`caveman`, `claude-handoff`, `gbrain`) are Claude-Code-only and are intentionally not named for Cursor.

## Considered but dropped (no clear license)

These cover functions already provided by permissive members of the stack, so they were dropped rather than wired in:

| Project | License | Why dropped |
|---|---|---|
| [alexgreensh/token-optimizer](https://github.com/alexgreensh/token-optimizer) | NOASSERTION (no clear license) | Token/compaction savings already covered by `rtk` + `caveman` + the built-in `compress`. |
| [orban/intent-layer](https://github.com/orban/intent-layer) | none (no LICENSE file) | Intent-driven "read only what matters" already covered by `code-review-graph` + `graphify`. |

## Prior art & inspiration

Patterns and ideas that shaped agent-stack's design — not integrated.

| Project | License | Influence |
|---|---|---|
| [nadimtuhin/claude-token-optimizer](https://github.com/nadimtuhin/claude-token-optimizer) | MIT | The generated-file taxonomy (`CLAUDE.md`, `COMMON_MISTAKES.md`, `ARCHITECTURE_MAP.md`). |
| [obra/superpowers](https://github.com/obra/superpowers) | MIT | Workflow-kernel and command patterns. |
| [vercel-labs/skills](https://github.com/vercel-labs/skills) | MIT | Cross-agent skill installation model. |
| [garrytan/gstack](https://github.com/garrytan/gstack) | MIT | The reviewer/coordinator skill taxonomy. |

## License compatibility

agent-stack is **MIT** and integrates only MIT / Apache-2.0 tooling — no consent flag, nothing non-permissive. agent-stack never vendors third-party code. The single source of truth for every tool's source, install strategy, integration kind, and license is [`integrations/tools.json`](integrations/tools.json).
