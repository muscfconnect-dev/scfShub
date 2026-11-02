# Environment variables

Use `.env.local` locally and your hosting provider’s environment settings in production.

| Variable                         | Where to get it / purpose                                                                                                 | Browser visible? |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `NEXT_PUBLIC_SITE_URL`           | Local `http://localhost:3000`, then your real HTTPS origin                                                                | Yes              |
| `NEXT_PUBLIC_SUPABASE_URL`       | Supabase project connection/API settings                                                                                  | Yes              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | Supabase public publishable key or legacy anon key                                                                        | Yes              |
| `SUPABASE_SERVICE_ROLE_KEY`      | Supabase server service-role key                                                                                          | **No**           |
| `APP_SECRET`                     | Generate 32 random bytes, hex encoded; salts rate-limit identifiers                                                       | **No**           |
| `CRON_SECRET`                    | Generate another 32 random bytes, hex encoded; protects retry job                                                         | **No**           |
| `R2_ACCOUNT_ID`                  | Cloudflare account’s R2 settings                                                                                          | No               |
| `R2_ACCESS_KEY_ID`               | R2 API token credentials                                                                                                  | **No**           |
| `R2_SECRET_ACCESS_KEY`           | R2 API token credentials                                                                                                  | **No**           |
| `R2_BUCKET_NAME`                 | Private R2 bucket name                                                                                                    | No               |
| `BREVO_API_KEY`                  | Brevo transactional email API key                                                                                         | **No**           |
| `EMAIL_FROM`                     | Verified Brevo sender email                                                                                               | No secret        |
| `EMAIL_FROM_NAME`                | Sender display name                                                                                                       | No secret        |
| `TRUST_PROXY_HEADERS`            | `false` directly; enable only behind a trusted proxy that replaces forwarded headers. Vercel is recognised automatically. | No               |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Optional Cloudflare Turnstile site key                                                                                    | Yes              |
| `TURNSTILE_SECRET_KEY`           | Optional matching Turnstile secret                                                                                        | **No**           |

Run `npm run check:env` to check presence. It does not print the values or contact providers.

For optional Turnstile, set both keys and add your live/local hostnames in its configuration. Public forms remain moderated/rate-limited without it.

If the app is directly exposed without trusted proxy headers, anonymous rate limits share a bucket. Use the trusted hosting platform/proxy configuration for accurate per-IP limits; never trust arbitrary client-supplied forwarded headers on an unprotected origin.

Official references consulted during implementation:

- https://supabase.com/docs/guides/auth/server-side/creating-a-client
- https://nextjs.org/docs/app/api-reference/functions/cookies
- https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/
- https://developers.cloudflare.com/r2/api/s3/presigned-urls/
