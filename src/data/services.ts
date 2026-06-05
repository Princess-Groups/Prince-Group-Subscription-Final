import { FileText, Megaphone, Ticket, Music } from "lucide-react";

export type ServiceItem = { name: string; price?: string };

export type ServiceCategory = {
  slug: "document-registration" | "digital-marketing" | "concert-tickets" | "concert-advertising";
  title: string;
  short: string;
  tagline: string;
  icon: typeof FileText;
  accent: "pine" | "avocado" | "gold" | "cream";
  items: ServiceItem[];
};

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    slug: "document-registration",
    title: "Document Registration",
    short: "Document Registration",
    tagline: "End-to-end legal documentation & registration support.",
    icon: FileText,
    accent: "pine",
    items: [
      { name: "House Loan Estimate", price: "Starting from ₹1,500" },
      { name: "Patta & Chitta", price: "Starting from ₹1,000" },
      { name: "Document Copy", price: "Starting from ₹600" },
      { name: "Encumbrance Certificate", price: "Starting from ₹700" },
      { name: "Rental Contract Agreement (Unregistered)", price: "Starting from ₹250" },
      { name: "Home Loan Assistance", price: "0% Charges" },
      { name: "Rectification Deed", price: "Starting from ₹1,500" },
      { name: "Lease Agreement", price: "Starting from ₹1,000" },
      { name: "Partition Deed", price: "Starting from ₹2,500" },
      { name: "Cancellation Deed", price: "Starting from ₹1,300" },
      { name: "General Power of Attorney", price: "Starting from ₹2,500" },
      { name: "Agreement Deed", price: "Starting from ₹2,000" },
      { name: "Receipt Document", price: "Starting from ₹1,300" },
      { name: "Mortgage Deed", price: "Starting from ₹1,000" },
      { name: "Will Deed", price: "Starting from ₹1,500" },
      { name: "Release Deed", price: "Starting from ₹2,500" },
      { name: "Registered Rental Agreement", price: "Starting from ₹1,000" },
    ],
  },
  {
    slug: "digital-marketing",
    title: "Digital Marketing",
    short: "Digital Marketing",
    tagline: "Grow your brand with SEO, ads, content & creative production.",
    icon: Megaphone,
    accent: "avocado",
    items: [
      { name: "SEO (Basic Package)" },
      { name: "SEO (Advanced Package)" },
      { name: "Meta Ads Management" },
      { name: "Google Ads Management" },
      { name: "Social Media Page Maintenance" },
      { name: "Instagram Marketing" },
      { name: "Facebook Marketing" },
      { name: "Reels Creation" },
      { name: "Advertisement Creation" },
      { name: "Logo Designing" },
      { name: "Animation Videos" },
      { name: "Graphic Designing" },
      { name: "Promotional Video Shoots" },
      { name: "Views Increasing Services" },
      { name: "Followers Increasing Services" },
      { name: "Website Creation" },
      { name: "App Creation" },
      { name: "App Development" },
      { name: "Automation Management" },
      { name: "Ecommerce Page Creation" },
      { name: "Ecommerce Website Creation" },
      { name: "Landing Page Creation" },
    ],
  },
  {
    slug: "concert-tickets",
    title: "Concert Tickets",
    short: "Concert Tickets",
    tagline: "Member pricing on every tier — from Silver to VVIP.",
    icon: Ticket,
    accent: "gold",
    items: [
      { name: "VIP Tickets" },
      { name: "VVIP Tickets" },
      { name: "Fan Pit Tickets" },
      { name: "Elite Tickets" },
      { name: "Gold Tickets" },
      { name: "Silver Tickets" },
    ],
  },
  {
    slug: "concert-advertising",
    title: "Concert Advertising",
    short: "Concert Advertising",
    tagline: "Put your brand in front of thousands of live attendees.",
    icon: Music,
    accent: "cream",
    items: [
      { name: "Sponsor Announcement" },
      { name: "VIP Entry Branding" },
      { name: "Award Presentation Sponsorship" },
      { name: "Banner Advertisement" },
      { name: "Stall Allocation" },
      { name: "Canvassing Areas Promotion" },
      { name: "LED Projection Advertising" },
      { name: "Logo Advertising" },
      { name: "Red Carpet Entries Branding" },
      { name: "Partnership Opportunities" },
      { name: "Video Promotion" },
      { name: "Reach Enhancement Campaigns" },
    ],
  },
];

export function getCategory(slug: string) {
  return SERVICE_CATEGORIES.find((c) => c.slug === slug);
}
