import { describe, it, expect } from "vitest";
import { detect } from "../src/core/detect.js";
import { makeTmpRepo, cleanup } from "./helpers.js";

describe("detect", () => {
  it("detects pnpm + TypeScript + Next.js and picks the code profile", () => {
    const dir = makeTmpRepo({
      "package.json": JSON.stringify({ dependencies: { next: "14" } }),
      "tsconfig.json": "{}",
      "pnpm-lock.yaml": "",
    });
    try {
      const d = detect(dir);
      expect(d.packageManager).toBe("pnpm");
      expect(d.language).toBe("TypeScript");
      expect(d.framework).toBe("Next.js");
      expect(d.profile).toBe("code");
    } finally {
      cleanup(dir);
    }
  });

  it("picks multimodal when enough large media is present", () => {
    const media: Record<string, string> = { "package.json": "{}" };
    for (let i = 0; i < 6; i++) media[`docs/file${i}.pdf`] = "x";
    const dir = makeTmpRepo(media);
    try {
      expect(detect(dir).profile).toBe("multimodal");
    } finally {
      cleanup(dir);
    }
  });

  it("picks spec when spec-kit is detected", () => {
    const dir = makeTmpRepo({ "package.json": "{}", "spec-kit.config.json": "{}" });
    try {
      expect(detect(dir).profile).toBe("spec");
    } finally {
      cleanup(dir);
    }
  });

  it("defaults host to Claude Code when nothing is detected", () => {
    const dir = makeTmpRepo({ "package.json": "{}" });
    try {
      expect(detect(dir).hosts).toContain("claude");
    } finally {
      cleanup(dir);
    }
  });
});
