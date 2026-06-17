// Vercel serverless function: /api/[route]
// Replaces the Cloudflare worker in functions-api/src/index.ts.
// Frontend posts to `${WORKER_URL}/<route>`; we accept the same path and dispatch.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHmac, timingSafeEqual } from "node:crypto";
import nodemailer from "nodemailer";

type RouteHandler = (req: VercelRequest, res: VercelResponse) => Promise<void> | void;

const env = (key: string): string => process.env[key] ?? "";

// ────────────────────────────────────────────
// SHARED PLAN CONFIG (single source of truth)
// amounts in paise
// ────────────────────────────────────────────
const PLANS: Record<string, { firstMonthPaise: number; monthlyPaise: number; name: string; description: string }> = {
  starter: { firstMonthPaise: 3000,  monthlyPaise: 3000,  name: "₹1 Plan",  description: "Starter – ₹30/month subscription" },
  popular: { firstMonthPaise: 30000, monthlyPaise: 30000, name: "₹10 Plan", description: "Popular – ₹300/month subscription" },
  premium: { firstMonthPaise: 300000, monthlyPaise: 300000, name: "₹100 Plan", description: "Premium – ₹3000/month subscription" },
};

function setCors(res: VercelResponse, origin?: string) {
  const allowed = env("CORS_ORIGIN") || origin || "*";
  res.setHeader("Access-Control-Allow-Origin", allowed);
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
// 1. SAVE PAYMENT (with idempotency check)
// ────────────────────────────────────────────
const savePayment: RouteHandler = async (req, res) => {
  const {
    userId, planId, planName, razorpayOrderId, razorpayPaymentId, razorpaySubscriptionId,
    amount, username, mobile, email,
  } = await readJson(req);

  if (!userId || !planId || !razorpayPaymentId || !amount) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const headers = supabaseHeaders();

  // ── IDEMPOTENCY CHECK: prevent duplicate payments ──
  // If a payment with this razorpay_payment_id already exists, return the existing subscription
  const existingPayRes = await fetch(
    `${env("SUPABASE_URL")}/rest/v1/payments?razorpay_payment_id=eq.${razorpayPaymentId}&select=subscription_id`,
    { headers }
  );
  if (existingPayRes.ok) {
    const existing = await existingPayRes.json();
    if (Array.isArray(existing) && existing.length > 0) {
      console.log(`[save-payment] Duplicate payment detected: ${razorpayPaymentId}, returning existing subscription: ${existing[0].subscription_id}`);
      return res.status(200).json({ success: true, subscriptionId: existing[0].subscription_id, duplicate: true });
    }
  }

  const now = new Date().toISOString();
  const later = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // ── Deactivate any existing active subscription for this user ──
  const existingSubRes = await fetch(
    `${env("SUPABASE_URL")}/rest/v1/subscriptions?user_id=eq.${userId}&status=eq.active&select=id`,
    { headers }
  );
  if (existingSubRes.ok) {
    const existingSubs = await existingSubRes.json();
    if (Array.isArray(existingSubs) && existingSubs.length > 0) {
      for (const sub of existingSubs) {
        await fetch(`${env("SUPABASE_URL")}/rest/v1/subscriptions?id=eq.${sub.id}`, {
          method: "PATCH", headers,
          body: JSON.stringify({ status: "replaced", replaced_at: now }),
        }).catch((e) => console.error("Failed to deactivate old subscription:", e));
      }
    }
  }

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
    }).catch((e) => console.error("Profile update failed:", e));
  }

  // Send email notification (best-effort, don't block the response)
  sendEmailNotification({
    subscriptionId: subId,
    planName: planName || planId || "",
    username: username || "",
    email: email || "",
  }).catch((err) => console.error("Email notification failed:", err));

  // Send WhatsApp notifications (best-effort, don't block the response)
  sendWhatsAppNotifications({
    subscriptionId: subId,
    planName: planName || planId || "",
    username: username || "",
    mobile: mobile || "",
  }).catch((err) => console.error("WhatsApp notification failed:", err));

  return res.status(200).json({ success: true, subscriptionId: subId });
};

// ────────────────────────────────────────────
// 2. CREATE RAZORPAY ORDER
// ────────────────────────────────────────────
const createRazorpayOrder: RouteHandler = async (req, res) => {
  const { planId } = await readJson(req);
  if (!planId) return res.status(400).json({ error: "Missing planId" });

  const plan = PLANS[planId as string];
  if (!plan) return res.status(400).json({ error: "Invalid planId" });

  const razorpayKeySecret = env("RAZORPAY_KEY_SECRET");
  if (!razorpayKeySecret) {
    console.error("[create-razorpay-order] RAZORPAY_KEY_SECRET is not configured");
    return res.status(500).json({ error: "Payment service not configured" });
  }

  const razorpayAuth = Buffer.from(`${env("RAZORPAY_KEY_ID")}:${razorpayKeySecret}`).toString("base64");
  const authHeader = { Authorization: `Basic ${razorpayAuth}`, "Content-Type": "application/json" };

  // Search for existing Razorpay plan by notes.plan_id (reliable lookup)
  const searchRes = await fetch("https://api.razorpay.com/v1/plans?count=100", { headers: authHeader });
  const searchData: any = await searchRes.json();
  let razorpayPlanId = (searchData.items || []).find(
    (p: any) => p.notes?.plan_id === planId && p.period === "monthly"
  )?.id;

  // Fallback: match by name if notes lookup fails (legacy plans)
  if (!razorpayPlanId) {
    razorpayPlanId = (searchData.items || []).find(
      (p: any) => p.item?.name === plan.name && p.period === "monthly"
    )?.id;
  }

  if (!razorpayPlanId) {
    const planRes = await fetch("https://api.razorpay.com/v1/plans", {
      method: "POST", headers: authHeader,
      body: JSON.stringify({
        period: "monthly", interval: 1,
        item: { name: plan.name, description: plan.description, amount: plan.monthlyPaise, currency: "INR" },
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
      addons: [{ item: { name: "First month subscription", amount: plan.monthlyPaise, currency: "INR" } }],
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
    orderId: subData.id, // Razorpay subscriptions use subscription ID as order reference
    amount: plan.firstMonthPaise,
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

  const razorpaySecret = env("RAZORPAY_KEY_SECRET");
  if (!razorpaySecret) {
    console.error("[confirm-razorpay-payment] RAZORPAY_KEY_SECRET is not configured");
    return res.status(500).json({ error: "Payment verification service not configured" });
  }

  console.log(`[confirm-razorpay-payment] Verifying payment: ${razorpay_payment_id}`);

  const payload = razorpay_subscription_id
    ? `${razorpay_payment_id}|${razorpay_subscription_id}`
    : `${razorpay_order_id}|${razorpay_payment_id}`;

  const generatedSignature = createHmac("sha256", razorpaySecret)
    .update(payload)
    .digest("hex");

  if (
    generatedSignature.length !== razorpay_signature.length ||
    !timingSafeEqual(Buffer.from(generatedSignature, "hex"), Buffer.from(razorpay_signature, "hex"))
  ) {
    console.error(`[confirm-razorpay-payment] Signature mismatch for payment: ${razorpay_payment_id}`);
    return res.status(400).json({ error: "Invalid Razorpay signature" });
  }

  console.log(`[confirm-razorpay-payment] Signature verified OK`);

  const razorpayAuth = Buffer.from(`${env("RAZORPAY_KEY_ID")}:${razorpaySecret}`).toString("base64");
  const payRes = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}`, {
    headers: { Authorization: `Basic ${razorpayAuth}` },
  });

  if (!payRes.ok) {
    const errorText = await payRes.text();
    console.error("Razorpay payment fetch error:", payRes.status, errorText);
    return res.status(402).json({ error: "Payment verification failed", details: errorText });
  }

  let payData: any;
  try {
    payData = await payRes.json();
  } catch (jsonErr) {
    console.error("Failed to parse Razorpay payment response:", jsonErr);
    return res.status(500).json({ error: "Invalid response from Razorpay" });
  }

  // Only accept payments that are authorized or captured
  // "created" means the customer hasn't completed auth yet — reject it
  if (payData.status === "failed") {
    return res.status(402).json({ error: "Payment failed", status: payData.status });
  }
  if (!["authorized", "captured"].includes(payData.status)) {
    console.warn(`Payment ${razorpay_payment_id} has status: ${payData.status} — allowing to proceed`);
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
// EMAIL HELPER (shared between savePayment and sendEmail)
// ────────────────────────────────────────────
type EmailData = { subscriptionId: string; planName: string; username: string; email: string };
type WhatsAppData = { subscriptionId: string; planName: string; username: string; mobile: string };

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function sendEmailNotification(data: EmailData): Promise<void> {
  const { subscriptionId, planName, username, email } = data;
  const fromEmail = env("SMTP_EMAIL") || "noreply@princegroups.com";
  const appPassword = env("SMTP_PASSWORD");
  const ownerEmail = env("OWNER_EMAIL") || fromEmail;

  if (!appPassword) {
    console.warn("sendEmailNotification: SMTP_PASSWORD not set, skipping email");
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: fromEmail, pass: appPassword },
  });

  const safeName = escapeHtml(username || "Valued Member");
  const safePlan = escapeHtml(planName);
  const safeSubId = escapeHtml(subscriptionId);

  // 1. Email to the user (if email provided)
  if (email) {
    try {
      await transporter.sendMail({
        from: `"Prince Groups" <${fromEmail}>`,
        to: email,
        subject: "🎉 Welcome to Prince Groups — Membership Activated!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; background: #fafafa; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #0f766e; margin: 0;">🌟 Prince Groups</h1>
              <p style="color: #888; font-size: 13px;">Kanyakumari</p>
            </div>
            <div style="background: white; border-radius: 10px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
              <h2 style="margin: 0 0 16px; color: #1a1a2e;">Welcome, ${safeName}! 🎉</h2>
              <p style="color: #555; line-height: 1.6;">Your membership is now <strong style="color: #0f766e;">active</strong>.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr><td style="padding: 8px 0; color: #888;">Plan</td><td style="padding: 8px 0; font-weight: bold; text-align: right;">${safePlan}</td></tr>
                <tr><td style="padding: 8px 0; color: #888; border-top: 1px solid #eee;">Auto-Pay</td><td style="padding: 8px 0; font-weight: bold; text-align: right; border-top: 1px solid #eee; color: #0f766e;">✅ Enabled</td></tr>
                <tr><td style="padding: 8px 0; color: #888; border-top: 1px solid #eee;">Next charge</td><td style="padding: 8px 0; text-align: right; border-top: 1px solid #eee;">In 30 days</td></tr>
                <tr><td style="padding: 8px 0; color: #888; border-top: 1px solid #eee;">Subscription ID</td><td style="padding: 8px 0; text-align: right; border-top: 1px solid #eee; font-size: 12px; color: #999;">${safeSubId}</td></tr>
              </table>
              <p style="color: #555; line-height: 1.6; font-size: 14px;">Thank you for joining! For any queries, reply to this email or contact us.</p>
            </div>
            <p style="text-align: center; font-size: 12px; color: #bbb; margin-top: 20px;">Prince Groups — Kanyakumari</p>
          </div>
        `,
      });
      console.log(`Email sent to user ${email} for subscription ${subscriptionId}`);
    } catch (err) {
      console.error(`sendEmailNotification: Email to user (${email}) failed:`, err);
    }
  }

  // 2. Email to the owner
  try {
    await transporter.sendMail({
      from: `"Prince Groups" <${fromEmail}>`,
      to: ownerEmail,
      subject: "🎉 New Subscription Activated!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; background: #fafafa; border-radius: 12px;">
          <h2 style="color: #1a1a2e;">New Subscription</h2>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 8px 0; color: #888;">Name</td><td style="padding: 8px 0; font-weight: bold; text-align: right;">${safeName}</td></tr>
            <tr><td style="padding: 8px 0; color: #888; border-top: 1px solid #eee;">Email</td><td style="padding: 8px 0; text-align: right; border-top: 1px solid #eee;">${escapeHtml(email || "N/A")}</td></tr>
            <tr><td style="padding: 8px 0; color: #888; border-top: 1px solid #eee;">Plan</td><td style="padding: 8px 0; font-weight: bold; text-align: right; border-top: 1px solid #eee;">${safePlan}</td></tr>
            <tr><td style="padding: 8px 0; color: #888; border-top: 1px solid #eee;">Sub ID</td><td style="padding: 8px 0; text-align: right; border-top: 1px solid #eee; font-size: 12px;">${safeSubId}</td></tr>
          </table>
        </div>
      `,
    });
    console.log(`Email sent to owner ${ownerEmail} for subscription ${subscriptionId}`);
  } catch (err) {
    console.error(`sendEmailNotification: Email to owner (${ownerEmail}) failed:`, err);
  }
}

// ────────────────────────────────────────────
// WHATSAPP HELPER (sends notifications to customer and owner)
// ────────────────────────────────────────────
async function sendWhatsAppNotifications(data: WhatsAppData): Promise<void> {
  const { subscriptionId, planName, username, mobile } = data;
  const WHATSAPP_API_TOKEN = env("WHATSAPP_API_TOKEN");
  const WHATSAPP_PHONE_ID = env("WHATSAPP_PHONE_ID");
  const OWNER_WHATSAPP = env("OWNER_WHATSAPP") || "919559155535";

  if (!WHATSAPP_API_TOKEN || !WHATSAPP_PHONE_ID) {
    console.warn("sendWhatsAppNotifications: WhatsApp credentials not set, skipping");
    return;
  }

  const sendWhatsAppMessage = async (to: string, message: string) => {
    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_ID}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: to,
          type: "text",
          text: { body: message },
        }),
      });
      if (!res.ok) {
        console.error(`WhatsApp API error for ${to}:`, await res.text());
      } else {
        console.log(`WhatsApp message sent to ${to}`);
      }
    } catch (err) {
      console.error(`WhatsApp send failed for ${to}:`, err);
    }
  };

  // 1. Send welcome message to customer (if mobile provided)
  if (mobile && mobile.length >= 10) {
    // Strip + and leading zeros, ensure starts with 91
    let cleanMobile = mobile.replace(/[^0-9]/g, "");
    if (cleanMobile.startsWith("91") && cleanMobile.length > 10) {
      // Already has country code
    } else if (cleanMobile.length === 10) {
      cleanMobile = "91" + cleanMobile;
    }
    const customerMessage = `🎉 *Welcome to Prince Groups!*\n\nHi ${username || "Valued Member"}! 👋\n\nYour membership is now *active*.\n\n📦 *Plan:* ${planName}\n✅ *Auto-Pay:* Enabled\n📅 *Next charge:* In 30 days\n🔑 *Sub ID:* ${subscriptionId}\n\nThank you for joining! For any queries, contact us on WhatsApp or call 9559155535.\n\n_Prince Groups — Kanyakumari_`;
    await sendWhatsAppMessage(cleanMobile, customerMessage);
  }

  // 2. Send notification to owner
  const ownerMessage = `🎉 *New Subscription Activated!*\n\n👤 *Name:* ${username || "N/A"}\n📱 *Mobile:* ${mobile || "N/A"}\n📦 *Plan:* ${planName}\n🔑 *Sub ID:* ${subscriptionId}\n✅ *Auto-Pay:* Enabled (Razorpay)\n\n_Prince Groups — Kanyakumari_`;
  await sendWhatsAppMessage(OWNER_WHATSAPP, ownerMessage);
}

// ────────────────────────────────────────────
// 5. SEND EMAIL (free — uses Gmail SMTP)
// ────────────────────────────────────────────
const sendEmail: RouteHandler = async (req, res) => {
  const { subscriptionId, planName, username, email } = await readJson(req);
  try {
    await sendEmailNotification({ subscriptionId, planName, username, email });
  } catch (err) {
    console.error("sendEmail route error:", err);
    return res.status(500).json({ error: "Failed to send email" });
  }
  return res.status(200).json({ success: true });
};

// ────────────────────────────────────────────
// 6. RAZORPAY WEBHOOK
// ────────────────────────────────────────────
const razorpayWebhook: RouteHandler = async (req, res) => {
  const signature = (req.headers["x-razorpay-signature"] as string | undefined) ?? "";
  const rawBody = await readRawBody(req);

  // Webhook signature is MANDATORY — reject if missing
  if (!signature) {
    console.error("[razorpay-webhook] Missing x-razorpay-signature header");
    return res.status(401).json({ error: "Missing webhook signature" });
  }

  const expected = createHmac("sha256", env("RAZORPAY_KEY_SECRET")).update(rawBody).digest("hex");
  if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"))) {
    console.error("[razorpay-webhook] Invalid webhook signature");
    return res.status(401).json({ error: "Invalid signature" });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody || "{}");
  } catch (e) {
    console.error("[razorpay-webhook] Failed to parse webhook body");
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const { event: eventType, payload: eventPayload } = event;
  const headers = supabaseHeaders();
  console.log(`[razorpay-webhook] Received event: ${eventType}`);

  // ── Payment events ──
  if (eventType === "payment.authorized" || eventType === "payment.captured") {
    const entity = eventPayload?.payment?.entity;
    if (!entity) return res.status(200).json({ success: true }); // ack unknown payloads

    const paymentId = entity.id;
    const status = entity.status; // "authorized" or "captured"
    await fetch(`${env("SUPABASE_URL")}/rest/v1/payments?razorpay_payment_id=eq.${paymentId}`, {
      method: "PATCH", headers,
      body: JSON.stringify({ status }),
    }).catch((e) => console.error("webhook payment update error:", e));
  }

  if (eventType === "payment.failed") {
    const entity = eventPayload?.payment?.entity;
    if (!entity) return res.status(200).json({ success: true });

    const paymentId = entity.id;
    await fetch(`${env("SUPABASE_URL")}/rest/v1/payments?razorpay_payment_id=eq.${paymentId}`, {
      method: "PATCH", headers,
      body: JSON.stringify({
        status: "failed",
        error_code: entity.error_code,
        error_description: entity.error_description,
      }),
    }).catch((e) => console.error("webhook payment.failed update error:", e));
  }

  // ── Subscription lifecycle events ──
  if (eventType === "subscription.activated" || eventType === "subscription.charged") {
    const entity = eventPayload?.subscription?.entity;
    if (!entity) return res.status(200).json({ success: true });

    const razorpaySubId = entity.id;
    const paidAt = new Date().toISOString();
    const nextCharge = entity.current_end ? new Date(entity.current_end * 1000).toISOString() : null;

    const updateBody: Record<string, unknown> = { status: "active", paid_count: entity.paid_count };
    if (nextCharge) updateBody.next_charge_at = nextCharge;

    await fetch(`${env("SUPABASE_URL")}/rest/v1/subscriptions?razorpay_subscription_id=eq.${razorpaySubId}`, {
      method: "PATCH", headers,
      body: JSON.stringify(updateBody),
    }).catch((e) => console.error("webhook subscription update error:", e));
  }

  if (eventType === "subscription.cancelled") {
    const entity = eventPayload?.subscription?.entity;
    if (!entity) return res.status(200).json({ success: true });

    const razorpaySubId = entity.id;
    await fetch(`${env("SUPABASE_URL")}/rest/v1/subscriptions?razorpay_subscription_id=eq.${razorpaySubId}`, {
      method: "PATCH", headers,
      body: JSON.stringify({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
      }),
    }).catch((e) => console.error("webhook subscription.cancelled error:", e));
  }

  if (eventType === "subscription.completed") {
    const entity = eventPayload?.subscription?.entity;
    if (!entity) return res.status(200).json({ success: true });

    const razorpaySubId = entity.id;
    await fetch(`${env("SUPABASE_URL")}/rest/v1/subscriptions?razorpay_subscription_id=eq.${razorpaySubId}`, {
      method: "PATCH", headers,
      body: JSON.stringify({ status: "completed" }),
    }).catch((e) => console.error("webhook subscription.completed error:", e));
  }

  if (eventType === "subscription.paused") {
    const entity = eventPayload?.subscription?.entity;
    if (!entity) return res.status(200).json({ success: true });

    const razorpaySubId = entity.id;
    await fetch(`${env("SUPABASE_URL")}/rest/v1/subscriptions?razorpay_subscription_id=eq.${razorpaySubId}`, {
      method: "PATCH", headers,
      body: JSON.stringify({ status: "paused" }),
    }).catch((e) => console.error("webhook subscription.paused error:", e));
  }

  // ── Refund events ──
  if (eventType === "refund.created") {
    const entity = eventPayload?.refund?.entity;
    if (!entity) return res.status(200).json({ success: true });

    const paymentId = entity.payment_id;
    await fetch(`${env("SUPABASE_URL")}/rest/v1/payments?razorpay_payment_id=eq.${paymentId}`, {
      method: "PATCH", headers,
      body: JSON.stringify({ status: "refunded" }),
    }).catch((e) => console.error("webhook refund update error:", e));
  }

  return res.status(200).json({ success: true });
};

// ────────────────────────────────────────────
// 7. ADMIN LOGIN
// ────────────────────────────────────────────
const adminLogin: RouteHandler = async (req, res) => {
  const { username, password } = await readJson(req);

  const adminUser = env("ADMIN_USERNAME");
  const adminPass = env("ADMIN_PASSWORD");

  // If env vars are set, use them; otherwise fall back to defaults (for backwards compat)
  const validUser = adminUser || "PrinceAdmin";
  const validPass = adminPass || "BeemBoy@123";

  if (username !== validUser || password !== validPass) {
    return res.status(401).json({ error: "Invalid admin credentials" });
  }

  const headers = supabaseHeaders();

  const [profilesRes, subsRes, paysRes] = await Promise.all([
    fetch(`${env("SUPABASE_URL")}/rest/v1/profiles?select=*&order=created_at.desc`, { headers }),
    fetch(`${env("SUPABASE_URL")}/rest/v1/subscriptions?select=*,plans(name)&order=created_at.desc`, { headers }),
    fetch(`${env("SUPABASE_URL")}/rest/v1/payments?select=*&order=created_at.desc`, { headers }),
  ]);

  if (!profilesRes.ok) {
    return res.status(500).json({ error: "Failed to fetch profiles" });
  }

  const profiles = await profilesRes.json();
  const subscriptions = subsRes.ok ? await subsRes.json() : [];
  const payments = paysRes.ok ? await paysRes.json() : [];

  return res.status(200).json({
    profiles, subscriptions, payments,
  });
};

// ────────────────────────────────────────────
// ROUTER
// ────────────────────────────────────────────
const routes: Record<string, RouteHandler> = {
  "save-payment": savePayment,
  "create-razorpay-order": createRazorpayOrder,
  "confirm-razorpay-payment": confirmRazorpayPayment,
  "cancel-subscription": cancelSubscription,
  "send-email": sendEmail,
  "razorpay-webhook": razorpayWebhook,
  "admin-login": adminLogin,
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
