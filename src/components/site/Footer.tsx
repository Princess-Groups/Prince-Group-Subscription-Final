import { Link } from "@tanstack/react-router";
import { Phone, MapPin, Facebook, Instagram, MessageCircle } from "lucide-react";
import logo from "@/assets/prince-logo.png";

export function Footer() {
  return (
    <footer className="relative mt-24 bg-pine-deep text-cream overflow-hidden">
      <div className="absolute inset-0 bg-radial-luxe opacity-40" />
      <div className="relative container mx-auto px-4 py-16">
        <div className="grid gap-12 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src={logo} alt="Prince Group" width={1024} height={1024} loading="lazy" className="h-14 w-14 object-contain rounded-full drop-shadow-[0_6px_12px_rgba(37,211,102,0.35)]" style={{ background: "transparent" }} />
              <div>
                <div className="font-bold tracking-wide text-base">PRINCE GROUP</div>
                <div className="text-[10px] uppercase tracking-[0.2em] opacity-80">20 Branches All Over Kanyakumari</div>
                <div className="text-[9px] uppercase tracking-[0.22em] opacity-60">The One Brand For All Your Needs</div>
              </div>
            </div>
            <p className="text-sm opacity-80 leading-relaxed">
              Subscription plans, member benefits, earning opportunities and insurance offers — all in one trusted brand from Kanyakumari.
            </p>
            <div className="flex gap-2 mt-5">
              {[Facebook, Instagram, MessageCircle].map((Icon, i) => (
                <a key={i} href="#" className="h-9 w-9 grid place-items-center rounded-full glass-dark hover:bg-cream hover:text-pine-deep transition">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-display text-lg mb-4 text-cream">Quick Links</h4>
            <ul className="space-y-2 text-sm opacity-90">
              {[["/", "Home"], ["/plans", "Plans"], ["/benefits", "Benefits"], ["/earnings", "Referral"], ["/contact", "Contact"]].map(([to, label]) => (
                <li key={to}><Link to={to} className="hover:text-white transition">{label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-display text-lg mb-4 text-cream">Head Office</h4>
            <p className="text-sm opacity-90 flex gap-2"><MapPin className="h-4 w-4 mt-0.5 shrink-0" /> Monday Market, Kanyakumari District</p>
            <p className="text-sm opacity-90 mt-3 flex gap-2"><Phone className="h-4 w-4 mt-0.5" /> 9559155535</p>
            <p className="text-sm opacity-90 mt-1 flex gap-2"><Phone className="h-4 w-4 mt-0.5" /> 9344380178</p>
          </div>
          <div>
            <h4 className="font-display text-lg mb-4 text-cream">Subscribe & Save</h4>
            <p className="text-sm opacity-80 mb-4">Join our daily subscription and unlock up to 75% off across every Prince Groups service.</p>
            <Link to="/plans" className="inline-flex items-center justify-center rounded-full bg-cream text-pine-deep font-semibold px-5 py-2.5 hover:shadow-glow transition">
              Activate Membership
            </Link>
          </div>
        </div>
        <div className="mt-14 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between gap-3 text-xs opacity-70">
          <p>© {new Date().getFullYear()} Prince Groups. All rights reserved.</p>
          <p>THE ONE BRAND ALL YOUR NEEDS — Kanyakumari.</p>
        </div>
      </div>
    </footer>
  );
}
