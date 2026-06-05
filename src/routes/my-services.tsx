import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { SERVICE_CATEGORIES } from "@/data/services";
import { WHATSAPP } from "@/data/site";
import {
  ArrowRight,
  CheckCircle2,
  Headphones,
  MessageCircle,
  Phone,
  Sparkles,
  Star,
  Ticket,
} from "lucide-react";

type Membership = { plan: string; username: string; mobile: string } | null;
type ServiceRequest = {
  id: string;
  category: string;
  service: string;
  status: "Submitted" | "In Progress" | "Completed";
  createdAt: string;
};

export const Route = createFileRoute("/my-services")({
  validateSearch: (s: Record<string, unknown>) => ({
    from: typeof s.from === "string" ? s.from : undefined,
  }),
  head: () => ({
    meta: [
      { title: "My Services — Prince Groups Kanyakumari" },
      { name: "description", content: "Your Prince Groups membership dashboard. Pick a service to get started." },
    ],
  }),
  component: MyServicesPage,
});

function MyServicesPage() {
  const { from } = useSearch({ from: "/my-services" });
  const [membership, setMembership] = useState<Membership>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [showSuccess, setShowSuccess] = useState(from === "payment");

  useEffect(() => {
    // Load subscription from Supabase
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("*, plans(*)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      if (sub) {
        setMembership({
          plan: sub.plans?.name || "Active Member",
          username: user.user_metadata?.full_name || user.email?.split("@")[0] || "",
          mobile: user.user_metadata?.phone || "",
        });
      }
    });

    // Load local service requests
    try {
      const r = localStorage.getItem("pg_service_requests");
      if (r) setRequests(JSON.parse(r));
    } catch {}
  }, []);

  useEffect(() => {
    if (!showSuccess) return;
    const t = setTimeout(() => setShowSuccess(false), 6000);
    return () => clearTimeout(t);
  }, [showSuccess]);

  const popular = [
    { cat: "document-registration", name: "Patta & Chitta" },
    { cat: "digital-marketing", name: "Instagram Marketing" },
    { cat: "concert-tickets", name: "VIP Tickets" },
    { cat: "concert-advertising", name: "Banner Advertisement" },
  ];

  return (
    <SiteLayout>
      {showSuccess && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-fade-up">
          <div className="flex items-center gap-3 rounded-2xl bg-[oklch(0.7_0.18_145)] text-white px-5 py-3 shadow-luxury">
            <CheckCircle2 className="h-5 w-5" />
            <div className="text-sm font-semibold">
              Payment Successful! Thank you — please select a service to continue.
            </div>
          </div>
        </div>
      )}

      {/* HERO */}
      <section className="relative overflow-hidden bg-hero text-white">
        <div className="absolute inset-0 bg-radial-luxe opacity-40" />
        <div className="relative container mx-auto px-4 py-16 md:py-20">
          <div className="inline-flex items-center gap-2 glass-dark rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.25em]">
            <Sparkles className="h-3.5 w-3.5" /> My Services
          </div>
          <h1 className="mt-5 font-display text-4xl md:text-5xl text-cream">
            {membership ? `Welcome${membership.username ? `, ${membership.username}` : ""}!` : "Your Services Dashboard"}
          </h1>
          <p className="mt-3 text-white/85 max-w-2xl">
            {membership
              ? `Your ${membership.plan} membership is active. Select a service category below to get started.`
              : "You need an active membership to access services. Pick a plan to get started with Prince Groups."}
          </p>

          {membership ? (
            <div className="mt-6 inline-flex flex-wrap items-center gap-4 rounded-2xl glass-dark px-5 py-3 text-sm">
              <span className="font-semibold">{membership.plan}</span>
              <span className="text-white/60">·</span>
              <span>Mobile: {membership.mobile || "—"}</span>
              <span className="text-white/60">·</span>
              <span className="text-cream">Active</span>
            </div>
          ) : (
            <div className="mt-6">
              <Link
                to="/plans"
                className="inline-flex items-center gap-2 rounded-full bg-gold text-pine-deep px-6 py-3 font-bold shadow-glow hover:scale-105 transition"
              >
                View Plans & Join → <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="py-16 bg-cream-grad">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-pine">Step 1</div>
              <h2 className="mt-2 font-display text-3xl md:text-4xl text-pine-deep">Select a service category</h2>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICE_CATEGORIES.map((c, i) => {
              const Icon = c.icon;
              return (
                <Link
                  key={c.slug}
                  to="/services/$category"
                  params={{ category: c.slug }}
                  className="group rounded-3xl bg-card border border-border p-6 shadow-card hover-lift animate-pop-in"
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  <div className="h-12 w-12 grid place-items-center rounded-2xl bg-pine-deep text-cream">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 font-display text-xl text-pine-deep">{c.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{c.tagline}</p>
                  <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-pine">
                    Explore {c.items.length} services
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* POPULAR SERVICES */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-pine">Popular Services</div>
          <h2 className="mt-2 font-display text-3xl text-pine-deep">Quick picks for new members</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {popular.map((p, i) => (
              <Link
                key={p.name}
                to="/request/$category/$service"
                params={{ category: p.cat, service: encodeURIComponent(p.name) }}
                className="group rounded-2xl bg-card border border-border p-5 shadow-card hover-lift animate-fade-up"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="flex items-center gap-2 text-amber-500">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="text-xs font-bold uppercase tracking-wider">Popular</span>
                </div>
                <h3 className="mt-2 font-semibold text-pine-deep">{p.name}</h3>
                <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-pine">
                  Request Service <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* MY REQUESTS */}
      <section className="py-16 bg-cream-grad">
        <div className="container mx-auto px-4">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-pine">My Requests</div>
          <h2 className="mt-2 font-display text-3xl text-pine-deep">Track your service requests</h2>

          {requests.length === 0 ? (
            <div className="mt-8 rounded-3xl bg-card border border-dashed border-border p-10 text-center">
              <Ticket className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="mt-3 text-muted-foreground">No service requests yet. Select a category above to get started.</p>
            </div>
          ) : (
            <div className="mt-8 grid gap-3">
              {requests.map((r) => (
                <div key={r.id} className="rounded-2xl bg-card border border-border p-5 flex items-center justify-between shadow-card">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">{r.category}</div>
                    <div className="font-semibold text-pine-deep mt-0.5">{r.service}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Submitted {new Date(r.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <span className="rounded-full bg-pine/10 text-pine-deep px-3 py-1 text-xs font-semibold">
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SUPPORT */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="relative rounded-3xl bg-pine-deep text-cream p-10 text-center overflow-hidden">
            <div className="absolute inset-0 bg-radial-luxe opacity-40" />
            <div className="relative">
              <Headphones className="h-10 w-10 mx-auto" />
              <h2 className="mt-4 font-display text-3xl">Need help choosing?</h2>
              <p className="mt-2 text-white/80 max-w-xl mx-auto">
                Our team is one tap away — get instant assistance on WhatsApp or call us directly.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <a
                  href={`https://wa.me/${WHATSAPP}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-[oklch(0.7_0.18_145)] text-white px-6 py-3 font-semibold shadow-glow hover:scale-105 transition"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp Support
                </a>
                <a
                  href="tel:9559155535"
                  className="inline-flex items-center gap-2 rounded-full glass-dark text-white px-6 py-3 font-semibold hover:bg-white/15 transition"
                >
                  <Phone className="h-4 w-4" /> Call 9559155535
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
