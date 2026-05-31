---
name: stack-measure
description: Measure token usage and savings via ccusage — establish a baseline and compare before/after. Use right after init (to record the baseline) and again after about a week to quantify the input-token reduction against the ≥40% target. Wraps `agent-stack measure`, which reads ccusage's local JSONL — never vendor self-reported numbers.
---

# stack-measure

Quantify token usage with the neutral `ccusage` tool. Savings are always measured, never claimed.

## What to do
- **Baseline:** `npx @drmahdikazempour/agent-stack measure` (init already stored one in `.agent-stack/baseline.json`).
- **Compare:** `npx @drmahdikazempour/agent-stack measure --since 7d` — reports baseline vs recent average input tokens/day and the % reduction, color-coded against the ≥40% target.

## Notes
- If `ccusage` isn't installed, the command falls back to the local `usage.jsonl` our `Stop` hook appends; install `ccusage` (`npm i -g ccusage`) for authoritative numbers.
- Telemetry-free and local-only: it reads ccusage's JSONL on the user's machine.
