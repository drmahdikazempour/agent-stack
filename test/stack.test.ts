import { describe, it, expect } from "vitest";
import { getAdapter, adaptersForProfile } from "../src/adapters/registry.js";
import { ensureAdapter } from "../src/adapters/install.js";
import { isToolPresent } from "../src/adapters/detect-tools.js";
import { generateMcp } from "../src/generate/mcp.js";
import { generateClaude } from "../src/generate/claude.js";
import { buildContext } from "../src/generate/context.js";
import { coordinatorSection, cursorPortableTools } from "../src/generate/coordinator.js";
import { getProfileConfig } from "../src/core/plan.js";
import { detect } from "../src/core/detect.js";
import { makeTmpRepo, cleanup } from "./helpers.js";

describe("tools registry (real, verified commands)", () => {
  it("rtk installs from the rtk-ai git repo, never crates.io", () => {
    const rtk = getAdapter("rtk");
    expect(rtk.integration).toBe("path");
    expect(rtk.install[0]!.needs).toBe("cargo");
    expect(rtk.install[0]!.run.join(" ")).toBe("cargo install --git https://github.com/rtk-ai/rtk");
    // never bare `cargo install rtk` (that resolves to a different project on crates.io)
    expect(rtk.install.some((s) => s.run.join(" ") === "cargo install rtk")).toBe(false);
    expect(rtk.guidance).toMatch(/install\.sh|rtk gain/);
  });

  it("graphify uses the real PyPI name `graphifyy` (double-y)", () => {
    const g = getAdapter("graphify");
    expect(g.install.every((s) => s.run.includes("graphifyy"))).toBe(true);
    expect(g.detect).toMatchObject({ kind: "path", bin: "graphify" });
  });

  it("code-review-graph contributes an MCP server entry", () => {
    const c = getAdapter("code-review-graph");
    expect(c.integration).toBe("mcp");
    expect(c.mcp).toEqual({ server: "code-review-graph", command: "uvx", args: ["code-review-graph", "serve"] });
    expect(c.refresh).toEqual(["code-review-graph", "update"]);
  });

  it("caveman + claude-handoff install as Claude Code plugins and are NOT Cursor-portable", () => {
    for (const name of ["caveman", "claude-handoff"]) {
      const t = getAdapter(name);
      expect(t.integration).toBe("plugin");
      expect(t.install[0]!.needs).toBe("claude");
      expect(t.install[0]!.run.slice(0, 3)).toEqual(["claude", "plugin", "marketplace"]);
      expect(t.install[0]!.then?.[1]).toBe("plugin");
      expect(t.cursor).toBe(false);
    }
  });

  it("every wired tool is permissive (no consent gate)", () => {
    for (const a of adaptersForProfile(getProfileConfig("max"))) {
      expect(a.permissive).toBe(true);
      expect(["MIT", "Apache-2.0"]).toContain(a.spdx);
    }
  });
});

describe("install: detect-first + guidance", () => {
  it("config-only mode returns guidance instead of installing", () => {
    const dir = makeTmpRepo({});
    try {
      // Use a synthetic mcp-detected adapter so it is deterministically ABSENT in an
      // empty tmp dir (a real tool may happen to be installed on the test machine).
      const absent = { ...getAdapter("code-review-graph"), detect: { kind: "mcp" as const, server: "code-review-graph" } };
      const out = ensureAdapter(absent, { install: false, cwd: dir });
      expect(out.status).toBe("config-only");
      expect(out.guidance).toBeTruthy();
    } finally {
      cleanup(dir);
    }
  });
});

describe("detect-tools", () => {
  // A synthetic adapter that detects via MCP-server presence (exercises the mcp branch).
  const mcpDetect = { ...getAdapter("code-review-graph"), detect: { kind: "mcp" as const, server: "code-review-graph" } };

  it("mcp detection reads the repo's .mcp.json", () => {
    const dir = makeTmpRepo({
      ".mcp.json": JSON.stringify({ mcpServers: { "code-review-graph": { command: "uvx" } } }),
    });
    try {
      expect(isToolPresent(mcpDetect, dir)).toBe(true);
    } finally {
      cleanup(dir);
    }
  });

  it("mcp detection is false when the server is absent", () => {
    const dir = makeTmpRepo({ ".mcp.json": JSON.stringify({ mcpServers: {} }) });
    try {
      expect(isToolPresent(mcpDetect, dir)).toBe(false);
    } finally {
      cleanup(dir);
    }
  });
});

function maxCtx(dir: string) {
  return buildContext(
    detect(dir),
    "max",
    getProfileConfig("max"),
    adaptersForProfile(getProfileConfig("max")),
    ["claude", "cursor"],
  );
}

describe("generate/mcp merge", () => {
  it("adds code-review-graph while preserving a user's existing server", () => {
    const dir = makeTmpRepo({
      ".mcp.json": JSON.stringify({ mcpServers: { mine: { command: "node", args: ["server.js"] } } }),
    });
    try {
      const [file] = generateMcp(maxCtx(dir));
      const parsed = JSON.parse(file!.contents);
      expect(parsed.mcpServers.mine).toEqual({ command: "node", args: ["server.js"] });
      expect(parsed.mcpServers["code-review-graph"]).toEqual({ command: "uvx", args: ["code-review-graph", "serve"] });
    } finally {
      cleanup(dir);
    }
  });
});

describe("coordinator docs", () => {
  it("CLAUDE.md + AGENTS.md route each job to the right tool, by name", () => {
    const dir = makeTmpRepo({ "package.json": "{}" });
    try {
      const section = coordinatorSection(maxCtx(dir));
      for (const name of ["rtk", "code-review-graph", "graphify", "caveman", "claude-handoff", "gbrain"]) {
        expect(section).toContain(name);
      }
      expect(section).toMatch(/fallback/i);
    } finally {
      cleanup(dir);
    }
  });

  it("Cursor subset excludes Claude-Code-only plugins/skills", () => {
    const dir = makeTmpRepo({ "package.json": "{}" });
    try {
      const portable = cursorPortableTools(maxCtx(dir)).map((t) => t.name).sort();
      expect(portable).toEqual(["code-review-graph", "graphify", "rtk"]);
      expect(portable).not.toContain("caveman");
      expect(portable).not.toContain("gbrain");
    } finally {
      cleanup(dir);
    }
  });
});

describe("generated coordinator surfaces in real files", () => {
  it("AGENTS.md names the active tools and mentions Cursor only when targeted", () => {
    const dir = makeTmpRepo({ "package.json": "{}" });
    try {
      const files = generateClaude(maxCtx(dir));
      const agents = files.find((f) => f.path === "AGENTS.md")!;
      expect(agents.contents).toContain("rtk");
      expect(agents.contents).toContain("Cursor"); // targets include cursor in maxCtx
    } finally {
      cleanup(dir);
    }
  });
});
