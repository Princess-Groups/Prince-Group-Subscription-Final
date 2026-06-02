import { json, corsPreflight, getSupabaseHeaders } from "./utils";

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
  WHATSAPP_API_TOKEN: string;
  WHATSAPP_PHONE_ID: string;
  OWNER_WHATSAPP: string;
}

type RouteHandler = (req: Request, env: Env) => Promise<Response>;

const routes: Record<string, RouteHandler> = {
  "save-payment": savePayment,
  "create-razorpay-order": createRazorpayOrder,
  "confirm-razorpay-payment": confirmRazorpayPayment,
  "cancel-subscription": cancelSubscription,
  "send-whatsapp": sendWhatsApp,
  "razorpay-webhook": razorpayWebhook,
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return corsPreflight();
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const url = new URL(request.url);
    const path = url.pathname.replace(/^\//, "");
    const handler = routes[path];

    if (!handler) return json({ error: `Unknown route: ${path}` }, 404);

    console.log(`[${path}] START`);
    try {
      const result = await handler(request, env);
      console.log(`[${path}] OK`);
      return result;
    } catch (err) {
      console.error(`[${path}] ERROR:`, err);
      return json({ error: (err as Error).message || "Internal error" }, 500);
    }
  },
};

// ────────────────────────────────────────────
// 1. SAVE PAYMENT
// ────────────────────────────────────────────
async function savePayment(request: Request, env: Env): Promise<Response> {
  const { userId, planId, razorpayOrderId, razorpayPaymentId, razorpaySubscriptionId, amount, username, mobile } = await request.json();

  if (!userId || !planId || !razorpayPaymentId || !amount) {
    return json({ error: "Missing required fields" }, 400);
  }

  const headers = getSupabaseHeaders(env);
  const now = new Date().toISOString();
  const later = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Create subscription
  const subPayload: Record<string, unknown> = {
    user_id: userId, plan_id: planId, status: "active",
    current_start: now, current_end: later, next_charge_at: later, paid_count: 1,
  };
  if (razorpaySubscriptionId) subPayload.razorpay_subscription_id = razorpaySubscriptionId;

  const subRes = await fetch(`${env.SUPABASE_URL}/rest/v1/subscriptions?select=id`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify(subPayload),
  });

  if (!subRes.ok) {
    const errText = await subRes.text();
    console.error("sub insert failed:", errText);
    return json({ error: "Unable to create subscription" }, 500);
  }

  const subData = await subRes.json();
  const subId = Array.isArray(subData) ? subData[0]?.id : subData?.id;
  if (!subId) return json({ error: "Unable to create subscription (no id)" }, 500);

  // Record payment
  const payRes = await fetch(`${env.SUPABASE_URL}/rest/v1/payments`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
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
    return json({ error: "Unable to save payment record" }, 500);
  }

  // Update profile (best-effort, fire-and-forget)
  if (username || mobile) {
    const updates: Record<string, string> = {};
    if (username) updates.full_name = username;
    if (mobile) updates.phone = mobile;
    fetch(`${env.SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}`, {
      method: "PATCH", headers, body: JSON.stringify(updates),
    }).catch(() => {});
  }

  return json({ success: true, subscriptionId: subId });
}

// ────────────────────────────────────────────
// 2. CREATE RAZORPAY ORDER
// ────────────────────────────────────────────
async function createRazorpayOrder(request: Request, env: Env): Promise<Response> {
  const { planId } = await request.json();
  if (!planId) return json({ error: "Missing planId" }, 400);

  const razorpayAuth = btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);
  const authHeader = { Authorization: `Basic ${razorpayAuth}`, "Content-Type": "application/json" };

  const plans: Record<string, { amount: number; monthlyAmount: number; name: string; description: string }> = {
    starter: { amount: 100, monthlyAmount: 3000, name: "₹1 Plan", description: "Starter daily membership" },
    popular: { amount: 1000, monthlyAmount: 30000, name: "₹10 Plan", description: "Popular daily membership" },
    premium: { amount: 10000, monthlyAmount: 300000, name: "₹100 Plan", description: "Premium daily membership" },
  };

  const plan = plans[planId as string];
  if (!plan) return json({ error: "Invalid planId" }, 400);

  // Find or create Razorpay plan
  const searchRes = await fetch("https://api.razorpay.com/v1/plans?count=10", { headers: authHeader });
  const searchData = await searchRes.json() as any;
  let razorpayPlanId = (searchData.items || []).find(
    (p: any) => p.item?.name === plan.name && p.period === "monthly"
  )?.id;

  if (!razorpayPlanId) {
    const planRes = await fetch("https://api.razorpay.com/v1/plans", {
      method: "POST", headers: authHeader,
      body: JSON.stringify({
        period: "monthly", interval: 1,
        item: { name: plan.name, description: plan.description, amount: plan.monthlyAmount, currency: "INR" },
        notes: { plan_id: planId },
      }),
    });
    const planData = await planRes.json() as any;
    if (!planRes.ok || !planData.id) return json({ error: "Unable to create Razorpay plan" }, 500);
    razorpayPlanId = planData.id;
  }

  // Create Razorpay subscription
  const subRes = await fetch("https://api.razorpay.com/v1/subscriptions", {
    method: "POST", headers: authHeader,
    body: JSON.stringify({
      plan_id: razorpayPlanId, total_count: 120, quantity: 1, customer_notify: 1,
      addons: [{ item: { name: "First day charge", amount: plan.amount, currency: "INR" } }],
      notes: { plan_key: planId, plan_name: plan.name },
    }),
  });
  const subData = await subRes.json() as any;
  if (!subRes.ok || !subData.id) return json({ error: subData.error?.description || "Unable to create subscription" }, 500);

  return json({
    keyId: env.RAZORPAY_KEY_ID,
    subscriptionId: subData.id,
    orderId: subData.id,
    amount: plan.amount,
    currency: "INR",
    planName: plan.name,
    description: plan.description,
    isSubscription: true,
  });
}

// ────────────────────────────────────────────
// 3. CONFIRM RAZORPAY PAYMENT
// ────────────────────────────────────────────
async function confirmRazorpayPayment(request: Request, env: Env): Promise<Response> {
  const { razorpay_payment_id, razorpay_order_id, razorpay_subscription_id, razorpay_signature } = await request.json();

  if (!razorpay_payment_id || !razorpay_signature) {
    return json({ error: "Missing payment verification payload" }, 400);
  }

  // Verify signature
  const payload = razorpay_subscription_id
    ? `${razorpay_payment_id}|${razorpay_subscription_id}`
    : `${razorpay_order_id}|${razorpay_payment_id}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(env.RAZORPAY_KEY_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const generatedSignature = Array.from(new Uint8Array(signed)).map(b => b.toString(16).padStart(2, "0")).join("");

  if (generatedSignature !== razorpay_signature) {
    return json({ error: "Invalid Razorpay signature" }, 400);
  }

  // Verify with Razorpay API
  const razorpayAuth = btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);
  const payRes = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}`, {
    headers: { Authorization: `Basic ${razorpayAuth}` },
  });
  const payData = await payRes.json() as any;

  if (!payRes.ok || !["captured", "authorized"].includes(payData.status)) {
    return json({ error: "Payment not captured yet" }, 402);
  }

  return json({ success: true, payment: payData });
}

// ────────────────────────────────────────────
// 4. CANCEL SUBSCRIPTION
// ────────────────────────────────────────────
async function cancelSubscription(request: Request, env: Env): Promise<Response> {
  const { subscriptionId, razorpaySubscriptionId } = await request.json();
  if (!subscriptionId || !razorpaySubscriptionId) return json({ error: "Missing subscription details" }, 400);

  const razorpayAuth = btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);
  const cancelRes = await fetch(`https://api.razorpay.com/v1/subscriptions/${encodeURIComponent(razorpaySubscriptionId)}/cancel`, {
    method: "POST", headers: { Authorization: `Basic ${razorpayAuth}`, "Content-Type": "application/json" },
  });
  const cancelData = await cancelRes.json() as any;
  if (!cancelRes.ok) return json({ error: cancelData.error?.description || "Failed to cancel" }, 500);

  // Update DB
  const headers = getSupabaseHeaders(env);
  const updateRes = await fetch(`${env.SUPABASE_URL}/rest/v1/subscriptions?id=eq.${subscriptionId}`, {
    method: "PATCH", headers,
    body: JSON.stringify({ status: "cancelled", cancelled_at: new Date().toISOString(), cancel_at_period_end: true }),
  });
  if (!updateRes.ok) console.error("Failed to update subscription status");

  return json({ success: true, message: "Subscription cancelled", razorpay: cancelData });
}

// ────────────────────────────────────────────
// 5. SEND WHATSAPP
// ────────────────────────────────────────────
async function sendWhatsApp(request: Request, env: Env): Promise<Response> {
  const { subscriptionId, userId, planName, username, mobile } = await request.json();

  if (!env.WHATSAPP_API_TOKEN || !env.WHATSAPP_PHONE_ID) {
    console.warn("WhatsApp credentials not set, skipping notification");
    return json({ success: true, skipped: true });
  }

  const owner = env.OWNER_WHATSAPP || "919559155535";
  const message = `🎉 *New Subscription Activated!*\n\n👤 *Name:* ${username || "N/A"}\n📱 *Mobile:* ${mobile || "N/A"}\n📦 *Plan:* ${planName}\n🔑 *Sub ID:* ${subscriptionId}\n✅ *Auto-Pay:* Enabled (Razorpay)\n\n_Prince Groups — Kanyakumari_`;

  const res = await fetch(`https://graph.facebook.com/v19.0/${env.WHATSAPP_PHONE_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.WHATSAPP_API_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: owner, type: "text", text: { body: message } }),
  });
  if (!res.ok) console.error("WhatsApp API error:", await res.text());

  return json({ success: true });
}

// ────────────────────────────────────────────
// 6. RAZORPAY WEBHOOK
// ────────────────────────────────────────────
async function razorpayWebhook(request: Request, env: Env): Promise<Response> {
  const signature = request.headers.get("x-razorpay-signature");
  const rawBody = await request.text();

  if (signature) {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.RAZORPAY_KEY_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
    const expected = Array.from(new Uint8Array(signed)).map(b => b.toString(16).padStart(2, "0")).join("");
    if (expected !== signature) return json({ error: "Invalid signature" }, 401);
  }

  const event = JSON.parse(rawBody);
  const { event: eventType, payload: eventPayload } = event;
  const headers = getSupabaseHeaders(env);

  if (eventType === "payment.authorized") {
    const paymentId = eventPayload.payment.entity.id;
    const status = eventPayload.payment.entity.status;
    await fetch(`${env.SUPABASE_URL}/rest/v1/payments?razorpay_payment_id=eq.${paymentId}`, {
      method: "PATCH", headers,
      body: JSON.stringify({ status: status === "captured" ? "captured" : "authorized" }),
    }).catch(e => console.error("webhook update error:", e));
  }

  if (eventType === "payment.failed") {
    const paymentId = eventPayload.payment.entity.id;
    await fetch(`${env.SUPABASE_URL}/rest/v1/payments?razorpay_payment_id=eq.${paymentId}`, {
      method: "PATCH", headers,
      body: JSON.stringify({
        status: "failed",
        error_code: eventPayload.payment.entity.error_code,
        error_description: eventPayload.payment.entity.error_description,
      }),
    }).catch(e => console.error("webhook update error:", e));
  }

  if (eventType === "refund.created") {
    const paymentId = eventPayload.refund.entity.payment_id;
    await fetch(`${env.SUPABASE_URL}/rest/v1/payments?razorpay_payment_id=eq.${paymentId}`, {
      method: "PATCH", headers,
      body: JSON.stringify({ status: "refunded" }),
    }).catch(e => console.error("webhook update error:", e));
  }

  return json({ success: true });
}
