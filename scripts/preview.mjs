import { spawn } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url),
  args = process.argv.slice(2);
let host = "0.0.0.0",
  port = "3000";
for (let i = 0; i < args.length; i++) {
  if (["--host", "--hostname"].includes(args[i])) host = args[++i];
  else if (["--port", "-p"].includes(args[i])) port = args[++i];
  else if (args[i] !== "--strictPort")
    throw new Error(`Unknown option: ${args[i]}`);
}
const child = spawn(
  process.execPath,
  [
    require.resolve("next/dist/bin/next"),
    "start",
    "--hostname",
    host,
    "--port",
    port,
  ],
  { stdio: "inherit" },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 1));
