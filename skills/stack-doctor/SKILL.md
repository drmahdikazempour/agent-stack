---
name: stack-doctor
description: Lint the agent-stack setup — CLAUDE.md token budget (≤800), each SKILL.md description (≤1024 chars) and body (≤500 lines), hook conflicts in settings.json, frontmatter validity, and adapter availability. Use when something feels off, before committing config changes, or to confirm a healthy setup. Wraps `agent-stack doctor`; exit code 1 means there are issues to fix.
---

# stack-doctor

Lint the optimization layer and report problems with exact files and limits.

## Checks performed
- `CLAUDE.md` ≤ 800 tokens (startup-load budget).
- Each `SKILL.md` description ≤ 1024 chars (Agent Skills hard limit).
- Each `SKILL.md` body ≤ 500 lines.
- Combined skill metadata ≤ 500 tokens.
- Zero hook conflicts in `.claude/settings.json`.
- Valid frontmatter (`name` + `description`) on every skill.
- Every adapter binary callable, or clearly flagged as config-only.

## What to do
1. Run `npx @drmahdikazempour/agent-stack doctor`.
2. If it exits non-zero, surface each failure with the file and the limit it broke.
3. For auto-fixable issues (e.g. CLAUDE.md over budget), offer `npx @drmahdikazempour/agent-stack optimize`.
4. For hook conflicts, never hand-edit `settings.json` — re-run `init`/`profile use` so the merger reconciles them.

`--skills-only` lints just the SKILL.md files (used in CI).
