import { describe, it, expect } from "vitest";
import { runInit } from "../src/commands/init.js";
import type { InitOptions } from "../src/core/types.js";
import { makeTmpRepo, cleanup, exists, read } from "./helpers.js";

function opts(cwd: string, over: Partial<InitOptions> = {}): InitOptions {
  return {
    cwd,
    yes: true,
    dryRun: false,
    // Force both targets so the suite is deterministic regardless of whether
    // the host machine has ~/.cursor (CI does not; dev machines often do).
    targets: ["claude", "cursor"],
    noInstall: true, // never touch the network in CI
    allowNoncommercial: false,
    overwrite: false,
    force: false,
    nonInteractive: true,
    ...over,
  };
}

describe("init end-to-end (the headline contract)", () => {
  it("detect → write → wire → activate → baseline in a clean tmpdir", async () => {
    const dir = makeTmpRepo({
      "package.json": JSON.stringify({ dependencies: { next: "14" } }),
      "tsconfig.json": "{}",
    });
    try {
      const res = await runInit(opts(dir));
      expect(res.ok).toBe(true);
      expect(res.rolledBack).toBe(false);

      // Files written across both hosts.
      expect(exists(dir, "CLAUDE.md")).toBe(true);
      expect(exists(dir, ".claude/settings.json")).toBe(true);
      expect(exists(dir, ".claude/skills/stack-bootstrap/SKILL.md")).toBe(true);
      expect(exists(dir, ".claude/agents/stack-explorer.md")).toBe(true);
      expect(exists(dir, "AGENTS.md")).toBe(true);
      expect(exists(dir, ".mcp.json")).toBe(true);
      expect(exists(dir, ".agent-stack/installed.json")).toBe(true);

      // Hooks were wired with the agent-stack signature.
      const settings = JSON.parse(read(dir, ".claude/settings.json"));
      expect(Object.keys(settings.hooks).length).toBeGreaterThan(0);
    } finally {
      cleanup(dir);
    }
  });

  it("is idempotent: a second run changes nothing", async () => {
    const dir = makeTmpRepo({ "package.json": "{}" });
    try {
      await runInit(opts(dir));
      const second = await runInit(opts(dir));
      expect(second.message).toBe("already installed");
      expect(second.filesWritten).toBe(0);
    } finally {
      cleanup(dir);
    }
  });

  it("backs up an existing CLAUDE.md before writing", async () => {
    const dir = makeTmpRepo({ "package.json": "{}", "CLAUDE.md": "# my notes\nkeep me" });
    try {
      const res = await runInit(opts(dir));
      expect(res.ok).toBe(true);
      // A backup dir was created and contains the original content.
      const fs = await import("node:fs");
      const baks = fs.readdirSync(dir).filter((n) => n.startsWith(".agent-stack.bak."));
      expect(baks.length).toBe(1);
      const backedUp = read(dir, `${baks[0]}/CLAUDE.md`);
      expect(backedUp).toContain("keep me");
    } finally {
      cleanup(dir);
    }
  });

  it("dry-run writes nothing", async () => {
    const dir = makeTmpRepo({ "package.json": "{}" });
    try {
      const res = await runInit(opts(dir, { dryRun: true }));
      expect(res.message).toBe("dry-run");
      expect(exists(dir, "CLAUDE.md")).toBe(false);
    } finally {
      cleanup(dir);
    }
  });

  it("blocks research profile without --allow-noncommercial", async () => {
    const dir = makeTmpRepo({ "package.json": "{}" });
    try {
      const res = await runInit(opts(dir, { profile: "research" }));
      expect(res.ok).toBe(false);
      expect(res.message).toContain("allow-noncommercial");
    } finally {
      cleanup(dir);
    }
  });
});
