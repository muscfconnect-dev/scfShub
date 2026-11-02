"use client";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { api, Notice, Submit } from "@/components/ui";
export default function Page() {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      const c = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      );
      void c.auth.getSession().then(() => {
        if (window.location.hash)
          window.history.replaceState({}, "", window.location.pathname);
      });
    }
  }, []);
  return (
    <main className="auth-page">
      <form
        className="stack-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const f = new FormData(e.currentTarget);
          if (f.get("password") !== f.get("confirm")) {
            setError("Passwords do not match.");
            setBusy(false);
            return;
          }
          try {
            await api("auth/password", { password: f.get("password") });
            setMessage("Password saved. You can open the admin now.");
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h1>Set your staff password.</h1>
        <p>Use at least 12 characters.</p>
        <label>
          New password
          <input
            type="password"
            name="password"
            required
            minLength={12}
            autoComplete="new-password"
          />
        </label>
        <label>
          Confirm password
          <input
            type="password"
            name="confirm"
            required
            minLength={12}
            autoComplete="new-password"
          />
        </label>
        {error && <Notice error>{error}</Notice>}
        {message ? (
          <Notice>
            {message} <a href="/admin">Open admin</a>
          </Notice>
        ) : (
          <Submit busy={busy}>Save password</Submit>
        )}
      </form>
    </main>
  );
}
