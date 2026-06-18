import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { SubscribeProvider, useSubscribe } from "@/components/site/SubscribeModal";
import { Counter } from "@/components/site/Counter";
import { PLANS, WHATSAPP, type PlanId } from "@/data/site";
import heroBg from "@/assets/hero-bg.jpg";
import networkImg from "@/assets/network-home.jpg";
import earnImg from "@/assets/earn-growth.jpg";
import trustImg from "@/assets/trust-handshake.jpg";
import princeLogo from "@/assets/prince-logo.png";
import {
  ArrowRight, MessageCircle, Sparkles, Star, Check, Tag,
  ShieldCheck, Zap, Clock, Award, Users, Building2, Phone,
  TrendingUp, Gift, Rocket, Heart, FileText, Megaphone, Ticket, Music,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Prince Groups — THE ONE BRAND ALL YOUR NEEDS" },
      { name: "description", content: "Premium daily subscriptions from ₹1. Unlock up to 75% off documentation, marketing, concert tickets and more across Kanyakumari." },
      { property: "og:title", content: "Prince Groups — Subscribe & Save Every Day" },
      { property: "og:description", content: "₹1 · ₹10 · ₹100 daily plans. Up to 75% off all services." },
    ],
  }),
  component: () => (
    <SubscribeProvider>
      <SiteLayout><Index /></SiteLayout>
    </SubscribeProvider>
  ),
});

const TICKER = [
  "All Document Registration", "Digital Marketing", "Concert Tickets",
  "Concert Advertising", "Insurance Offers", "Member Earnings",
  "Priority Support", "Up to 75% OFF",
];

function Index() {
  const waHref = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hello PRINCE GROUPS, I'd like to subscribe.")}`;
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <video
          src="/motion-bg.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          poster={heroBg}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-pine-deep/85 via-pine-deep/70 to-pine-deep/90" />
        <div className="absolute inset-0 backdrop-brightness-90" />
        <div className="absolute inset-0 bg-radial-luxe opacity-50" />
        <div className="absolute -top-32 -left-20 h-96 w-96 rounded-full bg-avocado/30 blur-3xl animate-float" />
        <div className="absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-cream/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

        <div className="relative container mx-auto px-4 py-20 md:py-28">
          <div className="max-w-4xl mx-auto text-center text-white">
            <div className="inline-flex items-center gap-2 rounded-full glass-dark px-4 py-1.5 text-xs uppercase tracking-[0.25em] animate-fade-in">
              Prince Group Kanyakumari
            </div>
            <h1 className="mt-6 font-display text-4xl md:text-6xl lg:text-7xl leading-[1.05] animate-fade-up text-cream">
              Subscribe Today in Kanyakumari.<br />
              <span className="text-gradient-gold">Save Every Single Day.</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-white/90 max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: ".1s" }}>
              Plans starting at just <span className="font-bold text-cream">₹1/day</span> — unlock up to 75% off documentation, marketing, concert tickets and exclusive insurance offers.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3 animate-fade-up" style={{ animationDelay: ".2s" }}>
              <a href="#plans" className="group inline-flex items-center gap-2 rounded-full bg-cream text-pine-deep font-semibold px-7 py-3.5 shadow-glow hover:scale-105 transition">
                Choose Your Plan <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
              </a>
              <a href={waHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full glass-dark text-white font-semibold px-7 py-3.5 hover:bg-white/15 transition">
                <MessageCircle className="h-4 w-4" /> WhatsApp Us
              </a>
            </div>

            <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {[
                { icon: Award, k: 10, suf: "+", v: "Years Trusted" },
                { icon: Users, k: 50000, suf: "+", v: "Happy Members" },
                { icon: Building2, k: 20, suf: "+", v: "Branch Networks" },
                { icon: ShieldCheck, k: 100, suf: "%", v: "Secure Payments" },
              ].map(({ icon: Icon, k, suf, v }, i) => (
                <div key={v} className="glass-dark rounded-2xl p-4 text-center animate-pop-in" style={{ animationDelay: `${0.3 + i * 0.1}s` }}>
                  <Icon className="h-5 w-5 mx-auto text-cream" />
                  <div className="mt-2 font-display text-2xl"><Counter to={k} suffix={suf} /></div>
                  <div className="text-[11px] uppercase tracking-widest opacity-80">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* benefits ticker */}
        <div className="relative bg-cream/95 border-y border-pine/10 overflow-hidden py-3">
          <div className="flex gap-12 whitespace-nowrap animate-ticker">
            {[...TICKER, ...TICKER].map((t, i) => (
              <span key={i} className="inline-flex items-center gap-2 text-pine-deep font-semibold text-sm tracking-wide">
                <Sparkles className="h-3.5 w-3.5 text-pine" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING — focus area */}
      <section id="plans" className="relative py-24 bg-cream-grad overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[900px] rounded-full bg-pine/10 blur-3xl" />
        <div className="relative container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full bg-pine/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.25em] text-pine-deep">
              <Tag className="h-3.5 w-3.5" /> Subscription Plans
            </div>
            <h2 className="mt-4 font-display text-4xl md:text-5xl text-pine-deep">
              Pick the plan that <span className="text-gradient-pine">unlocks more savings.</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Daily autopay. Cancel anytime. The longer you stay, the more you save.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3 [perspective:1000px]">
            {PLANS.map((p, i) => (
              <PlanCard key={p.id} p={p} delay={i * 0.12} />
            ))}
          </div>

          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {[
              { i: FileText, t: "Document Registration" },
              { i: Megaphone, t: "Digital Marketing" },
              { i: Ticket, t: "Concert Tickets" },
              { i: Music, t: "Concert Advertising" },
            ].map(({ i: Icon, t }, idx) => (
              <div key={t} className="rounded-xl bg-card border border-border p-4 text-sm text-pine-deep flex flex-col items-center gap-2 hover-lift animate-fade-up" style={{ animationDelay: `${idx * 0.08}s` }}>
                <Icon className="h-5 w-5 text-pine" /> <span className="font-medium">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY SUBSCRIBE */}
      <section className="py-24 bg-pine-deep text-cream relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-luxe opacity-30" />
        <div className="relative container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-cream/80">Why Members Stay</div>
            <h2 className="mt-3 font-display text-4xl md:text-5xl">A premium experience <span className="text-gradient-gold">built for you.</span></h2>
          </div>
          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-5 gap-5 max-w-6xl mx-auto">
            {[
              { i: Zap, t: "Instant Activation", d: "Membership goes live the second your payment is confirmed." },
              { i: ShieldCheck, t: "100% Trusted", d: "10+ years serving Kanyakumari. Real people, real support." },
              { i: Gift, t: "Exclusive Offers", d: "Up to 75% off everything Prince Groups touches." },
              { i: TrendingUp, t: "Earn While You Save", d: "Referral commissions paid directly by Prince Group." },
              { i: Heart, t: "Customer-First Care", d: "WhatsApp support that actually responds in minutes." },
            ].map(({ i: Icon, t, d }) => (
              <div key={t} className="glass-dark rounded-2xl p-6 hover-lift">
                <div className="h-11 w-11 grid place-items-center rounded-xl bg-cream text-pine-deep mb-4"><Icon className="h-5 w-5" /></div>
                <h3 className="font-semibold text-lg">{t}</h3>
                <p className="text-sm opacity-85 mt-1 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EARN + TRUST visual band */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative animate-fade-up">
              <div className="absolute -inset-4 rounded-[2rem] rotate-2 opacity-40 blur-xl" style={{ background: "var(--gradient-pistachio)" }} />
              <div className="relative grid grid-cols-2 gap-4">
                <img src={earnImg} alt="Earn with Prince Groups" loading="lazy" className="rounded-2xl shadow-luxury aspect-[3/4] object-cover hover-lift" />
                <img src={trustImg} alt="Businesses trust Prince Groups" loading="lazy" className="rounded-2xl shadow-luxury aspect-[3/4] object-cover hover-lift mt-10" />
              </div>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-pine">Subscribe · Save · Earn</div>
              <h2 className="mt-3 font-display text-4xl md:text-5xl text-pine-deep leading-tight">
                More than savings — a <span className="text-gradient-pine">growth engine.</span>
              </h2>
              <p className="mt-5 text-muted-foreground text-lg leading-relaxed">
                Every member unlocks daily discounts, plus the chance to earn through commissions, partnerships and insurance referrals. Your subscription pays you back.
              </p>
              <div className="mt-7 grid sm:grid-cols-3 gap-3">
                {[{v:10,l:"Years"},{v:20,l:"Branches"},{v:50000,l:"Members"}].map(s => (
                  <div key={s.l} className="rounded-xl bg-cream p-4 text-center shadow-card">
                    <div className="font-display text-3xl text-pine-deep"><Counter to={s.v} suffix="+" /></div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.l}</div>
                  </div>
                ))}
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#plans" className="inline-flex items-center gap-2 rounded-full bg-hero text-white px-6 py-3 font-semibold shadow-luxury hover:shadow-glow transition">
                  Subscribe Now <ArrowRight className="h-4 w-4" />
                </a>
                <Link to="/earnings" className="inline-flex items-center gap-2 rounded-full bg-cream text-pine-deep px-6 py-3 font-semibold hover:bg-white transition">
                  Learn How To Earn
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NETWORK BAND */}
      <section className="py-24 bg-cream-grad">
        <div className="container mx-auto px-4">
          <div className="rounded-3xl overflow-hidden shadow-luxury relative">
            <img src={networkImg} alt="Connected business network" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-pine-deep/95 via-pine-deep/85 to-pine/70" />
            <div className="relative p-8 md:p-14 text-cream grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.25em] text-cream/80">Prince Groups Network</div>
                <h2 className="mt-3 font-display text-4xl md:text-5xl">One brand. <span className="text-gradient-gold">Multiple businesses with 20 branches.</span></h2>
                <p className="mt-5 text-cream/90 text-lg leading-relaxed">
                  We're merging Kanyakumari's strongest businesses into one premium membership — so every rupee you spend stretches further.
                </p>
                <a href="#plans" className="mt-7 inline-flex items-center gap-2 rounded-full bg-cream text-pine-deep px-7 py-3.5 font-semibold shadow-glow hover:scale-105 transition">
                  Join The Network <ArrowRight className="h-4 w-4" />
                </a>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  "Documentation Partners",
                  "Marketing Studios",
                  "Concert Promoters",
                  "Insurance Agencies",
                  "Local Merchants",
                  "Service Providers",
                ].map((t, i) => (
                  <div key={t} className="glass-dark rounded-xl p-4 font-medium animate-fade-up" style={{ animationDelay: `${i * 0.06}s` }}>
                    <Check className="h-4 w-4 text-cream inline mr-2" />{t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="relative rounded-3xl bg-hero text-white p-10 md:p-16 text-center shadow-luxury overflow-hidden">
            <div className="absolute inset-0 bg-radial-luxe opacity-40" />
            <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-cream/15 blur-3xl animate-float" />
            <div className="relative">
              <img src={princeLogo} alt="Prince Group" className="h-16 w-16 mx-auto rounded-full object-contain bg-white/10 p-1 shadow-glow" />
              <h2 className="mt-4 font-display text-4xl md:text-6xl">Your premium membership <span className="text-gradient-gold">starts today.</span></h2>
              <p className="mt-5 text-white/90 text-lg max-w-2xl mx-auto">From ₹1 a day. Cancel anytime. Unlock everything Prince Groups has to offer.</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <a href="#plans" className="inline-flex items-center gap-2 rounded-full bg-cream text-pine-deep px-8 py-4 font-bold shadow-glow hover:scale-105 transition">
                  Subscribe Now <ArrowRight className="h-4 w-4" />
                </a>
                <a href={`tel:9559155535`} className="inline-flex items-center gap-2 rounded-full glass-dark text-white px-8 py-4 font-semibold hover:bg-white/15 transition">
                  <Phone className="h-4 w-4" /> 9559155535
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function PlanCard({ p, delay }: { p: typeof PLANS[number]; delay: number }) {
  const { open } = useSubscribe();
  const monthly = p.price * 30;
  return (
    <div
      className={`group relative rounded-3xl p-7 hover-lift animate-pop-in transition-transform [transform-style:preserve-3d] hover:[transform:rotateX(-2deg)_rotateY(2deg)] ${
        p.highlight
          ? "bg-hero text-white shadow-luxury ring-1 ring-white/20"
          : "bg-card shadow-card border border-border"
      }`}
      style={{ animationDelay: `${delay}s` }}
    >
      {p.highlight && (
        <>
          <span className="absolute -inset-px rounded-3xl bg-pine/30 blur-xl -z-10 animate-glow" />
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-cream px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-pine-deep shadow-glow">
            <Star className="h-3 w-3" /> Most Popular
          </div>
        </>
      )}

      {/* shimmer sweep on hover */}
      <span className="pointer-events-none absolute inset-0 rounded-3xl overflow-hidden">
        <span className="absolute -inset-x-1/2 -top-1/2 h-[200%] w-[60%] rotate-12 bg-gradient-to-r from-transparent via-white/25 to-transparent translate-x-[-200%] group-hover:translate-x-[300%] transition-transform duration-[1400ms]" />
      </span>

      <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-widest ${p.highlight ? "text-cream" : "text-pine"}`}>
        <Sparkles className="h-3.5 w-3.5" /> {p.name}
      </div>
      <div className="mt-4 flex items-baseline gap-1">
        <span className={`font-display text-6xl ${p.highlight ? "text-white" : "text-pine-deep"}`}>₹{p.price}</span>
        <span className={`text-sm ${p.highlight ? "text-white/80" : "text-muted-foreground"}`}>/ day</span>
      </div>
      <div className={`text-xs mt-1 ${p.highlight ? "text-white/70" : "text-muted-foreground"}`}>≈ ₹{monthly}/month · cancel anytime</div>
      <p className={`mt-3 text-sm ${p.highlight ? "text-white/85" : "text-muted-foreground"}`}>{p.tagline}</p>
      <div className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${p.highlight ? "bg-white/15 text-white" : "bg-cream text-pine-deep"}`}>
        <Tag className="h-3 w-3" /> {p.discount}
      </div>
      <ul className="mt-6 space-y-3">
        {p.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className={`h-4 w-4 mt-0.5 shrink-0 ${p.highlight ? "text-white" : "text-pine"}`} />
            <span className={p.highlight ? "text-white/95" : "text-foreground/85"}>{f}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={() => open(p.id as PlanId)}
        className={`mt-7 w-full rounded-full py-3.5 font-semibold transition ${
          p.highlight
            ? "bg-cream text-pine-deep shadow-glow hover:scale-[1.02]"
            : "bg-pine-deep text-white hover:bg-pine"
        }`}
      >
        {p.cta}
      </button>
    </div>
  );
}
