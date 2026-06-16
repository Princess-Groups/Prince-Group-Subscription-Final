const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function bufferToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

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
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return new Response(JSON.stringify({ error: "Razorpay credentials are not configured" }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Support both subscription and one-time payment signatures
    const { razorpay_payment_id, razorpay_order_id, razorpay_subscription_id, razorpay_signature } = body;

    if (!razorpay_payment_id || !razorpay_signature) {
      return new Response(JSON.stringify({ error: "Missing payment verification payload" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    let payload: string;

    if (razorpay_subscription_id) {
      // Subscription payment: payload = payment_id|subscription_id
      payload = `${razorpay_payment_id}|${razorpay_subscription_id}`;
    } else {
      // One-time order: payload = order_id|payment_id
      payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    }

    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(RAZORPAY_KEY_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    const generatedSignature = bufferToHex(signed);

    if (generatedSignature !== razorpay_signature) {
      return new Response(JSON.stringify({ error: "Invalid Razorpay signature" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Fetch payment status from Razorpay to confirm it's captured
    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    const paymentResponse = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}`,
      { headers: { Authorization: `Basic ${auth}` } },
    );

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      console.error("Razorpay API error:", paymentResponse.status, errorText);
      return new Response(JSON.stringify({ error: "Payment verification failed", details: errorText }), {
        status: 402,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    let paymentData;
    try {
      paymentData = await paymentResponse.json();
    } catch (jsonError) {
      console.error("Failed to parse Razorpay response as JSON:", jsonError);
      return new Response(JSON.stringify({ error: "Invalid response from Razorpay" }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    if (!["captured", "authorized"].includes(paymentData.status)) {
      return new Response(JSON.stringify({ error: "Payment not captured yet", status: paymentData.status }), {
        status: 402,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, payment: paymentData }),
      { status: 200, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("confirm-razorpay-payment error", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
}
