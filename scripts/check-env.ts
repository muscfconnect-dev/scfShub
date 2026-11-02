import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
const groups: Record<string, string[]> = {
  Application: ["NEXT_PUBLIC_SITE_URL", "APP_SECRET", "CRON_SECRET"],
  Supabase: [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ],
  Uploads: [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
  ],
  Email: ["BREVO_API_KEY", "EMAIL_FROM"],
};
let missing = false;
for (const [group, keys] of Object.entries(groups)) {
  console.log(`\n${group}`);
  for (const key of keys) {
    const ok = !!process.env[key];
    if (!ok) missing = true;
    console.log(`  ${ok ? "OK" : "MISSING"} ${key}`);
  }
}
for (const key of ["APP_SECRET", "CRON_SECRET"])
  if (process.env[key] && process.env[key]!.length < 32) {
    console.log(`${key} should contain at least 32 random characters.`);
    missing = true;
  }
if (
  !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY !==
  !!process.env.TURNSTILE_SECRET_KEY
) {
  console.log("Turnstile requires both its public and secret key.");
  missing = true;
}
console.log("\nValues are deliberately not printed.");
process.exitCode = missing ? 1 : 0;
