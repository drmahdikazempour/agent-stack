/**
 * Built-in, dependency-free output compressor. This is agent-stack's own
 * shell-output compression (the "rtk-equivalent" that actually ships and works),
 * so the feature is real without auto-installing an unrelated npm package.
 *
 * Safe, lossless-ish transforms that cut tokens from large command output:
 *  - strip ANSI escape sequences,
 *  - collapse runs of blank lines,
 *  - fold consecutive duplicate lines into "<line>  (×N)",
 *  - cap absurdly long lines,
 *  - head/tail elision when the output exceeds a line budget.
 */

export interface CompressOptions {
  maxLines?: number;
  head?: number;
  tail?: number;
  maxLineLength?: number;
}

const ANSI_RE = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;

export function compress(input: string, opts: CompressOptions = {}): string {
  const maxLines = opts.maxLines ?? 200;
  const head = opts.head ?? Math.min(120, Math.floor(maxLines * 0.6));
  const tail = opts.tail ?? Math.max(20, maxLines - head);
  const maxLineLength = opts.maxLineLength ?? 800;

  // 1. Strip ANSI and split.
  let lines = input.replace(ANSI_RE, "").split("\n");

  // 2. Cap line length.
  lines = lines.map((l) =>
    l.length > maxLineLength ? l.slice(0, maxLineLength) + ` …[+${l.length - maxLineLength} chars]` : l,
  );

  // 3. Collapse runs of blank lines to a single blank.
  const collapsed: string[] = [];
  for (const l of lines) {
    if (l.trim() === "" && collapsed.length && collapsed[collapsed.length - 1] === "") continue;
    collapsed.push(l.trim() === "" ? "" : l);
  }

  // 4. Fold consecutive duplicate lines.
  const folded: string[] = [];
  let i = 0;
  while (i < collapsed.length) {
    let j = i + 1;
    while (j < collapsed.length && collapsed[j] === collapsed[i]) j++;
    const count = j - i;
    folded.push(count > 1 ? `${collapsed[i]}  (×${count})` : collapsed[i]!);
    i = j;
  }

  // 5. Head/tail elision if still over budget.
  if (folded.length > maxLines) {
    const elided = folded.length - head - tail;
    if (elided > 0) {
      return [
        ...folded.slice(0, head),
        `… [${elided} lines elided by agent-stack compress] …`,
        ...folded.slice(folded.length - tail),
      ].join("\n");
    }
  }

  return folded.join("\n");
}

export function compressionStats(before: string, after: string): { beforeLines: number; afterLines: number; savedPct: number } {
  const b = before.length || 1;
  const a = after.length;
  return {
    beforeLines: before.split("\n").length,
    afterLines: after.split("\n").length,
    savedPct: Math.round(((b - a) / b) * 1000) / 10,
  };
}
