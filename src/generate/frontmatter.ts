/**
 * Minimal YAML-frontmatter reader/writer. We only need flat string key/values
 * (name, description, model, allowed-tools, globs), so a dependency-free parser
 * is sufficient and keeps the install lean.
 */

export interface Frontmatter {
  data: Record<string, string>;
  body: string;
}

export function parseFrontmatter(raw: string): Frontmatter {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw);
  if (!match) return { data: {}, body: raw };
  const data: Record<string, string> = {};
  for (const line of match[1]!.split("\n")) {
    const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!m) continue;
    let value = m[2]!.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    data[m[1]!] = value;
  }
  return { data, body: match[2] ?? "" };
}

export function buildFrontmatter(data: Record<string, string>, body: string): string {
  const lines = Object.entries(data).map(([k, v]) => {
    // Quote values containing characters YAML would choke on.
    const needsQuote = /[:#]/.test(v);
    return `${k}: ${needsQuote ? JSON.stringify(v) : v}`;
  });
  return `---\n${lines.join("\n")}\n---\n\n${body.replace(/^\n+/, "")}`;
}
