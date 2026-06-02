// CORS headers for browser requests
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export default async function (request: Request) {
  // Handle CORS preflight
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
    const planId = body?.planId;

    if (!planId) {
      return new Response(JSON.stringify({ error: "Missing planId" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return new Response(JSON.stringify({ error: "Razorpay credentials are not configured" }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const plans: Record<string, { amount: number; monthlyAmount: number; name: string; description: string }> = {
      starter: { amount: 100,   monthlyAmount: 3000,   name: "₹1 Plan",   description: "Starter daily membership – ₹30/month autopay" },
      popular: { amount: 1000,  monthlyAmount: 30000,  name: "₹10 Plan",  description: "Popular daily membership – ₹300/month autopay" },
      premium: { amount: 10000, monthlyAmount: 300000, name: "₹100 Plan", description: "Premium daily membership – ₹3000/month autopay" },
    };

    const plan = plans[planId];
    if (!plan) {
      return new Response(JSON.stringify({ error: "Invalid planId" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

    // Step 1: Create or fetch the Razorpay Plan for this planId
    // (Razorpay Plans are reusable – we search for an existing one first)
    let razorpayPlanId: string;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const searchRes = await fetch(
      `https://api.razorpay.com/v1/plans?count=10`,
      { headers: { Authorization: `Basic ${auth}` }, signal: controller.signal }
    );
    clearTimeout(timeout);
    
    const searchData = await searchRes.json();
    const existing = (searchData.items || []).find(
      (p: any) => p.item?.name === plan.name && p.period === "monthly"
    );

    if (existing?.id) {
      razorpayPlanId = existing.id;
    } else {
      // Create a new Razorpay Plan
      const controllerPlan = new AbortController();
      const timeoutPlan = setTimeout(() => controllerPlan.abort(), 5000);
      const planRes = await fetch("https://api.razorpay.com/v1/plans", {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          period: "monthly",
          interval: 1,
          item: {
            name: plan.name,
            description: plan.description,
            amount: plan.monthlyAmount,
            currency: "INR",
          },
          notes: { plan_id: planId },
        }),
        signal: controllerPlan.signal,
      });
      clearTimeout(timeoutPlan);
      const planData = await planRes.json();
      if (!planRes.ok || !planData.id) {
        return new Response(JSON.stringify({ error: planData.error?.description || "Unable to create Razorpay plan" }), {
          status: 500,
          headers: { ...CORS, "Content-Type": "application/json" },
        });
      }
      razorpayPlanId = planData.id;
    }

    // Step 2: Create a Razorpay Subscription (auto-pay recurring)
    const controllerSub = new AbortController();
    const timeoutSub = setTimeout(() => controllerSub.abort(), 10000);
    const subRes = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        plan_id: razorpayPlanId,
        total_count: 120,         // up to 120 months (10 years)
        quantity: 1,
        customer_notify: 1,       // Razorpay sends payment reminders
        addons: [
          {
            item: {
              name: "First day charge",
              amount: plan.amount,
              currency: "INR",
            },
          },
        ],
        notes: {
          plan_key: planId,
          plan_name: plan.name,
        },
      }),
      signal: controllerSub.signal,
    });
    clearTimeout(timeoutSub);

    const subData = await subRes.json();
    if (!subRes.ok || !subData.id) {
      return new Response(JSON.stringify({ error: subData.error?.description || "Unable to create Razorpay subscription" }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        keyId: RAZORPAY_KEY_ID,
        subscriptionId: subData.id,
        // Legacy fields retained for frontend compatibility
        orderId: subData.id,
        amount: plan.amount,
        currency: "INR",
        planName: plan.name,
        description: plan.description,
        isSubscription: true,
      }),
      {
        status: 200,
        headers: { ...CORS, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("create-razorpay-order error", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
}
