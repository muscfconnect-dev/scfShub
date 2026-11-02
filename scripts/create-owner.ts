import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
loadEnvConfig(process.cwd());
async function password() {
  if (!stdin.isTTY)
    throw new Error("Run this command in an interactive terminal.");
  stdout.write("Owner password (12+ characters, hidden): ");
  stdin.setRawMode(true);
  stdin.resume();
  return new Promise<string>((resolve, reject) => {
    let value = "";
    const handler = (data: Buffer) => {
      for (const c of data.toString()) {
        if (c === "\u0003") {
          cleanup();
          reject(new Error("Cancelled."));
          return;
        }
        if (c === "\r" || c === "\n") {
          cleanup();
          resolve(value);
          return;
        }
        if (c === "\u007f" || c === "\b") value = value.slice(0, -1);
        else if (c >= " ") value += c;
      }
    };
    const cleanup = () => {
      stdin.off("data", handler);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
    };
    stdin.on("data", handler);
  });
}
async function main() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  )
    throw new Error(
      "Add the Supabase URL and service-role key to .env.local first.",
    );
  const rl = createInterface({ input: stdin, output: stdout });
  const email = (await rl.question("Owner email: ")).trim().toLowerCase(),
    display_name = (await rl.question("Owner full name: ")).trim();
  rl.close();
  const secret = await password();
  if (secret.length < 12 || !email.includes("@") || display_name.length < 2)
    throw new Error(
      "Use a valid email, name and password of at least 12 characters.",
    );
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: secret,
    email_confirm: true,
  });
  if (error || !data.user)
    throw new Error(error?.message || "Unable to create the owner.");
  const insert = await db.from("staff").insert({
    id: data.user.id,
    email,
    display_name,
    role: "owner",
    permissions: [],
    active: true,
  });
  if (insert.error) {
    await db.auth.admin.deleteUser(data.user.id);
    throw new Error(insert.error.message);
  }
  console.log("Owner created. Sign in at /admin.");
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
