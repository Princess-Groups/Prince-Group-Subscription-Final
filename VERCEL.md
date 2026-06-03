# Vercel Deployment

This project runs as a **static SPA + serverless API on Vercel**.

## How it works

- **Frontend** — `npm run build` runs the Vite/TanStack Start build in
  **SPA mode** (`vite.config.ts`). It prerenders every route to a static
  `index.html` in `dist/client/`. Vercel serves those files directly.
- **API** — `api/[route].ts` is a Vercel serverless function. The frontend
  POSTs to `/api/<route>` (same origin) and the function dispatches to the
  same six handlers the old Cloudflare Worker exposed:
  `save-payment`, `create-razorpay-order`, `confirm-razorpay-payment`,
  `cancel-subscription`, `send-whatsapp`, `razorpay-webhook`.

## Deploy

1. Push to GitHub (or GitLab/Bitbucket).
2. Import the project in [Vercel](https://vercel.com/new). Vercel detects
   `vercel.json` automatically and uses:
   - Build command: `npm run build`
   - Output directory: `dist/client`

### What's already configured (no action needed)

The file **`.env.production`** is committed to the repo and contains the
**public, publishable** env vars Vite needs at build time. These values
are designed to be public — they end up in the browser bundle either way:

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public anon/publishable key |
| `VITE_SUPABASE_PROJECT_ID` | Project ID |
| `VITE_RAZORPAY_KEY_ID` | Live Razorpay key ID (`rzp_live_*`) |
| `VITE_API_WORKER_URL` | Empty → SPA calls `/api/<route>` on same origin |

If you ever need to change these, edit `.env.production` and push — no
Vercel dashboard step required.

### What you must add in Vercel (secrets only)

In **Project Settings → Environment Variables**, add the **server-side
secrets** used by the `/api/*` function. These are read at request time
from `process.env`, never shipped to the browser:

| Variable | Where to get it |
| --- | --- |
| `SUPABASE_URL` | Same Supabase project URL (already in `.env.production` but the serverless function reads it independently) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Settings → API |
| `RAZORPAY_KEY_ID` | `rzp_live_*` from Razorpay dashboard |
| `RAZORPAY_KEY_SECRET` | Razorpay dashboard |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay dashboard → Webhooks |
| `WHATSAPP_API_TOKEN` | Optional — Meta for Developers |
| `WHATSAPP_PHONE_ID` | Optional — Meta for Developers |
| `OWNER_WHATSAPP` | Optional — destination phone number |
| `SMTP_EMAIL` | Gmail address used to send emails (e.g., `groupprince43@gmail.com`) |
| `SMTP_PASSWORD` | Gmail app password for SMTP auth |
| `OWNER_EMAIL` | Email address to receive new-subscription notifications |

Set these for **Production** at minimum. Click into the same dialog and
tick "Preview" too if you want them on preview deploys.

3. In **Razorpay dashboard → Webhooks**, point the webhook at:

   ```
   https://<your-app>.vercel.app/api/razorpay-webhook
   ```

   Subscribe to: `payment.authorized`, `payment.failed`, `refund.created`.

## Local dev

The Vite dev server (port 8080 / 8081) serves the SPA only — it does not
run the Vercel serverless function. For local end-to-end testing of the
API use `npx vercel dev` (after `vercel login` and linking the project).

## Troubleshooting

- **Site shows "Something went wrong"** — open the browser dev console.
  The Supabase client logs which env var is missing. (This is rare now:
  the public vars ship in `.env.production`.)
- **Payments fail silently** — check Vercel → Logs for the function
  invocation. The most common cause is a missing `RAZORPAY_KEY_SECRET` or
  `SUPABASE_SERVICE_ROLE_KEY`.
- **Webhook signature errors** — make sure `RAZORPAY_WEBHOOK_SECRET`
  matches the secret shown in the Razorpay dashboard for this webhook.
