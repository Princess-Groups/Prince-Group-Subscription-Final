/**
 * Local API dev server — runs the same handlers as the Vercel serverless function
 * so you can test everything (including admin login) locally.
 *
 * Usage:  node server.mjs
 *         (runs on port 3001)
 *
 * In another terminal: npm run dev:vite (Vite dev server on port 5173)
 * The frontend calls /api/* which is proxied by Vite to this server on port 3001.
 */

import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import { createHmac, timingSafeEqual } from "crypto";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env file ─────────────────────────────────────────────────────
function loadEnv() {
  const envPath = resolve(__dirname, ".env");
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
loadEnv();

// Also try loading supabase/.env.local for the service role key
const supEnvPath = resolve(__dirname, "supabase", ".env.local");
if (existsSync(supEnvPath)) {
  const lines = readFileSync(supEnvPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eqIdx = trimmed.indexOf("=");
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

// ── Config ──────────────────────────────────────────────────────────────
const PORT = 3001;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://ylctrvnptuewnniyxncc.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function supabaseHeaders() {
  return {
    "Content-Type": "application/json",
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  };
}

function jsonBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try { resolve(JSON.parse(raw || "{}")); }
      catch { resolve({}); }
    });
  });
}

// ── Helper Functions ────────────────────────────────────────────────────
async function sendEmailNotification(data) {
  const { subscriptionId, planName, username, email } = data;
  const fromEmail = process.env.SMTP_EMAIL || "noreply@princegroups.com";
  const appPassword = process.env.SMTP_PASSWORD;
  const ownerEmail = process.env.OWNER_EMAIL || fromEmail;

  if (!appPassword) {
    console.warn("sendEmailNotification: SMTP_PASSWORD not set, skipping email");
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: fromEmail, pass: appPassword },
  });

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
              <h2 style="margin: 0 0 16px; color: #1a1a2e;">Welcome, ${username || "Valued Member"}! 🎉</h2>
              <p style="color: #555; line-height: 1.6;">Your membership is now <strong style="color: #0f766e;">active</strong>.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr><td style="padding: 8px 0; color: #888;">Plan</td><td style="padding: 8px 0; font-weight: bold; text-align: right;">${planName}</td></tr>
                <tr><td style="padding: 8px 0; color: #888; border-top: 1px solid #eee;">Auto-Pay</td><td style="padding: 8px 0; font-weight: bold; text-align: right; border-top: 1px solid #eee; color: #0f766e;">✅ Enabled</td></tr>
                <tr><td style="padding: 8px 0; color: #888; border-top: 1px solid #eee;">Next charge</td><td style="padding: 8px 0; text-align: right; border-top: 1px solid #eee;">In 30 days</td></tr>
                <tr><td style="padding: 8px 0; color: #888; border-top: 1px solid #eee;">Subscription ID</td><td style="padding: 8px 0; text-align: right; border-top: 1px solid #eee; font-size: 12px; color: #999;">${subscriptionId}</td></tr>
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

  try {
    await transporter.sendMail({
      from: `"Prince Groups" <${fromEmail}>`,
      to: ownerEmail,
      subject: "🎉 New Subscription Activated!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; background: #fafafa; border-radius: 12px;">
          <h2 style="color: #1a1a2e;">New Subscription</h2>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 8px 0; color: #888;">Name</td><td style="padding: 8px 0; font-weight: bold; text-align: right;">${username || "N/A"}</td></tr>
            <tr><td style="padding: 8px 0; color: #888; border-top: 1px solid #eee;">Email</td><td style="padding: 8px 0; text-align: right; border-top: 1px solid #eee;">${email || "N/A"}</td></tr>
            <tr><td style="padding: 8px 0; color: #888; border-top: 1px solid #eee;">Plan</td><td style="padding: 8px 0; font-weight: bold; text-align: right; border-top: 1px solid #eee;">${planName}</td></tr>
            <tr><td style="padding: 8px 0; color: #888; border-top: 1px solid #eee;">Sub ID</td><td style="padding: 8px 0; text-align: right; border-top: 1px solid #eee; font-size: 12px;">${subscriptionId}</td></tr>
          </table>
        </div>
      `,
    });
    console.log(`Email sent to owner ${ownerEmail} for subscription ${subscriptionId}`);
  } catch (err) {
    console.error(`sendEmailNotification: Email to owner (${ownerEmail}) failed:`, err);
  }
}

async function sendWhatsAppNotifications(data) {
  const { subscriptionId, planName, username, mobile } = data;
  const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;
  const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
  const OWNER_WHATSAPP = process.env.OWNER_WHATSAPP || "919559155535";

  if (!WHATSAPP_API_TOKEN || !WHATSAPP_PHONE_ID) {
    console.warn("sendWhatsAppNotifications: WhatsApp credentials not set, skipping");
    return;
  }

  const sendWhatsAppMessage = async (to, message) => {
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

  if (mobile && mobile.length >= 10) {
    const customerPhone = mobile.startsWith("91") ? mobile : "91" + mobile;
    const customerMessage = `🎉 *Welcome to Prince Groups!*\n\nHi ${username || "Valued Member"}! 👋\n\nYour membership is now *active*.\n\n📦 *Plan:* ${planName}\n✅ *Auto-Pay:* Enabled\n📅 *Next charge:* In 30 days\n🔑 *Sub ID:* ${subscriptionId}\n\nThank you for joining! For any queries, contact us on WhatsApp or call 9559155535.\n\n_Prince Groups — Kanyakumari_`;
    await sendWhatsAppMessage(customerPhone, customerMessage);
  }

  const ownerMessage = `🎉 *New Subscription Activated!*\n\n👤 *Name:* ${username || "N/A"}\n📱 *Mobile:* ${mobile || "N/A"}\n📦 *Plan:* ${planName}\n🔑 *Sub ID:* ${subscriptionId}\n✅ *Auto-Pay:* Enabled (Razorpay)\n\n_Prince Groups — Kanyakumari_`;
  await sendWhatsAppMessage(OWNER_WHATSAPP, ownerMessage);
}

// ── HTTP Server ─────────────────────────────────────────────────────────
const server = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.setHeader("Access-Control-Allow-Headers", "content-type, authorization, apikey");

  if (req.method === "OPTIONS") return res.writeHead(204).end();
  if (req.method !== "POST") return res.writeHead(405).end(JSON.stringify({ error: "Method not allowed" }));

  const path = (req.url || "").replace(/^\//, "").replace(/\/$/, "");
  const body = await jsonBody(req);

  const send = (status, data) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };

  // Extract route name (remove /api/ prefix if present)
  const routeName = path.replace(/^api\//, "");

  // ── ADMIN LOGIN ─────────────────────────────────────────────────────
  if (routeName === "admin-login") {
    const { username, password } = body;
    if (username !== "PrinceAdmin" || password !== "BeemBoy@123") {
      return send(401, { error: "Invalid admin credentials" });
    }

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return send(200, {
        profiles: [], subscriptions: [], payments: [],
      });
    }

    try {
      const headers = supabaseHeaders();
      const [profilesRes, subsRes, paysRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*&order=created_at.desc`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/subscriptions?select=*,plans(name)&order=created_at.desc`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/payments?select=*&order=created_at.desc`, { headers }),
      ]);

      const profiles = profilesRes.ok ? await profilesRes.json() : [];
      const subscriptions = subsRes.ok ? await subsRes.json() : [];
      const payments = paysRes.ok ? await paysRes.json() : [];
      return send(200, { profiles, subscriptions, payments });
    } catch (err) {
      return send(500, { error: "Supabase query failed: " + (err.message || err) });
    }
  }

  // ── CONFIRM RAZORPAY PAYMENT ───────────────────────────────────────
  if (routeName === "confirm-razorpay-payment") {
    const { razorpay_payment_id, razorpay_order_id, razorpay_subscription_id, razorpay_signature } = body;
    if (!razorpay_payment_id || !razorpay_signature) {
      return send(400, { error: "Missing payment verification payload" });
    }

    const payload = razorpay_subscription_id
      ? `${razorpay_payment_id}|${razorpay_subscription_id}`
      : `${razorpay_order_id}|${razorpay_payment_id}`;

    const generatedSignature = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(payload)
      .digest("hex");

    if (
      generatedSignature.length !== razorpay_signature.length ||
      !timingSafeEqual(Buffer.from(generatedSignature, "hex"), Buffer.from(razorpay_signature, "hex"))
    ) {
      return send(400, { error: "Invalid Razorpay signature" });
    }

    return send(200, { success: true, verified: true });
  }

  // ── SAVE PAYMENT ────────────────────────────────────────────────────
  if (routeName === "save-payment") {
    const { userId, planId, planName, razorpayOrderId, razorpayPaymentId, razorpaySubscriptionId, amount, username, mobile, email } = body;

    if (!userId || !planId || !razorpayPaymentId || !amount) {
      return send(400, { error: "Missing required fields" });
    }

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return send(500, { error: "Supabase service role key not configured" });
    }

    try {
      const headers = supabaseHeaders();
      const now = new Date().toISOString();
      const later = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const subPayload = {
        user_id: userId,
        plan_id: planId,
        status: "active",
        current_start: now,
        current_end: later,
        next_charge_at: later,
        paid_count: 1,
      };
      if (razorpaySubscriptionId) subPayload.razorpay_subscription_id = razorpaySubscriptionId;

      const subRes = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions`, {
        method: "POST",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify(subPayload),
      });

      if (!subRes.ok) {
        console.error("sub insert failed:", await subRes.text());
        return send(500, { error: "Unable to create subscription" });
      }

      const subData = await subRes.json();
      const subId = Array.isArray(subData) ? subData[0]?.id : subData?.id;
      if (!subId) return send(500, { error: "Unable to create subscription (no id)" });

      const payRes = await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
        method: "POST",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify({
          user_id: userId,
          subscription_id: subId,
          razorpay_order_id: razorpayOrderId || null,
          razorpay_subscription_id: razorpaySubscriptionId || null,
          razorpay_payment_id: razorpayPaymentId,
          amount,
          currency: "INR",
          status: "captured",
          method: "razorpay",
        }),
      });

      if (!payRes.ok) {
        console.error("pay insert failed:", await payRes.text());
        return send(500, { error: "Unable to save payment record" });
      }

      if (username || mobile) {
        const updates = {};
        if (username) updates.full_name = username;
        if (mobile) updates.phone = mobile;
        fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify(updates),
        }).catch(() => {});
      }

      sendEmailNotification({ subscriptionId: subId, planName: planName || planId || "", username: username || "", email: email || "" }).catch(err => console.error("Email failed:", err));
      sendWhatsAppNotifications({ subscriptionId: subId, planName: planName || planId || "", username: username || "", mobile: mobile || "" }).catch(err => console.error("WhatsApp failed:", err));

      return send(200, { success: true, subscriptionId: subId });
    } catch (err) {
      return send(500, { error: "Payment save failed: " + (err.message || err) });
    }
  }

  // ── CREATE RAZORPAY ORDER ───────────────────────────────────────────
  if (routeName === "create-razorpay-order") {
    const { planId } = body;
    if (!planId) return send(400, { error: "Missing planId" });

    const plans = {
      starter: { amount: 100, monthlyAmount: 3000, name: "₹1 Plan", description: "Starter – ₹30/month subscription" },
      popular: { amount: 1000, monthlyAmount: 30000, name: "₹10 Plan", description: "Popular – ₹300/month subscription" },
      premium: { amount: 10000, monthlyAmount: 300000, name: "₹100 Plan", description: "Premium – ₹3000/month subscription" },
    };

    const plan = plans[planId];
    if (!plan) return send(400, { error: "Invalid planId" });

    // For local testing, return mock subscription ID
    // In production, this calls Razorpay API to create actual plans and subscriptions
    const mockSubscriptionId = `sub_local_${Date.now()}`;

    return send(200, {
      keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_local",
      subscriptionId: mockSubscriptionId,
      orderId: mockSubscriptionId,
      amount: plan.amount,
      currency: "INR",
      planName: plan.name,
      description: plan.description,
      isSubscription: true,
    });
  }

  // ── Catch-all ───────────────────────────────────────────────────────
  return send(404, { error: `Unknown route: ${routeName}` });
});

server.listen(PORT, () => {
  console.log(`\n  🛡️  API server running at http://localhost:${PORT}`);
  console.log(`  📌 POST /admin-login  — Admin login (PrinceAdmin / BeemBoy@123)`);
  console.log(`  🔑 Service Role Key: ${SUPABASE_SERVICE_ROLE_KEY ? "✅ Loaded" : "❌ Not set"}`);
  console.log(`  ⚡ Supabase URL: ${SUPABASE_URL}\n`);
});
