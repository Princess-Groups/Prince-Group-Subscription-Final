import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import logo from "@/assets/prince-logo.png";

const nav = [
  { to: "/", label: "Home" },
  { to: "/plans", label: "Plans" },
  { to: "/my-services", label: "Services" },
  { to: "/benefits", label: "Benefits" },
  { to: "/earnings", label: "Referral" },
  { to: "/contact", label: "Contact" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          setScrolled((prev) => {
            const next = window.scrollY > 20;
            return prev === next ? prev : next;
          });
          ticking = false;
        });
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled ? "py-1" : "py-2"
      }`}
    >
      <div className="container mx-auto px-4">
        <div
          className={`flex items-center justify-between rounded-2xl px-4 md:px-6 py-2 transition-all ${
            scrolled ? "glass shadow-card" : "bg-cream/95 shadow-card"
          }`}
        >
          <Link to="/" className="flex items-center gap-2 md:gap-3 group">
            <img
              src={logo}
              alt="Prince Group"
              width={1024}
              height={1024}
              className="h-10 w-10 md:h-12 md:w-12 object-contain rounded-full transition-transform group-hover:scale-105 drop-shadow-[0_4px_8px_rgba(37,211,102,0.35)]"
              style={{ background: "transparent" }}
            />
            <div className="leading-tight">
              <div className="text-xl md:text-2xl lg:text-3xl font-extrabold tracking-wide text-pine-deep font-display">
                PRINCE GROUP
              </div>
              <div className="text-[8px] md:text-[10px] font-semibold uppercase tracking-[0.16em] text-black truncate max-w-[220px] md:max-w-none">
                20 Branches All Over Kanyakumari
              </div>
              <div className="text-[7px] md:text-[8px] uppercase tracking-[0.2em] text-black/70 truncate max-w-[220px] md:max-w-none">
                The One Brand For All Your Needs
              </div>
            </div>
          </Link>
          <nav className="hidden lg:flex items-center gap-1">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="px-4 py-2 text-sm font-medium text-foreground/80 hover:text-pine-deep rounded-full hover:bg-cream transition"
                activeProps={{ className: "px-4 py-2 text-sm font-semibold rounded-full bg-cream text-pine-deep" }}
                activeOptions={{ exact: true }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="hidden lg:flex items-center gap-2">
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-pine-deep hover:bg-muted transition"
            >
              Admin
            </Link>
            <Link
              to="/plans"
              className="inline-flex items-center gap-2 rounded-full bg-hero px-5 py-2.5 text-sm font-semibold text-white shadow-luxury hover:shadow-glow transition-all"
            >
              Join Now
            </Link>
          </div>
          <button
            className="lg:hidden h-10 w-10 grid place-items-center rounded-xl glass"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open && (
          <div className="lg:hidden mt-2 glass rounded-2xl p-3 shadow-card animate-fade-up">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="block px-4 py-3 rounded-xl text-foreground hover:bg-cream"
              >
                {n.label}
              </Link>
            ))}
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="block px-4 py-3 rounded-xl text-foreground hover:bg-cream"
            >
              Admin
            </Link>
            <Link
              to="/plans"
              onClick={() => setOpen(false)}
              className="mt-2 block text-center rounded-xl bg-hero text-white py-3 font-semibold"
            >
              Join Now
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
