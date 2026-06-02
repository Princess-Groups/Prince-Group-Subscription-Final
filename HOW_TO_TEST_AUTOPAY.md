# How to Test Auto-Pay - Quick Guide

## 🚀 Quick Start

### Step 1: Switch to Test Mode (IMPORTANT!)
Your current keys are **LIVE** keys. To avoid real charges:

1. Open `.env` file
2. Replace with TEST keys:
```env
RAZORPAY_KEY_ID="rzp_test_XXXXXXXXXXXX"
RAZORPAY_KEY_SECRET="YOUR_TEST_SECRET_KEY"
```
3. Get test keys from: https://dashboard.razorpay.com/ (switch to Test Mode)
4. Restart server: `npm run dev`

### Step 2: Open Test Dashboard
Open this file in your browser:
```
file:///c:/Users/srine/Downloads/prince-prime-subs-fixed_2/prince-prime-subs-main/prince-prime-subs-main/TEST_AUTO_PAY.html
```

Or simply double-click `TEST_AUTO_PAY.html`

### Step 3: Run Tests
Click each test button in the dashboard to verify:
- ✅ Environment is configured
- ✅ Razorpay SDK is loaded
- ✅ Supabase is connected
- ✅ Payment functions work

### Step 4: Test Complete Flow
1. Go to http://localhost:8080/
2. Click any subscription plan
3. Create account or login
4. Click "Activate Auto-Pay"
5. Use test card: `4111 1111 1111 1111`
6. CVV: `123`, Expiry: `12/25`
7. Complete payment
8. Check for success message

### Step 5: Verify in Dashboards

**Razorpay Dashboard:**
- Go to https://dashboard.razorpay.com/ (Test Mode)
- Click "Subscriptions" in sidebar
- You should see your test subscription

**Supabase Dashboard:**
- Go to https://supabase.com/dashboard
- Select project: `ylctrvnptuewnniyxncc`
- Go to Table Editor → `subscriptions`
- You should see your subscription record

## 📋 What to Check

### ✅ Frontend (Browser)
- [ ] Modal opens when clicking plan
- [ ] Login/signup works
- [ ] "Activate Auto-Pay" button appears
- [ ] Razorpay checkout opens
- [ ] Payment completes successfully
- [ ] Success message shows

### ✅ Razorpay Dashboard
- [ ] Subscription appears in list
- [ ] Status is "active"
- [ ] Amount matches plan
- [ ] Next billing date is set

### ✅ Supabase Database
- [ ] User exists in `auth.users`
- [ ] Subscription in `subscriptions` table
- [ ] Payment in `payments` table
- [ ] `razorpay_subscription_id` is saved

## 🐛 Troubleshooting

### Payment doesn't work?
1. Check browser console for errors
2. Verify you're using TEST mode keys
3. Make sure server is running
4. Try different test card

### Subscription not created?
1. Check Supabase functions are deployed
2. Check browser console for function errors
3. Verify database tables exist
4. Check Supabase logs

### Can't login?
1. Check email is valid
2. Password is at least 4 characters
3. Check browser console for auth errors
4. Try creating new account

## 📚 Full Documentation

For detailed testing guide, see:
- `AUTO_PAY_TESTING_GUIDE.md` - Complete testing documentation
- `FIXES_APPLIED.md` - List of all fixes applied
- `RAZORPAY_SETUP.md` - Razorpay configuration guide

## 🎯 Test Card Details

**Visa (Success):**
- Card: `4111 1111 1111 1111`
- CVV: `123`
- Expiry: `12/25`

**Mastercard (Success):**
- Card: `5555 5555 5555 4444`
- CVV: `123`
- Expiry: `12/25`

**Visa (Failure - for testing):**
- Card: `4000 0000 0000 0002`
- CVV: `123`
- Expiry: `12/25`

## ⚠️ Important Notes

1. **Always use TEST mode** for testing
2. **Never test with real cards** in test mode
3. **Test mode doesn't charge** real money
4. **Webhooks** need to be set up for production
5. **Recurring charges** don't happen automatically in test mode

## 🔗 Useful Links

- Razorpay Dashboard: https://dashboard.razorpay.com/
- Supabase Dashboard: https://supabase.com/dashboard
- Test Cards: https://razorpay.com/docs/payments/payments/test-card-details/
- Your Project: http://localhost:8080/

## ✅ Success Criteria

Auto-pay is working if:
1. ✅ Payment completes without errors
2. ✅ Subscription appears in Razorpay dashboard
3. ✅ Subscription saved in Supabase database
4. ✅ User sees success message
5. ✅ Console shows no errors

---

**Need Help?** Check the full guide in `AUTO_PAY_TESTING_GUIDE.md`
