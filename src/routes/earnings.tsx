import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import {
  TrendingUp,
  Users,
  Heart,
  FileSignature,
  FileText,
  Megaphone,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  IndianRupee,
} from "lucide-react";

export const Route = createFileRoute("/earnings")({
  head: () => ({
    meta: [
      { title: "Referral Earnings — Prince Groups" },
      { name: "description", content: "Earn referral commissions directly from Prince Group. Get paid for every subscription and service referral — Marriage Registration, Documentation and Digital Marketing." },
      { property: "og:title", content: "Referral Earnings — Prince Groups" },
      { property: "og:description", content: "Earn directly from Prince Group through subscription and service referrals." },
    ],
  }),
  component: () => <SiteLayout><ReferralPage /></SiteLayout>,
});

const COMMISSIONS = [
  {
    icon: Users,
    title: "Referral Income",
    desc: "Refer customers and earn commission directly from Prince Group — never from the customer.",
    badge: "Direct Payout",
  },
  {
    icon: IndianRupee,
    title: "Subscription Commission",
    desc: "Earn rewards every time a referred customer joins one of our daily subscription plans.",
    badge: "Recurring Earning",
  },
  {
    icon: FileSignature,
    title: "Marriage Registration",
    desc: "Get service commission when your referred subscribers use Marriage Registration support.",
    badge: "Service Commission",
  },
  {
    icon: FileText,
    title: "Documentation Services",
    desc: "Earn on every documentation service availed by your referred subscription members.",
    badge: "Service Commission",
  },
  {
    icon: Megaphone,
    title: "Digital Marketing Services",
    desc: "Get paid when subscribers use our digital marketing services through your referral.",
    badge: "Service Commission",
  },
] as const;

function ReferralPage() {
  return (
    <>
      {/* HERO */}
      <section className="relative bg-hero-animated text-white py-24 overflow-hidden">
        <div className="absolute inset-0 bg-radial-luxe opacity-50" />
        <div className="absolute -top-32 -left-20 h-96 w-96 rounded-full bg-avocado/30 blur-3xl animate-float" />
        <div className="absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-cream/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />
        <div className="relative container mx-auto px-4 text-center animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full glass-dark px-4 py-1.5 text-xs uppercase tracking-[0.25em]">
            <TrendingUp className="h-3.5 w-3.5 text-cream" /> Referral Earnings Program
          </div>
          <h1 className="mt-5 font-display text-5xl md:text-6xl leading-tight">
            Refer & earn — paid <span className="text-gradient-gold">directly by Prince Group.</span>
          </h1>
          <p className="mt-5 text-white/90 max-w-3xl mx-auto text-lg leading-relaxed">
            Bring people to our subscription plans and unlock commissions on every service they use. A simple, transparent and rewarding way to grow with Prince Groups.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/plans" className="inline-flex items-center gap-2 rounded-full bg-cream text-pine-deep px-7 py-3.5 font-semibold shadow-glow hover:scale-105 transition">
              Become a Member <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/contact" className="inline-flex items-center gap-2 rounded-full glass-dark text-white px-7 py-3.5 font-semibold hover:bg-white/15 transition">
              Talk To Our Team
            </Link>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS - Quote / Statement */}
      <section className="py-20 bg-cream-grad">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto rounded-3xl bg-card border border-border p-8 md:p-12 shadow-card animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full bg-pine/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.25em] text-pine-deep">
              <Sparkles className="h-3.5 w-3.5" /> How Earnings Work
            </div>
            <p className="mt-5 text-lg md:text-xl text-foreground/85 leading-relaxed">
              Users will receive commission <span className="font-semibold text-pine-deep">directly from Prince Group</span>, not from customers. If they refer customers for subscription plans, they will earn referral commission. They will also receive commission when referred customers use our services such as <span className="font-semibold text-pine-deep">Marriage Registration, Documentation Services, and Digital Marketing Services</span>. Service commissions are applicable only when the customer is enrolled in a subscription plan.
            </p>

            <div className="mt-8 grid sm:grid-cols-3 gap-3">
              {[
                "Direct payouts from Prince Group",
                "Earn on subscription + services",
                "Subscriber-only service commissions",
              ].map((t) => (
                <div key={t} className="flex items-start gap-2 rounded-xl bg-cream p-4">
                  <CheckCircle2 className="h-5 w-5 text-pine shrink-0 mt-0.5" />
                  <span className="text-sm font-medium text-pine-deep">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* COMMISSION BENEFITS */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto animate-fade-up">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-pine">Commission Benefits</div>
            <h2 className="mt-3 font-display text-4xl md:text-5xl text-pine-deep">
              Five ways to <span className="text-gradient-pine">earn every month.</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Every active referral can pay you across multiple touchpoints — subscription joins and ongoing services.
            </p>
          </div>

          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {COMMISSIONS.map(({ icon: Icon, title, desc, badge }, i) => (
              <div
                key={title}
                className="group relative rounded-3xl bg-card border border-border p-7 hover-lift animate-pop-in overflow-hidden"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <span className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-pine/10 blur-3xl group-hover:bg-pine/20 transition" />
                <div className="relative">
                  <div className="h-12 w-12 grid place-items-center rounded-xl bg-hero text-white shadow-luxury">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-cream px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pine-deep">
                    {badge}
                  </div>
                  <h3 className="mt-3 font-display text-2xl text-pine-deep">{title}</h3>
                  <p className="mt-2 text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-24">
        <div className="container mx-auto px-4">
          <div className="relative rounded-3xl bg-hero text-white p-10 md:p-14 text-center shadow-luxury overflow-hidden">
            <div className="absolute inset-0 bg-radial-luxe opacity-40" />
            <div className="relative">
              <Heart className="h-9 w-9 mx-auto text-cream" />
              <h2 className="mt-4 font-display text-4xl md:text-5xl">Start earning with every referral.</h2>
              <p className="mt-4 text-white/90 text-lg max-w-2xl mx-auto">
                Join a Prince Groups subscription plan and unlock the full referral earnings program today.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link to="/plans" className="inline-flex items-center gap-2 rounded-full bg-cream text-pine-deep px-8 py-4 font-bold shadow-glow hover:scale-105 transition">
                  View Plans <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/contact" className="inline-flex items-center gap-2 rounded-full glass-dark text-white px-8 py-4 font-semibold hover:bg-white/15 transition">
                  Contact Team
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
