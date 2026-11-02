# Setup, from ZIP to running website

Use a **new Supabase project** for this application. The migration locks down the public schema; do not run it in a database belonging to another application.

## 1. Install and open

Install Node.js 22 or newer. Extract the ZIP, open the extracted `scf-students-hub` folder in VS Code and open its terminal.

```powershell
npm ci
Copy-Item .env.example .env.local
```

On macOS/Linux, the copy command is `cp .env.example .env.local`.

Keep `.env.local` private. It is excluded from Git. Never put the service-role key, R2 secret or Brevo key into a variable beginning with `NEXT_PUBLIC_`.

## 2. Supabase

1. Create a project at the Supabase dashboard.
2. Copy its project URL and public key into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Copy the server service-role key into `SUPABASE_SERVICE_ROLE_KEY`. The legacy service-role key is available under the project’s API-key settings. Use it only on the server.
4. Open SQL Editor. Run `supabase/migrations/202610210001_hub.sql`.
5. Run `supabase/migrations/202610210002_starter_content.sql`, then `supabase/migrations/202610220001_course_catalogue.sql`.
6. Under Authentication, turn **public sign-up off**. Only the local owner installer and authorised owners should create staff.
7. Set the Auth Site URL to your website address. Allow these redirect URLs for local development and your deployed domain:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/set-password`
   - `https://YOUR-DOMAIN/auth/callback`
   - `https://YOUR-DOMAIN/auth/set-password`

For staff invites and password recovery, configure a custom SMTP sender in Supabase Authentication. Brevo can supply SMTP credentials; its SMTP password/key is configured in Supabase, while `BREVO_API_KEY` is used separately by the application.

Use this link in both the **Invite user** and **Reset password** email templates so links work across browsers:

```html
<a
  href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type={{ .Type }}"
  >Open your SCF account</a
>
```

For an invitation template, `type=invite` may be used explicitly; for the recovery template use `type=recovery`. Set Supabase’s Site URL correctly for the environment sending the email. The app exchanges the one-time token, then opens `/auth/set-password`.

## 3. Generate application secrets

Run this command twice and use a different output each time:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Put one output into `APP_SECRET` and the other into `CRON_SECRET`. Do not reuse your Supabase or Brevo keys as these secrets.

## 4. Cloudflare R2 uploads

1. Create an R2 bucket. Keep it private.
2. Create an R2 API token with object read/write access restricted to that bucket.
3. Fill in `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` and `R2_BUCKET_NAME`.
4. In the bucket’s CORS configuration, add your actual origins:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://YOUR-DOMAIN"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Uploads go directly from the browser to R2 using short-lived signed URLs. The server checks size, content type and file signatures before attaching a file. Receipts stay private. Documents are served through expiring links; do not enable a public bucket endpoint for receipts.

Limits: images 10 MB; receipts 5 MB; academic documents 25 MB. Rules are PDF. Resources accept PDF, DOCX, PPTX and ZIP. This implementation validates file signatures; it does not claim to perform antivirus scanning.

## 5. Brevo application emails

1. Create a transactional API key in Brevo.
2. Verify the sender address/domain.
3. Set `BREVO_API_KEY`, `EMAIL_FROM` and `EMAIL_FROM_NAME`.

Student email verification, private-link recovery, complaint notifications and transport updates use this sender. Staff account invitation/recovery emails use Supabase Auth’s SMTP configuration from step 2.

The app attempts delivery after relevant submissions. The retry job handles failures, so configure it before launch.

## 6. First owner and local development

```powershell
npm run check:env
npm run setup:owner
npm run dev
```

The owner command asks for an email, name and hidden password. Use at least 12 characters. It creates a verified Supabase Auth account and an owner record. It does not print your password.

Open `http://localhost:3000/admin` and sign in. Invite the remaining SCF members from **SCF members**. Notifications use each member’s notification email, falling back to their login email. Owners can edit the notification address in SCF members. Owners manage accounts; admins manage the site; staff receive only the areas assigned to them.

## 7. Publish on Vercel

Push the extracted source folder to your own Git repository and import it into Vercel. Framework: Next.js. Install: `npm ci`. Build: `npm run build`. Use Node 22 or newer.

Add the environment variables in Vercel. Change `NEXT_PUBLIC_SITE_URL` to the real HTTPS origin. Add this origin to R2 CORS and Supabase redirect settings, then redeploy. Values starting with `NEXT_PUBLIC_` are included at build time, so changes require a new deployment.

No `vercel.json` cron is included: a service such as cron-job.org can call the retry endpoint without relying on a Vercel cron schedule.

## 8. Schedule retries

Create an HTTP job every 1–5 minutes:

- URL: `https://YOUR-DOMAIN/api/cron/emails`
- Method: GET
- Header name: `Authorization`
- Header value: `Bearer YOUR_CRON_SECRET`
- Timeout: at least 60 seconds if the scheduler supports it

Keep the secret in the header, never in the URL. Open **Email delivery** in admin to inspect failed attempts. You can also run `npm run email:retry` from a local terminal with the deployed origin in `.env.local`.

## 9. Add the real school content

In admin, configure the bank account, transport/cancellation terms, support message, footer and privacy wording. Add the official faculty/department list, real campus businesses, verified groups, sports schedules, trips and approved hostel rules. Replace generic food/sport image panels with real photos through Site settings.

Then complete `docs/VERIFICATION.md`. A successful build confirms the code compiles; it does not confirm your email provider, bucket or live Auth settings.

## Upgrading an already configured project

For the Course Catalogue update, run only `supabase/migrations/202610220001_course_catalogue.sql` against an existing hub database, then deploy this source version. Do not rerun the original schema migration. The upgrade adds the new content type and page and attaches existing departments to their matching faculty. It does not delete existing records.

Publish the faculties and departments, then add the approved courses under **Course Catalogue**. If an old department’s faculty name was ambiguous, edit that department once and choose its faculty. Students reach the list through **Academics → Course Catalogue**, the **Browse courses** callout on the archive, or `/courses`.
