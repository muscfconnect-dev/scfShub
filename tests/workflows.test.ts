import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
const pg = new PGlite();
const owner = randomUUID(),
  transport = randomUUID(),
  officerA = randomUUID(),
  officerB = randomUUID(),
  content = randomUUID();
async function scalar(sql: string, args: any[] = []) {
  return (await pg.query<any>(sql, args)).rows[0];
}
async function trip(capacity = 1) {
  return (
    await scalar(
      "insert into trips(title,slug,destination,departure_at,fare,capacity,booking_closes_at,status) values('Home trip',$1,'Enugu',now()+interval '30 days',3000,$2,now()+interval '29 days','published') returning id",
      [randomUUID(), capacity],
    )
  ).id;
}
async function booking(trip_id: string) {
  return (
    await scalar(
      "insert into bookings(reference,trip_id,name,email,phone,status,verified_at) values($1,$2,'Test student',$3,'08000000000','pending_receipt',now()) returning id",
      [
        `TRP-${randomUUID().slice(0, 8)}`,
        trip_id,
        `${randomUUID()}@example.test`,
      ],
    )
  ).id;
}
async function receipt(id: string) {
  const f = await scalar(
    "insert into files(object_key,filename,mime,size_bytes,purpose,booking_id,ready) values($1,'receipt.pdf','application/pdf',500,'receipt',$2,true) returning id",
    [randomUUID(), id],
  );
  await pg.query("select submit_receipt($1,$2)", [id, f.id]);
  return f.id;
}
before(async () => {
  await pg.exec(
    "create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);",
  );
  await pg.exec(
    await readFile("supabase/migrations/202610210001_hub.sql", "utf8"),
  );
  for (const [id, role, permissions] of [
    [owner, "owner", []],
    [transport, "staff", ["transport"]],
    [officerA, "staff", ["complaints"]],
    [officerB, "staff", ["complaints"]],
    [content, "staff", ["content"]],
  ] as const) {
    await pg.query("insert into auth.users values($1)", [id]);
    await pg.query(
      "insert into staff(id,email,display_name,role,permissions)values($1,$2,$3,$4,$5)",
      [id, `${id}@example.test`, role, role, permissions],
    );
  }
});
after(async () => {
  await pg.close();
});
test("fresh PostgreSQL migration creates every application table with RLS", async () => {
  const r = await scalar(
    "select count(*)::int as n from pg_class where relnamespace='public'::regnamespace and relkind='r' and relrowsecurity",
  );
  assert.equal(r.n, 13);
});
test("anonymous and authenticated roles cannot execute privileged workflows", async () => {
  assert.equal(
    (
      await scalar(
        "select has_function_privilege('anon','public.review_booking(uuid,uuid,text,text)','EXECUTE') as ok",
      )
    ).ok,
    false,
  );
  assert.equal(
    (
      await scalar(
        "select has_function_privilege('authenticated','public.claim_case(uuid,uuid)','EXECUTE') as ok",
      )
    ).ok,
    false,
  );
  assert.equal(
    (
      await scalar(
        "select has_table_privilege('anon','public.cases','SELECT') as ok",
      )
    ).ok,
    false,
  );
});
test("staff permissions are enforced inside transactional booking confirmation", async () => {
  const t = await trip(),
    b = await booking(t);
  await receipt(b);
  await assert.rejects(
    pg.query("select review_booking($1,$2,'confirmed','')", [b, content]),
    /Not authorised/,
  );
  assert.equal(
    (await scalar("select status from bookings where id=$1", [b])).status,
    "pending",
  );
});
test("only one payment can take the last seat; retries are idempotent", async () => {
  const t = await trip(),
    a = await booking(t),
    b = await booking(t);
  await receipt(a);
  await receipt(b);
  await pg.query("select review_booking($1,$2,'confirmed','checked')", [
    a,
    transport,
  ]);
  await pg.query("select review_booking($1,$2,'confirmed','checked')", [
    a,
    transport,
  ]);
  await assert.rejects(
    pg.query("select review_booking($1,$2,'confirmed','checked')", [
      b,
      transport,
    ]),
    /No seats remain/,
  );
  assert.equal(
    (
      await scalar(
        "select count(*)::int as n from bookings where trip_id=$1 and status='confirmed'",
        [t],
      )
    ).n,
    1,
  );
});
test("cancelling a confirmed booking releases capacity for another payment", async () => {
  const t = await trip(),
    a = await booking(t),
    b = await booking(t);
  await receipt(a);
  await receipt(b);
  await pg.query("select review_booking($1,$2,'confirmed','')", [a, transport]);
  await pg.query(
    "select review_booking($1,$2,'cancelled','Student requested')",
    [a, transport],
  );
  await pg.query("select review_booking($1,$2,'confirmed','')", [b, transport]);
  assert.equal(
    (await scalar("select status from bookings where id=$1", [b])).status,
    "confirmed",
  );
});
test("receipt ownership prevents a student attaching another booking’s receipt", async () => {
  const t = await trip(2),
    a = await booking(t),
    b = await booking(t),
    f = await receipt(a);
  await assert.rejects(
    pg.query("select submit_receipt($1,$2)", [b, f]),
    /valid receipt/,
  );
});
test("case creation saves complaint, message and verification email together", async () => {
  const result = await scalar("select create_case($1,$2,$3) as ref", [
    {
      kind: "hostel",
      category: "Water",
      subject: "No water in block",
      name: "Student",
      email: "student@example.test",
      message: "No water since yesterday. Please help.",
    },
    "case-secret",
    "https://hub.example/case/{reference}?token=secret",
  ]);
  const c = await scalar("select * from cases where reference=$1", [
    result.ref,
  ]);
  assert.equal(c.verified_at, null);
  assert.equal(
    (
      await scalar(
        "select count(*)::int as n from case_messages where case_id=$1",
        [c.id],
      )
    ).n,
    1,
  );
  await assert.rejects(
    pg.query("select claim_case($1,$2)", [c.id, officerA]),
    /closed or already claimed/,
  );
});
test("private access rejects invalid tokens, verifies email and consumes the link once", async () => {
  const result = await scalar("select create_case($1,$2,$3) as ref", [
    {
      kind: "general",
      category: "Welfare",
      subject: "Please help",
      name: "Student",
      email: "verify@example.test",
      message: "A detailed concern for SCF to review.",
    },
    "verified-secret",
    "https://hub.example/case/{reference}",
  ]);
  await assert.rejects(
    pg.query("select exchange_access($1,$2,$3,$4)", [
      "case",
      result.ref,
      "wrong",
      "session-wrong",
    ]),
    /expired or was already used/,
  );
  await pg.query("select exchange_access($1,$2,$3,$4)", [
    "case",
    result.ref,
    "verified-secret",
    "session-correct",
  ]);
  const c = await scalar("select * from cases where reference=$1", [
    result.ref,
  ]);
  assert.ok(c.verified_at);
  await assert.rejects(
    pg.query("select exchange_access($1,$2,$3,$4)", [
      "case",
      result.ref,
      "verified-secret",
      "session-again",
    ]),
    /expired or was already used/,
  );
  assert.equal(
    (
      await scalar(
        "select count(*)::int as n from email_outbox where dedupe_key like $1",
        [`case-notify-${c.id}-%`],
      )
    ).n,
    5,
  );
});
test("case claiming prevents a second member taking or replying to an assigned case", async () => {
  const c = await scalar(
    "insert into cases(reference,kind,category,subject,name,email,verified_at)values($1,'general','Welfare','Help','Student','case@example.test',now()) returning id",
    [randomUUID()],
  );
  await pg.query("select claim_case($1,$2)", [c.id, officerA]);
  await assert.rejects(
    pg.query("select claim_case($1,$2)", [c.id, officerB]),
    /already claimed/,
  );
  await assert.rejects(
    pg.query("select reply_case($1,$2,'Reply','resolved')", [c.id, officerB]),
    /Claim this case/,
  );
  await pg.query(
    "select reply_case($1,$2,'We are looking into it','resolved')",
    [c.id, officerA],
  );
  assert.equal(
    (await scalar("select status from cases where id=$1", [c.id])).status,
    "resolved",
  );
});
test("a closed complaint rejects student follow-ups", async () => {
  const c = await scalar(
    "insert into cases(reference,kind,category,subject,name,email,verified_at,status)values($1,'academic','Results','Help','Student','closed@example.test',now(),'closed') returning id",
    [randomUUID()],
  );
  await assert.rejects(
    pg.query("select student_reply($1,'New message')", [c.id]),
    /closed/,
  );
});
test("the final active owner cannot be deactivated or demoted", async () => {
  await assert.rejects(
    pg.query("update staff set active=false where id=$1", [owner]),
    /last active owner/,
  );
  await assert.rejects(
    pg.query("update staff set role='staff' where id=$1", [owner]),
    /last active owner/,
  );
});
test("rate limits persist across requests", async () => {
  assert.equal(
    (await scalar("select consume_rate('test',2,60) as ok")).ok,
    true,
  );
  assert.equal(
    (await scalar("select consume_rate('test',2,60) as ok")).ok,
    true,
  );
  assert.equal(
    (await scalar("select consume_rate('test',2,60) as ok")).ok,
    false,
  );
});
test("outbox leases prevent two workers claiming the same email", async () => {
  const a = (await pg.query<any>("select * from claim_emails(20)")).rows,
    b = (await pg.query<any>("select * from claim_emails(20)")).rows;
  assert.ok(a.length);
  assert.equal(a.filter((x) => b.some((y) => y.id === x.id)).length, 0);
});
test("trip capacity cannot be reduced below confirmed bookings", async () => {
  const t = await trip(2),
    b = await booking(t);
  await receipt(b);
  await pg.query("select review_booking($1,$2,'confirmed','')", [b, transport]);
  const data = {
    title: "Trip",
    slug: randomUUID(),
    destination: "Enugu",
    departure_at: new Date(Date.now() + 864000000).toISOString(),
    fare: 3000,
    capacity: 0,
    meeting_point: "Gate",
    instructions: "",
    booking_closes_at: new Date(Date.now() + 800000000).toISOString(),
    status: "published",
  };
  await assert.rejects(
    pg.query("select update_trip($1,$2,$3)", [t, transport, data]),
    /below confirmed/,
  );
});
test("cancelling a trip cancels its bookings and frees every seat", async () => {
  const t = await trip(2),
    b = await booking(t);
  await receipt(b);
  await pg.query("select review_booking($1,$2,'confirmed','')", [b, transport]);
  const data = {
    title: "Trip",
    slug: randomUUID(),
    destination: "Enugu",
    departure_at: new Date(Date.now() + 864000000).toISOString(),
    fare: 3000,
    capacity: 2,
    meeting_point: "Gate",
    instructions: "",
    booking_closes_at: new Date(Date.now() + 800000000).toISOString(),
    status: "cancelled",
  };
  await pg.query("select update_trip($1,$2,$3)", [t, transport, data]);
  assert.equal(
    (await scalar("select status from bookings where id=$1", [b])).status,
    "cancelled",
  );
});
test("starter content migration runs and publishes no invented reviews or trips", async () => {
  await pg.exec(
    await readFile(
      "supabase/migrations/202610210002_starter_content.sql",
      "utf8",
    ),
  );
  assert.equal(
    (
      await scalar(
        "select count(*)::int as n from entries where kind='link' and status='published'",
      )
    ).n,
    12,
  );
  assert.equal(
    (
      await scalar(
        "select count(*)::int as n from entries where kind in ('place','group') and status='published'",
      )
    ).n,
    0,
  );
});
