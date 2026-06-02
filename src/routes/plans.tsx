import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { SubscribeProvider } from "@/components/site/SubscribeModal";
import { PlansGrid } from "@/components/site/PlansGrid";
import { ShieldCheck, Sparkles, Clock } from "lucide-react";

export const Route = createFileRoute("/plans")({
  head: () => ({
    meta: [
      { title: "Subscription Plans — Prince Groups" },
      { name: "description", content: "₹1, ₹10 or ₹100 daily plans — unlock up to 75% off all services. THE ONE BRAND ALL YOUR NEEDS." },
      { property: "og:title", content: "Subscription Plans — Prince Groups" },
      { property: "og:description", content: "₹1, ₹10 or ₹100 daily plans — unlock up to 75% off all services." },
    ],
  }),
  component: () => (
    <SubscribeProvider>
      <SiteLayout><PlansPage /></SiteLayout>
    </SubscribeProvider>
  ),
});

function PlansPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-hero-animated text-white py-24">
        <div className="absolute inset-0 bg-radial-luxe opacity-50" />
        <div className="relative container mx-auto px-4 text-center animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full glass-dark px-4 py-1.5 text-xs uppercase tracking-[0.25em]">
            <Sparkles className="h-3.5 w-3.5 text-cream" /> Premium Subscriptions
          </div>
          <h1 className="mt-5 font-display text-5xl md:text-6xl">Find your <span className="text-gradient-gold">perfect plan</span></h1>
          <p className="mt-4 text-white/90 max-w-xl mx-auto text-lg">
            Three tiers. One promise — premium service at unbeatable daily pricing. Activate in seconds, save for life.
          </p>
        </div>
      </section>

      <section className="py-20 bg-cream-grad">
        <div className="container mx-auto px-4">
          <PlansGrid />
          <div className="mt-16 grid md:grid-cols-3 gap-5">
            {[
              { icon: ShieldCheck, t: "Bank-grade Security", d: "Encrypted UPI gateway with safe auto-debit setup." },
              { icon: Clock, t: "Instant Activation", d: "Your benefits go live the moment payment confirms." },
              { icon: Sparkles, t: "Premium Perks", d: "Up to 75% off across the entire Prince Groups network." },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="glass rounded-2xl p-6 shadow-card hover-lift">
                <Icon className="h-6 w-6 text-pine" />
                <div className="mt-3 font-semibold text-pine-deep">{t}</div>
                <p className="text-sm text-muted-foreground mt-1">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
