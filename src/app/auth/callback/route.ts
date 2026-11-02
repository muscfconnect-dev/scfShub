import { NextRequest, NextResponse } from "next/server";
import { authClient, siteUrl } from "@/lib/server";
export async function GET(req: NextRequest) {
  const auth = await authClient();
  const code = req.nextUrl.searchParams.get("code"),
    token_hash = req.nextUrl.searchParams.get("token_hash"),
    type = req.nextUrl.searchParams.get("type");
  let success = false;
  if (code) {
    const { error } = await auth.auth.exchangeCodeForSession(code);
    success = !error;
  } else if (
    token_hash &&
    ["invite", "recovery", "email"].includes(type || "")
  ) {
    const { error } = await auth.auth.verifyOtp({
      token_hash,
      type: type as "invite" | "recovery" | "email",
    });
    success = !error;
  }
  return NextResponse.redirect(
    `${siteUrl()}${success ? "/auth/set-password" : "/admin?error=link-expired"}`,
  );
}
