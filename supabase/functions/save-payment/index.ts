const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export default async function (request: Request) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  try {
    const { userId, planId, razorpayOrderId, razorpayPaymentId, razorpaySubscriptionId, amount, username, mobile } = await request.json();

    if (!userId || !planId || !razorpayPaymentId || !amount) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeaders = {
      "Content-Type": "application/json",
      "apikey": SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
    };

    const now = new Date().toISOString();
    const later = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Create subscription record
    const subPayload: Record<string, unknown> = {
      user_id: userId, plan_id: planId, status: "active",
      current_start: now, current_end: later, next_charge_at: later, paid_count: 1,
    };
    if (razorpaySubscriptionId) subPayload.razorpay_subscription_id = razorpaySubscriptionId;

    const subRes = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?select=id`, {
      method: "POST",
      headers: { ...authHeaders, Prefer: "return=representation" },
      body: JSON.stringify(subPayload),
    });

    if (!subRes.ok) {
      console.error("sub insert failed:", await subRes.text());
      return new Response(JSON.stringify({ error: "Unable to create subscription" }), {
        status: 500, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const subData = await subRes.json();
    const subId = Array.isArray(subData) ? subData[0]?.id : subData?.id;

    // 2. Record the initial payment
    const payRes = await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
      method: "POST",
      headers: { ...authHeaders, Prefer: "return=representation" },
      body: JSON.stringify({
        user_id: userId, subscription_id: subId,
        razorpay_order_id: razorpayOrderId || null,
        razorpay_subscription_id: razorpaySubscriptionId || null,
        razorpay_payment_id: razorpayPaymentId,
        amount, currency: "INR", status: "captured", method: "razorpay",
      }),
    });

    if (!payRes.ok) {
      console.error("pay insert failed:", await payRes.text());
      return new Response(JSON.stringify({ error: "Unable to save payment record" }), {
        status: 500, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // 3. Update user profile (best-effort)
    if (username || mobile) {
      const profileUpdates: Record<string, string> = {};
      if (username) profileUpdates.full_name = username;
      if (mobile) profileUpdates.phone = mobile;
      fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}`, {
        method: "PATCH", headers: authHeaders, body: JSON.stringify(profileUpdates),
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ success: true, subscriptionId: subId }), {
      status: 200, headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("save-payment error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
}
