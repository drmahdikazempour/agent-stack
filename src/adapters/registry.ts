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

/** The adapters a profile needs (graph + compression + measurement + optional caveman). */
export function adaptersForProfile(
  graph: string,
  compression: string,
  caveman: boolean,
): AdapterDescriptor[] {
  const names = new Set<string>();
  if (graph && graph !== "none") names.add(graph);
  if (compression) names.add(compression);
  names.add("ccusage"); // measurement is always present
  if (caveman) names.add("caveman");
  return [...names].map(getAdapter);
}
