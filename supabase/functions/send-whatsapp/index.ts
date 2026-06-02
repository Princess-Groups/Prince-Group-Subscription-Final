const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export default async function (request: Request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  try {
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const { subscriptionId, userId, planName, username, mobile } = body;

    const WHATSAPP_API_TOKEN = Deno.env.get("WHATSAPP_API_TOKEN");
    const WHATSAPP_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID");
    const OWNER_WHATSAPP = Deno.env.get("OWNER_WHATSAPP") || "919559155535";

    if (!WHATSAPP_API_TOKEN || !WHATSAPP_PHONE_ID) {
      console.warn("WhatsApp credentials not set, skipping notification");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const message = `🎉 *New Subscription Activated!*\n\n👤 *Name:* ${username || "N/A"}\n📱 *Mobile:* ${mobile || "N/A"}\n📦 *Plan:* ${planName}\n🔑 *Sub ID:* ${subscriptionId}\n✅ *Auto-Pay:* Enabled (Razorpay)\n\n_Prince Groups — Kanyakumari_`;

    const res = await fetch(`https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: OWNER_WHATSAPP,
        type: "text",
        text: { body: message },
      }),
    });

    if (!res.ok) {
      console.error("WhatsApp API error:", await res.text());
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-whatsapp error", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
}
