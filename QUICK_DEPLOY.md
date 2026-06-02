# 🚀 2-Hour Safe Deployment Guide

**Goal**: Deploy safely with all secrets protected

## Timeline: 2 Hours

### ⏱️ Hour 1: Local Setup & Testing

**00:00 - 00:10 - Clone/Setup**
```bash
cd prince-prime-subs-main
npm install
```

**00:10 - 00:20 - Configure Local Environment**
```bash
# Copy example files
cp .env.example .env
cp supabase/.env.local.example supabase/.env.local
```

Edit `.env`:
```env
SUPABASE_PUBLISHABLE_KEY="your_test_key"
SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_PROJECT_ID="your_project_id"
VITE_SUPABASE_PUBLISHABLE_KEY="your_test_key"
VITE_SUPABASE_URL="https://your-project.supabase.co"
RAZORPAY_KEY_ID="rzp_test_YOUR_TEST_KEY"
VITE_RAZORPAY_KEY_ID="rzp_test_YOUR_TEST_KEY"
```

Edit `supabase/.env.local`:
```env
RAZORPAY_KEY_ID="rzp_test_YOUR_TEST_KEY"
RAZORPAY_KEY_SECRET="your_test_secret"
RAZORPAY_WEBHOOK_SECRET="your_test_webhook_secret"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
```

**00:20 - 00:45 - Test Locally**
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Start Supabase functions
npm run dev:functions

# Test the flow:
# 1. Go to localhost:5173/plans
# 2. Click Subscribe
# 3. Create test account
# 4. Use test card: 4111 1111 1111 1111
# 5. Complete payment
```

**00:45 - 01:00 - Clean Secrets from Git**
```bash
# Remove from git tracking (won't delete local files)
git rm --cached .env supabase/.env.local

# Commit the cleanup
git add .gitignore .env.example supabase/.env.local.example DEPLOYMENT.md SECURITY_CHECKLIST.md
git commit -m "chore: secure environment variables and add deployment guides"
```

### ⏱️ Hour 2: Deploy to Production

**01:00 - 01:20 - Choose & Setup Deployment Platform**

#### Option A: Vercel (Easiest)
1. Push to GitHub:
   ```bash
   git push origin main
   ```

2. Go to [Vercel](https://vercel.com/) → Import Project
   - Select your GitHub repo
   - Click Deploy

3. After initial deploy, go to **Settings → Environment Variables**
   - Add all variables from `.env.example`
   - Use LIVE Razorpay keys (`rzp_live_*`)

#### Option B: Render
1. Go to [Render](https://render.com/)
2. Click "New +" → Select "Web Service"
3. Connect GitHub repo
4. Choose "Node" environment
5. Add Environment Variables (all from `.env`)
6. Deploy

#### Option C: Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Set secrets
railway variables set RAZORPAY_KEY_ID=rzp_live_YOUR_KEY
railway variables set RAZORPAY_KEY_SECRET=your_secret
# ... repeat for all variables

# Deploy
railway up
```

**01:20 - 01:30 - Deploy Supabase Functions**

```bash
# Link to your Supabase project (if not already linked)
supabase link --project-ref your_project_id

# Deploy functions
supabase functions deploy create-razorpay-order
supabase functions deploy confirm-razorpay-payment
supabase functions deploy save-payment
supabase functions deploy razorpay-webhook
supabase functions deploy send-whatsapp
```

Verify deployment:
```bash
supabase functions list
```

**01:30 - 01:45 - Configure Razorpay Webhook**

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Navigate to **Settings → Webhooks**
3. Click "Add Webhook"
4. Enter webhook URL:
   ```
   https://your-project.supabase.co/functions/v1/razorpay-webhook
   ```
5. Select events:
   - ✅ payment.authorized
   - ✅ payment.failed
   - ✅ refund.created
6. Copy the webhook secret
7. Add to your deployment platform's environment variables:
   ```
   RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
   ```

**01:45 - 02:00 - Verify & Test Production**

```bash
✅ Verification Checklist:

1. Application starts: https://your-deployed-app.com
2. /plans page loads
3. Razorpay key is present (check browser DevTools)
4. Test signup/login flow
5. Test payment with live card
6. Check Razorpay dashboard → Payments (should see your test payment)
7. Check Supabase → Database → payments table (should have record)
8. Check Supabase → Database → subscriptions table (should have record)
```

## 🔒 Security Verification

After deployment, verify:

```bash
# Check 1: .env files NOT in git
git ls-files | grep -i '.env'
# Should return nothing

# Check 2: Secrets are set on deployment platform
# Vercel: Settings → Environment Variables (should see all vars)
# Render: Environment (should see all vars)

# Check 3: Functions deployed
supabase functions list
# Should show all 5 functions

# Check 4: Webhook configured
# Razorpay Dashboard → Settings → Webhooks (should see your URL)
```

## ✅ Final Checklist

```
MUST COMPLETE:
□ Code pushed to GitHub
□ Deployment platform shows no secrets in code
□ Environment variables set in deployment platform
□ Using LIVE Razorpay keys (rzp_live_*)
□ Supabase functions deployed
□ Razorpay webhook URL configured
□ Test payment successful
□ Payment recorded in database
□ No errors in function logs

SECURITY VERIFIED:
□ .env not in git
□ .env.local not in git
□ No secrets in environment variable keys (only values)
□ CORS configured correctly
□ Webhook signature verification enabled
```

## If Something Goes Wrong

**Payment not appearing in database:**
- Check Supabase function logs
- Verify `save-payment` function is deployed
- Check database `payments` table exists

**Webhook not receiving events:**
- Check Razorpay webhook URL in dashboard (Settings → Webhooks)
- Verify function is deployed: `supabase functions list`
- Check function execution logs: Supabase → Functions → Edge Logs

**Environment variables not working:**
- Verify you set them in deployment platform, not in code
- Restart the application after setting variables
- Check that variable names match exactly (case-sensitive)

**LIVE keys not working:**
- Verify you're using `rzp_live_*` keys (not test keys)
- Check Razorpay account has live mode enabled
- Verify webhook secret matches

## Support URLs

- **Razorpay Docs**: https://razorpay.com/docs/
- **Supabase Docs**: https://supabase.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Render Docs**: https://render.com/docs
- **Railway Docs**: https://docs.railway.app/

---

**Deployed at**: [Add your URL]
**Deployment Date**: [Add date]
**Status**: ✅ Production Ready
