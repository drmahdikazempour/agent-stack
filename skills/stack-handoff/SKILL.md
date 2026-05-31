---
name: stack-handoff
description: Write or resume a continuity handoff so work survives across sessions or teammates — current task, decisions made, open threads, git state, and next steps. Use when ending a session, switching context, or picking up someone else's work. Wraps `agent-stack handoff write|resume`, which stores a single `.agent-stack/handoff.md` you can edit freely.
---

# stack-handoff

Persist and resume working state across sessions.

## Write a handoff
`npx @drmahdikazempour/agent-stack handoff write` captures into `.agent-stack/handoff.md`:
- current git branch, uncommitted changes, recent commits,
- a template for the current task, decisions made, and next steps.

Edit the generated file to fill in the narrative parts before you stop.

## Resume
`npx @drmahdikazempour/agent-stack handoff resume` prints the latest handoff so you can continue exactly where the last session stopped.

## When to use
- At the end of any working session.
- Before switching branches or context.
- At the start of any resumed or handed-off task — resume first, then continue.
