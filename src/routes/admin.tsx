import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import type { AdminData } from "@/lib/api";
import {
  Users,
  CreditCard,
  Activity,
  TrendingUp,
  ArrowLeft,
  Sparkles,
  Loader2,
  Shield,
  Phone,
  CheckCircle2,
  XCircle,
  Clock,
  LogIn,
  Eye,
  EyeOff,
  Lock,
  User,
  AlertTriangle,
  RefreshCw,
  WifiOff,
} from "lucide-react";

const SESSION_KEY = "pg_admin_session";

type Tab = "members" | "subscriptions" | "payments";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Login — Prince Groups" },
      { name: "description", content: "Prince Groups administration panel." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminData | null>(null);
  const [tab, setTab] = useState<Tab>("members");
  const [loggedIn, setLoggedIn] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  // Attempt session restore on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setData(parsed.data);
        setLastRefresh(parsed.lastRefresh || null);
        setLoggedIn(true);
      }
    } catch {}
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!username.trim()) { setError("Enter admin username"); return; }
    if (!password) { setError("Enter admin password"); return; }

    setLoading(true);
    setError(null);

    // First verify credentials hardcoded
    if (username.trim() !== "PrinceAdmin" || password !== "BeemBoy@123") {
      setError("Invalid admin credentials");
      setLoading(false);
      return;
    }

    try {
      // Directly fetch /api/admin-login — this hits either the local server.mjs
      // (via Vite proxy on port 3001) or the Vercel serverless function in production.
      const raw = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      if (!raw.ok) {
        const errBody = await raw.json().catch(() => null);
        throw new Error(errBody?.error || `HTTP ${raw.status}`);
      }
      const result = await raw.json();
      // API returns flat { profiles, subscriptions, payments }
      if (result.profiles || result.subscriptions || result.payments) {
        setData(result);
        setLoggedIn(true);
        const now = new Date().toLocaleString("en-IN");
        setLastRefresh(now);
        try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ data: result, lastRefresh: now })); } catch {}
        setLoading(false);
        return;
      }
      throw new Error("No data returned from API");
    } catch (err) {
      setError((err as Error).message || "Failed to load admin data. Check that the API server is reachable.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setLoggedIn(false);
    setData(null);
    setUsername("");
    setPassword("");
    setError(null);
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  };

  const handleRefresh = async () => {
    if (!loggedIn) return;
    setLoading(true);
    setError(null);
    try {
      const raw = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "PrinceAdmin", password: "BeemBoy@123" }),
      });
      if (!raw.ok) throw new Error(`HTTP ${raw.status}`);
      const result = await raw.json();
      if (result.profiles || result.subscriptions || result.payments) {
        setData(result);
        const now = new Date().toLocaleString("en-IN");
        setLastRefresh(now);
        try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ data: result, lastRefresh: now })); } catch {}
        setLoading(false);
        return;
      }
      throw new Error("No data returned");
    } catch (err) {
      setError((err as Error).message || "Refresh failed");
    } finally {
      setLoading(false);
    }
  };

  // ── LOGIN SCREEN ──
  if (!loggedIn) {
    return (
      <SiteLayout>
        <section className="relative overflow-hidden bg-hero text-white py-16">
          <div className="absolute inset-0 bg-radial-luxe opacity-40" />
          <div className="relative container mx-auto px-4 text-center">
            <Shield className="h-12 w-12 mx-auto text-cream/60" />
            <h1 className="mt-4 font-display text-4xl md:text-5xl text-cream">Admin Panel</h1>
            <p className="mt-2 text-white/70">Sign in to manage Prince Groups</p>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4 max-w-sm">
            <form onSubmit={handleLogin} className="rounded-3xl bg-card border border-border p-8 shadow-card space-y-5">
              <div className="text-center">
                <div className="h-14 w-14 mx-auto rounded-full bg-pine-deep/10 grid place-items-center">
                  <Lock className="h-6 w-6 text-pine-deep" />
                </div>
                <h2 className="mt-3 font-display text-2xl text-pine-deep">Admin Login</h2>
                <p className="text-sm text-muted-foreground mt-1">Use your admin credentials</p>
              </div>

              <Field label="Username">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={inputCls + " pl-9"}
                    placeholder="Admin username"
                    autoComplete="username"
                  />
                </div>
              </Field>

              <Field label="Password">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    required
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputCls + " pl-9 pr-9"}
                    placeholder="Admin password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>

              {error && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-hero text-cream font-semibold py-3.5 shadow-luxury hover:shadow-glow transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>
                ) : (
                  <><LogIn className="h-4 w-4" /> Sign In</>
                )}
              </button>
            </form>
          </div>
        </section>
      </SiteLayout>
    );
  }

  // ── DASHBOARD ──
  if (!data) return null;

  const stats = {
    totalMembers: data.profiles?.length || 0,
    activeSubscriptions: (data.subscriptions || []).filter((s: any) => s.status === "active").length,
    totalPayments: (data.payments || []).filter((p: any) => p.status === "captured").reduce((a: number, p: any) => a + p.amount, 0),
    pendingPayments: (data.payments || []).filter((p: any) => p.status === "created" || p.status === "authorized").length,
  };

  return (
    <SiteLayout>
      {/* HEADER */}
      <section className="relative overflow-hidden bg-hero text-white">
        <div className="absolute inset-0 bg-radial-luxe opacity-40" />
        <div className="relative container mx-auto px-4 py-12 md:py-16">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 glass-dark rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.25em]">
                <Shield className="h-3.5 w-3.5" /> Admin Panel
              </div>
              <h1 className="mt-4 font-display text-3xl md:text-5xl text-cream">Dashboard</h1>
              <p className="mt-2 text-white/80">Manage members, subscriptions, and payments</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-full glass-dark text-white px-4 py-2 text-sm font-semibold hover:bg-white/15 transition disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/20 text-white/80 hover:text-white hover:bg-white/10 px-4 py-2 text-sm font-semibold transition"
              >
                Logout
              </button>
            </div>
          </div>
          {lastRefresh && (
            <p className="mt-3 text-xs text-white/60">Last updated: {lastRefresh}</p>
          )}
        </div>
      </section>

      {/* STATS */}
      <section className="-mt-8 relative z-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Members", value: stats.totalMembers, icon: Users, color: "bg-blue-500/10 text-blue-600" },
              { label: "Active Subs", value: stats.activeSubscriptions, icon: Activity, color: "bg-avocado/10 text-avocado" },
              { label: "Revenue (₹)", value: `₹${(stats.totalPayments / 100).toLocaleString("en-IN")}`, icon: TrendingUp, color: "bg-gold/10 text-amber-600" },
              { label: "Pending Pays", value: stats.pendingPayments, icon: Clock, color: "bg-orange-500/10 text-orange-600" },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-2xl bg-card border border-border p-5 shadow-card animate-fade-up" style={{ animationDelay: `${i * 0.06}s` }}>
                  <div className={`h-10 w-10 rounded-xl ${s.color} grid place-items-center`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-3 text-2xl font-bold text-pine-deep">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {error && (
        <section className="pt-6">
          <div className="container mx-auto px-4">
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        </section>
      )}

      {/* TABS */}
      <section className="py-10">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 border-b border-border pb-2 overflow-x-auto">
            {(["members", "subscriptions", "payments"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-2.5 rounded-t-xl text-sm font-semibold transition capitalize whitespace-nowrap ${
                  tab === t ? "bg-hero text-white" : "text-muted-foreground hover:text-pine-deep hover:bg-muted"
                }`}
              >
                {t}
                <span className="ml-2 text-xs opacity-70">
                  ({t === "members" ? data.profiles?.length || 0 : t === "subscriptions" ? data.subscriptions?.length || 0 : data.payments?.length || 0})
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* TAB CONTENT */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          {tab === "members" && <MembersTable profiles={data.profiles || []} subscriptions={data.subscriptions || []} />}
          {tab === "subscriptions" && <SubscriptionsTable subscriptions={data.subscriptions || []} />}
          {tab === "payments" && <PaymentsTable payments={data.payments || []} />}
        </div>
      </section>
    </SiteLayout>
  );
}

// ── MEMBERS TABLE ───────────────────────────────────────────────────────
function MembersTable({ profiles, subscriptions }: { profiles: any[]; subscriptions: any[] }) {
  const getSub = (userId: string) => subscriptions.find((s: any) => s.user_id === userId && s.status === "active");

  if (profiles.length === 0) {
    return (
      <div className="text-center py-16">
        <Users className="h-12 w-12 mx-auto text-muted-foreground/50" />
        <p className="mt-3 text-muted-foreground">No members found yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border shadow-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/70 text-left">
            <th className="px-5 py-4 font-semibold text-pine-deep">Name</th>
            <th className="px-5 py-4 font-semibold text-pine-deep">Email</th>
            <th className="px-5 py-4 font-semibold text-pine-deep">Phone</th>
            <th className="px-5 py-4 font-semibold text-pine-deep">Plan</th>
            <th className="px-5 py-4 font-semibold text-pine-deep">Status</th>
            <th className="px-5 py-4 font-semibold text-pine-deep">Joined</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((p: any, i: number) => {
            const sub = getSub(p.user_id);
            return (
              <tr key={p.id} className="border-t border-border hover:bg-muted/30 transition">
                <td className="px-5 py-4 font-medium text-pine-deep">{p.full_name || "—"}</td>
                <td className="px-5 py-4 text-muted-foreground">{p.email || "—"}</td>
                <td className="px-5 py-4">
                  {p.phone ? (
                    <a href={`tel:${p.phone}`} className="text-pine hover:underline">{p.phone}</a>
                  ) : "—"}
                </td>
                <td className="px-5 py-4">{sub?.plans?.name || "—"}</td>
                <td className="px-5 py-4">
                  {sub ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-avocado/10 text-avocado px-3 py-0.5 text-xs font-semibold">
                      <CheckCircle2 className="h-3 w-3" /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-3 py-0.5 text-xs font-semibold">
                      <XCircle className="h-3 w-3" /> Inactive
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 text-xs text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── SUBSCRIPTIONS TABLE ─────────────────────────────────────────────────
function SubscriptionsTable({ subscriptions }: { subscriptions: any[] }) {
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const handleCancelSubscription = async (subId: string, razorpaySub: string) => {
    if (!window.confirm("Are you sure you want to cancel this subscription?")) return;
    setCancelling(subId);
    setCancelError(null);
    try {
      const { error } = await api.cancelSubscription({
        subscriptionId: subId,
        razorpaySubscriptionId: razorpaySub,
      });
      if (error) throw new Error(error.message);
      // Refresh or update UI
      window.location.reload();
    } catch (err) {
      setCancelError((err as Error).message);
    } finally {
      setCancelling(null);
    }
  };
    active: "bg-avocado/10 text-avocado",
    created: "bg-blue-500/10 text-blue-600",
    authenticated: "bg-blue-500/10 text-blue-600",
    pending: "bg-orange-500/10 text-orange-600",
    paused: "bg-amber-500/10 text-amber-600",
    cancelled: "bg-destructive/10 text-destructive",
    completed: "bg-pine/10 text-pine",
    expired: "bg-muted text-muted-foreground",
    halted: "bg-destructive/10 text-destructive",
  };

  if (subscriptions.length === 0) {
    return (
      <div className="text-center py-16">
        <Activity className="h-12 w-12 mx-auto text-muted-foreground/50" />
        <p className="mt-3 text-muted-foreground">No subscriptions found.</p>
      </div>
    );
  }

  const activeSubs = subscriptions.filter((s: any) => s.status === "active");
  const historySubs = subscriptions.filter((s: any) => s.status !== "active");

  return (
    <div className="space-y-8">
      {/* Active Subscriptions */}
      <div>
        <h3 className="font-display text-xl text-pine-deep mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-avocado" />
          Active Subscriptions ({activeSubs.length})
        </h3>
        <div className="overflow-x-auto rounded-2xl border border-border shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-avocado/5 text-left">
                <th className="px-5 py-4 font-semibold text-pine-deep">Plan</th>
                <th className="px-5 py-4 font-semibold text-pine-deep">User ID</th>
                <th className="px-5 py-4 font-semibold text-pine-deep">Status</th>
                <th className="px-5 py-4 font-semibold text-pine-deep">Charges</th>
                <th className="px-5 py-4 font-semibold text-pine-deep">Next Charge</th>
                <th className="px-5 py-4 font-semibold text-pine-deep">Created</th>
                <th className="px-5 py-4 font-semibold text-pine-deep">Action</th>
              </tr>
            </thead>
            <tbody>
              {activeSubs.map((s: any) => (
                <tr key={s.id} className="border-t border-border hover:bg-avocado/5 transition">
                  <td className="px-5 py-4 font-medium text-pine-deep">{s.plans?.name || "—"}</td>
                  <td className="px-5 py-4">
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{(s.user_id || "").slice(0, 12)}...</code>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-avocado/10 text-avocado px-3 py-0.5 text-xs font-semibold">
                      <CheckCircle2 className="h-3 w-3" /> Active
                    </span>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{s.paid_count}</td>
                  <td className="px-5 py-4 text-xs text-muted-foreground">
                    {s.next_charge_at ? new Date(s.next_charge_at).toLocaleDateString("en-IN") : "—"}
                  </td>
                  <td className="px-5 py-4 text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => handleCancelSubscription(s.id, s.razorpay_subscription_id)}
                      disabled={cancelling === s.id}
                      className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive hover:text-white px-3 py-1 text-xs font-semibold transition disabled:opacity-60"
                    >
                      {cancelling === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subscription History (cancelled, expired etc — includes upgrades) */}
      {historySubs.length > 0 && (
        <div>
          <h3 className="font-display text-xl text-pine-deep mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            History — Cancelled / Upgraded / Expired ({historySubs.length})
          </h3>
          <div className="overflow-x-auto rounded-2xl border border-border shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/70 text-left">
                  <th className="px-5 py-4 font-semibold text-pine-deep">Plan</th>
                  <th className="px-5 py-4 font-semibold text-pine-deep">User ID</th>
                  <th className="px-5 py-4 font-semibold text-pine-deep">Status</th>
                  <th className="px-5 py-4 font-semibold text-pine-deep">Ended</th>
                  <th className="px-5 py-4 font-semibold text-pine-deep">Created</th>
                </tr>
              </thead>
              <tbody>
                {historySubs.map((s: any) => (
                  <tr key={s.id} className="border-t border-border hover:bg-muted/30 transition">
                    <td className="px-5 py-4 font-medium text-pine-deep">{s.plans?.name || "—"}</td>
                    <td className="px-5 py-4">
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{(s.user_id || "").slice(0, 12)}...</code>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-semibold capitalize ${statusStyles[s.status] || "bg-muted text-muted-foreground"}`}>
                        {s.status === "cancelled" ? <XCircle className="h-3 w-3" /> : null}
                        {s.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {s.cancelled_at
                        ? new Date(s.cancelled_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                        : s.current_end
                          ? new Date(s.current_end).toLocaleDateString("en-IN")
                          : "—"}
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── PAYMENTS TABLE ──────────────────────────────────────────────────────
function PaymentsTable({ payments }: { payments: any[] }) {
  const statusStyles: Record<string, string> = {
    captured: "bg-avocado/10 text-avocado",
    created: "bg-blue-500/10 text-blue-600",
    authorized: "bg-blue-500/10 text-blue-600",
    failed: "bg-destructive/10 text-destructive",
    refunded: "bg-orange-500/10 text-orange-600",
  };

  if (payments.length === 0) {
    return (
      <div className="text-center py-16">
        <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/50" />
        <p className="mt-3 text-muted-foreground">No payments found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border shadow-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/70 text-left">
            <th className="px-5 py-4 font-semibold text-pine-deep">Payment ID</th>
            <th className="px-5 py-4 font-semibold text-pine-deep">Amount</th>
            <th className="px-5 py-4 font-semibold text-pine-deep">Status</th>
            <th className="px-5 py-4 font-semibold text-pine-deep">Method</th>
            <th className="px-5 py-4 font-semibold text-pine-deep">User ID</th>
            <th className="px-5 py-4 font-semibold text-pine-deep">Date</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p: any) => (
            <tr key={p.id} className="border-t border-border hover:bg-muted/30 transition">
              <td className="px-5 py-4">
                <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{(p.id || "").slice(0, 16)}...</code>
              </td>
              <td className="px-5 py-4 font-semibold text-pine-deep">₹{(p.amount / 100).toLocaleString("en-IN")}</td>
              <td className="px-5 py-4">
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-semibold capitalize ${statusStyles[p.status] || "bg-muted text-muted-foreground"}`}>
                  {p.status === "captured" && <CheckCircle2 className="h-3 w-3" />}
                  {p.status === "failed" && <XCircle className="h-3 w-3" />}
                  {p.status}
                </span>
              </td>
              <td className="px-5 py-4 text-muted-foreground">{p.method || "—"}</td>
              <td className="px-5 py-4">
                <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{(p.user_id || "").slice(0, 12)}...</code>
              </td>
              <td className="px-5 py-4 text-xs text-muted-foreground">
                {new Date(p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── HELPERS ─────────────────────────────────────────────────────────────
const inputCls = "w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition";

function Field({ label, children, required: req }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label} {req && <span className="text-destructive">*</span>}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
