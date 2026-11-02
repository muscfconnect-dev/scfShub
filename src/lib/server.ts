import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  createHash,
  randomBytes,
  timingSafeEqual,
  createHmac,
} from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  defaultSettings,
  hasPermission,
  type Staff,
  type Module,
  type Entry,
  type Trip,
  type Review,
} from "./domain";
export const configured = () =>
  !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
export function db() {
  if (!configured())
    throw new HttpError(
      503,
      "The hub is being connected. Please try again later.",
    );
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export async function authClient() {
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (all) => {
          try {
            all.forEach(({ name, value, options }) =>
              jar.set(name, value, options),
            );
          } catch {
            /* Server component refresh is handled by proxy. */
          }
        },
      },
    },
  );
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function staffUser(module?: Module) {
  if (!configured())
    throw new HttpError(
      503,
      "Staff login is not available yet. Please contact SCF.",
    );
  const auth = await authClient();
  const { data, error } = await auth.auth.getUser();
  if (error || !data.user)
    throw new HttpError(401, "Please sign in to continue.");
  const { data: staff } = await db()
    .from("staff")
    .select("*")
    .eq("id", data.user.id)
    .eq("active", true)
    .maybeSingle();
  if (!staff)
    throw new HttpError(
      403,
      "This account is not an active SCF staff account.",
    );
  if (module && !hasPermission(staff, module))
    throw new HttpError(403, "You do not have access to this area.");
  return staff as Staff;
}
export function checkOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  const configuredOrigin = new URL(process.env.NEXT_PUBLIC_SITE_URL || req.url)
    .origin;
  if (!origin || ![configuredOrigin, new URL(req.url).origin].includes(origin))
    throw new HttpError(403, "Please submit this form from the hub.");
}
export const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export const token = () => randomBytes(32).toString("hex");
export function siteUrl() {
  const s = process.env.NEXT_PUBLIC_SITE_URL;
  if (!s) throw new HttpError(503, "The website address is not configured.");
  return new URL(s).origin;
}
export function safeEqual(a: string, b: string) {
  return (
    a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))
  );
}
export async function limit(
  req: NextRequest,
  action: string,
  max = 10,
  seconds = 3600,
  extra = "",
) {
  const trusted =
    process.env.VERCEL === "1" || process.env.TRUST_PROXY_HEADERS === "true";
  const ip = trusted
    ? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    : "shared";
  if (!process.env.APP_SECRET)
    throw new HttpError(
      503,
      "This service is being set up. Please try again later.",
    );
  const key = createHmac("sha256", process.env.APP_SECRET)
    .update(`${action}:${ip}:${extra}`)
    .digest("hex");
  const { data, error } = await db().rpc("consume_rate", {
    p_key: key,
    p_limit: max,
    p_seconds: seconds,
  });
  if (error) throw new HttpError(503, "Please try again shortly.");
  if (!data)
    throw new HttpError(
      429,
      "Too many attempts. Please wait before trying again.",
    );
}
export async function captcha(value: string) {
  if (!process.env.TURNSTILE_SECRET_KEY) return;
  const r = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: value,
      }),
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!(await r.json()).success)
    throw new HttpError(400, "Complete the security check and try again.");
}
export async function body(req: NextRequest, max = 64000) {
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError(400, "Missing form data.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw new HttpError(413, "This request is too large.");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Invalid form data.");
  }
}
export function checked<T>(result: { data: T; error: any }): NonNullable<T> {
  if (result.error) {
    console.error("Database operation failed:", result.error.code);
    throw new HttpError(
      result.error.code === "23505" ? 409 : 400,
      result.error.code === "23505"
        ? "This record already exists. Open the existing record instead."
        : result.error.code === "23503"
          ? "This record is still in use. Archive it instead."
          : result.error.code === "P0001"
            ? result.error.message
            : "Unable to save the change. Check the fields and try again.",
    );
  }
  return result.data as NonNullable<T>;
}
export async function audit(
  staff: Staff,
  action: string,
  target: string,
  details: object = {},
) {
  const { error } = await db()
    .from("audit_log")
    .insert({ actor_id: staff.id, action, target_id: target, details });
  if (error) console.error("Audit insert failed", error.code);
}
export const caseCookie = (kind: string, ref: string) => `scf-${kind}-${ref}`;
export async function privateRecord(
  req: NextRequest,
  kind: "case" | "booking",
  reference: string,
) {
  if (!/^(SCF|TRP)-[A-F0-9]{12}$/.test(reference))
    throw new HttpError(404, "Request not found.");
  const secret = req.cookies.get(caseCookie(kind, reference))?.value;
  if (!secret)
    throw new HttpError(
      401,
      "Open your private email link or request a fresh one.",
    );
  const client = db();
  const { data: record } = await client
    .from(kind === "case" ? "cases" : "bookings")
    .select("*")
    .eq("reference", reference)
    .maybeSingle();
  if (!record) throw new HttpError(404, "Request not found.");
  const { data: access } = await client
    .from("access_tokens")
    .select("id")
    .eq("target_kind", kind)
    .eq("target_id", record.id)
    .eq("token_hash", hash(secret))
    .eq("kind", "session")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (!access)
    throw new HttpError(
      401,
      "Your private link has expired. Request a fresh link.",
    );
  return record;
}
async function readCatalogEntries(client: ReturnType<typeof db>) {
  let result: any[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = await client
      .from("entries")
      .select("*")
      .eq("status", "published")
      .neq("kind", "resource")
      .order("sort_order")
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + 499);
    if (page.error) return { data: null, error: page.error };
    result.push(...page.data);
    if (page.data.length < 500) break;
  }
  const resources = await client
    .from("entries")
    .select("*")
    .eq("status", "published")
    .eq("kind", "resource")
    .order("sort_order")
    .order("created_at", { ascending: false })
    .order("id")
    .range(0, 499);
  return resources.error
    ? { data: null, error: resources.error }
    : { data: [...result, ...resources.data], error: null };
}
async function readPublicData() {
  if (!configured())
    return {
      entries: [] as Entry[],
      trips: [] as Trip[],
      reviews: [] as Review[],
      settings: defaultSettings,
      connected: false,
    };
  const client = db();
  const [entries, trips, reviews, settings] = await Promise.all([
    readCatalogEntries(client),
    client
      .from("trips")
      .select("*")
      .in("status", ["published", "closed"])
      .order("departure_at"),
    client
      .from("reviews")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(500),
    client.from("settings").select("data").eq("id", 1).single(),
  ]);
  if (entries.error || trips.error || reviews.error || settings.error)
    throw new HttpError(
      503,
      "The hub is temporarily unavailable. Please try again shortly.",
    );
  const availability = checked(await client.rpc("trip_availability")) as {
    trip_id: string;
    confirmed_count: number;
  }[];
  return {
    entries: entries.data as Entry[],
    trips: trips.data.map((t) => ({
      ...t,
      confirmed_count: Number(
        availability.find((b) => b.trip_id === t.id)?.confirmed_count || 0,
      ),
    })) as Trip[],
    reviews: reviews.data as Review[],
    settings: { ...defaultSettings, ...settings.data.data },
    connected: true,
  };
}
export const publicData = cache(readPublicData);
export type HubData = Awaited<ReturnType<typeof publicData>>;
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
