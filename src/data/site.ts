export const PHONES = ["9559155535", "9344380178"] as const;
export const WHATSAPP = "919559155535";
export const TAGLINE = "THE ONE BRAND ALL YOUR NEEDS";

const COMMON_INCLUDED = [
  "All Document Registration",
  "Digital Marketing",
  "Music Concert",
  "Concert Advertising",
  "Subscribers will get referral income from Prince Groups.",
] as const;

export const PLANS = [
  {
    id: "starter",
    name: "₹1 Plan",
    price: 1,
    tagline: "Get started with everyday savings",
    cta: "Join ₹1 Plan",
    discount: "25% Offer on All Services",
    features: [
      "25% offer on all services",
      ...COMMON_INCLUDED,
      "Daily autopay ₹1",
    ],
    highlight: false,
  },
  {
    id: "popular",
    name: "₹10 Plan",
    price: 10,
    tagline: "Most chosen — better savings every day",
    cta: "Join ₹10 Plan",
    discount: "50% Offer on All Services",
    features: [
      "50% offer on all services",
      ...COMMON_INCLUDED,
      "Priority response support",
      "Daily autopay ₹10",
    ],
    highlight: true,
  },
  {
    id: "premium",
    name: "₹100 Plan",
    price: 100,
    tagline: "Maximum savings for premium members",
    cta: "Join ₹100 Plan",
    discount: "75% Offer on All Services",
    features: [
      "75% offer on all services",
      ...COMMON_INCLUDED,
      "VIP priority service",
      "Daily autopay ₹100",
    ],
    highlight: false,
  },
] as const;

export type PlanId = (typeof PLANS)[number]["id"];

export const EARNINGS = [
  {
    title: "Prince Group Commission",
    desc: "Earn commission on every successful service introduced through your network.",
  },
  {
    title: "MLM Earnings",
    desc: "Build a referral team and earn multi-level rewards from active subscribers.",
  },
  {
    title: "Insurance Commissions",
    desc: "Get paid for every car, vehicle and other insurance policy referred via Prince Groups.",
  },
] as const;

export const INSURANCE = [
  { title: "Car Insurance", desc: "Best-in-class policies with member-only pricing." },
  { title: "Vehicle Insurance", desc: "Two-wheeler, commercial & private vehicle cover." },
  { title: "Service Support", desc: "Claim assistance and renewal reminders included." },
  { title: "Other Insurance Offers", desc: "Health, home and business insurance partners." },
] as const;
