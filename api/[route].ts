// Vercel serverless function: /api/[route]
// Clean rewrite — handles all backend API routes for Prince Groups subscription system.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHmac, timingSafeEqual } from "node:crypto";

type RouteHandler = (req: VercelRequest, res: VercelResponse) => Promise<void> | void;

const env = (key: string): string => process.env[key] ?? "";

// ─── PLAN CONFIG ───────────────────────────────────────────
// amounts in paise. Razorpay subscriptions charge this monthly.
const PLANS: Record<string, { amount: number; name: string; description: string }> = {
  starter: { amount: 3000,  name: "₹1 Plan",  description: "Starter – ₹30/month subscription" },
  popular: { amount: 30000, name: "₹10 Plan", description: "Popular – ₹300/month subscription" },
  premium: { amount: 300000, name: "₹100 Plan", description: "Premium – ₹3000/month subscription" },
};

// ─── HELPERS ───────────────────────────────────────────────
function setCors(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", env("CORS_ORIGIN") || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
}

function readJson(req: VercelRequest): Promise<any> {
  const body = req.body;
  if (body && typeof body === "object") return Promise.resolve(body);
  if (typeof body === "string") return Promise.resolve(JSON.parse(body || "{}"));
  return Promise.resolve({});
}

function supabaseHeaders() {
  return {
    "Content-Type": "application/json",
    apikey: env("SUPABASE_SERVICE_ROLE_KEY"),
    Authorization: `Bearer ${env("SUPABASE_SERVICE_ROLE_KEY")}`,
  };
}

function razorpayAuth() {
  const keyId = env("RAZORPAY_KEY_ID");
  const keySecret = env("RAZORPAY_KEY_SECRET");
  const token = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  return { Authorization: `Basic ${token}`, "Content-Type": "application/json" };
}

// ─── 1. HEALTH CHECK ──────────────────────────────────────
const health: RouteHandler = async (_req, res) => {
  const missing: string[] = [];
  if (!env("RAZORPAY_KEY_ID")) missing.push("RAZORPAY_KEY_ID");
  if (!env("RAZORPAY_KEY_SECRET")) missing.push("RAZORPAY_KEY_SECRET");
  if (!env("SUPABASE_URL")) missing.push("SUPABASE_URL");
  if (!env("SUPABASE_SERVICE_ROLE_KEY")) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  return res.status(missing.length ? 200 : 200).json({
    status: missing.length ? "MISSING" : "OK",
    razorpay: !missing.includes("RAZORPAY_KEY_ID") && !missing.includes("RAZORPAY_KEY_SECRET"),
    supabase: !missing.includes("SUPABASE_URL") && !missing.includes("SUPABASE_SERVICE_ROLE_KEY"),
    missingRequired: missing,
    plans: Object.keys(PLANS),
  });
};

// ─── 2. CREATE RAZORPAY ORDER ─────────────────────────────
const createRazorpayOrder: RouteHandler = async (req, res) => {
  const { planId, razorpayKeyId: clientKeyId } = await readJson(req);
  if (!planId) return res.status(400).json({ error: "Missing planId" });

  const plan = PLANS[planId as string];
  if (!plan) return res.status(400).json({ error: `Invalid planId: "${planId}". Valid: starter, popular, premium` });

  // Key secret must come from server env. Key ID can come from client (it's public).
  const keySecret = env("RAZORPAY_KEY_SECRET");
  const keyId = env("RAZORPAY_KEY_ID") || clientKeyId || "";
  if (!keySecret) return res.status(500).json({ error: "RAZORPAY_KEY_SECRET not configured on server" });
  if (!keyId) return res.status(500).json({ error: "RAZORPAY_KEY_ID not available" });

  const headers = razorpayAuth();
  const supHeaders = supabaseHeaders();

  // Find or create Razorpay plan
  const searchRes = await fetch("https://api.razorpay.com/v1/plans?count=100", { headers });
  const searchData: any = await searchRes.json();
  let rzpPlanId = (searchData.items || []).find(
    (p: any) => p.notes?.plan_id === planId && p.period === "monthly"
  )?.id;

  if (!rzpPlanId) {
    rzpPlanId = (searchData.items || []).find(
      (p: any) => p.item?.name === plan.name && p.period === "monthly"
    )?.id;
  }

  if (!rzpPlanId) {
    const planRes = await fetch("https://api.razorpay.com/v1/plans", {
      method: "POST", headers,
      body: JSON.stringify({
        period: "monthly", interval: 1,
        item: { name: plan.name, description: plan.description, amount: plan.amount, currency: "INR" },
        notes: { plan_id: planId },
      }),
    });
    const planData: any = await planRes.json();
    if (!planRes.ok || !planData.id) {
      console.error("[create-order] Razorpay plan creation failed:", planData);
      return res.status(500).json({ error: planData.error?.description || "Failed to create Razorpay plan" });
    }
    rzpPlanId = planData.id;

    // Save the Razorpay plan ID to our plans table
    await fetch(`${env("SUPABASE_URL")}/rest/v1/plans?id=eq.${planId}`, {
      method: "PATCH", headers: supHeaders,
      body: JSON.stringify({ razorpay_plan_id: rzpPlanId }),
    }).catch(() => {});
  }

  // Ensure plan row exists in Supabase (prevents FK violation on subscriptions insert)
  const existingPlan = await fetch(`${env("SUPABASE_URL")}/rest/v1/plans?id=eq.${planId}&select=id`, { headers: supHeaders });
  if (existingPlan.ok) {
    const rows = await existingPlan.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      await fetch(`${env("SUPABASE_URL")}/rest/v1/plans`, {
        method: "POST", headers: supHeaders,
        body: JSON.stringify({ id: planId, name: plan.name, initial_amount: plan.amount, monthly_amount: plan.amount, active: true }),
      }).catch((e) => console.error("[create-order] Plan upsert failed:", e));
    }
  }

  // Create Razorpay subscription
  const subRes = await fetch("https://api.razorpay.com/v1/subscriptions", {
    method: "POST", headers,
    body: JSON.stringify({
      plan_id: rzpPlanId, total_count: 120, quantity: 1, customer_notify: 1,
      notes: { plan_key: planId, plan_name: plan.name },
    }),
  });
  const subData: any = await subRes.json();
  if (!subRes.ok || !subData.id) {
    console.error("[create-order] Razorpay subscription failed:", subData);
    return res.status(500).json({ error: subData.error?.description || "Failed to create subscription" });
  }

  return res.status(200).json({
    keyId,
    subscriptionId: subData.id,
    orderId: subData.id,
    amount: plan.amount,
    currency: "INR",
    planName: plan.name,
    description: plan.description,
  });
};

// ─── 3. CONFIRM PAYMENT ───────────────────────────────────
const confirmRazorpayPayment: RouteHandler = async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_subscription_id, razorpay_signature } = await readJson(req);

  if (!razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: "Missing payment verification fields" });
  }

  const keySecret = env("RAZORPAY_KEY_SECRET");
  if (!keySecret) return res.status(500).json({ error: "RAZORPAY_KEY_SECRET not configured" });

  // Verify HMAC signature
  const payload = razorpay_subscription_id
    ? `${razorpay_payment_id}|${razorpay_subscription_id}`
    : `${razorpay_order_id}|${razorpay_payment_id}`;
  const generated = createHmac("sha256", keySecret).update(payload).digest("hex");

  if (generated.length !== razorpay_signature.length ||
      !timingSafeEqual(Buffer.from(generated, "hex"), Buffer.from(razorpay_signature, "hex"))) {
    return res.status(400).json({ error: "Invalid Razorpay signature" });
  }

  // Fetch payment details from Razorpay to confirm status
  const keyId = env("RAZORPAY_KEY_ID");
  const payRes = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}`, {
    headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}` },
  });
  if (!payRes.ok) return res.status(500).json({ error: "Could not verify payment with Razorpay" });

  const payData: any = await payRes.json();
  if (payData.status === "failed") {
    return res.status(402).json({ error: "Payment failed on Razorpay" });
  }

  return res.status(200).json({ success: true, payment: payData });
};

// ─── 4. SAVE PAYMENT ──────────────────────────────────────
const savePayment: RouteHandler = async (req, res) => {
  const {
    userId, planId, planName, razorpayOrderId, razorpayPaymentId, razorpaySubscriptionId,
    amount, username, mobile, email,
  } = await readJson(req);

  if (!userId || !planId || !razorpayPaymentId || !amount) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const headers = supabaseHeaders();

  // Idempotency: check if payment already saved
  const existing = await fetch(
    `${env("SUPABASE_URL")}/rest/v1/payments?razorpay_payment_id=eq.${razorpayPaymentId}&select=subscription_id`,
    { headers }
  );
  if (existing.ok) {
    const rows = await existing.json();
    if (Array.isArray(rows) && rows.length > 0) {
      return res.status(200).json({ success: true, subscriptionId: rows[0].subscription_id, duplicate: true });
    }
  }

  // Deactivate any existing active subscription for this user
  const existingSubs = await fetch(
    `${env("SUPABASE_URL")}/rest/v1/subscriptions?user_id=eq.${userId}&status=eq.active&select=id`,
    { headers }
  );
  if (existingSubs.ok) {
    const subs = await existingSubs.json();
    if (Array.isArray(subs)) {
      for (const sub of subs) {
        await fetch(`${env("SUPABASE_URL")}/rest/v1/subscriptions?id=eq.${sub.id}`, {
          method: "PATCH", headers,
          body: JSON.stringify({ status: "cancelled", cancelled_at: new Date().toISOString() }),
        }).catch(() => {});
      }
    }
  }

  // Create subscription record
  const now = new Date().toISOString();
  const later = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const subRes = await fetch(`${env("SUPABASE_URL")}/rest/v1/subscriptions?select=id`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({
      user_id: userId, plan_id: planId, status: "active",
      razorpay_subscription_id: razorpaySubscriptionId || null,
      current_start: now, current_end: later, next_charge_at: later, paid_count: 1,
    }),
  });

  if (!subRes.ok) {
    const err = await subRes.text();
    console.error("[save-payment] Subscription insert failed:", subRes.status, err);
    return res.status(500).json({ error: `Failed to create subscription: ${err}` });
  }

  const subRows = await subRes.json();
  const subId = Array.isArray(subRows) ? subRows[0]?.id : subRows?.id;
  if (!subId) return res.status(500).json({ error: "Subscription created but no ID returned" });

  // Create payment record
  const payRes = await fetch(`${env("SUPABASE_URL")}/rest/v1/payments`, {
    method: "POST", headers,
    body: JSON.stringify({
      user_id: userId, subscription_id: subId,
      razorpay_order_id: razorpayOrderId || null,
      razorpay_subscription_id: razorpaySubscriptionId || null,
      razorpay_payment_id: razorpayPaymentId,
      amount, currency: "INR", status: "captured", method: "razorpay",
    }),
  });

  if (!payRes.ok) {
    console.error("[save-payment] Payment insert failed:", await payRes.text());
  }

  // Update profile with name/phone
  if (username || mobile) {
    const updates: Record<string, string> = {};
    if (username) updates.full_name = username;
    if (mobile) updates.phone = mobile;
    fetch(`${env("SUPABASE_URL")}/rest/v1/profiles?user_id=eq.${userId}`, {
      method: "PATCH", headers, body: JSON.stringify(updates),
    }).catch(() => {});
  }

  return res.status(200).json({ success: true, subscriptionId: subId });
};

// ─── 5. CANCEL SUBSCRIPTION ───────────────────────────────
const cancelSubscription: RouteHandler = async (req, res) => {
  const { subscriptionId, razorpaySubscriptionId } = await readJson(req);
  if (!subscriptionId || !razorpaySubscriptionId) {
    return res.status(400).json({ error: "Missing subscription details" });
  }

  const headers = razorpayAuth();
  const cancelRes = await fetch(`https://api.razorpay.com/v1/subscriptions/${encodeURIComponent(razorpaySubscriptionId)}/cancel`, {
    method: "POST", headers,
    body: JSON.stringify({ cancel_at_cycle_end: 1 }),
  });
  const cancelData: any = await cancelRes.json();
  if (!cancelRes.ok) return res.status(500).json({ error: cancelData.error?.description || "Failed to cancel" });

  // Update local DB
  await fetch(`${env("SUPABASE_URL")}/rest/v1/subscriptions?id=eq.${subscriptionId}`, {
    method: "PATCH", headers: supabaseHeaders(),
    body: JSON.stringify({ status: "cancelled", cancelled_at: new Date().toISOString(), cancel_at_period_end: true }),
  });

  return res.status(200).json({ success: true, message: "Subscription cancelled" });
};

// ─── 6. RAZORPAY WEBHOOK ──────────────────────────────────
const razorpayWebhook: RouteHandler = async (req, res) => {
  const signature = (req.headers["x-razorpay-signature"] as string) ?? "";
  const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});

  if (!signature) return res.status(401).json({ error: "Missing webhook signature" });

  const expected = createHmac("sha256", env("RAZORPAY_KEY_SECRET")).update(rawBody).digest("hex");
  if (!timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"))) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  let event: any;
  try { event = JSON.parse(rawBody); } catch { return res.status(400).json({ error: "Invalid JSON" }); }

  const { event: eventType, payload } = event;
  const headers = supabaseHeaders();
  console.log(`[webhook] ${eventType}`);

  if (eventType === "payment.authorized" || eventType === "payment.captured") {
    const entity = payload?.payment?.entity;
    if (entity) {
      await fetch(`${env("SUPABASE_URL")}/rest/v1/payments?razorpay_payment_id=eq.${entity.id}`, {
        method: "PATCH", headers, body: JSON.stringify({ status: entity.status }),
      }).catch(() => {});
    }
  }

  if (eventType === "payment.failed") {
    const entity = payload?.payment?.entity;
    if (entity) {
      await fetch(`${env("SUPABASE_URL")}/rest/v1/payments?razorpay_payment_id=eq.${entity.id}`, {
        method: "PATCH", headers,
        body: JSON.stringify({ status: "failed", error_code: entity.error_code, error_description: entity.error_description }),
      }).catch(() => {});
    }
  }

  if (eventType === "subscription.activated" || eventType === "subscription.charged") {
    const entity = payload?.subscription?.entity;
    if (entity) {
      const nextCharge = entity.current_end ? new Date(entity.current_end * 1000).toISOString() : null;
      const update: Record<string, any> = { status: "active", paid_count: entity.paid_count };
      if (nextCharge) update.next_charge_at = nextCharge;
      await fetch(`${env("SUPABASE_URL")}/rest/v1/subscriptions?razorpay_subscription_id=eq.${entity.id}`, {
        method: "PATCH", headers, body: JSON.stringify(update),
      }).catch(() => {});
    }
  }

  if (eventType === "subscription.cancelled") {
    const entity = payload?.subscription?.entity;
    if (entity) {
      await fetch(`${env("SUPABASE_URL")}/rest/v1/subscriptions?razorpay_subscription_id=eq.${entity.id}`, {
        method: "PATCH", headers, body: JSON.stringify({ status: "cancelled", cancelled_at: new Date().toISOString() }),
      }).catch(() => {});
    }
  }

  if (eventType === "subscription.completed" || eventType === "subscription.expired") {
    const entity = payload?.subscription?.entity;
    if (entity) {
      await fetch(`${env("SUPABASE_URL")}/rest/v1/subscriptions?razorpay_subscription_id=eq.${entity.id}`, {
        method: "PATCH", headers, body: JSON.stringify({ status: eventType === "subscription.completed" ? "completed" : "expired" }),
      }).catch(() => {});
    }
  }

  return res.status(200).json({ success: true });
};

// ─── 7. ADMIN LOGIN ───────────────────────────────────────
const adminLogin: RouteHandler = async (req, res) => {
  const { username, password } = await readJson(req);
  const adminUser = env("ADMIN_USERNAME") || "PrinceAdmin";
  const adminPass = env("ADMIN_PASSWORD") || "BeemBoy@123";

  if (username !== adminUser || password !== adminPass) {
    return res.status(401).json({ error: "Invalid admin credentials" });
  }

  const headers = supabaseHeaders();
  const [profilesRes, subsRes, paysRes] = await Promise.all([
    fetch(`${env("SUPABASE_URL")}/rest/v1/profiles?select=*&order=created_at.desc`, { headers }),
    fetch(`${env("SUPABASE_URL")}/rest/v1/subscriptions?select=*,plans(name)&order=created_at.desc`, { headers }),
    fetch(`${env("SUPABASE_URL")}/rest/v1/payments?select=*&order=created_at.desc`, { headers }),
  ]);

  return res.status(200).json({
    profiles: profilesRes.ok ? await profilesRes.json() : [],
    subscriptions: subsRes.ok ? await subsRes.json() : [],
    payments: paysRes.ok ? await paysRes.json() : [],
  });
};

// ─── ROUTER ────────────────────────────────────────────────
const routes: Record<string, RouteHandler> = {
  "health": health,
  "save-payment": savePayment,
  "create-razorpay-order": createRazorpayOrder,
  "confirm-razorpay-payment": confirmRazorpayPayment,
  "cancel-subscription": cancelSubscription,
  "razorpay-webhook": razorpayWebhook,
  "admin-login": adminLogin,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method === "GET") return health(req, res);
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const path = ((req.query.route as string) || "").replace(/^\//, "");
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
