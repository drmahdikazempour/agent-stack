import fs from "node:fs";
import type { AdapterDescriptor, ProfileConfig } from "../core/types.js";
import { integrationsPath } from "../core/pkg-root.js";

// Loaded from integrations/tools.json — the single source of truth for every
// external tool's source repo, ordered install strategies, integration kind,
// detection method, MCP server entry, coordinator role, and license.
const data = JSON.parse(fs.readFileSync(integrationsPath("tools.json"), "utf8")) as {
  tools: Record<string, Omit<AdapterDescriptor, "name">>;
};

export function getAdapter(name: string): AdapterDescriptor {
  const t = data.tools[name];
  if (!t) throw new Error(`Unknown tool: ${name}`);
  return { name, ...t };
}

export function allAdapterNames(): string[] {
  return Object.keys(data.tools);
}

/**
 * The external tools a profile activates. Measurement (ccusage) is always
 * present; a profile's `tools` list adds the rest. Built-in graph/compression
 * are not adapters (they ship in src/builtin/) — they're the fallback when an
 * external tool is absent.
 */
export function adaptersForProfile(profile: ProfileConfig): AdapterDescriptor[] {
  const names = new Set<string>(["ccusage"]);
  for (const t of profile.tools ?? []) names.add(t);
  return [...names].map(getAdapter);
}
