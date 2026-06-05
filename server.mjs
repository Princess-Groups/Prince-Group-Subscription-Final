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

  // ── ADMIN LOGIN ─────────────────────────────────────────────────────
  if (path === "admin-login") {
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

  // ── Catch-all ───────────────────────────────────────────────────────
  return send(404, { error: `Unknown route: ${path}` });
});

server.listen(PORT, () => {
  console.log(`\n  🛡️  API server running at http://localhost:${PORT}`);
  console.log(`  📌 POST /admin-login  — Admin login (PrinceAdmin / BeemBoy@123)`);
  console.log(`  🔑 Service Role Key: ${SUPABASE_SERVICE_ROLE_KEY ? "✅ Loaded" : "❌ Not set"}`);
  console.log(`  ⚡ Supabase URL: ${SUPABASE_URL}\n`);
});
