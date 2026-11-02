# Architecture

The public site is rendered by the Next.js App Router. Interactive components handle search, filtering, forms, Motion transitions and CMS interaction. The supplied CSS is retained in two ordered layers; application styles adapt it to React and add CMS/private-page components. Photos and fonts are bundled locally.

All data access goes through the Next.js server. Supabase public/authenticated database roles have no access to application tables or privileged RPCs. Row-level security is enabled. A server-only service-role client is used after input validation, staff permission checks or private-session checks. Staff identity is revalidated with Supabase Auth `getUser`, then checked against the current staff record.

## Tables

- `entries`: typed CMS records, publication state, display order and content-specific data. Course records store stable faculty/department IDs, course code, level, semester, units, compulsory/elective status and optional session. Courses and taxonomy use the resources permission.
- `settings`: public-facing website settings; provider secrets stay in environment variables.
- `reviews`: course/place reviews and moderation state.
- `staff`: active role, notification email and module permissions; linked to Supabase Auth.
- `cases` / `case_messages`: private case metadata, assignments and conversations.
- `trips` / `bookings`: transport inventory, payment state and officer decisions.
- `files`: private R2 object metadata, upload ownership and readiness.
- `access_tokens`: hashed one-time email tokens and browser session secrets.
- `email_outbox`: persistent notification delivery, leases and retry state.
- `audit_log`: staff actions.
- `rate_limits`: durable anonymous endpoint throttling.

## Important workflows

Creation of a complaint or booking saves its initial verification email in the same PostgreSQL transaction. Opening an email link consumes a one-time token and sets an HttpOnly private-session cookie. The raw token is removed from the page URL after exchange. Tokens are stored as SHA-256 hashes; emailed access links expire after 24 hours and private browser sessions after 30 days.

Complaint claiming and replies are PostgreSQL functions. Only the assigned member can reply; an owner/admin can release an assignment. A student follow-up reopens a resolved case, while a closed case rejects further messages.

Transport confirmation locks the trip row before counting confirmed seats and updating the booking. Trip-capacity changes use the same lock. Booking cancellation releases a confirmed seat. A trip cancellation updates affected bookings and queues notifications in one transaction.

R2 uploads use five-minute signed PUT URLs. The finalisation step checks the stored size, content type and initial bytes. A resource/rule can reference only an uploaded document of the corresponding purpose; page images cannot attach receipts. Download access checks publication or staff/private-session ownership before issuing a two-minute signed GET URL.

Email workers claim due jobs with `FOR UPDATE SKIP LOCKED`. A five-minute lease prevents overlapping workers taking the same job; expired leases are recoverable. Retries back off up to one hour and stop after eight attempts. Provider timeouts can cause an ambiguous delivery; the outbox is designed for reliable retry rather than claiming mathematical exactly-once delivery across a third-party API.

## Hosting

The production target is a standard Next.js Node deployment such as Vercel. The project is independent of ChatGPT Sites hosting. No provider credentials or schema provisioning occur during a build. Public pages show their design without credentials; actions clearly remain unavailable until services are connected.

For a reverse proxy, configure the trusted originating-IP header path before enabling `TRUST_PROXY_HEADERS`. Vercel’s forwarded-header path is recognised automatically. Direct connections intentionally share an anonymous rate-limit bucket rather than trusting spoofable client headers.

## Course Catalogue upgrade

`202610220001_course_catalogue.sql` extends the CMS entry constraint, backfills existing department-to-faculty identifiers when a unique match exists, validates course data in PostgreSQL and adds an editable `/courses` page banner. Courses are published only against published faculties and departments. Public rendering resolves current names by identifier, filters unpublished taxonomy, and keeps shared courses available if one of their departments is archived.
