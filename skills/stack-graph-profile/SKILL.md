---
name: stack-graph-profile
description: Inspect or switch the code-graph backend and profile for a repo (code / review / multimodal / spec). Use when the repo's focus changes — heavy PR review, newly added PDFs or video, spec-driven work — or when graph queries are returning poor context. Wraps `agent-stack profile use` and `agent-stack graph use`, which regenerate affected files and re-verify the setup.
---

# stack-graph-profile

Manage the graph backend and profile bundle.

## Profiles
| Profile | Graph | Best for |
|---|---|---|
| `code` | codegraph | normal code repos (default) |
| `review` | code-review-graph | PR/review-heavy repos |
| `multimodal` | graphify | repos with PDFs, video, many images |
| `spec` | codegraph | spec-kit / cc-spex driven work |
| `research` | none (context-mode) | large-output sandbox (opt-in, `--allow-noncommercial`) |

## When to use
- Repo focus shifted (more PR review, media added, spec work started).
- Graph queries are returning irrelevant or incomplete context.

## What to do
- **Show current:** read `.agent-stack/installed.json` (or `npx @drmahdikazempour/agent-stack profile show`).
- **Switch profile:** `npx @drmahdikazempour/agent-stack profile use <name>` — swaps the graph + compression + skills and regenerates.
- **Switch only the graph:** `npx @drmahdikazempour/agent-stack graph use <codegraph|code-review-graph|graphify>`.

Both operations back up first, regenerate the affected files, and re-run activation verification.
