# Vercel Deployment

This project now runs as a **static SPA + serverless API on Vercel** — the
Cloudflare Worker + Wrangler setup has been replaced.

## How it works

- **Frontend** — `npm run build` runs the Vite/TanStack Start build in
  **SPA mode** (`vite.config.ts`). It prerenders every route to a static
  `index.html` in `dist/client/`. Vercel serves those files directly.
- **API** — `api/[route].ts` is a Vercel serverless function. The frontend
  POSTs to `/api/<route>` (same origin) and the function dispatches to the
  same six handlers that the old Cloudflare Worker exposed:
  - `save-payment`
  - `create-razorpay-order`
  - `confirm-razorpay-payment`
  - `cancel-subscription`
  - `send-whatsapp`
  - `razorpay-webhook`

## Deploy

1. Push to GitHub (or GitLab/Bitbucket).
2. Import the project in [Vercel](https://vercel.com/new). Vercel detects
   `vercel.json` automatically and uses:
   - Build command: `npm run build`
   - Output directory: `dist/client`
3. Add these environment variables in **Settings → Environment Variables**:

   | Variable | Notes |
   | --- | --- |
   | `VITE_SUPABASE_URL` | Public Supabase project URL |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Public anon/publishable key |
   | `VITE_SUPABASE_PROJECT_ID` | Project ID |
   | `VITE_RAZORPAY_KEY_ID` | `rzp_live_*` for production |
   | `SUPABASE_URL` | Same project URL (server-side) |
   | `SUPABASE_SERVICE_ROLE_KEY` | Service-role key (server-side only) |
   | `RAZORPAY_KEY_ID` | `rzp_live_*` |
   | `RAZORPAY_KEY_SECRET` | Razorpay secret |
   | `RAZORPAY_WEBHOOK_SECRET` | From Razorpay dashboard |
   | `WHATSAPP_API_TOKEN` | Optional |
   | `WHATSAPP_PHONE_ID` | Optional |
   | `OWNER_WHATSAPP` | Optional notification recipient |

4. In the **Razorpay dashboard → Webhooks**, point the webhook at:

   ```
   https://<your-app>.vercel.app/api/razorpay-webhook
   ```

5. (Optional) Override the API base in the frontend by setting
   `VITE_API_WORKER_URL` if you ever want to point at a separate API origin.
   When unset, the SPA calls `/api/<route>` on the same origin (default).

## Local dev

The Vite dev server (port 8080) does not run the API routes. To exercise the
payment flow locally you have two options:

- Run a separate Vercel dev process: `npx vercel dev` (after `vercel login`).
- Or set `VITE_API_WORKER_URL` in `.env` to point at a deployed preview.

## Migrating away from Cloudflare

You can safely delete `functions-api/` and `wrangler.jsonc` — they are no
longer used by the build. `.wrangler/`, `dist/server/`, and the `wrangler`
dev dependency can be removed from `package.json` if you want a clean tree.
