# Deployment Guide - Security First

## ⚠️ Critical: Environment Secrets

**NEVER commit `.env` or `supabase/.env.local` files to git!**

These files contain:
- Razorpay API keys (test AND live)
- Supabase service role key (super secret)
- WhatsApp credentials
- Webhook secrets

### 1. Setup Local Development

Copy the example files and fill in your test credentials:

```bash
# Root directory
cp .env.example .env

# Supabase directory
cp supabase/.env.local.example supabase/.env.local
```

Fill in your **test** values in `.env`:
```env
SUPABASE_PUBLISHABLE_KEY="sb_publishable_YOUR_KEY"
SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_PROJECT_ID="your_project_id"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_YOUR_KEY"
VITE_SUPABASE_URL="https://your-project.supabase.co"
RAZORPAY_KEY_ID="rzp_test_YOUR_TEST_KEY"
VITE_RAZORPAY_KEY_ID="rzp_test_YOUR_TEST_KEY"
```

Fill in your **test** values in `supabase/.env.local`:
```env
RAZORPAY_KEY_ID="rzp_test_YOUR_TEST_KEY"
RAZORPAY_KEY_SECRET="your_test_key_secret"
RAZORPAY_WEBHOOK_SECRET="your_test_webhook_secret"
WHATSAPP_BUSINESS_PHONE="1234567890"
WHATSAPP_API_TOKEN="your_test_token"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
```

### 2. Get Your Credentials

#### Supabase Keys
1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. **Settings → API**:
   - Copy `Project URL` → `SUPABASE_URL`
   - Copy `anon public` key → `SUPABASE_PUBLISHABLE_KEY`
   - Copy `service_role` secret → `SUPABASE_SERVICE_ROLE_KEY`

#### Razorpay Keys (Test First)
1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. **Settings → API Keys**:
   - Copy **Test** Key ID → Use in `.env` with `rzp_test_*`
   - Copy **Test** Key Secret → Use in `supabase/.env.local`

#### Razorpay Webhook Secret
1. In Razorpay Dashboard → **Settings → Webhooks**
2. Add webhook URL (we'll set this after deployment)
3. Copy the webhook secret

### 3. Test Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# In another terminal, start Supabase functions
npm run dev:functions
```

Test the payment flow with Razorpay test card: `4111 1111 1111 1111`

### 4. Deploy to Production

Choose your deployment platform:

#### **Option A: Vercel (Recommended)**

1. **Push to GitHub** (ensure `.env` is in `.gitignore`):
   ```bash
   git add .
   git commit -m "chore: setup secure deployment"
   git push origin main
   ```

2. **Deploy on Vercel**:
   - Connect your GitHub repo to [Vercel](https://vercel.com/)
   - Add environment variables in **Settings → Environment Variables**:
     - All variables from `.env.example` but with **LIVE** Razorpay keys

3. **Deploy Supabase Functions**:
   ```bash
   # Set your Supabase project reference
   supabase link --project-ref your_project_id
   
   # Deploy functions with production secrets
   supabase functions deploy create-razorpay-order
   supabase functions deploy confirm-razorpay-payment
   supabase functions deploy save-payment
   supabase functions deploy razorpay-webhook
   supabase functions deploy send-whatsapp
   ```

#### **Option B: Cloudflare Pages**

1. Create `wrangler.toml` with environment secrets
2. Deploy: `wrangler pages deploy dist`

#### **Option C: Docker / Self-hosted**

1. Build: `npm run build`
2. Set environment variables before starting
3. Run your server

### 5. Configure Razorpay Webhook (After Deployment)

1. Get your deployed app URL (e.g., `https://myapp.vercel.app`)
2. Go to **Razorpay Dashboard → Settings → Webhooks**
3. Add webhook endpoint:
   ```
   https://myapp.vercel.app/api/razorpay-webhook
   ```
   Or if using Supabase:
   ```
   https://your-project.supabase.co/functions/v1/razorpay-webhook
   ```
4. Subscribe to events:
   - `payment.authorized`
   - `payment.failed`
   - `refund.created`
5. Copy the webhook secret and add to your deployment platform

### 6. Final Checklist

- ✅ `.env` and `supabase/.env.local` NOT committed to git
- ✅ All secrets added to deployment platform (Vercel/Railway/Render)
- ✅ Using **LIVE** Razorpay keys in production
- ✅ Using **TEST** Razorpay keys in development
- ✅ Supabase functions deployed
- ✅ Razorpay webhook URL configured
- ✅ Database migrations applied
- ✅ RLS (Row Level Security) policies enabled on Supabase

### 7. Production Secrets Checklist

Before going live, ensure these are set correctly:

```
Production Environment Variables:
□ RAZORPAY_KEY_ID = "rzp_live_*" (LIVE key, not test)
□ RAZORPAY_KEY_SECRET = your_production_secret
□ RAZORPAY_WEBHOOK_SECRET = from Razorpay webhook settings
□ SUPABASE_URL = your production project URL
□ SUPABASE_SERVICE_ROLE_KEY = your service role key
□ WHATSAPP credentials (if using WhatsApp notifications)
```

## Monitoring & Logging

- Monitor Razorpay payments in [Razorpay Dashboard](https://dashboard.razorpay.com/app/payments)
- Monitor Supabase functions in [Supabase Dashboard](https://app.supabase.com/) → Functions → Edge Logs
- Check payment records in Supabase → Database → `payments` table
- Check subscriptions in Supabase → Database → `subscriptions` table

## Troubleshooting

### Webhook not receiving events
- Verify webhook URL is publicly accessible
- Check Razorpay Dashboard → Webhooks → Recent deliveries
- Ensure webhook secret matches

### Payment recording fails
- Check Supabase function logs
- Verify `payments` table exists
- Verify user authentication is working

### WhatsApp not sending
- If API token not set, it logs silently (no error)
- Configure token to enable notifications

## Security Best Practices

1. **Never commit secrets** - Use environment variables only
2. **Rotate keys regularly** - Generate new keys every 90 days
3. **Use separate keys for environments** - Test vs Production
4. **Monitor access logs** - Track who accessed what when
5. **Use HTTPS only** - All communications must be encrypted
6. **Enable 2FA** - Protect your Razorpay and Supabase accounts
7. **Audit function logs** - Check for suspicious activity

---

**Questions?** Check the main README or contact your DevOps team.
