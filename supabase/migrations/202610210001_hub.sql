-- SCF Students' Hub. Run once in a fresh Supabase project's SQL editor.
create table public.staff (
 id uuid primary key references auth.users(id) on delete cascade,
 email text not null unique, notification_email text not null default '', display_name text not null,
 role text not null default 'staff' check(role in ('owner','admin','staff')),
 permissions text[] not null default '{}', active boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.entries (
 id uuid primary key default gen_random_uuid(),
 kind text not null check(kind in ('page','resource','place','group','sport','news','link','guide','rule','ad','faculty','department')),
 title text not null, slug text not null, summary text not null default '', body text not null default '', image text not null default '',
 status text not null default 'draft' check(status in ('draft','published','archived')),
 sort_order integer not null default 0, data jsonb not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(kind,slug)
);
create index entries_public on public.entries(kind,status,sort_order);
create index entries_data on public.entries using gin(data);
create table public.settings(id integer primary key default 1 check(id=1),data jsonb not null default '{}',updated_at timestamptz not null default now());
insert into public.settings default values;
create table public.reviews (
 id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('course','place')),
 title text not null,course_code text not null default '',course_name text not null default '',faculty text not null default '',department text not null default '',level text not null default '',
 place_id uuid references public.entries(id) on delete restrict,difficulty text not null default 'Moderate',study_hours text not null default '',
 rating integer not null check(rating between 1 and 5),body text not null,helped text not null default '',author_name text not null,
 status text not null default 'pending' check(status in ('pending','published','rejected')), created_at timestamptz not null default now()
);
create index reviews_public on public.reviews(status,kind,created_at desc);
create table public.cases (
 id uuid primary key default gen_random_uuid(), reference text not null unique,
 kind text not null check(kind in ('general','academic','hostel')),category text not null,subject text not null,name text not null,email text not null,
 hostel text not null default '', location text not null default '', status text not null default 'open' check(status in ('open','in_progress','resolved','closed')),
 assignee uuid references public.staff(id) on delete set null, verified_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index cases_inbox on public.cases(status,created_at desc) where verified_at is not null;
create table public.case_messages(id uuid primary key default gen_random_uuid(),case_id uuid not null references public.cases(id) on delete cascade,body text not null,author_id uuid references public.staff(id) on delete set null,from_student boolean not null default true,created_at timestamptz not null default now());
create table public.trips (
 id uuid primary key default gen_random_uuid(),title text not null,slug text not null unique,destination text not null,departure_at timestamptz not null,
 fare numeric(12,2) not null check(fare>=0),capacity integer not null check(capacity between 1 and 1000),meeting_point text not null default '',instructions text not null default '',booking_closes_at timestamptz not null,
 status text not null default 'draft' check(status in ('draft','published','closed','cancelled')),created_at timestamptz not null default now(),check(booking_closes_at<=departure_at)
);
create table public.bookings (
 id uuid primary key default gen_random_uuid(),reference text not null unique,trip_id uuid not null references public.trips(id) on delete restrict,
 name text not null,email text not null,phone text not null,
 status text not null default 'awaiting_verification' check(status in ('awaiting_verification','pending_receipt','pending','rejected','confirmed','cancelled')),
 verified_at timestamptz,receipt_id uuid,officer_note text not null default '',cancellation_requested boolean not null default false,
 verified_by uuid references public.staff(id) on delete set null,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create unique index booking_duplicate on public.bookings(trip_id,lower(email)) where status<>'cancelled';
create index bookings_trip on public.bookings(trip_id,status);
create table public.files (
 id uuid primary key default gen_random_uuid(),object_key text not null unique,filename text not null,mime text not null,size_bytes bigint not null check(size_bytes>0),
 purpose text not null check(purpose in ('image','resource','rule','receipt')),booking_id uuid references public.bookings(id) on delete cascade,
 uploaded_by uuid references public.staff(id) on delete set null,ready boolean not null default false,created_at timestamptz not null default now()
);
alter table public.bookings add constraint booking_receipt foreign key(receipt_id) references public.files(id) on delete set null;
create table public.access_tokens(id uuid primary key default gen_random_uuid(),target_kind text not null check(target_kind in ('case','booking')),target_id uuid not null,token_hash text not null unique,kind text not null check(kind in ('email','session')),expires_at timestamptz not null,used_at timestamptz,created_at timestamptz not null default now());
create index access_lookup on public.access_tokens(target_kind,target_id,token_hash);
create table public.email_outbox(id uuid primary key default gen_random_uuid(),recipient text not null,subject text not null,body text not null,dedupe_key text unique,status text not null default 'pending' check(status in ('pending','sending','sent','failed')),attempts integer not null default 0,next_attempt_at timestamptz not null default now(),lease_until timestamptz,sent_at timestamptz,last_error text,created_at timestamptz not null default now());
create index outbox_due on public.email_outbox(status,next_attempt_at);
create table public.audit_log(id bigint generated always as identity primary key,actor_id uuid references public.staff(id) on delete set null,action text not null,target_id text not null,details jsonb not null default '{}',created_at timestamptz not null default now());
create table public.rate_limits(key text primary key,hits integer not null,reset_at timestamptz not null);
create or replace function public.staff_allowed(p_staff uuid,p_module text) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from staff where id=p_staff and active and (role in ('owner','admin') or p_module=any(permissions)));$$;
create or replace function public.touch_updated() returns trigger language plpgsql as $$begin new.updated_at=now(); return new;end;$$;
create trigger entries_touch before update on public.entries for each row execute function public.touch_updated();
create trigger cases_touch before update on public.cases for each row execute function public.touch_updated();
create trigger bookings_touch before update on public.bookings for each row execute function public.touch_updated();
create or replace function public.protect_last_owner() returns trigger language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(731219);
 if old.role='owner' and old.active and (tg_op='DELETE' or new.role<>'owner' or not new.active) then
  if not exists(select 1 from staff where id<>old.id and role='owner' and active) then raise exception 'The last active owner cannot be removed.';end if;
 end if;
 if tg_op='DELETE' then return old;else return new;end if;
end;$$;
create trigger last_owner before update or delete on public.staff for each row execute function public.protect_last_owner();
create or replace function public.consume_rate(p_key text,p_limit integer,p_seconds integer) returns boolean language plpgsql security definer set search_path=public as $$
declare r rate_limits;begin
 insert into rate_limits(key,hits,reset_at) values(p_key,1,now()+make_interval(secs=>p_seconds)) on conflict(key) do update set hits=case when rate_limits.reset_at<=now() then 1 else rate_limits.hits+1 end,reset_at=case when rate_limits.reset_at<=now() then now()+make_interval(secs=>p_seconds) else rate_limits.reset_at end returning * into r;
 return r.hits<=p_limit;
end;$$;
create or replace function public.create_case(p_data jsonb,p_hash text,p_url text) returns text language plpgsql security definer set search_path=public as $$
declare c cases;begin
 insert into cases(reference,kind,category,subject,name,email,hostel,location) values('SCF-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),p_data->>'kind',p_data->>'category',p_data->>'subject',p_data->>'name',lower(p_data->>'email'),coalesce(p_data->>'hostel',''),coalesce(p_data->>'location','')) returning * into c;
 insert into case_messages(case_id,body) values(c.id,p_data->>'message');
 insert into access_tokens(target_kind,target_id,token_hash,kind,expires_at) values('case',c.id,p_hash,'email',now()+interval '24 hours');
 insert into email_outbox(recipient,subject,body,dedupe_key) values(c.email,'Confirm your SCF request · '||c.reference,'Confirm your email and open your private case: '||replace(p_url,'{reference}',c.reference)||E'\n\nReference: '||c.reference||E'\nThis link expires in 24 hours. Do not share it.','case-created-'||c.id);
 return c.reference;
end;$$;
create or replace function public.create_booking(p_data jsonb,p_hash text,p_url text) returns text language plpgsql security definer set search_path=public as $$
declare b bookings;t trips;begin
 select * into t from trips where id=(p_data->>'trip_id')::uuid for update;
 if not found or t.status<>'published' or t.booking_closes_at<=now() then raise exception 'Booking is closed for this trip.';end if;
 if (select count(*) from bookings where trip_id=t.id and status='confirmed')>=t.capacity then raise exception 'This trip is full.';end if;
 insert into bookings(reference,trip_id,name,email,phone) values('TRP-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),t.id,p_data->>'name',lower(p_data->>'email'),p_data->>'phone') returning * into b;
 insert into access_tokens(target_kind,target_id,token_hash,kind,expires_at) values('booking',b.id,p_hash,'email',now()+interval '24 hours');
 insert into email_outbox(recipient,subject,body,dedupe_key) values(b.email,'Verify your transport request · '||b.reference,'Confirm your email, see payment instructions and upload your receipt: '||replace(p_url,'{reference}',b.reference)||E'\n\nA seat is confirmed only after payment verification. This link expires in 24 hours.','booking-created-'||b.id);
 return b.reference;
end;$$;
create or replace function public.exchange_access(p_kind text,p_reference text,p_hash text,p_session_hash text) returns uuid language plpgsql security definer set search_path=public as $$
declare tid uuid;token_id uuid;was_verified boolean;member staff;begin
 if p_kind='case' then select id,verified_at is not null into tid,was_verified from cases where reference=p_reference for update;
 elsif p_kind='booking' then select id,verified_at is not null into tid,was_verified from bookings where reference=p_reference for update;
 else raise exception 'Invalid request.';end if;
 select id into token_id from access_tokens where target_kind=p_kind and target_id=tid and token_hash=p_hash and kind='email' and used_at is null and expires_at>now() for update;
 if token_id is null then raise exception 'This link has expired or was already used. Request a new link.';end if;
 update access_tokens set used_at=now() where id=token_id;
 insert into access_tokens(target_kind,target_id,token_hash,kind,expires_at) values(p_kind,tid,p_session_hash,'session',now()+interval '30 days');
 if p_kind='case' then
  update cases set verified_at=coalesce(verified_at,now()) where id=tid;
  if not was_verified then
   for member in select * from staff where active loop
    insert into email_outbox(recipient,subject,body,dedupe_key) values(coalesce(nullif(member.notification_email,''),member.email),'New SCF complaint · '||p_reference,'A student has verified a new complaint. Sign in to the secure SCF admin inbox to review and claim it. Reference: '||p_reference,'case-notify-'||tid||'-'||member.id) on conflict(dedupe_key) do nothing;
   end loop;
  end if;
 else update bookings set verified_at=coalesce(verified_at,now()),status=case when status='awaiting_verification' then 'pending_receipt' else status end where id=tid;end if;
 return tid;
end;$$;
create or replace function public.claim_case(p_case uuid,p_staff uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 if not staff_allowed(p_staff,'complaints') then raise exception 'Not authorised.';end if;
 update cases set assignee=p_staff,status='in_progress' where id=p_case and verified_at is not null and (assignee is null or assignee=p_staff) and status in ('open','in_progress');
 if not found then raise exception 'This case is closed or already claimed by another member.';end if;
end;$$;
create or replace function public.reply_case(p_case uuid,p_staff uuid,p_body text,p_status text) returns void language plpgsql security definer set search_path=public as $$
declare c cases;begin
 select * into c from cases where id=p_case for update;
 if c.verified_at is null or not staff_allowed(p_staff,'complaints') or c.assignee is distinct from p_staff then raise exception 'Claim this case before replying.';end if;
 if p_status not in ('in_progress','resolved','closed') then raise exception 'Invalid status.';end if;
 insert into case_messages(case_id,body,author_id,from_student) values(c.id,p_body,p_staff,false);
 update cases set status=p_status where id=c.id;
 insert into email_outbox(recipient,subject,body) values(c.email,'SCF replied · '||c.reference,'There is a new reply on your private SCF case. Open your saved case link, or recover access from the Ask SCF page. Reference: '||c.reference);
end;$$;
create or replace function public.student_reply(p_case uuid,p_body text) returns void language plpgsql security definer set search_path=public as $$
declare c cases;member staff;begin
 select * into c from cases where id=p_case for update;
 if c.verified_at is null or c.status='closed' then raise exception 'This case is closed.';end if;
 insert into case_messages(case_id,body) values(c.id,p_body);
 update cases set status=case when assignee is null then 'open' else 'in_progress' end where id=c.id;
 for member in select * from staff where active and staff_allowed(id,'complaints') and (c.assignee is null or id=c.assignee) loop
  insert into email_outbox(recipient,subject,body) values(coalesce(nullif(member.notification_email,''),member.email),'Student follow-up · '||c.reference,'A student replied to their case. Open the secure SCF complaints inbox. Reference: '||c.reference);
 end loop;
end;$$;
create or replace function public.submit_receipt(p_booking uuid,p_file uuid) returns void language plpgsql security definer set search_path=public as $$
declare b bookings;member staff;begin
 select * into b from bookings where id=p_booking for update;
 if b.verified_at is null or b.status not in ('pending_receipt','rejected','pending') then raise exception 'This booking cannot accept a receipt.';end if;
 if not exists(select 1 from files where id=p_file and booking_id=b.id and ready and purpose='receipt') then raise exception 'Upload a valid receipt first.';end if;
 if exists(select 1 from trips where id=b.trip_id and status='cancelled') then raise exception 'This trip is cancelled.';end if;
 update bookings set receipt_id=p_file,status='pending',officer_note='' where id=b.id;
 for member in select * from staff where active and staff_allowed(id,'transport') loop
  insert into email_outbox(recipient,subject,body) values(coalesce(nullif(member.notification_email,''),member.email),'Transport receipt ready · '||b.reference,'A receipt is ready for verification in the secure transport dashboard. Reference: '||b.reference);
 end loop;
end;$$;
create or replace function public.review_booking(p_booking uuid,p_staff uuid,p_decision text,p_note text) returns void language plpgsql security definer set search_path=public as $$
declare b bookings;t trips;tripid uuid;begin
 if not staff_allowed(p_staff,'transport') then raise exception 'Not authorised.';end if;
 select trip_id into tripid from bookings where id=p_booking;
 select * into t from trips where id=tripid for update;
 select * into b from bookings where id=p_booking for update;
 if b.id is null then raise exception 'Booking not found.';end if;
 if p_decision not in ('confirmed','rejected','cancelled') then raise exception 'Invalid decision.';end if;
 if p_decision='confirmed' then
  if b.status='confirmed' then return;end if;
  if b.status<>'pending' or b.receipt_id is null or b.verified_at is null or t.status not in ('published','closed') then raise exception 'This booking is not ready for confirmation.';end if;
  if (select count(*) from bookings where trip_id=t.id and status='confirmed')>=t.capacity then raise exception 'No seats remain. Do not confirm this payment; contact the student.';end if;
 elsif p_decision='rejected' and b.status<>'pending' then raise exception 'Only pending receipts can be rejected.';
 elsif p_decision='cancelled' and b.status='cancelled' then return;
 end if;
 update bookings set status=p_decision,officer_note=p_note,verified_by=p_staff,cancellation_requested=false where id=b.id;
 insert into email_outbox(recipient,subject,body) values(b.email,'Transport update · '||b.reference,'Your booking is now '||p_decision||'. Open your private booking page for the officer’s note and details. Reference: '||b.reference);
 insert into audit_log(actor_id,action,target_id,details) values(p_staff,'booking.'||p_decision,b.id::text,jsonb_build_object('note',p_note));
end;$$;
create or replace function public.update_trip(p_id uuid,p_staff uuid,p_data jsonb) returns void language plpgsql security definer set search_path=public as $$
declare t trips;b bookings;begin
 if not staff_allowed(p_staff,'transport') then raise exception 'Not authorised.';end if;
 select * into t from trips where id=p_id for update;
 if not found then raise exception 'Trip not found.';end if;
 if (p_data->>'capacity')::integer<(select count(*) from bookings where trip_id=p_id and status='confirmed') then raise exception 'Capacity cannot be below confirmed bookings.';end if;
 update trips set title=p_data->>'title',slug=p_data->>'slug',destination=p_data->>'destination',departure_at=(p_data->>'departure_at')::timestamptz,fare=(p_data->>'fare')::numeric,capacity=(p_data->>'capacity')::integer,meeting_point=p_data->>'meeting_point',instructions=p_data->>'instructions',booking_closes_at=(p_data->>'booking_closes_at')::timestamptz,status=p_data->>'status' where id=p_id;
 if p_data->>'status'='cancelled' and t.status<>'cancelled' then
  for b in select * from bookings where trip_id=p_id and status<>'cancelled' loop
   update bookings set status='cancelled',officer_note='The transport team cancelled this trip. Contact SCF regarding any payment.',cancellation_requested=false where id=b.id;
   insert into email_outbox(recipient,subject,body) values(b.email,'Trip cancelled · '||b.reference,'Your trip was cancelled by the transport team. Open your private booking page for details and contact SCF regarding any payment.');
  end loop;
 end if;
end;$$;
create or replace function public.claim_emails(p_limit integer) returns setof email_outbox language sql security definer set search_path=public as $$
 update email_outbox set status='sending',lease_until=now()+interval '5 minutes',attempts=attempts+1 where id in (select id from email_outbox where ((status='pending' and next_attempt_at<=now()) or (status='sending' and lease_until<now())) and attempts<8 order by created_at for update skip locked limit least(p_limit,20)) returning *;
$$;
create or replace function public.trip_availability() returns table(trip_id uuid,confirmed_count bigint) language sql stable security definer set search_path=public as $$
 select t.id,count(b.id) from trips t left join bookings b on b.trip_id=t.id and b.status='confirmed' group by t.id;
$$;
-- Lock down every table and RPC. All access goes through the checked Next.js server.
do $$declare r record;begin
 for r in select tablename from pg_tables where schemaname='public' loop execute format('alter table public.%I enable row level security',r.tablename);execute format('revoke all on public.%I from anon,authenticated',r.tablename);execute format('grant all on public.%I to service_role',r.tablename);end loop;
end;$$;
revoke all on all sequences in schema public from anon,authenticated;
grant usage,select on all sequences in schema public to service_role;
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on all functions in schema public to service_role;
