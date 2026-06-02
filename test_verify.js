import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ylctrvnptuewnniyxncc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_5ADGnQ-FqAZncLwnfa8Abg_GBLSCgxE";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: false
  }
});

async function run() {
  const email = "test_127537@gmail.com";
  const password = "password123";

  console.log(`Signing in as ${email}...`);
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (signInError) {
    console.error("Sign in failed:", signInError);
    return;
  }

  const token = signInData.session?.access_token;
  console.log("JWT token acquired!");

  console.log("Invoking create-razorpay-order function...");
  const { data, error } = await supabase.functions.invoke("create-razorpay-order", {
    body: { planId: "starter" }
  });

  if (error) {
    console.error("Function invocation error:", error);
    if (error.context) {
      try {
        console.log("Response body:", await error.context.text());
      } catch (e) {}
    }
  } else {
    console.log("Function response data:", data);
  }
}

run();
