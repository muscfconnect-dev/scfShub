# Verification and handoff

## Checked during the build

- TypeScript checks.
- Next.js production compilation.
- Thirty-two automated tests using input validators and a real PostgreSQL engine through PGlite.
- The schema and upgrade migrations, RLS/role restrictions and privileged RPC grants.
- Course publication, faculty/department association checks, renamed taxonomy, shared courses, semester/level/session filters, unit totals and draft/archive visibility.
- Staff permissions, private one-time access, case verification and exclusive claiming.
- Receipt ownership, last-seat confirmation, repeated confirmation, cancellations and capacity changes.
- The last-active-owner rule, durable rate limits and email job leases.
- Production desktop browser checks of all 15 student sections, search, review dialog and staff-login screen. No horizontal overflow was observed at the tested desktop size. Authenticated admin screens and actual phone layouts still require live setup checks.
- The production dependency audit reported zero known vulnerabilities at packaging time.

These database tests exercise PostgreSQL functions, not a mocked copy of their implementation. PGlite uses one local connection; the row-locking design still requires a deployed Postgres integration check under concurrent requests before launch.

## Live-service checks after adding your keys

1. `npm run check:env`, `npm run typecheck`, `npm test`, `npm run build`.
2. Create the initial owner and sign in. Invite a second SCF member and complete its set-password link in another browser.
3. Verify password recovery. Deactivate a member and confirm that subsequent API access is refused.
4. Create a restricted staff account. Confirm it cannot open or mutate areas outside its permissions, including by calling API URLs directly.
5. Publish a test resource. Preview/download its actual file. Archive it and confirm public access stops.
6. Upload a banner, check readability, remove it and confirm gold fallback.
7. Add a school link and a WhatsApp invite. Check both destinations and the selected placement.
8. Submit a review. Confirm it stays hidden until approved.
9. Submit a complaint with an email you control. Verify the email and check all active SCF members receive a notification. Have two members attempt to claim the same case; only one should succeed.
10. Reply from staff, follow up as the student, close the case and test private-link recovery. Check that another browser without the private link cannot read the case.
11. Create a trip with one seat. Use two verified test bookings and actual test receipts. Confirm one seat, then confirm that the second cannot take it. Cancel the first and confirm the second can take the released seat.
12. Open a receipt as a transport officer and as its student. Confirm unauthorised browsers cannot access it. Do not submit real bank transfers merely to test the upload workflow.
13. Test a rejected receipt replacement, a cancellation request, trip cancellation and the resulting emails.
14. Call the cron endpoint without a bearer secret (must return 401), then with it (must process due jobs). Check failed-delivery status and retry.
15. Check the site on actual phones, including menu opening, swipeable filters, dialogs, keyboard focus and upload progress.

## External configuration not supplied

No live Supabase project, R2 bucket, Brevo sender or production domain was configured during this handoff. Provider delivery, real Auth emails and live file transfers must be verified with your own accounts. The source, migrations and integration code are included; credentials are not.

The site contains editable starter policy wording. SCF must approve its real support commitments, privacy/retention process, bank details and transport/refund terms before students rely on them.

## Course Catalogue checks after upgrading

Publish a faculty and two departments, then publish one shared course and one department-specific course. Verify each programme’s course list, level and semester filters, course units and status labels. Check that drafts are hidden, renaming the faculty/department preserves the course links, and archiving one department leaves shared courses visible to the other. Confirm an account with only content permission cannot create or edit courses.
