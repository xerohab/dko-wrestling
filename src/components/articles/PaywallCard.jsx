import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Lock, Crown, Loader2, Star, LogIn } from "lucide-react";

export default function PaywallCard() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [pendingPlan, setPendingPlan] = useState(null);

  useEffect(() => {
    base44.entities.SubscriptionPlan
      .filter({ is_active: true, grants_paywall_access: true }, "sort_order", 10)
      .then(setPlans)
      .catch(() => {})
      .finally(() => setLoading(false));
    base44.auth.isAuthenticated().then(async (authed) => {
      if (authed) setUser(await base44.auth.me());
    });
  }, []);

  const handleSubscribe = (plan) => {
    if (!user) {
      base44.auth.redirectToLogin(window.location.pathname);
      return;
    }
    if (!plan.paypal_plan_id) {
      alert("Subscription payments are not yet set up for this plan. Please contact us to subscribe.");
      return;
    }
    window.open(`https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=${plan.paypal_plan_id}`, "_blank");
    setPendingPlan(plan.id);
  };

  return (
    <div className="relative">
      {/* Blurred placeholder with gradient fade hinting at hidden content */}
      <div className="relative overflow-hidden rounded-xl mb-4 select-none pointer-events-none" aria-hidden="true">
        <div className="blur-sm opacity-50 space-y-3 px-1">
          <div className="h-4 bg-secondary rounded w-full" />
          <div className="h-4 bg-secondary rounded w-11/12" />
          <div className="h-4 bg-secondary rounded w-4/5" />
          <div className="h-4 bg-secondary rounded w-full" />
          <div className="h-4 bg-secondary rounded w-3/4" />
          <div className="h-4 bg-secondary rounded w-5/6" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background" />
      </div>

      {/* Paywall card */}
      <div className="bg-card border-2 border-accent/40 rounded-xl p-6 sm:p-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent/10 border border-accent/40 mb-4">
          <Lock className="w-7 h-7 text-accent" />
        </div>
        <h2 className="font-oswald font-bold text-white text-2xl uppercase tracking-wide mb-2">Premium Content</h2>
        <p className="text-muted-foreground font-inter text-sm mb-6 max-w-md mx-auto">
          This article is locked for members. Subscribe to a plan below to unlock this and all other premium content.
        </p>

        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 text-accent animate-spin" /></div>
        ) : plans.length === 0 ? (
          <p className="text-muted-foreground font-inter text-sm">Premium plans are coming soon. Check back shortly.</p>
        ) : (
          <div className={`grid gap-3 ${plans.length === 1 ? "max-w-xs mx-auto" : "grid-cols-1 sm:grid-cols-2"}`}>
            {plans.map(plan => (
              <div key={plan.id} className={`bg-secondary/50 border rounded-lg p-4 text-left flex flex-col ${plan.highlight ? "border-accent" : "border-border"}`}>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-oswald font-bold text-white text-base uppercase">{plan.name}</h3>
                  {plan.highlight && <Star className="w-4 h-4 text-accent" />}
                </div>
                {plan.description && <p className="text-muted-foreground font-inter text-xs mb-2">{plan.description}</p>}
                <div className="mb-3">
                  <span className="font-oswald font-bold text-2xl text-accent">£{plan.price}</span>
                  <span className="text-muted-foreground font-inter text-xs">/{plan.interval}</span>
                </div>
                <button
                  onClick={() => handleSubscribe(plan)}
                  className="mt-auto w-full py-2.5 bg-accent text-black font-oswald font-bold text-sm uppercase tracking-wider rounded hover:brightness-110 transition-all flex items-center justify-center gap-2"
                >
                  <Crown className="w-4 h-4" /> Subscribe to Unlock
                </button>
              </div>
            ))}
          </div>
        )}

        {pendingPlan && (
          <div className="mt-5 bg-accent/10 border border-accent/30 rounded-lg p-3 text-sm font-inter text-accent">
            <p className="mb-2">Complete your payment in the PayPal window, then click below once your subscription is active.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-accent text-black font-oswald font-bold text-xs uppercase rounded hover:brightness-110 transition-all"
            >
              I've Subscribed — Unlock
            </button>
          </div>
        )}

        {!user && !pendingPlan && (
          <p className="text-muted-foreground font-inter text-xs mt-4 flex items-center justify-center gap-1.5">
            <LogIn className="w-3.5 h-3.5" /> You'll be asked to log in before subscribing.
          </p>
        )}
      </div>
    </div>
  );
}