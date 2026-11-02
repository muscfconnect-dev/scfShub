import { resolveCourseReferences } from "@/lib/curriculum";
import { NextRequest, NextResponse, after } from "next/server";
import { z, ZodError } from "zod";
import {
  db,
  authClient,
  staffUser,
  checkOrigin,
  limit,
  body,
  checked,
  json,
  HttpError,
  hash,
  token,
  siteUrl,
  privateRecord,
  caseCookie,
  audit,
  safeEqual,
  captcha,
  publicData,
} from "@/lib/server";
import {
  entrySchema,
  fieldSchemas,
  kindModule,
  reviewSchema,
  caseSchema,
  tripSchema,
  bookingSchema,
  hasPermission,
  modules,
  kinds,
  type Kind,
  type Staff,
  defaultSettings,
  type CourseData,
  type Entry,
} from "@/lib/domain";
import {
  fileTypes,
  maxSize,
  uploadUrl,
  verifyObject,
  downloadUrl,
} from "@/lib/storage";
import { runEmails } from "@/lib/email";
export const runtime = "nodejs";
export const maxDuration = 60;
const uuid = z.uuid();
function dispatchEmails() {
  after(async () => {
    try {
      await runEmails();
    } catch (error) {
      console.error(
        "Email delivery deferred:",
        error instanceof HttpError ? error.status : "provider unavailable",
      );
    }
  });
}
async function route(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const p = path.join("/");
  const method = req.method;
  if (p === "cron/emails") {
    const expected = process.env.CRON_SECRET;
    if (
      !expected ||
      !safeEqual(req.headers.get("authorization") || "", `Bearer ${expected}`)
    )
      throw new HttpError(401, "Unauthorised.");
    return json(await runEmails());
  }
  if (method !== "GET") checkOrigin(req);
  if (p === "public" && method === "GET") return json(await publicData());
  if (p === "catalog" && method === "GET") {
    const offset = z.coerce
        .number()
        .int()
        .min(0)
        .max(1000000)
        .parse(req.nextUrl.searchParams.get("offset") || 0),
      kind = req.nextUrl.searchParams.get("kind");
    if (req.nextUrl.searchParams.get("type") === "review") {
      const k = z.enum(["course", "place"]).parse(kind);
      return json({
        rows: checked(
          await db()
            .from("reviews")
            .select("*")
            .eq("status", "published")
            .eq("kind", k)
            .order("created_at", { ascending: false })
            .order("id")
            .range(offset, offset + 499),
        ),
      });
    }
    const k = z.enum(kinds).parse(kind);
    return json({
      rows: checked(
        await db()
          .from("entries")
          .select("*")
          .eq("status", "published")
          .eq("kind", k)
          .order("sort_order")
          .order("created_at", { ascending: false })
          .order("id")
          .range(offset, offset + 499),
      ),
    });
  }
  if (p === "search" && method === "GET") {
    const q = z
      .string()
      .trim()
      .min(2)
      .max(100)
      .parse(req.nextUrl.searchParams.get("q"));
    const client = db();
    const [a, b] = await Promise.all([
      client
        .from("entries")
        .select("*")
        .eq("status", "published")
        .ilike("title", `%${q}%`)
        .limit(25),
      client
        .from("entries")
        .select("*")
        .eq("status", "published")
        .in("kind", ["resource", "course"])
        .ilike("data->>course_code", `%${q}%`)
        .limit(25),
    ]);
    return json({
      rows: [
        ...new Map(
          [...checked(a), ...checked(b)].map((e) => [e.id, e]),
        ).values(),
      ].filter((e) => !["faculty", "department", "ad"].includes(e.kind)),
    });
  }
  if (p === "admin/records" && method === "GET") {
    const table = z
        .enum([
          "entries",
          "reviews",
          "cases",
          "trips",
          "bookings",
          "staff",
          "email_outbox",
          "audit_log",
        ])
        .parse(req.nextUrl.searchParams.get("table")),
      offset = z.coerce
        .number()
        .int()
        .min(0)
        .max(1000000)
        .parse(req.nextUrl.searchParams.get("offset") || 0);
    let module: any = (
      {
        reviews: "reviews",
        cases: "complaints",
        trips: "transport",
        bookings: "transport",
        staff: "staff",
        email_outbox: "settings",
        audit_log: "settings",
      } as any
    )[table];
    const kind =
      table === "entries"
        ? z.enum(kinds).parse(req.nextUrl.searchParams.get("kind"))
        : null;
    if (kind) module = kindModule(kind);
    const staff = await staffUser(module);
    if (table === "audit_log" && staff.role === "staff")
      throw new HttpError(403, "No access.");
    let query = db()
      .from(table)
      .select(
        table === "email_outbox"
          ? "id,recipient,subject,status,attempts,next_attempt_at,last_error,created_at,sent_at"
          : "*",
      )
      .order("created_at", { ascending: false })
      .order("id");
    if (kind) query = query.eq("kind", kind);
    if (table === "cases") query = query.not("verified_at", "is", null);
    return json({ rows: checked(await query.range(offset, offset + 499)) });
  }

  if (p === "auth/login" && method === "POST") {
    const v = z
      .object({ email: z.email(), password: z.string().min(1).max(200) })
      .parse(await body(req));
    await limit(req, "login", 15, 900);
    const auth = await authClient();
    const { data, error } = await auth.auth.signInWithPassword(v);
    if (error || !data.user)
      throw new HttpError(401, "Email or password is incorrect.");
    try {
      const s = await staffUser();
      return json({ staff: s });
    } catch (e) {
      await auth.auth.signOut();
      throw e;
    }
  }
  if (p === "auth/logout" && method === "POST") {
    const auth = await authClient();
    await auth.auth.signOut();
    return json({ ok: true });
  }
  if (p === "auth/forgot" && method === "POST") {
    const v = z.object({ email: z.email() }).parse(await body(req));
    await limit(req, "password-recovery", 5, 3600);
    const auth = await authClient();
    const { data } = await db()
      .from("staff")
      .select("id")
      .eq("email", v.email.toLowerCase())
      .eq("active", true)
      .maybeSingle();
    if (data)
      await auth.auth.resetPasswordForEmail(v.email, {
        redirectTo: `${siteUrl()}/auth/set-password`,
      });
    return json({
      message:
        "If this is an active staff account, a recovery email will be sent.",
    });
  }
  if (p === "auth/password" && method === "POST") {
    const v = z
      .object({ password: z.string().min(12).max(200) })
      .parse(await body(req));
    await staffUser();
    const auth = await authClient();
    const { error } = await auth.auth.updateUser({ password: v.password });
    if (error)
      throw new HttpError(
        400,
        "Unable to change the password. Open a fresh invitation or recovery link.",
      );
    return json({ ok: true });
  }
  if (p === "reviews" && method === "POST") {
    const v = reviewSchema.parse(await body(req));
    await limit(req, "review", 5, 3600);
    if (v.website) throw new HttpError(400, "Unable to submit this form.");
    await captcha(v.captcha);
    if (v.kind === "place") {
      const { data } = await db()
        .from("entries")
        .select("id")
        .eq("id", v.place_id!)
        .eq("kind", "place")
        .eq("status", "published")
        .maybeSingle();
      if (!data) throw new HttpError(400, "This campus spot is unavailable.");
    }
    const { website, captcha: ignored, ...record } = v;
    checked(
      await db()
        .from("reviews")
        .insert({ ...record, status: "pending" }),
    );
    return json(
      { message: "Thanks. Your review is waiting for SCF moderation." },
      201,
    );
  }
  if ((p === "cases" || p === "bookings") && method === "POST") {
    const kind = p === "cases" ? "case" : "booking";
    const v =
      kind === "case"
        ? caseSchema.parse(await body(req))
        : bookingSchema.parse(await body(req));
    await limit(req, `${kind}-create`, 5, 3600);
    if (v.website) throw new HttpError(400, "Unable to submit this form.");
    await captcha(v.captcha);
    if (!process.env.BREVO_API_KEY || !process.env.EMAIL_FROM)
      throw new HttpError(
        503,
        "Email verification is not available yet. Please contact SCF directly.",
      );
    const secret = token();
    const reference = checked(
      await db().rpc(kind === "case" ? "create_case" : "create_booking", {
        p_data: v,
        p_hash: hash(secret),
        p_url: `${siteUrl()}/${kind}/{reference}?token=${secret}`,
      }),
    );
    dispatchEmails();
    return json(
      {
        reference,
        message:
          "Check your email to verify this request and open your private page.",
      },
      201,
    );
  }
  if (p === "access" && method === "POST") {
    const v = z
      .object({
        kind: z.enum(["case", "booking"]),
        reference: z.string().regex(/^(SCF|TRP)-[A-F0-9]{12}$/),
        token: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .parse(await body(req));
    await limit(req, "access", 30, 900);
    const session = token();
    checked(
      await db().rpc("exchange_access", {
        p_kind: v.kind,
        p_reference: v.reference,
        p_hash: hash(v.token),
        p_session_hash: hash(session),
      }),
    );
    dispatchEmails();
    const res = json({ ok: true });
    res.cookies.set(caseCookie(v.kind, v.reference), session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api",
      maxAge: 2592000,
    });
    return res;
  }
  if (p === "recover" && method === "POST") {
    const v = z
      .object({
        kind: z.enum(["case", "booking"]),
        reference: z.string().max(40),
        email: z.email(),
      })
      .parse(await body(req));
    await limit(req, "recover-ip", 10, 3600);
    await limit(req, "recover-email", 3, 3600, hash(v.email.toLowerCase()));
    const { data: record } = await db()
      .from(v.kind === "case" ? "cases" : "bookings")
      .select("id,email,reference")
      .eq("reference", v.reference.toUpperCase())
      .eq("email", v.email.toLowerCase())
      .maybeSingle();
    if (record) {
      const secret = token();
      checked(
        await db()
          .from("access_tokens")
          .insert({
            target_kind: v.kind,
            target_id: record.id,
            token_hash: hash(secret),
            kind: "email",
            expires_at: new Date(Date.now() + 86400000).toISOString(),
          }),
      );
      checked(
        await db()
          .from("email_outbox")
          .insert({
            recipient: record.email,
            subject: `Your private SCF link · ${record.reference}`,
            body: `Open your private page: ${siteUrl()}/${v.kind}/${record.reference}?token=${secret}\n\nThis link expires in 24 hours. Do not share it.`,
          }),
      );
      dispatchEmails();
    }
    return json({
      message:
        "If those details match, a fresh private link will be emailed to you.",
    });
  }
  if ((path[0] === "cases" || path[0] === "bookings") && path.length === 2) {
    const kind = path[0] === "cases" ? "case" : "booking";
    const record = await privateRecord(req, kind, path[1]);
    if (method === "GET") {
      if (kind === "case") {
        const messages = checked(
          await db()
            .from("case_messages")
            .select("id,body,from_student,created_at")
            .eq("case_id", record.id)
            .order("created_at"),
        );
        const { data: member } = record.assignee
          ? await db()
              .from("staff")
              .select("display_name")
              .eq("id", record.assignee)
              .maybeSingle()
          : { data: null };
        return json({
          record,
          messages,
          assignee: member?.display_name || null,
        });
      }
      const trip = checked(
        await db().from("trips").select("*").eq("id", record.trip_id).single(),
      );
      const settings = checked(
        await db().from("settings").select("data").eq("id", 1).single(),
      );
      return json({
        record,
        trip,
        settings: { ...defaultSettings, ...settings.data },
      });
    }
    if (method === "POST") {
      await limit(req, `${kind}-followup`, 20, 3600, record.id);
      const data = await body(req);
      if (kind === "case") {
        const v = z
          .object({ message: z.string().trim().min(2).max(5000) })
          .parse(data);
        checked(
          await db().rpc("student_reply", {
            p_case: record.id,
            p_body: v.message,
          }),
        );
      } else if (data.action === "receipt") {
        const v = z.object({ file_id: uuid }).parse(data);
        checked(
          await db().rpc("submit_receipt", {
            p_booking: record.id,
            p_file: v.file_id,
          }),
        );
      } else if (data.action === "cancel") {
        if (record.status === "cancelled")
          throw new HttpError(400, "This booking is already cancelled.");
        checked(
          await db()
            .from("bookings")
            .update({ cancellation_requested: true })
            .eq("id", record.id),
        );
        const staff = checked(
          await db()
            .from("staff")
            .select("email,notification_email,role,permissions")
            .eq("active", true),
        );
        for (const s of staff.filter(
          (s) => s.role !== "staff" || s.permissions.includes("transport"),
        ))
          checked(
            await db()
              .from("email_outbox")
              .insert({
                recipient: s.notification_email || s.email,
                subject: `Cancellation requested · ${record.reference}`,
                body: `Review this request in the transport dashboard. Reference: ${record.reference}`,
              }),
          );
      } else throw new HttpError(400, "Unknown action.");
      dispatchEmails();
      return json({ ok: true });
    }
  }
  if (p === "uploads/sign" && method === "POST") {
    const v = z
      .object({
        purpose: z.enum(["image", "resource", "rule", "receipt"]),
        filename: z.string().min(1).max(180),
        mime: z.string().max(150),
        size: z.number().int().positive(),
        reference: z.string().optional(),
      })
      .parse(await body(req));
    if (!fileTypes[v.purpose].includes(v.mime) || v.size > maxSize(v.purpose))
      throw new HttpError(
        400,
        `Choose a supported file under ${maxSize(v.purpose) / 1048576} MB.`,
      );
    let booking_id: string | null = null,
      uploaded_by: string | null = null;
    if (v.purpose === "receipt") {
      const b = await privateRecord(req, "booking", v.reference || "");
      if (!["pending_receipt", "rejected", "pending"].includes(b.status))
        throw new HttpError(400, "This booking cannot accept a receipt.");
      booking_id = b.id;
      await limit(req, "receipt-upload", 12, 3600, b.id);
    } else {
      const s = await staffUser();
      if (
        (v.purpose === "resource" && !hasPermission(s, "resources")) ||
        (v.purpose === "rule" && !hasPermission(s, "content")) ||
        (v.purpose === "image" &&
          !["content", "resources", "settings"].some((m) =>
            hasPermission(s, m as any),
          ))
      )
        throw new HttpError(403, "Upload permission required.");
      uploaded_by = s.id;
    }
    const id = crypto.randomUUID(),
      key = `${v.purpose}/${id}/${crypto.randomUUID()}`;
    const url = await uploadUrl(key, v.mime);
    checked(
      await db().from("files").insert({
        id,
        object_key: key,
        filename: v.filename,
        mime: v.mime,
        size_bytes: v.size,
        purpose: v.purpose,
        booking_id,
        uploaded_by,
      }),
    );
    return json({ id, url });
  }
  if (p === "uploads/complete" && method === "POST") {
    const v = z
      .object({ id: uuid, reference: z.string().optional() })
      .parse(await body(req));
    const f = checked(
      await db().from("files").select("*").eq("id", v.id).single(),
    );
    if (f.purpose === "receipt") {
      const b = await privateRecord(req, "booking", v.reference || "");
      if (b.id !== f.booking_id) throw new HttpError(403, "No access.");
    } else {
      const s = await staffUser();
      if (f.uploaded_by !== s.id) throw new HttpError(403, "No access.");
    }
    if (!f.ready) {
      await verifyObject(f);
      checked(await db().from("files").update({ ready: true }).eq("id", f.id));
    }
    return json({ id: f.id, url: `/api/files/${f.id}` });
  }
  if (path[0] === "files" && path.length === 2 && method === "GET") {
    const id = uuid.parse(path[1]);
    const f = checked(
      await db()
        .from("files")
        .select("*")
        .eq("id", id)
        .eq("ready", true)
        .single(),
    );
    let allowed = false;
    if (f.purpose === "receipt") {
      try {
        await staffUser("transport");
        allowed = true;
      } catch {
        const { data: b } = await db()
          .from("bookings")
          .select("reference")
          .eq("id", f.booking_id)
          .single();
        if (b) {
          await privateRecord(req, "booking", b.reference);
          allowed = true;
        }
      }
    } else {
      const { data: attached } = await db()
        .from("entries")
        .select("id")
        .eq("status", "published")
        .or(`image.eq./api/files/${id},data->>file_id.eq.${id}`)
        .limit(1);
      const { data: settings } = await db()
        .from("settings")
        .select("data")
        .eq("id", 1)
        .single();
      allowed =
        !!attached?.length ||
        Object.values(settings?.data || {}).includes(`/api/files/${id}`);
      if (!allowed) {
        const s = await staffUser();
        allowed = ["content", "resources", "settings"].some((m) =>
          hasPermission(s, m as any),
        );
      }
    }
    if (!allowed) throw new HttpError(403, "No access.");
    const res = NextResponse.redirect(
      await downloadUrl(
        f,
        f.purpose === "image" ||
          (req.nextUrl.searchParams.get("preview") === "1" &&
            f.mime === "application/pdf"),
      ),
    );
    res.headers.set("Cache-Control", "private, no-store");
    return res;
  }
  if (p === "admin/me" && method === "GET")
    return json({ staff: await staffUser() });
  if (p === "admin/data" && method === "GET") {
    const s = await staffUser(),
      client = db();
    const query = async (table: string, allowed: boolean, select = "*") =>
      allowed
        ? checked(
            await client
              .from(table)
              .select(select)
              .order("created_at", { ascending: false })
              .order("id")
              .limit(500),
          )
        : [];
    const [entries, reviews, cases, trips, bookings, staff, outbox, auditLog] =
      await Promise.all([
        query(
          "entries",
          hasPermission(s, "content") || hasPermission(s, "resources"),
        ),
        query("reviews", hasPermission(s, "reviews")),
        hasPermission(s, "complaints")
          ? checked(
              await client
                .from("cases")
                .select("*")
                .not("verified_at", "is", null)
                .order("created_at", { ascending: false })
                .limit(500),
            )
          : [],
        query("trips", hasPermission(s, "transport")),
        query("bookings", hasPermission(s, "transport")),
        query(
          "staff",
          hasPermission(s, "staff"),
          "id,email,notification_email,display_name,role,permissions,active,created_at",
        ),
        query(
          "email_outbox",
          hasPermission(s, "settings"),
          "id,recipient,subject,status,attempts,next_attempt_at,last_error,created_at,sent_at",
        ),
        query("audit_log", s.role !== "staff"),
      ]);
    // Course editing needs the full faculty/department directory even when content is paginated.
    const taxonomy: Entry[] = [];
    if (hasPermission(s, "resources"))
      for (let offset = 0; ; offset += 500) {
        const batch = checked(
          await client
            .from("entries")
            .select("*")
            .in("kind", ["faculty", "department"])
            .order("id")
            .range(offset, offset + 499),
        );
        taxonomy.push(...(batch as Entry[]));
        if (batch.length < 500) break;
      }
    const settings = checked(
      await client.from("settings").select("data").eq("id", 1).single(),
    );
    const countRows = async (
      table: string,
      status: string,
      allowed: boolean,
    ) => {
      if (!allowed) return 0;
      let query = client
        .from(table)
        .select("id", { count: "exact", head: true });
      query =
        status === "attention"
          ? query.or("status.eq.pending,cancellation_requested.eq.true")
          : query.eq("status", status);
      if (table === "cases") query = query.not("verified_at", "is", null);
      if (table === "entries")
        query = query.in(
          "kind",
          kinds.filter((k) => hasPermission(s, kindModule(k))),
        );
      const r = await query;
      if (r.error) throw new HttpError(503, "Unable to load workspace totals.");
      return r.count || 0;
    };
    const [
      published,
      openCases,
      pendingReviews,
      pendingBookings,
      confirmedSeats,
      availability,
    ] = await Promise.all([
      countRows(
        "entries",
        "published",
        hasPermission(s, "content") || hasPermission(s, "resources"),
      ),
      countRows("cases", "open", hasPermission(s, "complaints")),
      countRows("reviews", "pending", hasPermission(s, "reviews")),
      countRows("bookings", "attention", hasPermission(s, "transport")),
      countRows("bookings", "confirmed", hasPermission(s, "transport")),
      hasPermission(s, "transport")
        ? client.rpc("trip_availability")
        : Promise.resolve({ data: [], error: null }),
    ]);
    const summary = {
      published,
      openCases,
      pendingReviews,
      pendingBookings,
      confirmedSeats,
    };
    return json({
      staff: s,
      summary,
      availability: checked(availability),
      entries: [
        ...new Map([...(entries as unknown as Entry[]), ...taxonomy].map((e) => [e.id, e])).values(),
      ].filter((e: any) => hasPermission(s, kindModule(e.kind))),
      reviews,
      cases,
      trips,
      bookings,
      members: staff,
      outbox,
      audit: auditLog,
      settings: { ...defaultSettings, ...settings.data },
    });
  }
  if (p === "admin/entries" && method === "POST") {
    const raw = await body(req),
      v = entrySchema.parse(raw),
      s = await staffUser(kindModule(v.kind));
    v.data = fieldSchemas[v.kind].parse(v.data);
    if (v.kind === "course") {
      const course = v.data as CourseData;
      const related = checked(
        await db()
          .from("entries")
          .select("*")
          .in("id", [course.faculty_id, ...course.department_ids]),
      );
      try {
        v.data = resolveCourseReferences(
          course,
          related as Entry[],
          v.status === "published",
        );
      } catch (error) {
        throw new HttpError(400, (error as Error).message);
      }
    }
    if (v.kind === "department" && v.data.faculty_id) {
      const faculty = checked(
        await db()
          .from("entries")
          .select("title,status")
          .eq("id", v.data.faculty_id)
          .eq("kind", "faculty")
          .neq("status", "archived")
          .maybeSingle(),
      );
      if (!faculty) throw new HttpError(400, "Choose an existing faculty.");
      if (v.status === "published" && faculty.status !== "published")
        throw new HttpError(
          400,
          "Publish this faculty before publishing its department.",
        );
      v.data.faculty = faculty.title;
    }

    if (v.kind === "resource")
      v.data.departments = (v.data.departments as string[])
        .map((x: string) => x.trim())
        .filter(Boolean);
    if (
      v.kind === "ad" &&
      v.data.starts_at &&
      v.data.ends_at &&
      new Date(String(v.data.ends_at)) <= new Date(String(v.data.starts_at))
    )
      throw new HttpError(400, "The advert must end after it starts.");
    if (v.data.file_id) {
      const f = checked(
        await db()
          .from("files")
          .select("purpose")
          .eq("id", v.data.file_id)
          .eq("ready", true)
          .single(),
      );
      if (f.purpose !== (v.kind === "resource" ? "resource" : "rule"))
        throw new HttpError(400, "Choose the correct document type.");
    }
    if (v.image.startsWith("/api/files/")) {
      const f = checked(
        await db()
          .from("files")
          .select("purpose")
          .eq("id", v.image.slice(11))
          .eq("ready", true)
          .single(),
      );
      if (f.purpose !== "image")
        throw new HttpError(400, "Choose an image file.");
    }
    if (raw.id) {
      uuid.parse(raw.id);
      const old = checked(
        await db().from("entries").select("kind").eq("id", raw.id).single(),
      );
      if (old.kind !== v.kind)
        throw new HttpError(400, "The content type cannot be changed.");
      checked(await db().from("entries").update(v).eq("id", raw.id));
    } else checked(await db().from("entries").insert(v));
    await audit(s, "content.save", raw.id || v.slug, { kind: v.kind });
    return json({ ok: true });
  }
  if (p === "admin/archive" && method === "POST") {
    const v = z.object({ id: uuid }).parse(await body(req));
    const e = checked(
      await db().from("entries").select("kind").eq("id", v.id).single(),
    );
    const s = await staffUser(kindModule(e.kind));
    checked(
      await db().from("entries").update({ status: "archived" }).eq("id", v.id),
    );
    await audit(s, "content.archive", v.id);
    return json({ ok: true });
  }
  if (p === "admin/reviews" && method === "POST") {
    const s = await staffUser("reviews"),
      v = z
        .object({
          id: uuid,
          status: z.enum(["pending", "published", "rejected"]),
        })
        .parse(await body(req));
    checked(
      await db().from("reviews").update({ status: v.status }).eq("id", v.id),
    );
    await audit(s, `review.${v.status}`, v.id);
    return json({ ok: true });
  }
  if (p === "admin/cases" && method === "POST") {
    const s = await staffUser("complaints"),
      v = z
        .object({
          id: uuid,
          action: z.enum(["claim", "reply", "release"]),
          message: z.string().trim().max(5000).optional(),
          status: z
            .enum(["in_progress", "resolved", "closed"])
            .default("in_progress"),
        })
        .parse(await body(req));
    if (v.action === "claim")
      checked(await db().rpc("claim_case", { p_case: v.id, p_staff: s.id }));
    if (v.action === "reply") {
      if (!v.message) throw new HttpError(400, "Write a reply.");
      checked(
        await db().rpc("reply_case", {
          p_case: v.id,
          p_staff: s.id,
          p_body: v.message,
          p_status: v.status,
        }),
      );
      dispatchEmails();
    }
    if (v.action === "release") {
      if (s.role === "staff")
        throw new HttpError(403, "Only an admin can release a case.");
      checked(
        await db()
          .from("cases")
          .update({ assignee: null, status: "open" })
          .eq("id", v.id),
      );
    }
    await audit(s, `case.${v.action}`, v.id);
    return json({ ok: true });
  }
  if (
    path[0] === "admin" &&
    path[1] === "case" &&
    path[2] &&
    method === "GET"
  ) {
    await staffUser("complaints");
    const id = uuid.parse(path[2]);
    return json({
      messages: checked(
        await db()
          .from("case_messages")
          .select("*")
          .eq("case_id", id)
          .order("created_at"),
      ),
    });
  }
  if (p === "admin/trips" && method === "POST") {
    const raw = await body(req),
      v = tripSchema.parse(raw),
      s = await staffUser("transport");
    if (raw.id)
      checked(
        await db().rpc("update_trip", {
          p_id: uuid.parse(raw.id),
          p_staff: s.id,
          p_data: v,
        }),
      );
    else checked(await db().from("trips").insert(v));
    await audit(s, "trip.save", raw.id || v.slug);
    dispatchEmails();
    return json({ ok: true });
  }
  if (p === "admin/bookings" && method === "POST") {
    const s = await staffUser("transport"),
      v = z
        .object({
          id: uuid,
          decision: z.enum(["confirmed", "rejected", "cancelled"]),
          note: z.string().trim().max(2000).default(""),
        })
        .parse(await body(req));
    if (v.decision !== "confirmed" && v.note.length < 3)
      throw new HttpError(400, "Add a note explaining the decision.");
    checked(
      await db().rpc("review_booking", {
        p_booking: v.id,
        p_staff: s.id,
        p_decision: v.decision,
        p_note: v.note,
      }),
    );
    dispatchEmails();
    return json({ ok: true });
  }
  if (p === "admin/settings" && method === "POST") {
    const s = await staffUser("settings"),
      v = z.record(z.string(), z.string().max(30000)).parse(await body(req));
    const data = Object.fromEntries(
      Object.keys(defaultSettings)
        .filter((k) => k in v)
        .map((k) => [k, v[k]]),
    );
    for (const [k, value] of Object.entries(data)) {
      if (
        k.endsWith("_image") &&
        value &&
        !/^\/(?!\/)/.test(value) &&
        !/^https:\/\//.test(value)
      )
        throw new HttpError(400, "Choose a valid image URL.");
      if (k.endsWith("_image") && value.startsWith("/api/files/")) {
        const f = checked(
          await db()
            .from("files")
            .select("purpose")
            .eq("id", uuid.parse(value.slice(11)))
            .eq("ready", true)
            .single(),
        );
        if (f.purpose !== "image")
          throw new HttpError(400, "Use an image upload.");
      }
    }
    checked(
      await db()
        .from("settings")
        .update({ data, updated_at: new Date().toISOString() })
        .eq("id", 1),
    );
    await audit(s, "settings.save", "1");
    return json({ ok: true });
  }
  if (p === "admin/staff" && method === "POST") {
    const s = await staffUser("staff");
    if (s.role !== "owner")
      throw new HttpError(403, "Only an owner can manage staff.");
    const v = z
      .object({
        id: uuid.optional(),
        email: z.email(),
        notification_email: z.email().or(z.literal("")).default(""),
        display_name: z.string().trim().min(2).max(100),
        role: z.enum(["owner", "admin", "staff"]),
        permissions: z.array(z.enum(modules)),
        active: z.boolean(),
      })
      .parse(await body(req));
    const { id, ...record } = v;
    record.email = record.email.toLowerCase();
    if (id) {
      const old = checked(
        await db().from("staff").select("email").eq("id", id).single(),
      );
      if (old.email !== record.email)
        throw new HttpError(400, "Staff email cannot be changed here.");
      checked(await db().from("staff").update(record).eq("id", id));
    } else {
      const { data, error } = await db().auth.admin.inviteUserByEmail(
        record.email,
        { redirectTo: `${siteUrl()}/auth/set-password` },
      );
      if (error || !data.user)
        throw new HttpError(
          400,
          "Unable to invite this address. Check that it is not already registered and email delivery is configured in Supabase.",
        );
      const insert = await db()
        .from("staff")
        .insert({ id: data.user.id, ...record });
      if (insert.error) {
        await db().auth.admin.deleteUser(data.user.id);
        checked(insert);
      }
    }
    await audit(s, "staff.save", id || record.email);
    return json({ ok: true });
  }
  if (p === "admin/emails/retry" && method === "POST") {
    const s = await staffUser("settings"),
      v = z.object({ id: uuid }).parse(await body(req));
    checked(
      await db()
        .from("email_outbox")
        .update({
          status: "pending",
          attempts: 0,
          next_attempt_at: new Date().toISOString(),
          last_error: null,
          lease_until: null,
        })
        .eq("id", v.id)
        .in("status", ["failed", "pending"]),
    );
    await audit(s, "email.retry", v.id);
    dispatchEmails();
    return json({ ok: true });
  }
  throw new HttpError(404, "This page or action was not found.");
}
async function handle(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  try {
    return await route(req, ctx);
  } catch (e) {
    if (e instanceof ZodError)
      return json(
        {
          error: e.issues
            .map((i) => `${i.path.join(".") || "Form"}: ${i.message}`)
            .join("\n"),
        },
        400,
      );
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error("Request failed", e instanceof Error ? e.name : "unknown");
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
}
export { handle as GET, handle as POST };
