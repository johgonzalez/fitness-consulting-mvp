import { spawn } from "node:child_process";

// Keep the normal Next.js dev server while accepting supervised preview flags.
const args = process.argv.slice(2).flatMap((arg) => arg === "--strictPort" ? [] : [arg === "--host" ? "--hostname" : arg]);
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", ...args], { stdio: "inherit", env: process.env });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 1));
