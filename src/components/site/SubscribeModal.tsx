import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { PLANS, type PlanId } from "@/data/site";
import { useNavigate } from "@tanstack/react-router";
import { X, Check, Loader2, Sparkles, LogIn, UserPlus, RefreshCw, XCircle, User, Phone, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { api } from "@/lib/api";

type Step = "auth" | "pay" | "success" | "upgrade";
type AuthMode = "login" | "register";
type Ctx = { open: (plan: PlanId) => void };
const SubCtx = createContext<Ctx | null>(null);

export const useSubscribe = () => {
  const c = useContext(SubCtx);
  if (!c) throw new Error("SubscribeProvider missing");
  return c;
};

declare global {
  interface Window { Razorpay?: any; }
}

type RazorpayOrderResponse = {
  keyId: string;
  subscriptionId?: string;
  orderId: string;
  amount: number;
  currency: string;
  planName: string;
  description: string;
  isSubscription?: boolean;
};

type Subscription = {
  id: string;
  plan_id: string;
  status: string;
  razorpay_subscription_id: string;
  current_start: string;
  current_end: string;
  next_charge_at: string;
  paid_count: number;
};

export function SubscribeProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [planId, setPlanId] = useState<PlanId | null>(null);
  const [step, setStep] = useState<Step>("auth");
  const [authMode, setAuthMode] = useState<AuthMode>("login");

  // Form fields
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; name?: string; email?: string } | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  // Prevent duplicate signup calls
  const signupInFlightRef = useRef(false);
  // Tracks that we are in an upgrade flow — so the Razorpay handler knows to cancel the old sub
  const upgradeInFlightRef = useRef(false);

  const plan = PLANS.find((p) => p.id === planId);

  // ── SESSION RESTORE ───────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        const u = data.session.user;
        setUser({ id: u.id, name: u.user_metadata?.full_name || "", email: u.email || "" });
        loadSubscription(u.id);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const u = session.user;
        setUser({ id: u.id, name: u.user_metadata?.full_name || "", email: u.email || "" });
        loadSubscription(u.id);
      } else {
        setUser(null);
        setSubscription(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []); // run once only

  // When user state is set while modal is on auth step → advance to pay
  useEffect(() => {
    if (user && planId && step === "auth") {
      setStep("pay");
    }
  }, [user, planId, step]);

  // If subscription loads while modal is on pay step → advance based on plan match
  useEffect(() => {
    if (subscription && planId && step === "pay") {
      setStep(subscription.plan_id === planId ? "success" : "upgrade");
    }
  }, [subscription, planId, step]);

  const loadSubscription = async (userId: string) => {
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (data) setSubscription(data);
  };

  // ── OPEN / CLOSE ──────────────────────────────────────────────────────
  const open = useCallback((id: PlanId) => {
    setPlanId(id);
    setError(null);
    if (subscription) {
      // Same plan → already subscribed; different plan → upgrade
      setStep(subscription.plan_id === id ? "success" : "upgrade");
    } else {
      setStep(user ? "pay" : "auth");
    }
    if (!user) setAuthMode("login");
  }, [user, subscription]);

  const close = () => {
    setPlanId(null);
    setStep("auth");
    setAuthMode("login");
    setEmail("");
    setMobile("");
    setPassword("");
    setFullName("");
    setError(null);
    signupInFlightRef.current = false;
  };

  // ── CANCEL SUBSCRIPTION ───────────────────────────────────────────────
  const handleCancelSubscription = async () => {
    if (!subscription?.razorpay_subscription_id) return;
    setLoading(true);
    setError(null);
    try {
      const { error: cancelErr } = await api.cancelSubscription({
        subscriptionId: subscription.id,
        razorpaySubscriptionId: subscription.razorpay_subscription_id,
      });
      if (cancelErr) throw new Error(cancelErr.message);
      setSubscription(null);
      setError("Subscription cancelled. You can reactivate anytime.");
    } catch (err) {
      setError((err as Error).message || "Failed to cancel subscription");
    } finally {
      setLoading(false);
    }
  };

  // ── AUTH ──────────────────────────────────────────────────────────────
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // hard guard

    if (!email.trim() || !email.includes("@")) { setError("Enter a valid email address"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (authMode === "register") {
      if (!fullName.trim()) { setError("Please enter your full name"); return; }
      if (mobile && mobile.length !== 10) { setError("Enter a valid 10-digit mobile number"); return; }
    }

    setLoading(true);
    setError(null);

    try {
      if (authMode === "login") {
        const { error: loginErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (loginErr) {
          if (loginErr.message?.toLowerCase().includes("invalid")) {
            setAuthMode("register");
            setError("No account found. Enter your name below to create one.");
            return;
          }
          throw loginErr;
        }
        // user state will be set by onAuthStateChange → useEffect will advance to pay

      } else {
        // Prevent duplicate signup
        if (signupInFlightRef.current) {
          setError("Signup already in progress. Please wait.");
          return;
        }
        signupInFlightRef.current = true;

        const { error: regErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName.trim(), phone: mobile },
          },
        });

        if (regErr) {
          signupInFlightRef.current = false;
          if (regErr.message?.toLowerCase().includes("already")) {
            setAuthMode("login");
            setError("Account already exists. Sign in instead.");
            return;
          }
          throw regErr;
        }

        // Supabase may auto-confirm (if email confirm is off) or require confirmation.
        // Either way onAuthStateChange fires → useEffect advances to pay.
        signupInFlightRef.current = false;
      }
    } catch (err) {
      signupInFlightRef.current = false;
      setError((err as Error).message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── PAYMENT ───────────────────────────────────────────────────────────
  const loadRazorpay = () =>
    new Promise<void>((resolve, reject) => {
      if (window.Razorpay) return resolve();
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
      document.body.appendChild(s);
    });

  // Plan config — must match backend PLANS in api/[route].ts exactly
  // amounts in paise (₹30 = 3000 paise, ₹300 = 30000, ₹3000 = 300000)
  const PLAN_CONFIG: Record<string, { amount: number; name: string; description: string }> = {
    starter: { amount: 3000,   name: "₹1 Plan",   description: "Starter – ₹30/month subscription" },
    popular: { amount: 30000,  name: "₹10 Plan",  description: "Popular – ₹300/month subscription" },
    premium: { amount: 300000, name: "₹100 Plan", description: "Premium – ₹3000/month subscription" },
  };

  const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;
  if (!RAZORPAY_KEY_ID) {
    console.error("VITE_RAZORPAY_KEY_ID is not set — payment will fail");
  }

  const startPayment = async () => {
    if (!plan || !user || loading) return;
    // Guard: don't let already-subscribed users pay again
    if (subscription) {
      if (subscription.plan_id === planId) {
        setStep("success");
        return;
      }
      // Upgrade flow: mark upgrade, but DON'T cancel old sub yet.
      // Wait for successful payment in the Razorpay handler.
      upgradeInFlightRef.current = true;
    }
    setLoading(true);
    setError(null);

    try {
      await loadRazorpay();

      const planConfig = PLAN_CONFIG[planId!];
      if (!planConfig) throw new Error("Invalid plan selected");

      const displayName = user.name || fullName || "Member";
      const displayMobile = mobile || "";
      const displayEmail = user.email || email || "";

      const rzpOptions: Record<string, any> = {
        key: RAZORPAY_KEY_ID,
        amount: planConfig.amount,          // amount in paise
        currency: "INR",
        name: "Prince Groups",
        description: planConfig.description,
        prefill: {
          name: displayName,
          contact: displayMobile,
          email: displayEmail,
        },
        theme: { color: "#0f766e" },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setError(null); // User closed the modal intentionally, don't show error
          },
        },
        handler: async (response: any) => {
          try {
            // STEP 1: Verify Razorpay signature first (security check)
            const { error: confirmErr } = await api.confirmRazorpayPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (confirmErr) {
              console.error("Payment verification error:", confirmErr);
              throw new Error("Payment verification failed. Your payment was successful. Please contact support with your payment ID: " + response.razorpay_payment_id);
            }

            // STEP 2: If upgrading, cancel old subscription (best-effort, don't block)
            if (upgradeInFlightRef.current && subscription?.razorpay_subscription_id) {
              const { error: cancelErr } = await api.cancelSubscription({
                subscriptionId: subscription.id,
                razorpaySubscriptionId: subscription.razorpay_subscription_id,
              });
              if (cancelErr) {
                // Log but don't fail — new subscription is active, old one will auto-expire
                console.error("Failed to cancel old subscription during upgrade:", cancelErr.message);
              }
              upgradeInFlightRef.current = false;
            }

            // STEP 3: Save payment to DB via API worker (also sends email server-side)
            // The backend has idempotency — safe to retry if network fails
            let saveData = null;
            let saveErr = null;
            for (let attempt = 0; attempt < 2; attempt++) {
              const result = await api.savePayment({
                userId: user.id,
                planId,
                planName: plan.name,
                razorpaySubscriptionId: response.razorpay_subscription_id || null,
                razorpayOrderId: response.razorpay_order_id || null,
                razorpayPaymentId: response.razorpay_payment_id,
                amount: planConfig.amount,
                username: displayName,
                mobile: displayMobile,
                email: displayEmail,
              });
              saveData = result.data;
              saveErr = result.error;
              if (!saveErr) break;
              // Wait 1s before retry
              await new Promise(r => setTimeout(r, 1000));
            }
            if (saveErr) {
              // Payment was verified but DB save failed — tell user to contact support
              throw new Error("Payment verified but we couldn't save your subscription. Your payment ID: " + response.razorpay_payment_id + ". Please contact support — we will fix this immediately.");
            }
            const subId = saveData?.subscriptionId || response.razorpay_payment_id;

            // STEP 4: Reload subscription record and show success
            setSubscription(null); // clear cached so loadSubscription fetches the new one
            await loadSubscription(user.id);
            setStep("success");

            // STEP 5: Auto-redirect to services page after 2 seconds
            setTimeout(() => {
              close();
              navigate({ to: "/my-services" });
            }, 2000);
          } catch (err) {
            setError((err as Error).message || "Payment verification failed");
          } finally {
            setLoading(false);
          }
        },
      };

      new window.Razorpay(rzpOptions).open();
    } catch (err) {
      setError((err as Error).message || "Failed to start payment");
      setLoading(false);
    }
  };


  // ── RENDER ────────────────────────────────────────────────────────────
  return (
    <SubCtx.Provider value={{ open }}>
      {children}
      {plan && (
        <div className="fixed inset-0 z-[100] grid place-items-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-pine-deep/70 backdrop-blur-sm" onClick={close} />
          <div className="relative w-full max-w-md rounded-3xl bg-card shadow-luxury border border-border overflow-hidden animate-fade-up">
            <div className="absolute inset-x-0 top-0 h-1 bg-gold shimmer-gold" />
            <button onClick={close} className="absolute top-4 right-4 h-9 w-9 grid place-items-center rounded-full hover:bg-muted">
              <X className="h-4 w-4" />
            </button>

            <div className="p-7">
              {/* Plan badge */}
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-avocado">
                <Sparkles className="h-3.5 w-3.5" /> {plan.name}
              </div>

              {/* Step title */}
              <h3 className="mt-2 font-display text-2xl text-pine-deep">
                {step === "auth" && (authMode === "login" ? "Sign in to continue" : "Create your account")}
                {step === "pay" && "Confirm & activate auto-pay"}
                {step === "success" && "Membership activated! 🎉"}
                {step === "upgrade" && "Upgrade your membership"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {step === "auth" && `${plan.name} · ₹${plan.price}/day · Cancel anytime`}
                {step === "pay" && `₹${plan.price}/day auto-pay via Razorpay. Cancel anytime.`}
                {step === "success" && "Your auto-pay membership is now live."}
                {step === "upgrade" && `Move from ${PLANS.find(p => p.id === subscription?.plan_id)?.name || "current"} to ${plan.name} · ₹${plan.price}/day`}
              </p>

              {/* ── STEP 1: AUTH ── */}
              {step === "auth" && (
                <form onSubmit={handleAuth} className="mt-6 space-y-4">
                  {/* Toggle */}
                  <div className="flex rounded-xl overflow-hidden border border-border text-sm font-semibold">
                    <button type="button"
                      onClick={() => { setAuthMode("login"); setError(null); }}
                      className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition ${authMode === "login" ? "bg-hero text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                    >
                      <LogIn className="h-3.5 w-3.5" /> Sign In
                    </button>
                    <button type="button"
                      onClick={() => { setAuthMode("register"); setError(null); }}
                      className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition ${authMode === "register" ? "bg-hero text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                    >
                      <UserPlus className="h-3.5 w-3.5" /> New Account
                    </button>
                  </div>

                  {/* Email */}
                  <Field label="Email Address">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input required type="email" value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputCls + " pl-9"} placeholder="your@gmail.com"
                      />
                    </div>
                  </Field>

                  {/* Full name — register only */}
                  {authMode === "register" && (
                    <Field label="Full Name">
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input required value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className={inputCls + " pl-9"} placeholder="Your full name"
                        />
                      </div>
                    </Field>
                  )}

                  {/* Mobile — register only */}
                  {authMode === "register" && (
                    <Field label="Mobile Number">
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input inputMode="numeric" maxLength={10} value={mobile}
                          onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                          className={inputCls + " pl-9"} placeholder="10-digit mobile number"
                        />
                      </div>
                    </Field>
                  )}

                  {/* Password */}
                  <Field label="Password">
                    <input required type="password" minLength={6} value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputCls}
                      placeholder={authMode === "login" ? "Your password" : "Create a password (min 6 chars)"}
                    />
                  </Field>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <button type="submit" disabled={loading}
                    className="w-full rounded-full bg-hero text-cream font-semibold py-3 shadow-luxury hover:shadow-glow transition disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loading
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Please wait…</>
                      : authMode === "login" ? "Sign In & Continue →" : "Create Account & Continue →"
                    }
                  </button>
                </form>
              )}

              {/* ── STEP 2: PAY ── */}
              {step === "pay" && (
                <div className="mt-6 space-y-4">
                  {/* Account details card */}
                  <div className="rounded-xl bg-pine-deep/5 border border-pine/20 p-4 space-y-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-pine-deep mb-2">Your Account</p>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-pine shrink-0" />
                      <span className="text-pine-deep font-medium">{user?.name || fullName || "Member"}</span>
                    </div>
                    {(user?.email || email) && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-pine shrink-0" />
                        <span className="text-muted-foreground">{user?.email || email}</span>
                      </div>
                    )}
                    {mobile && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-pine shrink-0" />
                        <span className="text-muted-foreground">+91 {mobile}</span>
                      </div>
                    )}
                  </div>

                  {/* Auto-pay badge */}
                  <div className="flex items-center justify-center gap-2 rounded-full bg-avocado/15 text-pine-deep px-4 py-2 text-sm font-semibold">
                    <RefreshCw className="h-4 w-4 text-pine" />
                    Auto-Pay · ₹{plan.price}/day
                  </div>

                  {/* Billing summary */}
                  <div className="rounded-xl bg-muted p-4 text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Plan</span>
                      <span className="font-semibold text-pine-deep">{plan.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Today's charge</span>
                      <span className="font-semibold text-pine-deep">₹{plan.price * 30} (1 month)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Then monthly</span>
                      <span className="font-semibold text-pine-deep">₹{plan.price * 30}/month</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="font-semibold text-avocado">{plan.discount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cancel</span>
                      <span className="text-pine-deep">Anytime</span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    Recurring payments processed securely by Razorpay. You can cancel anytime from your Razorpay account.
                  </p>

                  {error && <p className="text-sm text-destructive text-center">{error}</p>}

                  <button onClick={startPayment} disabled={loading}
                    className="w-full rounded-full bg-gold text-pine-deep font-bold py-3.5 shadow-glow hover:scale-[1.02] transition disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loading
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
                      : `Pay ₹${plan.price * 30} & Activate Auto-Pay →`
                    }
                  </button>
                </div>
              )}

              {/* ── STEP 3: UPGRADE ── */}
              {step === "upgrade" && subscription && (
                <div className="mt-6 space-y-4">
                  {/* Current plan card */}
                  <div className="rounded-xl border border-border bg-muted/50 p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Current Plan</p>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-pine-deep">{PLANS.find(p => p.id === subscription.plan_id)?.name || subscription.plan_id}</span>
                      <span className="text-xs text-muted-foreground">Auto-Pay ✅ Active</span>
                    </div>
                  </div>

                  {/* Arrow down */}
                  <div className="flex justify-center text-muted-foreground">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                  </div>

                  {/* New plan card */}
                  <div className="rounded-xl bg-gold/10 border border-gold/30 p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-gold mb-2">Upgrade To</p>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-pine-deep text-lg">{plan.name}</span>
                      <span className="text-sm font-bold text-gold">₹{plan.price}/day</span>
                    </div>
                  </div>

                  {/* Upgrade benefits */}
                  <div className="rounded-xl bg-muted p-4 text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">New discount</span>
                      <span className="font-semibold text-avocado">{plan.discount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Today's charge</span>
                      <span className="font-semibold text-pine-deep">₹{plan.price * 30} (1 month)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monthly after</span>
                      <span className="font-semibold text-pine-deep">₹{plan.price * 30}/month</span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    Your current subscription will be cancelled and replaced with the new plan.
                  </p>

                  {error && <p className="text-sm text-destructive text-center">{error}</p>}

                  <button onClick={startPayment} disabled={loading}
                    className="w-full rounded-full bg-gold text-pine-deep font-bold py-3.5 shadow-glow hover:scale-[1.02] transition disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loading
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
                      : `Upgrade to ${plan.name} · Pay ₹${plan.price * 30} →`
                    }
                  </button>

                  <button onClick={close}
                    className="w-full rounded-full border border-border text-muted-foreground font-semibold py-2.5 transition hover:bg-muted"
                  >
                    Keep Current Plan
                  </button>
                </div>
              )}

              {/* ── STEP 4: SUCCESS ── */}
              {step === "success" && (
                <div className="mt-6 text-center space-y-4">
                  <div className="mx-auto h-20 w-20 rounded-full bg-avocado/15 grid place-items-center animate-glow">
                    <Check className="h-10 w-10 text-avocado" />
                  </div>

                  {/* Account summary */}
                  <div className="rounded-xl bg-muted p-4 text-sm text-left space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Member</span>
                      <span className="font-semibold text-pine-deep">{user?.name || fullName || "Member"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Plan</span>
                      <span className="font-semibold text-pine-deep">{plan.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Auto-Pay</span>
                      <span className="font-semibold text-avocado">✅ Active</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Next charge</span>
                      <span className="text-pine-deep">In 30 days</span>
                    </div>
                    {subscription?.razorpay_subscription_id && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subscription ID</span>
                        <span className="text-xs text-muted-foreground font-mono truncate max-w-[140px]">
                          {subscription.razorpay_subscription_id}
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    A confirmation will be sent to your email. Welcome to Prince Groups!
                  </p>

                  <button
                    onClick={() => { close(); setTimeout(() => navigate({ to: "/my-services" }), 100); }}
                    className="w-full rounded-full bg-hero text-cream font-semibold py-3 shadow-luxury hover:shadow-glow transition"
                  >
                    Go to My Services →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </SubCtx.Provider>
  );
}

const inputCls = "w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
