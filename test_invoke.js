// test_invoke.js – Node >= 18 has built-in fetch
const url = "https://ylctrvnptuewnniyxncc.supabase.co/functions/v1/create-razorpay-order";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsY3Rydm5wdHVld25uaXl4bmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODQ2NzUsImV4cCI6MjA5NTM2MDY3NX0.Bxhy_hcFxdzoS0m7ckaWZvmFL6aCgnHB3RgcZ26BPQo";

(async () => {
  try {
    console.log("Calling edge function...");
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${anonKey}`,
        "apikey": anonKey,
      },
      body: JSON.stringify({ planId: "starter" })
    });

    const text = await response.text();
    console.log("HTTP Status:", response.status);
    try {
      const data = JSON.parse(text);
      console.log("Response JSON:", JSON.stringify(data, null, 2));
    } catch {
      console.log("Response Text:", text);
    }
  } catch (err) {
    console.error("Fetch error:", err.message);
  }
})();
