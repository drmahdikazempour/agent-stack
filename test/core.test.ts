import { describe, it, expect } from "vitest";
import { estimateTokens, withinBudget } from "../src/core/token-estimator.js";
import { parseFrontmatter, buildFrontmatter } from "../src/generate/frontmatter.js";

describe("token-estimator", () => {
  it("returns 0 for empty input", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("scales with text length", () => {
    const small = estimateTokens("hello world");
    const big = estimateTokens("hello world ".repeat(100));
    expect(big).toBeGreaterThan(small);
  });

  it("enforces budgets", () => {
    expect(withinBudget("short", 100)).toBe(true);
    expect(withinBudget("x ".repeat(5000), 10)).toBe(false);
  });
});

describe("frontmatter", () => {
  it("parses name + description", () => {
    const raw = `---\nname: foo\ndescription: a thing\n---\n\nbody here`;
    const { data, body } = parseFrontmatter(raw);
    expect(data.name).toBe("foo");
    expect(data.description).toBe("a thing");
    expect(body.trim()).toBe("body here");
  });

  it("round-trips through build", () => {
    const built = buildFrontmatter({ name: "x", description: "y: with colon" }, "hello");
    const { data, body } = parseFrontmatter(built);
    expect(data.name).toBe("x");
    expect(data.description).toBe("y: with colon");
    expect(body.trim()).toBe("hello");
  });

  it("returns body unchanged when no frontmatter", () => {
    const { data, body } = parseFrontmatter("just text");
    expect(Object.keys(data)).toHaveLength(0);
    expect(body).toBe("just text");
  });
});
