# templates/

File generation in agent-stack is **deterministic and dependency-free**: the
templates live as typed string builders in [`src/generate/`](../src/generate/)
(`claude.ts`, `cursor.ts`, `mcp.ts`) rather than as external Handlebars files.

Keeping templates in TypeScript means:
- they are type-checked against the generation context,
- they are unit-tested with the golden-file snapshots in [`test/`](../test/),
- there is zero runtime dependency, so `npx agent-stack init` installs in seconds.

To change generated output, edit the relevant builder in `src/generate/` and run
`npm test` to update/verify snapshots.
