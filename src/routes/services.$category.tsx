import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { WHATSAPP } from "@/data/site";
import { SERVICE_CATEGORIES, getCategory } from "@/data/services";
import { ArrowLeft, ArrowRight, Check, MessageCircle, Phone, Sparkles } from "lucide-react";

export const Route = createFileRoute("/services/$category")({
  loader: ({ params }) => {
    const cat = getCategory(params.category);
    if (!cat) throw notFound();
    return { cat };
  },
  head: ({ loaderData }) => {
    const cat = loaderData?.cat;
    const title = cat ? `${cat.title} — Prince Groups Kanyakumari` : "Services — Prince Groups";
    const desc = cat
      ? `${cat.tagline} Explore all ${cat.title.toLowerCase()} services from Prince Groups Kanyakumari.`
      : "Explore all Prince Groups services in Kanyakumari.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
      ],
    };
  },
  notFoundComponent: () => (
    <SiteLayout>
      <div className="container mx-auto px-4 py-32 text-center">
        <h1 className="font-display text-4xl text-pine-deep">Service category not found</h1>
        <Link to="/" className="mt-6 inline-flex items-center gap-2 text-pine font-semibold">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
      </div>
    </SiteLayout>
  ),
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="container mx-auto px-4 py-32 text-center">
        <h1 className="font-display text-3xl text-pine-deep">Something went wrong</h1>
        <p className="mt-2 text-muted-foreground">{error.message}</p>
        <button onClick={reset} className="mt-6 rounded-full bg-pine-deep text-white px-6 py-3">
          Try again
        </button>
      </div>
    </SiteLayout>
  ),
  component: CategoryPage,
});

function CategoryPage() {
  const { cat } = Route.useLoaderData();
  const Icon = cat.icon;

  const enquire = (service: string) =>
    `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
      `Hello PRINCE GROUPS, I'd like to enquire about "${service}" under ${cat.title}.`
    )}`;

  return (
    <SiteLayout>
      {/* HERO */}
      <section className="relative overflow-hidden bg-hero text-white">
        <div className="absolute inset-0 bg-radial-luxe opacity-40" />
        <div className="absolute -top-24 -left-16 h-80 w-80 rounded-full bg-cream/15 blur-3xl animate-float" />
        <div className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-avocado/25 blur-3xl animate-float" style={{ animationDelay: "2s" }} />
        <div className="relative container mx-auto px-4 py-20 md:py-24">
          <Link to="/my-services" search={{ from: undefined }} className="inline-flex items-center gap-2 text-cream/90 hover:text-cream text-sm">
            <ArrowLeft className="h-4 w-4" /> Back to services
          </Link>
          <div className="mt-8 max-w-3xl">
            <div className="inline-flex items-center gap-2 glass-dark rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.25em]">
              <Sparkles className="h-3.5 w-3.5" /> Prince Groups Services
            </div>
            <h1 className="mt-5 font-display text-4xl md:text-6xl leading-[1.05] text-cream">
              {cat.title}
            </h1>
            <p className="mt-5 text-lg text-white/90 max-w-2xl">{cat.tagline}</p>
            <div className="mt-8 inline-flex items-center gap-3 rounded-2xl glass-dark px-5 py-3">
              <Icon className="h-6 w-6 text-cream" />
              <span className="text-sm font-semibold tracking-wide">
                {cat.items.length} services available
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES GRID */}
      <section className="py-20 bg-cream-grad">
        <div className="container mx-auto px-4">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cat.items.map((s: { name: string; price?: string }, i: number) => (
              <article
                key={s.name}
                className="group rounded-2xl bg-card border border-border p-6 shadow-card hover-lift animate-fade-up"
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 grid place-items-center rounded-xl bg-pine/10 text-pine-deep shrink-0">
                    <Check className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-pine-deep leading-snug">{s.name}</h3>
                    {s.price && (
                      <p className="mt-1 text-sm font-medium text-pine">{s.price}</p>
                    )}
                  </div>
                </div>
                <div className="mt-5 flex flex-col gap-2">
                  <Link
                    to="/request/$category/$service"
                    params={{ category: cat.slug, service: encodeURIComponent(s.name) }}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-hero text-cream text-sm font-semibold px-4 py-2.5 shadow-luxury hover:shadow-glow transition"
                  >
                    Request Service <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a
                    href={enquire(s.name)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-border text-pine-deep text-sm font-semibold px-4 py-2.5 hover:bg-muted transition"
                  >
                    <MessageCircle className="h-4 w-4" /> Enquire on WhatsApp
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* OTHER CATEGORIES */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-pine">Explore More</div>
            <h2 className="mt-3 font-display text-3xl md:text-4xl text-pine-deep">
              Other Prince Groups categories
            </h2>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICE_CATEGORIES.filter((c) => c.slug !== cat.slug).map((c) => {
              const CIcon = c.icon;
              return (
                <Link
                  key={c.slug}
                  to="/services/$category"
                  params={{ category: c.slug }}
                  className="group rounded-2xl bg-card border border-border p-6 shadow-card hover-lift flex items-center gap-4"
                >
                  <div className="h-12 w-12 grid place-items-center rounded-xl bg-pine-deep text-cream">
                    <CIcon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-pine-deep">{c.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.items.length} services</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-pine group-hover:translate-x-1 transition" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="relative rounded-3xl bg-pine-deep text-cream p-10 md:p-14 text-center overflow-hidden">
            <div className="absolute inset-0 bg-radial-luxe opacity-40" />
            <div className="relative">
              <h2 className="font-display text-3xl md:text-5xl">Need help choosing the right service?</h2>
              <p className="mt-4 text-white/85 max-w-xl mx-auto">
                Talk to a Prince Groups specialist — we'll guide you to the best option for your need.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <a
                  href={`https://wa.me/${WHATSAPP}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-cream text-pine-deep px-7 py-3.5 font-semibold shadow-glow hover:scale-105 transition"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp Us
                </a>
                <a
                  href="tel:9559155535"
                  className="inline-flex items-center gap-2 rounded-full glass-dark text-white px-7 py-3.5 font-semibold hover:bg-white/15 transition"
                >
                  <Phone className="h-4 w-4" /> 9559155535
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
