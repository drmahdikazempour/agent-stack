---
"@drmahdikazempour/agent-stack": minor
---

v0.3.0 — real external tool stack + coordinator.

- **Full permissive stack wired in** (the `max` profile / `init --all`): rtk (Apache-2.0) + code-review-graph, graphify, caveman, claude-handoff, gbrain (all MIT), over the built-in fallbacks. Detect → install-if-missing → use.
- **Multi-toolchain installer** — cargo / uv / pipx / pip / bun / `claude plugin`, tried in order with fallthrough on failure (e.g. a PEP-668 pip3 falls through to a working pip). Prints the tool's own install command as guidance when no toolchain is available; never auto-runs `curl|sh`.
- **MCP registration** — code-review-graph's server is merged into `.mcp.json` (preserving user-defined servers); the SessionStart hook refreshes the external graph backend when active.
- **Tool coordinator** — generated `CLAUDE.md` and `AGENTS.md` route each job to the right tool, with built-ins named as the explicit fallback. Cursor mirror references only the portable subset (rtk + MCP/CLI graph tools).
- **Honest sourcing** — every install/MCP command transcribed from each repo's own docs; the two unlicensed candidates (token-optimizer, intent-layer) dropped since permissive members cover their function. Single source of truth: `integrations/tools.json`.
