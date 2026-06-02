# Quick Start: Razorpay Integration

## ✅ Completed
- [x] Frontend checkout modal updated with Razorpay integration
- [x] Supabase functions created (create order, verify payment)
- [x] Environment variables configured
- [x] Database schema ready (from migrations)

## 🔧 Next Steps

### 1. Update Razorpay Keys
Edit `supabase/.env.local` and replace with your actual keys from https://dashboard.razorpay.com/app/settings/api-keys:

```env
RAZORPAY_KEY_ID="rzp_test_YOUR_KEY_ID"
RAZORPAY_KEY_SECRET="rzsecret_test_YOUR_SECRET"
```

### 2. Run Locally (Development)
In terminal 1, start Supabase functions:
```bash
npm run dev:functions
```

In terminal 2, start the app:
```bash
npm run dev
```

### 3. Test the Payment Flow
1. Go to http://localhost:5173/plans (or your dev URL)
2. Click "Subscribe" on any plan
3. Fill username, mobile, password
4. Click "Continue to Payment" → "Pay with Razorpay"
5. Razorpay checkout modal appears
6. Complete test payment (use test card 4111 1111 1111 1111)

### 4. Deploy to Production
```bash
supabase functions deploy create-razorpay-order
supabase functions deploy confirm-razorpay-payment
```

Then set secrets in Supabase Dashboard:
- Project Settings → Secrets
- Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`

## 📁 Files Modified
- `src/components/site/SubscribeModal.tsx` - Razorpay checkout UI
- `supabase/functions/create-razorpay-order/index.ts` - Order creation
- `supabase/functions/confirm-razorpay-payment/index.ts` - Payment verification
- `.env` - Razorpay credentials
- `supabase/.env.local` - Local function secrets
- `package.json` - Added `dev:functions` script

## 🔐 Security
- Razorpay secret key **never** exposed to frontend
- Signature verification on backend
- Database RLS policies protect user data
