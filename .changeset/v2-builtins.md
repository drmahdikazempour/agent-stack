---
"@drmahdikazempour/agent-stack": minor
---

v0.2.0 — self-contained token cutters + `max` profile.

- **Built-in code map** (`graph refresh`/`graph query`, `.agent-stack/graph.md`) — grep one compact file instead of reading whole directories. Refreshed on SessionStart and at init.
- **Built-in output compression** (`compress`) — ANSI strip, duplicate folding, head/tail elision; ~60% fewer chars on large logs.
- **`max` profile + `--all`** — turn on every feature (code map, compression, terse output, all skills/agents/hooks, measurement) in one command.
- **Honest install model** — only `ccusage` auto-installs; third-party graph/compression tools are detect-only (never auto-installed by their unrelated npm names). Graph/compression default to the built-ins.
- Hooks now drive agent-stack's own commands; opt-in non-permissive adapters remain runtime shell-outs gated by `--allow-noncommercial`.
