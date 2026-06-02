import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PHONES, WHATSAPP } from "@/data/site";
import { Phone, MessageCircle, MapPin, Send, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Prince Group Subscription Services" },
      { name: "description", content: "Call 9559155535 or 9344380178. WhatsApp support available. Head office at Monday Market, Kanyakumari." },
    ],
  }),
  component: () => <SiteLayout><ContactPage /></SiteLayout>,
});

function ContactPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", mobile: "", message: "" });
  const waHref = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hello PRINCE GROUP, I have a quick enquiry.")}`;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || form.mobile.length < 10) return;
    const msg = `Hello PRINCE GROUP,%0A%0AName: ${form.name}%0AMobile: ${form.mobile}%0A%0A${form.message}`;
    window.open(`https://wa.me/${WHATSAPP}?text=${msg}`, "_blank");
    setSent(true);
  };

  return (
    <>
      <section className="relative bg-hero-animated text-cream py-24 overflow-hidden">
        <div className="absolute inset-0 bg-radial-luxe opacity-50" />
        <div className="relative container mx-auto px-4 text-center animate-fade-up">
          <h1 className="font-display text-5xl md:text-6xl">We're here, <span className="text-gradient-gold">ready to help.</span></h1>
          <p className="mt-4 text-cream/85 max-w-xl mx-auto text-lg">Real humans. Quick responses. Reach our team by call, WhatsApp or the form below — most enquiries answered within minutes.</p>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-10">
            <div className="space-y-5">
              {PHONES.map((p) => (
                <div key={p} className="glass rounded-2xl p-6 shadow-card flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 grid place-items-center rounded-xl bg-hero text-cream"><Phone className="h-5 w-5" /></div>
                    <div>
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">Call Us</div>
                      <div className="font-display text-2xl text-pine-deep">{p}</div>
                    </div>
                  </div>
                  <a href={`tel:${p}`} className="rounded-full bg-pine-deep text-cream px-5 py-2.5 font-semibold text-sm hover:bg-pine transition">Call Now</a>
                </div>
              ))}
              <a href={waHref} target="_blank" rel="noreferrer" className="block rounded-2xl p-6 shadow-card bg-[oklch(0.7_0.18_145)] text-white hover-lift">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 grid place-items-center rounded-xl bg-white/15"><MessageCircle className="h-5 w-5" /></div>
                  <div>
                    <div className="text-xs uppercase tracking-widest opacity-80">WhatsApp Support</div>
                    <div className="font-display text-2xl">Chat with us</div>
                  </div>
                </div>
              </a>
              <div className="glass rounded-2xl p-6 shadow-card">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 grid place-items-center rounded-xl bg-gold text-pine-deep"><MapPin className="h-5 w-5" /></div>
                  <div>
                    <div className="text-xs uppercase tracking-widest text-muted-foreground">Head Office</div>
                    <div className="font-display text-2xl text-pine-deep">Monday Market</div>
                    <div className="text-sm text-muted-foreground">Kanyakumari District, Tamil Nadu</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-card border border-border p-8 shadow-card">
              <h2 className="font-display text-2xl text-pine-deep">Quick Enquiry</h2>
              <p className="text-sm text-muted-foreground mt-1">Send a message — we'll continue on WhatsApp.</p>
              {sent ? (
                <div className="mt-8 text-center py-10">
                  <CheckCircle2 className="h-14 w-14 mx-auto text-avocado animate-glow rounded-full" />
                  <p className="mt-4 text-pine-deep font-semibold">Opening WhatsApp…</p>
                </div>
              ) : (
                <form onSubmit={submit} className="mt-6 space-y-4">
                  <Input label="Your Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
                  <Input label="Mobile Number" value={form.mobile} onChange={(v) => setForm({ ...form, mobile: v.replace(/\D/g, "").slice(0, 10) })} />
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Message</span>
                    <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={4} className="mt-1.5 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition" placeholder="How can we help?" />
                  </label>
                  <button type="submit" className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-hero text-cream font-semibold py-3 shadow-luxury hover:shadow-glow transition">
                    <Send className="h-4 w-4" /> Send Enquiry
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input required value={value} onChange={(e) => onChange(e.target.value)} className="mt-1.5 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition" />
    </label>
  );
}
