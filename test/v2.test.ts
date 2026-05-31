import { describe, it, expect } from "vitest";
import { compress } from "../src/builtin/compress.js";
import { buildGraph, renderGraphMarkdown } from "../src/builtin/graph.js";
import { getProfileConfig } from "../src/core/plan.js";
import { hooksForProfile } from "../src/adapters/hooks.js";
import { adaptersForProfile } from "../src/adapters/registry.js";
import { makeTmpRepo, cleanup } from "./helpers.js";

describe("compress (built-in compression)", () => {
  it("strips ANSI and dedupes consecutive duplicates", () => {
    const input = "\x1b[31mred\x1b[39m\nsame\nsame\nsame\n";
    const out = compress(input);
    expect(out).not.toContain("\x1b[");
    expect(out).toContain("same  (×3)");
  });

  it("head/tail elides when over the line budget", () => {
    const input = Array.from({ length: 500 }, (_, i) => `line ${i}`).join("\n");
    const out = compress(input, { maxLines: 100 });
    expect(out).toContain("lines elided by agent-stack compress");
    expect(out.split("\n").length).toBeLessThan(200);
  });

  it("leaves small output essentially intact", () => {
    const out = compress("hello\nworld");
    expect(out.trim()).toBe("hello\nworld");
  });
});

describe("graph (built-in code map)", () => {
  it("extracts exported symbols across languages", () => {
    const dir = makeTmpRepo({
      "a.ts": "export function foo() {}\nexport const bar = 1\nexport class Baz {}",
      "b.py": "def hello():\n    pass\nclass World:\n    pass",
      "ignored/node_modules/x.ts": "export function shouldSkip(){}",
    });
    try {
      const g = buildGraph(dir);
      const a = g.entries.find((e) => e.path === "a.ts")!;
      expect(a.symbols).toEqual(["Baz", "bar", "foo"]);
      const b = g.entries.find((e) => e.path === "b.py")!;
      expect(b.symbols).toEqual(["World", "hello"]);
      const md = renderGraphMarkdown(g);
      expect(md).toContain("# Code map");
      expect(md).toContain("`a.ts`");
    } finally {
      cleanup(dir);
    }
  });
});

describe("max profile + tool stack", () => {
  it("max turns on caveman (terse) and all skills/agents", () => {
    const p = getProfileConfig("max");
    expect(p.caveman).toBe(true);
    expect(p.skills.length).toBe(5);
    expect(p.agents.length).toBeGreaterThan(0);
  });

  it("max activates the full permissive stack (ccusage + the 6 external tools)", () => {
    const adapters = adaptersForProfile(getProfileConfig("max"));
    const names = adapters.map((a) => a.name).sort();
    expect(names).toEqual(
      ["caveman", "ccusage", "claude-handoff", "code-review-graph", "gbrain", "graphify", "rtk"].sort(),
    );
    // Every wired tool is permissive — no consent gate anywhere.
    expect(adapters.every((a) => a.permissive)).toBe(true);
  });

  it("default 'code' profile stays built-ins-only (just ccusage)", () => {
    const adapters = adaptersForProfile(getProfileConfig("code"));
    expect(adapters.map((a) => a.name)).toEqual(["ccusage"]);
  });

  it("SessionStart hook prefers the external graph backend's own refresh when active", () => {
    const adapters = adaptersForProfile(getProfileConfig("max"));
    const hooks = hooksForProfile(getProfileConfig("max"), adapters);
    const start = hooks.find((h) => h.event === "SessionStart")!;
    expect(start.command).toContain("code-review-graph update");
    expect(start.command).not.toContain("agent-stack graph refresh");
    expect(hooks.some((h) => h.event === "Stop" && h.command.includes("ccusage"))).toBe(true);
  });

  it("falls back to the built-in graph refresh when no external backend is active", () => {
    const hooks = hooksForProfile(getProfileConfig("max"), []);
    const start = hooks.find((h) => h.event === "SessionStart")!;
    expect(start.command).toContain("graph refresh");
  });

  it("research profile (graph: none) emits no graph hook", () => {
    const hooks = hooksForProfile(getProfileConfig("research"));
    expect(hooks.some((h) => h.command.includes("graph refresh"))).toBe(false);
  });
});
