import readline from "node:readline";

/**
 * The single confirm prompt (PRD §3 step 3). A dependency-free stand-in for
 * @clack/prompts — we only ever need one yes/no, so a readline question keeps
 * the install lean. Defaults to yes (the [Y/n] contract).
 */
export function confirm(question: string, defaultYes = true): Promise<boolean> {
  if (!process.stdin.isTTY) return Promise.resolve(defaultYes);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const suffix = defaultYes ? " [Y/n] " : " [y/N] ";
  return new Promise((resolve) => {
    rl.question(question + suffix, (answer) => {
      rl.close();
      const a = answer.trim().toLowerCase();
      if (a === "") return resolve(defaultYes);
      resolve(a === "y" || a === "yes");
    });
  });
}
