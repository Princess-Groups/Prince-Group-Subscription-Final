# Supabase Razorpay Functions

This project includes two Supabase Edge Functions for secure Razorpay integration:

- `create-razorpay-order`
- `confirm-razorpay-payment`

## Required environment variables

Set these values in your Supabase project or local Supabase function environment:

- `RAZORPAY_KEY_ID` (Razorpay public key for orders)
- `RAZORPAY_KEY_SECRET` (Razorpay secret key for server-side verification)

## Deployment

Deploy the functions with the Supabase CLI or dashboard, then use the client-side checkout in `src/components/site/SubscribeModal.tsx`.

The frontend calls `supabase.functions.invoke()` to safely create Razorpay orders and confirm completed payments.
