import fs from "node:fs";
import type { AdapterDescriptor } from "../core/types.js";
import { integrationsPath } from "../core/pkg-root.js";

// Loaded from the integrations/ JSON so versions & licenses live in one place.
const versions = JSON.parse(fs.readFileSync(integrationsPath("versions.json"), "utf8")) as {
  adapters: Record<string, { version: string; install: any; fallback?: any }>;
};
const licenses = JSON.parse(fs.readFileSync(integrationsPath("licenses.json"), "utf8")) as {
  adapters: Record<string, { spdx: string; permissive: boolean; requires?: string }>;
};

export function getAdapter(name: string): AdapterDescriptor {
  const v = versions.adapters[name];
  const l = licenses.adapters[name];
  if (!v || !l) throw new Error(`Unknown adapter: ${name}`);
  return {
    name,
    version: v.version,
    install: v.install,
    fallback: v.fallback,
    spdx: l.spdx,
    permissive: l.permissive,
    requires: l.requires,
  };
}

export function allAdapterNames(): string[] {
  return Object.keys(versions.adapters);
}

const BUILTIN = new Set(["builtin", "none", ""]);

/**
 * Adapters a profile needs. Built-in graph/compression aren't adapters (they
 * ship in src/builtin/). ccusage (measurement) is always present. An external
 * graph/compression name maps to a detect-only adapter that is used only if its
 * real binary is already on PATH.
 */
export function adaptersForProfile(
  graph: string,
  compression: string,
  _caveman: boolean,
): AdapterDescriptor[] {
  const names = new Set<string>();
  names.add("ccusage"); // measurement is always present
  if (graph && !BUILTIN.has(graph)) names.add(graph);
  if (compression && !BUILTIN.has(compression)) names.add(compression);
  return [...names].map(getAdapter);
}
