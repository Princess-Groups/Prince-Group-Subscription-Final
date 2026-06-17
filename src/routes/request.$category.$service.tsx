import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { getCategory } from "@/data/services";
import { WHATSAPP } from "@/data/site";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Send,
  Lock,
  Crown,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/request/$category/$service")({
  head: ({ params }) => ({
    meta: [
      { title: `Request ${decodeURIComponent(params.service)} — Prince Groups` },
      { name: "description", content: "Submit your service request to Prince Groups Kanyakumari." },
    ],
  }),
  component: RequestPage,
});

function RequestPage() {
  const { category, service } = Route.useParams();
  const navigate = useNavigate();
  const cat = getCategory(category);
  const serviceName = decodeURIComponent(service);

  const [form, setForm] = useState({
    name: "",
    mobile: "",
    email: "",
    description: "",
    fileName: "",
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
  const [subChecking, setSubChecking] = useState(true);
  const [planName, setPlanName] = useState("");

  // Check for active subscription on mount
  useEffect(() => {
    let cancelled = false;
    async function checkSub() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) { setHasSubscription(false); setSubChecking(false); }
          return;
        }

        // Try with plans join first
        const { data: subWithPlan, error: joinErr } = await supabase
          .from("subscriptions")
          .select("*, plans(name)")
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();

        // Fallback: if join fails, try without join
        let planNameResult = "";
        let hasActiveSub = false;

        if (subWithPlan) {
          hasActiveSub = true;
          planNameResult = subWithPlan.plans?.name || subWithPlan.plan_id || "Active Member";
        } else if (joinErr) {
          console.warn("[request] Subscription query with plans join failed, trying without:", joinErr.message);
          const { data: subOnly } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("user_id", user.id)
            .eq("status", "active")
            .maybeSingle();
          if (subOnly) {
            hasActiveSub = true;
            planNameResult = subOnly.plan_id || "Active Member";
          }
        }

        if (!cancelled) {
          setHasSubscription(hasActiveSub);
          if (hasActiveSub) setPlanName(planNameResult);
          setSubChecking(false);
        }
      } catch (err) {
        console.error("[request] Subscription check failed:", err);
        if (!cancelled) { setHasSubscription(false); setSubChecking(false); }
      }
    }
    checkSub();
    return () => { cancelled = true; };
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || form.mobile.length < 10 || !form.description) return;
    setLoading(true);

    try {
      const existing = JSON.parse(localStorage.getItem("pg_service_requests") || "[]");
      const entry = {
        id: `req_${Date.now()}`,
        category: cat?.title ?? category,
        service: serviceName,
        status: "Submitted" as const,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem("pg_service_requests", JSON.stringify([entry, ...existing]));
    } catch {}

    const msg =
      `Hello PRINCE GROUPS, I'd like to request a service.\n\n` +
      `Category: ${cat?.title ?? category}\n` +
      `Service: ${serviceName}\n` +
      `Name: ${form.name}\n` +
      `Mobile: ${form.mobile}\n` +
      `Email: ${form.email || "—"}\n` +
      `Requirements: ${form.description}` +
      (form.fileName ? `\nAttachment: ${form.fileName} (will share on WhatsApp)` : "");

    setTimeout(() => {
      window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank");
      setLoading(false);
      setDone(true);
      setTimeout(() => navigate({ to: "/my-services", search: { from: undefined } }), 1800);
    }, 700);
  };

  // ── Loading subscription check ──
  if (subChecking) {
    return (
      <SiteLayout>
        <section className="bg-hero text-white py-12">
          <div className="container mx-auto px-4">
            <Link
              to="/services/$category"
              params={{ category }}
              className="inline-flex items-center gap-2 text-cream/90 hover:text-cream text-sm"
            >
              <ArrowLeft className="h-4 w-4" /> Back to {cat?.title ?? "category"}
            </Link>
            <h1 className="mt-5 font-display text-3xl md:text-4xl text-cream">Request: {serviceName}</h1>
          </div>
        </section>
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-2xl text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-pine" />
            <p className="mt-3 text-muted-foreground">Checking membership...</p>
          </div>
        </section>
      </SiteLayout>
    );
  }

  // ── No subscription — show upgrade prompt ──
  if (!hasSubscription) {
    return (
      <SiteLayout>
        <section className="bg-hero text-white py-12">
          <div className="container mx-auto px-4">
            <Link
              to="/services/$category"
              params={{ category }}
              className="inline-flex items-center gap-2 text-cream/90 hover:text-cream text-sm"
            >
              <ArrowLeft className="h-4 w-4" /> Back to {cat?.title ?? "category"}
            </Link>
            <h1 className="mt-5 font-display text-3xl md:text-4xl text-cream">Request: {serviceName}</h1>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4 max-w-lg text-center">
            <div className="rounded-3xl bg-card border border-border p-10 shadow-card">
              <div className="h-16 w-16 mx-auto rounded-full bg-amber-500/10 grid place-items-center">
                <Lock className="h-8 w-8 text-amber-500" />
              </div>
              <h2 className="mt-5 font-display text-2xl text-pine-deep">Members Only</h2>
              <p className="mt-2 text-muted-foreground">
                You need an active Prince Groups subscription to request services. Subscribe to any plan to unlock all services with up to 75% discount.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <Link
                  to="/plans"
                  className="w-full rounded-full bg-hero text-cream font-semibold py-3.5 shadow-luxury hover:shadow-glow transition inline-flex items-center justify-center gap-2"
                >
                  <Crown className="h-4 w-4" /> View Plans & Subscribe
                </Link>
                <Link
                  to="/my-services"
                  search={{ from: undefined }}
                  className="w-full rounded-full border border-border text-muted-foreground font-semibold py-3 hover:bg-muted transition"
                >
                  Browse Services
                </Link>
              </div>
            </div>
          </div>
        </section>
      </SiteLayout>
    );
  }

  // ── Has subscription — show form ──
  return (
    <SiteLayout>
      <section className="bg-hero text-white py-12">
        <div className="container mx-auto px-4">
          <Link
            to="/services/$category"
            params={{ category }}
            className="inline-flex items-center gap-2 text-cream/90 hover:text-cream text-sm"
          >
            <ArrowLeft className="h-4 w-4" /> Back to {cat?.title ?? "category"}
          </Link>
          <h1 className="mt-5 font-display text-3xl md:text-4xl text-cream">Request: {serviceName}</h1>
          <p className="mt-2 text-white/80">
            Fill in your details and our team will reach out shortly.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-avocado/20 text-cream px-4 py-1.5 text-xs font-semibold">
            <Sparkles className="h-3 w-3" /> {planName} — You're eligible for member pricing!
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4 max-w-2xl">
          <form
            onSubmit={submit}
            className="rounded-3xl bg-card border border-border p-6 md:p-8 shadow-card space-y-5"
          >
            <Field label="Full Name" required>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                maxLength={100}
                className={inputCls}
                placeholder="Your full name"
              />
            </Field>

            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="Mobile Number" required>
                <input
                  required
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, "") })}
                  className={inputCls}
                  placeholder="10-digit mobile"
                />
              </Field>
              <Field label="Email Address">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  maxLength={255}
                  className={inputCls}
                  placeholder="you@example.com"
                />
              </Field>
            </div>

            <Field label="Service Required">
              <input value={serviceName} disabled className={`${inputCls} bg-muted`} />
            </Field>

            <Field label="Description / Requirements" required>
              <textarea
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                maxLength={1000}
                rows={4}
                className={`${inputCls} resize-none`}
                placeholder="Tell us what you need..."
              />
            </Field>

            <Field label="Upload Documents (optional)">
              <input
                type="file"
                onChange={(e) => setForm({ ...form, fileName: e.target.files?.[0]?.name ?? "" })}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pine-deep file:text-cream hover:file:bg-pine"
              />
              {form.fileName && (
                <p className="mt-2 text-xs text-muted-foreground">Selected: {form.fileName} (share on WhatsApp after submitting)</p>
              )}
            </Field>

            <button
              type="submit"
              disabled={loading || done}
              className="w-full rounded-full bg-hero text-cream font-semibold py-3.5 shadow-luxury hover:shadow-glow transition disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : done ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Request submitted — redirecting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Submit Request
                </>
              )}
            </button>

            <p className="text-xs text-center text-muted-foreground">
              You'll be redirected to WhatsApp to share any documents and confirm with our team.
            </p>
          </form>
        </div>
      </section>
    </SiteLayout>
  );
}

const inputCls = "w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition";

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
