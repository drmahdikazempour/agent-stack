import { describe, it, expect } from "vitest";
import { mergeHooks } from "../src/wire-hooks.js";
import type { HookSpec } from "../src/core/types.js";

const rtkSpec: HookSpec = {
  event: "PreToolUse",
  matcher: "Bash",
  command: "rtk wrap --stdin # agent-stack",
  reason: "compress",
};

describe("wire-hooks merge", () => {
  it("adds a hook to empty settings", () => {
    const { settings, result } = mergeHooks({}, [rtkSpec]);
    expect(result.added).toBe(1);
    expect(settings.hooks!.PreToolUse![0]!.hooks[0]!.command).toContain("rtk");
  });

  it("dedupes identical agent-stack hooks (idempotency)", () => {
    const first = mergeHooks({}, [rtkSpec]);
    const second = mergeHooks(first.settings, [rtkSpec]);
    expect(second.result.added).toBe(0);
    expect(second.result.skipped).toBe(1);
  });

  it("preserves a user's existing hook and coexists", () => {
    const existing = {
      hooks: {
        PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command" as const, command: "my-own-lint" }] }],
      },
    };
    const { settings, result } = mergeHooks(existing, [rtkSpec]);
    const cmds = settings.hooks!.PreToolUse![0]!.hooks.map((h) => h.command);
    expect(cmds).toContain("my-own-lint");
    expect(cmds.some((c) => c.includes("rtk"))).toBe(true);
    expect(result.conflicts).toHaveLength(1);
  });

  it("handles matcher-less events (SessionStart)", () => {
    const spec: HookSpec = { event: "SessionStart", command: "codegraph refresh # agent-stack", reason: "" };
    const { settings, result } = mergeHooks({}, [spec]);
    expect(result.added).toBe(1);
    expect(settings.hooks!.SessionStart![0]!.matcher).toBeUndefined();
  });
});
