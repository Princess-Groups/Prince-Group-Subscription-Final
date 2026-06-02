# Auto-Pay Testing Guide

## Overview
This guide explains how to test if the Razorpay auto-pay subscription functionality is working correctly.

## Prerequisites

### 1. Razorpay Account Setup
- You need a Razorpay account (Test or Live mode)
- Get your API keys from Razorpay Dashboard

### 2. Current Configuration
Your `.env` file has:
```
RAZORPAY_KEY_ID="rzp_live_StvLfZlKF8WxWW"
RAZORPAY_KEY_SECRET="ZLoEbzpAKYVqYJg5utAOs4lh"
```

⚠️ **WARNING**: These are LIVE keys. Testing with live keys will charge real money!

## Testing Methods

### Method 1: Use Razorpay Test Mode (RECOMMENDED)

#### Step 1: Get Test API Keys
1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Switch to **Test Mode** (toggle in top-left corner)
3. Go to Settings → API Keys
4. Generate Test Keys if you don't have them
5. Copy the Test Key ID and Test Key Secret

#### Step 2: Update .env File
Replace your live keys with test keys:
```env
RAZORPAY_KEY_ID="rzp_test_XXXXXXXXXXXX"
RAZORPAY_KEY_SECRET="YOUR_TEST_SECRET_KEY"
```

#### Step 3: Restart the Server
```bash
npm run dev
```

#### Step 4: Test the Flow
1. Open http://localhost:8080/
2. Click on any subscription plan
3. Create an account or login
4. Click "Activate Auto-Pay"
5. Use Razorpay test card details:

**Test Card Details:**
- Card Number: `4111 1111 1111 1111`
- CVV: Any 3 digits (e.g., `123`)
- Expiry: Any future date (e.g., `12/25`)
- Name: Any name

6. Complete the payment

#### Step 5: Verify in Razorpay Dashboard
1. Go to Razorpay Dashboard (Test Mode)
2. Navigate to **Subscriptions** section
3. You should see your test subscription listed
4. Check the subscription details:
   - Status: `active`
   - Plan: Your selected plan
   - Next billing date
   - Customer details

---

### Method 2: Check Supabase Functions (Backend)

#### Step 1: Check if Functions Exist
Look for these Supabase Edge Functions:
- `create-razorpay-order`
- `confirm-razorpay-payment`
- `save-payment`
- `send-whatsapp`
- `cancel-subscription`

#### Step 2: Test Function Endpoints
You can test if functions are deployed:

1. Open browser console on your site
2. Try calling a function:
```javascript
const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
  body: JSON.stringify({ planId: 'starter' })
});
console.log('Response:', data, error);
```

---

### Method 3: Check Database Records

#### Step 1: Access Supabase Dashboard
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `ylctrvnptuewnniyxncc`
3. Go to **Table Editor**

#### Step 2: Check Tables
Look for these tables:
- `subscriptions` - Should store subscription records
- `payments` - Should store payment records
- `users` - Should have user authentication data

#### Step 3: Verify Data After Payment
After completing a test payment, check:

**subscriptions table:**
```sql
SELECT * FROM subscriptions WHERE user_id = 'YOUR_USER_ID';
```

Should show:
- `razorpay_subscription_id`
- `status` = 'active'
- `plan_id`
- `current_start` and `current_end` dates
- `next_charge_at` date

**payments table:**
```sql
SELECT * FROM payments WHERE user_id = 'YOUR_USER_ID';
```

Should show:
- `razorpay_payment_id`
- `amount`
- `status` = 'success'

---

## Verification Checklist

### ✅ Frontend Checks
- [ ] Subscription modal opens when clicking plan
- [ ] User can login/signup successfully
- [ ] "Activate Auto-Pay" button appears after login
- [ ] Razorpay checkout modal opens
- [ ] Payment form accepts test card details
- [ ] Success message appears after payment
- [ ] Modal shows "Membership activated! 🎉"

### ✅ Razorpay Dashboard Checks
- [ ] Subscription appears in Subscriptions section
- [ ] Subscription status is "active"
- [ ] Customer details are correct
- [ ] Plan amount matches selected plan
- [ ] Next billing date is set correctly
- [ ] Payment appears in Payments section

### ✅ Supabase Checks
- [ ] User record exists in `auth.users`
- [ ] Subscription record exists in `subscriptions` table
- [ ] Payment record exists in `payments` table
- [ ] `razorpay_subscription_id` is stored
- [ ] Subscription status is "active"

### ✅ Console Logs
Open browser console and check for:
```
[handleAuth] Login successful
[onAuthStateChange] User logged in, moving to pay step
Payment verification successful
Subscription created successfully
```

---

## Testing Auto-Pay Recurring Charges

### Important Notes:
1. **Test Mode**: Razorpay test mode does NOT actually charge recurring payments
2. **Live Mode**: Only test with small amounts (₹1 plan) if using live mode
3. **Webhooks**: Set up Razorpay webhooks to handle recurring payment notifications

### To Test Recurring Payments:

#### Option 1: Simulate in Razorpay Dashboard
1. Go to Razorpay Dashboard → Subscriptions
2. Find your test subscription
3. Click on it to view details
4. Use "Charge Now" button to simulate next payment
5. Check if payment is recorded in your database

#### Option 2: Wait for Actual Billing Cycle
- For ₹1/day plan: Wait 1 day
- For ₹10/day plan: Wait 1 day
- For ₹100/day plan: Wait 1 day
- Check Razorpay dashboard for automatic charge
- Verify payment record in Supabase

---

## Troubleshooting

### Issue: Razorpay Checkout Not Opening
**Check:**
1. Browser console for errors
2. Razorpay script loaded: `window.Razorpay` should exist
3. API keys are correct in `.env`
4. Server restarted after changing `.env`

### Issue: Payment Fails
**Check:**
1. Using test mode with test card details
2. Razorpay account is active
3. API keys have correct permissions
4. Check Razorpay dashboard for error details

### Issue: Subscription Not Created
**Check:**
1. Supabase functions are deployed
2. Check browser console for function errors
3. Verify `create-razorpay-order` function exists
4. Check Supabase function logs

### Issue: Database Not Updated
**Check:**
1. `save-payment` function is working
2. Database tables exist with correct schema
3. User has permission to insert records
4. Check Supabase logs for errors

---

## Quick Test Script

Run this in browser console after logging in:

```javascript
// Test if Razorpay is loaded
console.log('Razorpay loaded:', !!window.Razorpay);

// Test if Supabase is connected
const { data: session } = await supabase.auth.getSession();
console.log('User logged in:', !!session?.session?.user);

// Test function call
const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
  body: JSON.stringify({ planId: 'starter' })
});
console.log('Function response:', data, error);
```

---

## Production Checklist

Before going live:
- [ ] Switch to Razorpay Live mode keys
- [ ] Test with real payment (small amount)
- [ ] Set up Razorpay webhooks
- [ ] Configure webhook URL in Razorpay dashboard
- [ ] Test webhook delivery
- [ ] Set up email notifications
- [ ] Test subscription cancellation
- [ ] Test failed payment handling
- [ ] Set up monitoring and alerts
- [ ] Document customer support process

---

## Support Resources

- **Razorpay Docs**: https://razorpay.com/docs/subscriptions/
- **Razorpay Test Cards**: https://razorpay.com/docs/payments/payments/test-card-details/
- **Supabase Docs**: https://supabase.com/docs
- **Razorpay Dashboard**: https://dashboard.razorpay.com/

---

## Contact

If you encounter issues:
1. Check browser console for errors
2. Check Razorpay dashboard for payment status
3. Check Supabase logs for function errors
4. Review this guide's troubleshooting section
