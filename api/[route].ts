// Vercel serverless function: /api/[route]
// Replaces the Cloudflare worker in functions-api/src/index.ts.
// Frontend posts to `${WORKER_URL}/<route>`; we accept the same path and dispatch.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHmac, timingSafeEqual } from "node:crypto";

type RouteHandler = (req: VercelRequest, res: VercelResponse) => Promise<void> | void;

const env = (key: string): string => process.env[key] ?? "";

function setCors(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "authorization, x-client-info, apikey, content-type"
  );
}

function supabaseHeaders() {
  return {
    "Content-Type": "application/json",
    apikey: env("SUPABASE_SERVICE_ROLE_KEY"),
    Authorization: `Bearer ${env("SUPABASE_SERVICE_ROLE_KEY")}`,
  };
}

function readJson(req: VercelRequest): Promise<any> {
  // Vercel parses JSON for us when content-type is application/json.
  const body = req.body;
  if (body && typeof body === "object") return Promise.resolve(body);
  if (typeof body === "string") return Promise.resolve(JSON.parse(body || "{}"));
  return Promise.resolve({});
}

async function readRawBody(req: VercelRequest): Promise<string> {
  const body = req.body;
  if (body == null) return "";
  if (typeof body === "string") return body;
  if (Buffer.isBuffer(body)) return body.toString("utf8");
  return JSON.stringify(body);
}

// ────────────────────────────────────────────
// 1. SAVE PAYMENT
// ────────────────────────────────────────────
const savePayment: RouteHandler = async (req, res) => {
  const {
    userId, planId, razorpayOrderId, razorpayPaymentId, razorpaySubscriptionId,
    amount, username, mobile,
  } = await readJson(req);

  if (!userId || !planId || !razorpayPaymentId || !amount) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const headers = supabaseHeaders();
  const now = new Date().toISOString();
  const later = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const subPayload: Record<string, unknown> = {
    user_id: userId, plan_id: planId, status: "active",
    current_start: now, current_end: later, next_charge_at: later, paid_count: 1,
  };
  if (razorpaySubscriptionId) subPayload.razorpay_subscription_id = razorpaySubscriptionId;

  const subRes = await fetch(`${env("SUPABASE_URL")}/rest/v1/subscriptions?select=id`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify(subPayload),
  });

  if (!subRes.ok) {
    console.error("sub insert failed:", await subRes.text());
    return res.status(500).json({ error: "Unable to create subscription" });
  }

  const subData = await subRes.json();
  const subId = Array.isArray(subData) ? subData[0]?.id : subData?.id;
  if (!subId) return res.status(500).json({ error: "Unable to create subscription (no id)" });

  const payRes = await fetch(`${env("SUPABASE_URL")}/rest/v1/payments`, {
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
    return res.status(500).json({ error: "Unable to save payment record" });
  }

  if (username || mobile) {
    const updates: Record<string, string> = {};
    if (username) updates.full_name = username;
    if (mobile) updates.phone = mobile;
    fetch(`${env("SUPABASE_URL")}/rest/v1/profiles?user_id=eq.${userId}`, {
      method: "PATCH", headers: supabaseHeaders(), body: JSON.stringify(updates),
    }).catch(() => {});
  }

  return res.status(200).json({ success: true, subscriptionId: subId });
};

// ────────────────────────────────────────────
// 2. CREATE RAZORPAY ORDER
// ────────────────────────────────────────────
const createRazorpayOrder: RouteHandler = async (req, res) => {
  const { planId } = await readJson(req);
  if (!planId) return res.status(400).json({ error: "Missing planId" });

  const razorpayAuth = Buffer.from(`${env("RAZORPAY_KEY_ID")}:${env("RAZORPAY_KEY_SECRET")}`).toString("base64");
  const authHeader = { Authorization: `Basic ${razorpayAuth}`, "Content-Type": "application/json" };

  const plans: Record<string, { amount: number; monthlyAmount: number; name: string; description: string }> = {
    starter: { amount: 100, monthlyAmount: 3000, name: "₹1 Plan", description: "Starter daily membership" },
    popular: { amount: 1000, monthlyAmount: 30000, name: "₹10 Plan", description: "Popular daily membership" },
    premium: { amount: 10000, monthlyAmount: 300000, name: "₹100 Plan", description: "Premium daily membership" },
  };

  const plan = plans[planId as string];
  if (!plan) return res.status(400).json({ error: "Invalid planId" });

  const searchRes = await fetch("https://api.razorpay.com/v1/plans?count=10", { headers: authHeader });
  const searchData: any = await searchRes.json();
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
    const planData: any = await planRes.json();
    if (!planRes.ok || !planData.id) return res.status(500).json({ error: "Unable to create Razorpay plan" });
    razorpayPlanId = planData.id;
  }

  const subRes = await fetch("https://api.razorpay.com/v1/subscriptions", {
    method: "POST", headers: authHeader,
    body: JSON.stringify({
      plan_id: razorpayPlanId, total_count: 120, quantity: 1, customer_notify: 1,
      addons: [{ item: { name: "First day charge", amount: plan.amount, currency: "INR" } }],
      notes: { plan_key: planId, plan_name: plan.name },
    }),
  });
  const subData: any = await subRes.json();
  if (!subRes.ok || !subData.id) {
    return res.status(500).json({ error: subData.error?.description || "Unable to create subscription" });
  }

  return res.status(200).json({
    keyId: env("RAZORPAY_KEY_ID"),
    subscriptionId: subData.id,
    orderId: subData.id,
    amount: plan.amount,
    currency: "INR",
    planName: plan.name,
    description: plan.description,
    isSubscription: true,
  });
};

// ────────────────────────────────────────────
// 3. CONFIRM RAZORPAY PAYMENT
// ────────────────────────────────────────────
const confirmRazorpayPayment: RouteHandler = async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_subscription_id, razorpay_signature } = await readJson(req);

  if (!razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: "Missing payment verification payload" });
  }

  const payload = razorpay_subscription_id
    ? `${razorpay_payment_id}|${razorpay_subscription_id}`
    : `${razorpay_order_id}|${razorpay_payment_id}`;

  const generatedSignature = createHmac("sha256", env("RAZORPAY_KEY_SECRET"))
    .update(payload)
    .digest("hex");

  // Timing-safe compare (lengths must match)
  if (
    generatedSignature.length !== razorpay_signature.length ||
    !timingSafeEqual(Buffer.from(generatedSignature, "hex"), Buffer.from(razorpay_signature, "hex"))
  ) {
    return res.status(400).json({ error: "Invalid Razorpay signature" });
  }

  const razorpayAuth = Buffer.from(`${env("RAZORPAY_KEY_ID")}:${env("RAZORPAY_KEY_SECRET")}`).toString("base64");
  const payRes = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}`, {
    headers: { Authorization: `Basic ${razorpayAuth}` },
  });
  const payData: any = await payRes.json();

  if (!payRes.ok || !["captured", "authorized"].includes(payData.status)) {
    return res.status(402).json({ error: "Payment not captured yet" });
  }

  return res.status(200).json({ success: true, payment: payData });
};

// ────────────────────────────────────────────
// 4. CANCEL SUBSCRIPTION
// ────────────────────────────────────────────
const cancelSubscription: RouteHandler = async (req, res) => {
  const { subscriptionId, razorpaySubscriptionId } = await readJson(req);
  if (!subscriptionId || !razorpaySubscriptionId) {
    return res.status(400).json({ error: "Missing subscription details" });
  }

  const razorpayAuth = Buffer.from(`${env("RAZORPAY_KEY_ID")}:${env("RAZORPAY_KEY_SECRET")}`).toString("base64");
  const cancelRes = await fetch(`https://api.razorpay.com/v1/subscriptions/${encodeURIComponent(razorpaySubscriptionId)}/cancel`, {
    method: "POST", headers: { Authorization: `Basic ${razorpayAuth}`, "Content-Type": "application/json" },
  });
  const cancelData: any = await cancelRes.json();
  if (!cancelRes.ok) return res.status(500).json({ error: cancelData.error?.description || "Failed to cancel" });

  const updateRes = await fetch(`${env("SUPABASE_URL")}/rest/v1/subscriptions?id=eq.${subscriptionId}`, {
    method: "PATCH", headers: supabaseHeaders(),
    body: JSON.stringify({ status: "cancelled", cancelled_at: new Date().toISOString(), cancel_at_period_end: true }),
  });
  if (!updateRes.ok) console.error("Failed to update subscription status");

  return res.status(200).json({ success: true, message: "Subscription cancelled", razorpay: cancelData });
};

// ────────────────────────────────────────────
// 5. SEND WHATSAPP
// ────────────────────────────────────────────
const sendWhatsApp: RouteHandler = async (req, res) => {
  const { subscriptionId, userId, planName, username, mobile } = await readJson(req);

  if (!env("WHATSAPP_API_TOKEN") || !env("WHATSAPP_PHONE_ID")) {
    console.warn("WhatsApp credentials not set, skipping notification");
    return res.status(200).json({ success: true, skipped: true });
  }

  const owner = env("OWNER_WHATSAPP") || "919559155535";
  const message = `🎉 *New Subscription Activated!*\n\n👤 *Name:* ${username || "N/A"}\n📱 *Mobile:* ${mobile || "N/A"}\n📦 *Plan:* ${planName}\n🔑 *Sub ID:* ${subscriptionId}\n✅ *Auto-Pay:* Enabled (Razorpay)\n\n_Prince Groups — Kanyakumari_`;

  const waRes = await fetch(`https://graph.facebook.com/v19.0/${env("WHATSAPP_PHONE_ID")}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env("WHATSAPP_API_TOKEN")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: owner, type: "text", text: { body: message } }),
  });
  if (!waRes.ok) console.error("WhatsApp API error:", await waRes.text());

  return res.status(200).json({ success: true });
};

// ────────────────────────────────────────────
// 6. RAZORPAY WEBHOOK
// ────────────────────────────────────────────
const razorpayWebhook: RouteHandler = async (req, res) => {
  const signature = (req.headers["x-razorpay-signature"] as string | undefined) ?? "";
  const rawBody = await readRawBody(req);

  if (signature) {
    const expected = createHmac("sha256", env("RAZORPAY_KEY_SECRET")).update(rawBody).digest("hex");
    if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"))) {
      return res.status(401).json({ error: "Invalid signature" });
    }
  }

  const event = JSON.parse(rawBody || "{}");
  const { event: eventType, payload: eventPayload } = event;
  const headers = supabaseHeaders();

  if (eventType === "payment.authorized") {
    const paymentId = eventPayload.payment.entity.id;
    const status = eventPayload.payment.entity.status;
    await fetch(`${env("SUPABASE_URL")}/rest/v1/payments?razorpay_payment_id=eq.${paymentId}`, {
      method: "PATCH", headers,
      body: JSON.stringify({ status: status === "captured" ? "captured" : "authorized" }),
    }).catch((e) => console.error("webhook update error:", e));
  }

  if (eventType === "payment.failed") {
    const paymentId = eventPayload.payment.entity.id;
    await fetch(`${env("SUPABASE_URL")}/rest/v1/payments?razorpay_payment_id=eq.${paymentId}`, {
      method: "PATCH", headers,
      body: JSON.stringify({
        status: "failed",
        error_code: eventPayload.payment.entity.error_code,
        error_description: eventPayload.payment.entity.error_description,
      }),
    }).catch((e) => console.error("webhook update error:", e));
  }

  if (eventType === "refund.created") {
    const paymentId = eventPayload.refund.entity.payment_id;
    await fetch(`${env("SUPABASE_URL")}/rest/v1/payments?razorpay_payment_id=eq.${paymentId}`, {
      method: "PATCH", headers,
      body: JSON.stringify({ status: "refunded" }),
    }).catch((e) => console.error("webhook update error:", e));
  }

  return res.status(200).json({ success: true });
};

// ────────────────────────────────────────────
// DISPATCHER
// ────────────────────────────────────────────
const routes: Record<string, RouteHandler> = {
  "save-payment": savePayment,
  "create-razorpay-order": createRazorpayOrder,
  "confirm-razorpay-payment": confirmRazorpayPayment,
  "cancel-subscription": cancelSubscription,
  "send-whatsapp": sendWhatsApp,
  "razorpay-webhook": razorpayWebhook,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const rawPath = (req.query.route as string) || "";
  const path = rawPath.replace(/^\//, "");
  const handlerFn = routes[path];

  if (!handlerFn) return res.status(404).json({ error: `Unknown route: ${path}` });

  console.log(`[${path}] START`);
  try {
    await handlerFn(req, res);
    console.log(`[${path}] OK`);
  } catch (err) {
    console.error(`[${path}] ERROR:`, err);
    if (!res.writableEnded) {
      res.status(500).json({ error: (err as Error).message || "Internal error" });
    }
  }
}
