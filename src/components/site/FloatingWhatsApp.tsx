import { MessageCircle } from "lucide-react";

export function FloatingWhatsApp() {
  const href = "https://wa.me/919559155535?text=" + encodeURIComponent("Hello PRINCE GROUP, I'd like to know more about your subscription services.");
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="WhatsApp Support"
      className="fixed bottom-6 right-6 z-50 group"
    >
      <span className="absolute inset-0 rounded-full bg-avocado animate-ping opacity-30" />
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[oklch(0.7_0.18_145)] text-white shadow-luxury group-hover:scale-110 transition-transform">
        <MessageCircle className="h-6 w-6" />
      </span>
    </a>
  );
}
