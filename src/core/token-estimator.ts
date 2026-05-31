import { SPEC } from "../constants.js";

/**
 * Internal token budgeting only. Per PRD §11, gpt-tokenizer is suggested for
 * internal budgeting and ccusage is authoritative for user-facing measurement.
 * We use a dependency-free heuristic (chars / CHARS_PER_TOKEN, with a small
 * correction for whitespace-dense prose) so `npx agent-stack init` installs in
 * seconds with zero runtime dependencies. This is never reported as a savings
 * number — that always comes from ccusage.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Word-ish count gives a better floor than pure chars for natural language.
  const chars = text.length;
  const words = text.trim().split(/\s+/).length;
  const byChars = Math.ceil(chars / SPEC.CHARS_PER_TOKEN);
  const byWords = Math.ceil(words * 1.3);
  // Code/markdown skews toward the char estimate; prose toward words. Average.
  return Math.round((byChars + byWords) / 2);
}

export function withinBudget(text: string, maxTokens: number): boolean {
  return estimateTokens(text) <= maxTokens;
}
