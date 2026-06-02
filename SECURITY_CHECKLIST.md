# 🔒 Security Checklist - Before Deployment

## ✅ Environment Security

- [x] `.env` added to `.gitignore`
- [x] `supabase/.env.local` added to `.gitignore`
- [x] `.env.example` created with placeholder values
- [x] `supabase/.env.local.example` created with placeholder values
- [ ] Remove `.env` and `supabase/.env.local` from git history
  ```bash
  git filter-branch --tree-filter 'rm -f .env supabase/.env.local' -- --all
  git push origin --force --all
  ```

## ✅ Razorpay Security

- [x] Payment signature verification enabled (HMAC-SHA256)
- [x] Payment status verified against Razorpay API
- [x] Webhook signature verification implemented
- [x] Using environment variables for secrets (never in code)
- [ ] Switch from **TEST keys** to **LIVE keys** before production
  - Current: `rzp_test_SvYaS0PYcUmgOF` (test)
  - Change to: Get from Razorpay Dashboard → Settings → API Keys
- [ ] Configure Razorpay Webhook in Dashboard:
  - URL: `https://your-project.supabase.co/functions/v1/razorpay-webhook`
  - Secret: Set in deployment platform env vars
  - Events: `payment.authorized`, `payment.failed`, `refund.created`

## ✅ Supabase Security

- [x] Service role key used only in backend functions
- [x] Function environment validation (throws on missing config)
- [x] CORS headers properly configured
- [ ] Verify RLS (Row Level Security) policies on tables:
  ```sql
  -- In Supabase SQL Editor, run:
  SELECT * FROM pg_policies 
  WHERE schemaname = 'public' 
  AND tablename IN ('payments', 'subscriptions', 'profiles');
  ```
- [ ] Ensure `supabase/.env.local` is NOT committed to git

## ✅ Application Security

- [x] Authentication required before payment
- [x] User signup/login validation
- [x] Email validation on signup
- [x] Password validation (minimum 4 characters recommended)
- [ ] Review Supabase Auth settings for rate limits
- [ ] Enable MFA (Multi-Factor Auth) on Supabase account

## ✅ API & Function Security

- [x] All POST endpoints require proper headers/auth
- [x] Input validation on all functions
- [x] Error messages don't leak sensitive info
- [x] Proper HTTP status codes (401, 403, 500)
- [ ] Verify functions are deployed before going live:
  ```bash
  supabase functions list
  ```

## ✅ Database Security

- [x] Signature verification before writing to DB
- [x] Immutable payment records
- [ ] Enable backups in Supabase:
  - Supabase Dashboard → Settings → Backups
  - Set automatic daily backups
- [ ] Database audit logs enabled

## 🚨 Before Going Live

### Pre-Deployment Checklist
```
MUST DO:
□ Remove .env files from git history (use git filter-branch)
□ Switch Razorpay keys from TEST to LIVE
□ Test full payment flow in production mode
□ Configure Razorpay webhook URL (get from deployment platform)
□ Deploy Supabase functions
□ Set all environment variables in deployment platform
□ Enable Supabase backups
□ Test webhook delivery in Razorpay dashboard
□ Verify no console.errors in production
□ Test with real payment card (small amount)

SHOULD DO:
□ Enable HTTPS only (all platforms support this)
□ Set up monitoring/logging alerts
□ Enable 2FA on all accounts (Razorpay, Supabase)
□ Review function execution logs daily for first week
□ Document incident response procedure
```

### Production Keys & Secrets

**NEVER use these in code:**
```
❌ Razorpay Secret Key
❌ Supabase Service Role Key  
❌ Webhook Secrets
❌ WhatsApp API Token
❌ Any API credentials
```

**Always use environment variables:**
```
✅ Set in deployment platform (Vercel, Render, Railway, etc.)
✅ Set via Supabase dashboard for function secrets
✅ Use .env.local for local development only (never commit)
```

## 🔑 Secrets Management

### For Development
```
1. Copy .env.example → .env
2. Copy supabase/.env.local.example → supabase/.env.local
3. Fill in YOUR TEST credentials
4. Add to .gitignore (already done)
5. Never commit
```

### For Deployment (Vercel Example)
```
1. Push code to GitHub (without .env files)
2. Go to Vercel → Project Settings → Environment Variables
3. Add all variables from .env.example
4. Use LIVE Razorpay keys (rzp_live_*)
5. Redeploy
```

## Deployment Platform Recommendations

### Top Tier (Recommended)
- **Vercel** - Best for React/Next.js, free tier, auto-HTTPS
  - Set env vars in Settings → Environment Variables
  - Easy to manage secrets
  
- **Render** - Free tier, easy Supabase integration
  - Set env vars in Environment
  
- **Railway** - Pay-per-use, good for full-stack apps
  - Set env vars in Variables

### Setting Secrets on Each Platform

```bash
# Vercel CLI
vercel env add RAZORPAY_KEY_ID
vercel env add RAZORPAY_KEY_SECRET
vercel env add RAZORPAY_WEBHOOK_SECRET

# Railway
railway link
railway variables set RAZORPAY_KEY_ID=...

# Render
# Via dashboard: Service → Environment
```

## Monitoring Checklist

After deployment, monitor:

- [ ] Razorpay Dashboard - Payment success rate
- [ ] Supabase Logs - Function execution errors
- [ ] Application Logs - User signup/login failures
- [ ] Database - Check `payments` table for new records
- [ ] Webhooks - Razorpay → Recent deliveries section

## Security Headers to Add (Optional)

```
Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## Quick Fix: Remove Secrets from Git History

If `.env` is already committed, run this BEFORE deploying:

```bash
# Remove from all history
git filter-branch --tree-filter 'rm -f .env supabase/.env.local' -- --all

# Force push (⚠️ only if you own the repo)
git push origin --force --all

# Notify team to re-clone (history changed)
```

## Support & Troubleshooting

- **Razorpay Docs**: https://razorpay.com/docs/
- **Supabase Docs**: https://supabase.com/docs
- **Vercel Docs**: https://vercel.com/docs

---

**Status**: ⚠️ Ready for deployment after checking items above

**Last Updated**: June 1, 2026
