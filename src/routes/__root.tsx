import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Prince Groups — THE ONE BRAND ALL YOUR NEEDS" },
      { name: "description", content: "Daily subscription plans from ₹1. Up to 75% off documentation, marketing, concert tickets and insurance. Earn through commissions, MLM and partnerships." },
      { name: "author", content: "Prince Groups" },
      { property: "og:title", content: "Prince Groups — THE ONE BRAND ALL YOUR NEEDS" },
      { property: "og:description", content: "Daily subscription plans from ₹1. Up to 75% off documentation, marketing, concert tickets and insurance. Earn through commissions, MLM and partnerships." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Prince Groups — THE ONE BRAND ALL YOUR NEEDS" },
      { name: "twitter:description", content: "Daily subscription plans from ₹1. Up to 75% off documentation, marketing, concert tickets and insurance. Earn through commissions, MLM and partnerships." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/997d4b73-35b2-4eaf-9869-dfaf7dd86fb7/id-preview-596af8fa--65b89818-eb64-4a7c-ae77-6a77050b3103.lovable.app-1777549733220.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/997d4b73-35b2-4eaf-9869-dfaf7dd86fb7/id-preview-596af8fa--65b89818-eb64-4a7c-ae77-6a77050b3103.lovable.app-1777549733220.png" },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}
