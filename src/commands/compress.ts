import fs from "node:fs";
import { compress, compressionStats, type CompressOptions } from "../builtin/compress.js";
import { color } from "../core/util.js";

/** Read all of stdin synchronously (works in pipelines / hooks). */
function readStdin(): string {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

/**
 * `agent-stack compress` — pipe large command output through this to cut the
 * tokens it costs in context:  `npm run build 2>&1 | npx ... compress`.
 */
export function runCompress(opts: { maxLines?: number; stats?: boolean; file?: string }): number {
  const input = opts.file ? (fs.existsSync(opts.file) ? fs.readFileSync(opts.file, "utf8") : "") : readStdin();
  const compressOpts: CompressOptions = {};
  if (opts.maxLines) compressOpts.maxLines = opts.maxLines;
  const out = compress(input, compressOpts);
  process.stdout.write(out.endsWith("\n") ? out : out + "\n");
  if (opts.stats) {
    const s = compressionStats(input, out);
    process.stderr.write(color.dim(`compress: ${s.beforeLines}→${s.afterLines} lines, ${s.savedPct}% chars saved\n`));
  }
  return 0;
}
