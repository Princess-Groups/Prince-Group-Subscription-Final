import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Star, FileText, Megaphone, Music, Ticket, Percent, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/benefits")({
  head: () => ({
    meta: [
      { title: "Member Benefits — Prince Groups" },
      { name: "description", content: "Up to 75% off documentation, digital marketing, music concert tickets and concert advertising." },
      { property: "og:title", content: "Member Benefits — Prince Groups" },
      { property: "og:description", content: "Up to 75% off documentation, digital marketing, concert tickets and advertising." },
    ],
  }),
  component: () => <SiteLayout><BenefitsPage /></SiteLayout>,
});

const INCLUDED = [
  { icon: FileText, t: "Document Registration", d: "Every legal, business and personal document handled end-to-end with member discounts." },
  { icon: Megaphone, t: "Digital Marketing", d: "Social campaigns, paid ads and creative — produced and managed for our members." },
  { icon: Ticket, t: "Concert Tickets", d: "Member-only access and discounted passes to live shows across South India." },
  { icon: Music, t: "Concert Advertising", d: "Showcase your brand at our partnered events and reach thousands of attendees." },
];

const TIERS = [
  { name: "₹1 Plan", off: "30%", color: "bg-card border border-border text-pine-deep" },
  { name: "₹10 Plan", off: "50%", color: "bg-hero text-white shadow-luxury" },
  { name: "₹100 Plan", off: "75%", color: "bg-card border border-border text-pine-deep" },
];

function BenefitsPage() {
  return (
    <>
      <section className="relative bg-hero-animated text-white py-24 overflow-hidden">
        <div className="absolute inset-0 bg-radial-luxe opacity-50" />
        <div className="relative container mx-auto px-4 text-center animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full glass-dark px-4 py-1.5 text-xs uppercase tracking-[0.25em] text-white">
            <Star className="h-3.5 w-3.5 text-cream" /> Member Benefits
          </div>
          <h1 className="mt-5 font-display text-5xl md:text-6xl">Built to <span className="text-gradient-gold">reward you daily.</span></h1>
          <p className="mt-4 text-white/90 max-w-xl mx-auto text-lg">
            One subscription. Endless savings across documentation, marketing, events and insurance — across every Prince Groups partner.
          </p>
        </div>
      </section>

      <section className="py-20 bg-cream-grad">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-5">
            {TIERS.map((t, i) => (
              <div key={t.name} className={`rounded-3xl p-7 text-center hover-lift animate-pop-in ${t.color}`} style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="text-xs font-bold uppercase tracking-widest opacity-80">{t.name}</div>
                <div className="mt-3 font-display text-6xl flex items-center justify-center gap-1">
                  {t.off}<Percent className="h-7 w-7 opacity-70" />
                </div>
                <div className="mt-1 text-sm opacity-80">Discount on every service</div>
              </div>
            ))}
          </div>

          <div className="mt-20 text-center max-w-2xl mx-auto">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-pine">Everything Included</div>
            <h2 className="mt-3 font-display text-4xl md:text-5xl text-pine-deep">Premium services in <span className="text-gradient-pine">every plan.</span></h2>
            <p className="mt-4 text-muted-foreground">No upsells. No hidden tiers. Just more savings the higher you go.</p>
          </div>

          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {INCLUDED.map(({ icon: Icon, t, d }, i) => (
              <div key={t} className="rounded-2xl bg-card border border-border p-6 hover-lift animate-fade-up" style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="h-12 w-12 grid place-items-center rounded-xl bg-hero text-white"><Icon className="h-5 w-5" /></div>
                <h3 className="mt-4 font-semibold text-lg text-pine-deep">{t}</h3>
                <p className="text-sm text-muted-foreground mt-1">{d}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <Link to="/plans" className="inline-flex items-center gap-2 rounded-full bg-hero text-white px-7 py-3.5 font-semibold shadow-luxury hover:shadow-glow transition">
              See All Plans <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 bg-pine-deep text-cream">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-display text-4xl md:text-5xl">Reasons members <span className="text-gradient-gold">never leave.</span></h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              "Slash your documentation costs",
              "Skip queues with priority service",
              "Long-term loyalty rewards",
              "Faster registration turnaround",
              "Exclusive insurance member offers",
              "Real human customer support",
            ].map((b) => (
              <div key={b} className="glass-dark rounded-2xl p-6 hover-lift">
                <div className="h-10 w-10 grid place-items-center rounded-xl bg-cream text-pine-deep mb-4"><Star className="h-5 w-5" /></div>
                <p className="text-lg">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
