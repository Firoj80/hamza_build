# Paid account platform

## What changed

- Idea-to-Income Fieldguide: **$5 USD**, separate one-time purchase, read inside the account.
- Launchpad Studio: **$19 USD**, separate one-time purchase, used inside the account.
- No public PDF URL or downloadable Studio HTML/ZIP is served by the website.
- Supabase email/password sign-in, per-account library and cloud-saved workspace.
- Dodo checkout is tied to a server-created checkout attempt and signed-in user.
- Payment confirmation is verified with Dodo and persisted in Supabase.
- Signed webhooks reconcile payments, refunds and disputes. Revocation is terminal for that payment; another valid purchase can restore access.

Supabase project created: `build-hamza-platform`, ref `bidskxehibuaqmomqvqp`, Mumbai (`ap-south-1`). The platform schema is already applied. It is retained in `database/platform-schema.sql`; do not re-run the non-idempotent CREATE statements on that same project.

## Environment variables

Use `.env.local` locally and the corresponding Vercel environment variables. Never commit secrets or put them in `NEXT_PUBLIC_` variables.

```
NEXT_PUBLIC_SITE_URL=https://your-domain.example
NEXT_PUBLIC_SUPABASE_URL=https://bidskxehibuaqmomqvqp.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SECRET_KEY=your-server-secret-key
DODO_PAYMENTS_ENVIRONMENT=test_mode
DODO_PAYMENTS_API_KEY=your-test-api-key
DODO_FIELDGUIDE_PRODUCT_ID=your-5-dollar-product-id
DODO_STUDIO_PRODUCT_ID=your-19-dollar-product-id
DODO_PAYMENTS_WEBHOOK_KEY=your-webhook-signing-secret
SUPPORT_EMAIL=your-real-support-email
SALES_DASHBOARD_ADMIN_EMAIL=alamtech9@gmail.com
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=your-posthog-project-token
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

PostHog is optional and starts collecting only after the project token is set. In PostHog, open Project settings and copy the **project API key/token** (the public `phc_...` token, never a personal `phx_...` key). Add it in `.env.local` and in Vercel as `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`; set `NEXT_PUBLIC_POSTHOG_HOST` to the ingestion host shown by your PostHog region, then redeploy. This integration records page views, product detail views, and checkout attempts; automatic click/form capture and session replay are disabled. The existing first-party visitor counter remains available independently.

The owner-only sales dashboard is available at `/sales` after signing in. `alamtech9@gmail.com` is the configured owner email; the authenticated Supabase account must use this address. It reports privacy-friendly unique visitor estimates, verified Dodo payment totals and product counts. Amounts include tax and exclude processor fees. Visitor analytics stores a daily HMAC token instead of raw IP addresses or user agents.

## Supabase Auth

In Authentication → URL Configuration, set Site URL to the exact deployed origin and add `https://your-domain.example/auth/callback` to the redirect allowlist. For local development, add `http://localhost:3000/auth/callback`. Enable email/password sign-in and keep Confirm email disabled for immediate signup. Configure production SMTP for password reset emails. The default email service has delivery/rate limits and is suitable for initial testing, not an assumed production mail service. Normal signup and sign-in use email/password and do not send verification emails. Test password recovery separately using your own email in the deployed environment.

## Dodo product setup

Create two **one-time**, fixed-price USD products in test mode:

1. Idea-to-Income Fieldguide: 500 cents ($5).
2. Launchpad Studio: 1900 cents ($19).

Do not attach digital-file entitlements or the old Studio ZIP to these products. Account access is fulfilled by this platform. If you already attached files to a previous Dodo product, detach them or create fresh platform products before live sales. This project does not silently modify existing Dodo settings.

Create a webhook endpoint at `https://your-domain.example/api/webhooks/dodo`. Subscribe to payment lifecycle, refund and dispute events. Put its signing secret in `DODO_PAYMENTS_WEBHOOK_KEY`. Test completed, pending, cancelled and refunded purchases. Test-mode products and keys are different from live-mode products and keys.

## Vercel

Root Directory: `launch-store`. Framework: Next.js. Install: `npm ci`. Build: `npm run build`. Node 22 or newer. Use the normal Next.js output directory. Environment variables must be set before deploying and must match the final domain.

The private workspace HTML and private guide PDF are explicitly included in server file tracing. They are not in `public/`. Authenticated responses are not cached. The workspace checks both login and Studio purchase before serving its UI, and the database enforces per-account workspace ownership.

## Security limits

This is access control, not DRM. Anything a browser renders can be inspected or copied by an authorised user. Removing download buttons does not make JavaScript or a PDF copy-proof. Login, server-side purchase checks, restricted database writes and refund/dispute revocation protect who can access the service. The user can copy their own generated plan text; the app itself is not offered as a downloadable product.

The old standalone copies, ZIPs and duplicate mockups were removed during cleanup. Deploy the `launch-store` directory directly to Vercel. Product listing images are in `../product-listing-images`; original research is in `../research`.

## Verification

- `npm test`: redirect, data validation, payment-access and webhook signature tests.
- `npm run build`: production build and TypeScript.
- `database/verify-access.sql`: transaction-only RLS/idempotency/revocation checks; all fixture rows are rolled back.
- `node tests/hosted-platform.mjs`: requires a running local server and Supabase secret. Creates temporary synthetic users without sending emails or charging money, verifies paid/unpaid access and cloud persistence, then deletes the accounts/fixtures.

Real Dodo transactions, production email delivery and Vercel deployment require the corresponding account settings/credentials and must be tested before opening sales.

Official documentation:
- https://supabase.com/docs/guides/auth/server-side/creating-a-client
- https://docs.dodopayments.com/developer-resources/checkout-session
- https://docs.dodopayments.com/developer-resources/webhooks

## Site URL validation

For this deployment set `NEXT_PUBLIC_SITE_URL=https://build-hamza.vercel.app` as a plain value, without Markdown link syntax or the variable name. The shared origin resolver trims quotes/whitespace and adds HTTPS for a bare domain. Invalid values fall back to Vercel's `VERCEL_PROJECT_PRODUCTION_URL`, then the known Build Hamza production domain on Vercel. Localhost is ignored on Vercel. Request Host/Origin headers never determine the trusted origin. Metadata, auth, checkout and workspace saves use the same resolver.

## Password account flow

`/login` defaults to Create account; existing customers can switch to Sign in. The server uses Supabase `signUp` / `signInWithPassword` with session cookies. Keep Confirm email OFF (the current project reports auto-confirm enabled). No service-role key is used to grant signup sessions. Existing magic-link users keep the same account and purchases; use Set or reset password with that email once. Recovery alone uses email and returns through `/auth/callback` to `/account/password`.

Verification: `node tests/password-auth.mjs` uses a disposable synthetic account with confirmation disabled; verifies instant signup, authenticated library, wrong-password rejection, logout, safe return URLs, setting a password and paid-access isolation. It sends no emails or charges, and deletes its test account.
