# Credits & prior art

agent-stack stands on the shoulders of the Claude/agent token-optimization ecosystem. This file is a transparent record of every project that inspired or is integrated by agent-stack, how it relates, and under what license.

> **Transparency notes**
> - agent-stack **does not vendor** (copy in) any third-party code. Its built-in code map and output compression are original MIT code in [`src/builtin/`](src/builtin/), inspired by — not derived from — the tools below.
> - The **only** tool agent-stack auto-installs is `ccusage`.
> - "Optional" tools are used **only if their genuine binary is already on your PATH** (detect-only); they are never auto-installed, because the bare npm names are unrelated/squatted packages.
> - Links reflect the handles cited in this project's PRD. Where a canonical repository wasn't specified upstream, the tool is named without a link rather than guessing a URL.

## Integrated (used directly)

| Project | License | How agent-stack uses it |
|---|---|---|
| [ryoppippi/ccusage](https://github.com/ryoppippi/ccusage) | MIT | Auto-installed; the neutral source of truth for token-usage baselines and `measure` reports. |

## Optional integrations (detect-only — used if present on PATH)

| Project | License | Role |
|---|---|---|
| `rtk` | Apache-2.0 | Shell-output compression (alternative to the built-in `compress`). |
| `codegraph` | MIT | Code graph backend (alternative to the built-in code map). |
| [tirth8205/code-review-graph](https://github.com/tirth8205/code-review-graph) | MIT | Review-focused graph for the `review` profile. |
| [safishamsi/graphify](https://github.com/safishamsi/graphify) | MIT | Multimodal graph for the `multimodal` profile. |
| [rhuss/cc-spex](https://github.com/rhuss/cc-spex) | Apache-2.0 | Spec-driven workflow for the `spec` profile. |

## Opt-in (runtime shell-out only, behind `--allow-noncommercial`)

These are **never vendored** and never auto-installed; they are shelled out to at runtime only when you explicitly enable them.

| Project | License | Role |
|---|---|---|
| [mksglu/context-mode](https://github.com/mksglu/context-mode) | Elastic-2.0 | Large-output sandbox for the `research` profile. |
| [alexgreensh/token-optimizer](https://github.com/alexgreensh/token-optimizer) | PolyForm Noncommercial | Deep token audit (`audit --deep`). |

## Prior art & inspiration

Patterns, taxonomy, and ideas that shaped agent-stack's design — not integrated, but gratefully acknowledged.

| Project | License | Influence |
|---|---|---|
| [nadimtuhin/claude-token-optimizer](https://github.com/nadimtuhin/claude-token-optimizer) | MIT | The generated-file taxonomy (`CLAUDE.md`, `COMMON_MISTAKES.md`, `ARCHITECTURE_MAP.md`). |
| [obra/superpowers](https://github.com/obra/superpowers) | MIT | Workflow-kernel and command patterns. |
| [vercel-labs/skills](https://github.com/vercel-labs/skills) | MIT | Cross-agent skill installation model. |
| `caveman` | MIT | Terse output-style inspiration (agent-stack's "terse mode"). |
| [garrytan/gbrain](https://github.com/garrytan/gbrain) | — | Long-term memory tier (future roadmap). |

## License compatibility

agent-stack is **MIT**. Its default install pulls only MIT/Apache-2.0 tooling. Non-permissive tools (Elastic-2.0, PolyForm Noncommercial) are gated behind `--allow-noncommercial` and are never vendored — CI fails if any code under `src/` imports them. See [`integrations/licenses.json`](integrations/licenses.json).
