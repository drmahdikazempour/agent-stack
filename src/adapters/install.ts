import type { AdapterDescriptor } from "../core/types.js";
import { hasBinary, run } from "../core/util.js";
import { isToolPresent } from "./detect-tools.js";

export interface InstallOutcome {
  adapter: string;
  status: "present" | "installed" | "skipped" | "failed" | "config-only" | "needs-toolchain";
  detail: string;
  /** Manual finish-it instruction, shown when we couldn't fully auto-install. */
  guidance?: string;
}

/**
 * Detect → install-if-missing → use. Tries the tool's ordered install
 * strategies and stops at the first whose toolchain is on PATH. Never auto-runs
 * `curl|sh` one-liners — those live in `guidance` so the user runs them
 * deliberately. Honors --no-install (configOnly) and degrades to clear guidance
 * when no toolchain is available rather than failing the whole init.
 */
export function ensureAdapter(
  adapter: AdapterDescriptor,
  opts: { install: boolean; cwd: string },
): InstallOutcome {
  // 1. Already there? Use it.
  if (isToolPresent(adapter, opts.cwd)) {
    return { adapter: adapter.name, status: "present", detail: `${adapter.name} already available` };
  }

  // 2. Config-only mode: write configs, leave install to the user.
  if (!opts.install) {
    return {
      adapter: adapter.name,
      status: "config-only",
      detail: "skipped (--no-install)",
      guidance: adapter.guidance,
    };
  }

  // 3. Try each strategy whose toolchain is present, in order, until one lands.
  //    Falling through on failure matters: e.g. a PEP-668 "externally-managed"
  //    pip3 fails, but the next available pip (or pipx/uv) may succeed.
  const available = adapter.install.filter((s) => hasBinary(s.needs));
  if (available.length === 0) {
    const needed = [...new Set(adapter.install.map((s) => s.needs))].join(" / ");
    return {
      adapter: adapter.name,
      status: "needs-toolchain",
      detail: `no toolchain on PATH (need ${needed})`,
      guidance: adapter.guidance,
    };
  }

  let lastErr = "";
  for (const strategy of available) {
    const primary = run(strategy.run[0]!, strategy.run.slice(1), { timeoutMs: 600_000 });
    if (!primary.ok) {
      lastErr = `${strategy.run.join(" ")} → ${primary.stderr.slice(0, 140)}`;
      continue;
    }
    if (strategy.then) {
      const second = run(strategy.then[0]!, strategy.then.slice(1), { timeoutMs: 600_000 });
      if (!second.ok) {
        lastErr = `${strategy.then.join(" ")} → ${second.stderr.slice(0, 140)}`;
        continue;
      }
    }
    if (isToolPresent(adapter, opts.cwd)) {
      return { adapter: adapter.name, status: "installed", detail: strategy.run.join(" ") };
    }
    lastErr = `${strategy.run.join(" ")} ran but tool still not detected`;
  }

  return { adapter: adapter.name, status: "failed", detail: lastErr, guidance: adapter.guidance };
}

/** Post-write verification (activation step): is the tool callable/available now? */
export function verifyAdapter(adapter: AdapterDescriptor, cwd: string): boolean {
  return isToolPresent(adapter, cwd);
}
