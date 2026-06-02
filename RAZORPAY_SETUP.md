# Razorpay Integration Setup

## Step 1: Update environment variables

Replace placeholder values in `.env` and `supabase/.env.local`:

```env
RAZORPAY_KEY_ID="rzp_test_YOUR_ACTUAL_KEY_ID"
RAZORPAY_KEY_SECRET="rzsecret_test_YOUR_ACTUAL_SECRET"
```

Get these from [Razorpay Dashboard](https://dashboard.razorpay.com/app/settings/api-keys).

## Step 2: Deploy Supabase Functions

### Option A: Local Testing
```bash
supabase functions serve
```
This starts a local Supabase function server using `supabase/.env.local`.

### Option B: Deploy to Production
```bash
supabase functions deploy create-razorpay-order
supabase functions deploy confirm-razorpay-payment
```

Set secrets in Supabase Dashboard:
1. Project Settings → Secrets
2. Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`

## Step 3: Test the Flow

1. Start your app: `npm run dev` or `bun run dev`
2. Navigate to /plans
3. Click "Subscribe" on a plan
4. Fill in form and click "Continue to Payment"
5. Click "Pay with Razorpay"
6. Complete the Razorpay checkout

## File Structure

```
supabase/
├── functions/
│   ├── create-razorpay-order/
│   │   └── index.ts       # Creates Razorpay order
│   └── confirm-razorpay-payment/
│       └── index.ts       # Verifies payment signature
├── migrations/            # Database schema
└── .env.local            # Local function secrets
```

## Security Checklist

✓ Razorpay secret keys in `.env` and `supabase/.env.local` (dev only)
✓ Razorpay secret keys in Supabase Secrets (production)
✓ Frontend only calls Supabase functions (never calls Razorpay API directly)
✓ Payment signature verification on backend
✓ Database schema ready (profiles, subscriptions, payments tables)
