import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type, authorization, apikey");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { username, password } = req.body || {};

  if (username !== "PrinceAdmin" || password !== "BeemBoy@123") {
    return res.status(401).json({ error: "Invalid admin credentials" });
  }

  const env = (key: string): string => process.env[key] ?? "";
  const SUPABASE_URL = env("SUPABASE_URL");
  const SERVICE_KEY = env("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: "Supabase credentials not configured on server" });
  }

  const headers = {
    "Content-Type": "application/json",
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
  };

  try {
    const [profilesRes, subsRes, paysRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*&order=created_at.desc`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/subscriptions?select=*,plans(name)&order=created_at.desc`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/payments?select=*&order=created_at.desc`, { headers }),
    ]);

    const profiles = profilesRes.ok ? await profilesRes.json() : [];
    const subscriptions = subsRes.ok ? await subsRes.json() : [];
    const payments = paysRes.ok ? await paysRes.json() : [];

    return res.status(200).json({ profiles, subscriptions, payments });
  } catch (err) {
    return res.status(500).json({ error: "Supabase query failed: " + (err as Error).message });
  }
}
