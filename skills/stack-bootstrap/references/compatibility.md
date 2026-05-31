# Compatibility & licensing

## Hosts
- **Claude Code** (primary): `.claude/` surface — `CLAUDE.md`, `skills/`, `agents/`, `commands/`, `settings.json` hooks, `.mcp.json`.
- **Cursor** (mirror): `.cursor/rules/*.mdc` (glob-scoped) + shared `AGENTS.md`. Generated from the same context; regenerate with `agent-stack sync`.

## License posture
- **Default install:** MIT / Apache-2.0 adapters only (codegraph, rtk, ccusage, caveman, cc-spex, superpowers patterns).
- **Opt-in (`--allow-noncommercial`):** non-permissive adapters are **never vendored** — only shelled out to at runtime: `context-mode` (Elastic-2.0), `token-optimizer` (PolyForm Noncommercial).
- CI fails if any code under `src/` imports a non-permissive adapter.

## Toolchain fallbacks
- Missing `cargo` for rtk → falls back to the npm package if available, else config-only mode.
- Missing network or `npm` → config-only mode; the CLI tells you exactly what to install by hand.
