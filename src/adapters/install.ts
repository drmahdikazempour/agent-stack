import type { AdapterDescriptor, AdapterInstallSpec } from "../core/types.js";
import { hasBinary, run } from "../core/util.js";

export interface InstallOutcome {
  adapter: string;
  status: "present" | "installed" | "skipped" | "failed" | "config-only";
  detail: string;
}

function binName(spec: AdapterInstallSpec): string | null {
  return spec.bin ?? (spec.kind === "skill" ? null : spec.package);
}

function toolchainAvailable(kind: AdapterInstallSpec["kind"]): boolean {
  if (kind === "npm" || kind === "skill") return hasBinary("npm") || hasBinary("npx");
  if (kind === "cargo") return hasBinary("cargo");
  return false;
}

function doInstall(spec: AdapterInstallSpec, version: string): { ok: boolean; detail: string } {
  switch (spec.kind) {
    case "npm": {
      const r = run("npm", ["i", "-g", `${spec.package}@${version}`], { timeoutMs: 180_000 });
      return { ok: r.ok, detail: r.ok ? `npm i -g ${spec.package}@${version}` : r.stderr.slice(0, 200) };
    }
    case "cargo": {
      const r = run("cargo", ["install", spec.package, "--version", version], { timeoutMs: 600_000 });
      return { ok: r.ok, detail: r.ok ? `cargo install ${spec.package}` : r.stderr.slice(0, 200) };
    }
    case "skill": {
      // Cross-agent skills install via vercel-labs/skills (`npx skills add`).
      const r = run("npx", ["-y", "skills", "add", spec.package], { timeoutMs: 180_000 });
      return { ok: r.ok, detail: r.ok ? `skills add ${spec.package}` : r.stderr.slice(0, 200) };
    }
  }
}

/**
 * Ensure an adapter binary/skill is available. Honors --no-install (configOnly)
 * and falls back gracefully when a toolchain is missing (PRD §12 risk row).
 */
export function ensureAdapter(
  adapter: AdapterDescriptor,
  opts: { install: boolean },
): InstallOutcome {
  const bin = binName(adapter.install);

  if (bin && hasBinary(bin)) {
    return { adapter: adapter.name, status: "present", detail: `${bin} already on PATH` };
  }

  if (!opts.install) {
    return { adapter: adapter.name, status: "config-only", detail: "skipped (--no-install)" };
  }

  if (!toolchainAvailable(adapter.install.kind)) {
    // Try fallback if its toolchain exists.
    if (adapter.fallback && toolchainAvailable(adapter.fallback.kind)) {
      const r = doInstall(adapter.fallback, adapter.version);
      if (r.ok) return { adapter: adapter.name, status: "installed", detail: r.detail };
    }
    return {
      adapter: adapter.name,
      status: "config-only",
      detail: `no ${adapter.install.kind} toolchain; config written, install ${adapter.install.package} manually`,
    };
  }

  const primary = doInstall(adapter.install, adapter.version);
  if (primary.ok) return { adapter: adapter.name, status: "installed", detail: primary.detail };

  if (adapter.fallback && toolchainAvailable(adapter.fallback.kind)) {
    const fb = doInstall(adapter.fallback, adapter.version);
    if (fb.ok) return { adapter: adapter.name, status: "installed", detail: `${fb.detail} (fallback)` };
  }

  return { adapter: adapter.name, status: "failed", detail: primary.detail };
}

/** Verify a binary adapter is callable after install (activation step). */
export function verifyAdapter(adapter: AdapterDescriptor): boolean {
  const bin = binName(adapter.install);
  if (!bin) return true; // skill-only adapters are verified by the host, not us
  return hasBinary(bin);
}
