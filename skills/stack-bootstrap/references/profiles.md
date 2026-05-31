# Profiles reference

A profile bundles a graph backend + compression tool + skill set + hook config.
`init` picks one automatically; `agent-stack profile use <name>` swaps it.

| Profile | Graph | Compression | Auto-picked when | License gate |
|---|---|---|---|---|
| `code` (default) | codegraph (MIT) | rtk (Apache-2.0) | normal code repo, no large media | — |
| `review` | code-review-graph (MIT) | rtk | >500 commits **and** CODEOWNERS present | — |
| `multimodal` | graphify (MIT) | rtk | ≥5 PDFs/video/large images detected | — |
| `spec` | codegraph | rtk | spec-kit / cc-spex detected | — |
| `research` | none | context-mode (ELv2) | `--profile research` | `--allow-noncommercial` |

Detection confidence < 0.7 is the only case where `init` asks the user to confirm the profile.
