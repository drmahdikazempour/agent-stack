#!/usr/bin/env node
import { main } from "../dist/cli.js";

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err?.stack ?? err);
    process.exit(1);
  });
