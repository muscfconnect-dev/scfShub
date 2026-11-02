import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
async function main() {
  const base = process.env.NEXT_PUBLIC_SITE_URL,
    secret = process.env.CRON_SECRET;
  if (!base || !secret)
    throw new Error("Set NEXT_PUBLIC_SITE_URL and CRON_SECRET first.");
  const r = await fetch(`${base.replace(/\/$/, "")}/api/cron/emails`, {
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(60000),
  });
  const v = await r.json();
  if (!r.ok) throw new Error(v.error || "Retry job failed.");
  console.log(v);
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
