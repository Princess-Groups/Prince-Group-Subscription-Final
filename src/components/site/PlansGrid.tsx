import { Check, Sparkles, Star, Tag, Gift, TrendingUp, Crown } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { PLANS, type PlanId } from "@/data/site";
import { useSubscribe } from "./SubscribeModal";

export function PlansGrid() {
  const { open } = useSubscribe();
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {PLANS.map((p, i) => (
        <div
          key={p.id}
          className={`relative rounded-3xl p-7 hover-lift ${
            p.highlight
              ? "bg-hero text-white shadow-luxury ring-1 ring-white/20"
              : "bg-card shadow-card border border-border"
          }`}
        >
          {p.highlight && (
            <>
              <span className="absolute -inset-px rounded-3xl bg-pine/30 blur-xl -z-10 animate-glow" />
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-cream px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-pine-deep shadow-glow">
                <Star className="h-3 w-3" /> Most Popular
              </div>
            </>
          )}

          <PlanIcon id={p.id} delay={i * 0.2} />

          <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-widest ${p.highlight ? "text-cream" : "text-pine"}`}>
            <Sparkles className="h-3.5 w-3.5" /> {p.name}
          </div>
          <div className="mt-4 flex items-baseline gap-1">
            <span className={`font-display text-5xl ${p.highlight ? "text-white" : "text-pine-deep"}`}>₹{p.price}</span>
            <span className={`text-sm ${p.highlight ? "text-white/80" : "text-muted-foreground"}`}>/ day</span>
          </div>
          <div className={`mt-1 text-xs font-semibold uppercase tracking-wider ${p.highlight ? "text-cream" : "text-pine"}`}>
            Monthly Auto-Pay Subscription · ₹{p.price * 30}/month
          </div>
          <p className={`mt-1 text-sm ${p.highlight ? "text-white/85" : "text-muted-foreground"}`}>{p.tagline}</p>
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
            className={`mt-7 w-full rounded-full py-3 font-semibold transition ${
              p.highlight
                ? "bg-cream text-pine-deep shadow-glow hover:scale-[1.02]"
                : "bg-pine-deep text-white hover:bg-pine"
            }`}
          >
            {p.cta}
          </button>
        </div>
      ))}
    </div>
  );
}

function PlanIcon({ id, delay }: { id: string; delay: number }) {
  const [spin, setSpin] = useState(false);
  const icon = id === "starter" ? <Gift className="h-24 w-24" /> : id === "popular" ? <TrendingUp className="h-24 w-24" /> : <Crown className="h-24 w-24" />;
  return (
    <motion.div
      onClick={() => setSpin((s) => !s)}
      animate={{
        y: [0, -10, 0],
        rotate: spin ? 360 : 0,
      }}
      transition={{
        y: { duration: 3.2, repeat: Infinity, ease: "easeInOut", delay },
        rotate: spin
          ? { duration: 1.4, ease: "easeInOut" }
          : { duration: 0 },
      }}
      className="relative mx-auto -mt-4 mb-2 h-48 w-48 cursor-pointer select-none"
    >
      <div className="flex h-full w-full items-center justify-center">
        {icon}
      </div>
    </motion.div>
  );
}
