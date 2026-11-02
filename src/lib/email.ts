import "server-only";
import { db, HttpError, checked } from "./server";
export async function runEmails() {
  if (!process.env.BREVO_API_KEY || !process.env.EMAIL_FROM)
    throw new HttpError(
      503,
      "Connect the email sender before running delivery.",
    );
  const rows = checked(
    await db().rpc("claim_emails", { p_limit: 10 }),
  ) as any[];
  let sent = 0,
    failed = 0;
  await Promise.all(
    rows.map(async (row) => {
      try {
        const res = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "api-key": process.env.BREVO_API_KEY!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sender: {
              email: process.env.EMAIL_FROM,
              name: process.env.EMAIL_FROM_NAME || "SCF Students Hub",
            },
            to: [{ email: row.recipient }],
            subject: row.subject,
            textContent: row.body,
            headers: { idempotencyKey: row.id },
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) throw new Error(`Email provider returned ${res.status}`);
        checked(
          await db()
            .from("email_outbox")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              lease_until: null,
              last_error: null,
            })
            .eq("id", row.id),
        );
        sent++;
      } catch (error) {
        await db()
          .from("email_outbox")
          .update({
            status: row.attempts >= 8 ? "failed" : "pending",
            next_attempt_at: new Date(
              Date.now() + Math.min(3600, 30 * 2 ** row.attempts) * 1000,
            ).toISOString(),
            lease_until: null,
            last_error:
              error instanceof Error ? error.message : "Delivery failed",
          })
          .eq("id", row.id);
        failed++;
      }
    }),
  );
  await db()
    .from("rate_limits")
    .delete()
    .lt("reset_at", new Date(Date.now() - 86400000).toISOString());
  await db()
    .from("access_tokens")
    .delete()
    .lt("expires_at", new Date(Date.now() - 86400000).toISOString());
  await db()
    .from("email_outbox")
    .update({ status: "failed", last_error: "Delivery attempts exhausted." })
    .eq("status", "sending")
    .gte("attempts", 8)
    .lt("lease_until", new Date().toISOString());
  return { processed: rows.length, sent, failed };
}
