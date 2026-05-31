---
name: stack-bootstrap
description: Set up or re-sync the agent-stack optimization layer (CLAUDE.md, skills, hooks, code graph, shell compression, Cursor mirror) for a repo. Use when onboarding a repo, right after cloning, or when the agent context feels bloated/unoptimized. Runs `agent-stack init` under the hood — detect, install adapters, generate files, wire hooks, verify, and capture a token baseline — then reports exactly what changed.
---

# stack-bootstrap

Bootstrap or re-sync this repo's optimization layer. **Skills decide *when*; the CLI decides *how*** — always shell out to `agent-stack` for file writes so the hook merger stays the sole writer of `settings.json`.

## When to use
- First time working in a repo that should have agent-stack configured.
- After pulling changes that touched `.claude/`, `.cursor/`, or `integrations/`.
- When startup context feels heavy and you suspect the setup drifted.

## What to do
1. Run `npx @drmahdikazempour/agent-stack doctor` to see current state and whether anything is configured.
2. If unconfigured or drifted, run `npx @drmahdikazempour/agent-stack init`. It:
   - detects host(s), profile, package manager, and existing config,
   - backs up anything it will touch into `.agent-stack.bak.<ts>/`,
   - installs the profile's pinned adapters (or runs config-only with `--no-install`),
   - generates `CLAUDE.md`, skills, agents, commands, `.claudeignore`, the Cursor mirror, and MCP scaffold,
   - wires hooks in a single merged write,
   - verifies every skill loads and every hook is present (rolls back on failure),
   - captures a `ccusage` token baseline.
3. Report the chosen profile, adapters installed, hooks wired, and baseline tokens.

## Flags worth knowing
- `--dry-run` — print the plan, write nothing.
- `--profile <code|review|multimodal|spec>` — override auto-detection.
- `--no-install` — write configs only; skip binary installs.
- `--yes` — skip the single confirm prompt.

## Idempotency
Running `init` twice is a no-op unless `--force`. Safe to re-run anytime.
