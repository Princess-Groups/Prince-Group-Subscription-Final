// Auto-generated CORS headers added
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../types";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const RAZORPAY_WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase credentials");
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function bufferToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyWebhookSignature(payload: string, signature: string) {
  if (!RAZORPAY_WEBHOOK_SECRET) {
    console.warn("RAZORPAY_WEBHOOK_SECRET not set, skipping signature verification");
    return true;
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(RAZORPAY_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const generatedSignature = bufferToHex(signed);

  return generatedSignature === signature;
};

export default async function (request: Request) {
  try {
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    const signature = request.headers.get("x-razorpay-signature");
    const rawBody = await request.text();

    if (!signature || !(await verifyWebhookSignature(rawBody, signature))) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const event = JSON.parse(rawBody);
    const { event: eventType, payload } = event;

    // Handle payment.authorized
    if (eventType === "payment.authorized") {
      const paymentId = payload.payment.entity.id;
      const status = payload.payment.entity.status;

      const { error } = await supabase
        .from("payments")
        .update({ status: status === "captured" ? "captured" : "authorized" })
        .eq("razorpay_payment_id", paymentId);

      if (error) {
        console.error("Error updating payment status:", error);
      }
    }

    // Handle payment.failed
    if (eventType === "payment.failed") {
      const paymentId = payload.payment.entity.id;

      await supabase
        .from("payments")
        .update({
          status: "failed",
          error_code: payload.payment.entity.error_code,
          error_description: payload.payment.entity.error_description,
        })
        .eq("razorpay_payment_id", paymentId);
    }

    // Handle refund.created
    if (eventType === "refund.created") {
      const paymentId = payload.refund.entity.payment_id;
      const refundId = payload.refund.entity.id;

      await supabase
        .from("payments")
        .update({ status: "refunded" })
        .eq("razorpay_payment_id", paymentId);

      console.log(`Refund ${refundId} processed for payment ${paymentId}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("razorpay-webhook error", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
