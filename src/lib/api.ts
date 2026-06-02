/**
 * API client — calls the Cloudflare Worker instead of Supabase edge functions.
 * Update WORKER_URL after deployment.
 */

// In development, wrangler dev runs on port 8788 by default.
// In production, this is your deployed worker URL.
const WORKER_URL = import.meta.env.VITE_API_WORKER_URL || "https://prince-groups-api.megha19102004.workers.dev";

type ApiResponse<T = unknown> = {
  data?: T;
  error?: { message: string };
};

async function invoke<T = unknown>(route: string, body: Record<string, unknown>): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${WORKER_URL}/${route}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      return { error: { message: (data as any).error || `HTTP ${res.status}` } };
    }
    return { data: data as T };
  } catch (err) {
    return { error: { message: (err as Error).message || "Failed to send request" } };
  }
}

export interface SavePaymentInput {
  userId: string;
  planId: string;
  razorpayOrderId?: string | null;
  razorpayPaymentId: string;
  razorpaySubscriptionId?: string | null;
  amount: number;
  username: string;
  mobile: string;
}

export interface SavePaymentOutput {
  success: boolean;
  subscriptionId: string;
}

export interface CancelSubscriptionInput {
  subscriptionId: string;
  razorpaySubscriptionId: string;
}

export interface CancelSubscriptionOutput {
  success: boolean;
  message: string;
}

export interface SendWhatsAppInput {
  subscriptionId: string;
  userId: string;
  planName: string;
  username: string;
  mobile: string;
}

export interface CreateOrderInput {
  planId: string;
}

export interface CreateOrderOutput {
  keyId: string;
  subscriptionId: string;
  orderId: string;
  amount: number;
  currency: string;
  planName: string;
  description: string;
  isSubscription: boolean;
}

export const api = {
  savePayment: (input: SavePaymentInput) =>
    invoke<SavePaymentOutput>("save-payment", input as unknown as Record<string, unknown>),

  createRazorpayOrder: (input: CreateOrderInput) =>
    invoke<CreateOrderOutput>("create-razorpay-order", input as unknown as Record<string, unknown>),

  cancelSubscription: (input: CancelSubscriptionInput) =>
    invoke<CancelSubscriptionOutput>("cancel-subscription", input as unknown as Record<string, unknown>),

  sendWhatsApp: (input: SendWhatsAppInput) =>
    invoke("send-whatsapp", input as unknown as Record<string, unknown>),
};
