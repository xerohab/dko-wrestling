import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PublicNav from "@/components/layout/PublicNav";
import { Check, Crown, Loader2, Star, RefreshCw } from "lucide-react";

export default function Pricing() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [rates, setRates] = useState(null);
  const [ratesDate, setRatesDate] = useState(null);
  const [ratesLoading, setRatesLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.SubscriptionPlan.filter({ is_active: true }, "sort_order", 10),
    ]).then(([p]) => {
      // Hide hidden plans from public pricing
      setPlans(p.filter(pl => !pl.is_hidden));
      setLoading(false);
    });
    base44.auth.isAuthenticated().then(async authed => {
      if (authed) {
        const me = await base44.auth.me();
        setUser(me);
        const subs = await base44.entities.UserSubscription.filter({ user_email: me.email, status: "active" });
        if (subs.length) setSubscription(subs[0]);
      }
    });
    fetchRates();
  }, []);

  // Fetch live GBP→USD/EUR exchange rates every time the page loads
  const fetchRates = async () => {
    setRatesLoading(true);
    try {
      const res = await fetch("https://api.frankfurter.app/latest?from=GBP&to=USD,EUR");
      const data = await res.json();
      if (data?.rates) {
        setRates({ USD: data.rates.USD, EUR: data.rates.EUR });
        setRatesDate(data.date);
      }
    } catch {
      // Fallback static rates if API fails
      setRates({ USD: 1.27, EUR: 1.17 });
      setRatesDate(null);
    } finally {
      setRatesLoading(false);
    }
  };

  const fmtPrice = (gbp, currency) => {
    if (!rates || !rates[currency]) return null;
    const converted = gbp * rates[currency];
    const symbol = currency === "USD" ? "$" : "€";
    // Round to nearest sensible amount for display
    const rounded = converted >= 10 ? Math.round(converted * 100) / 100 : Math.round(converted * 100) / 100;
    return `${symbol}${rounded.toFixed(2)}`;
  };

  const handleSubscribe = (plan) => {
    if (!user) {
      base44.auth.redirectToLogin("/pricing");
      return;
    }
    if (plan.interval === "one_time") {
      alert("This is a staff-assigned plan. Please contact us to apply it to your account.");
      return;
    }
    if (!plan.paypal_plan_id) {
      alert("Subscription payments are not yet set up. Please contact us to subscribe.");
      return;
    }
    // Redirect to PayPal
    window.open(`https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=${plan.paypal_plan_id}`, "_blank");
  };

  const intervalLabel = (interval) => {
    if (interval === "one_time") return "one-time";
    return `/${interval}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <main className="max-w-5xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/30 text-accent font-oswald text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-4">
            <Crown className="w-3.5 h-3.5" /> Membership Plans
          </div>
          <h1 className="font-oswald font-bold text-white text-4xl md:text-5xl uppercase leading-tight mb-4">
            Join <span className="text-primary">DKO Club</span>
          </h1>
          <p className="text-muted-foreground font-inter text-lg max-w-xl mx-auto mb-6">
            Get exclusive access, ad-free experience, and support your favourite wrestling news platform.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto">
            {[
              "Behind-the-scenes videos from our shows",
              "Extra clips & exclusive footage",
              "Exclusive premium content",
              "Ad-free browsing",
            ].map(b => (
              <span key={b} className="inline-flex items-center gap-1.5 bg-secondary/60 border border-border text-foreground font-inter text-xs px-3 py-1.5 rounded-full">
                <Check className="w-3.5 h-3.5 text-accent" /> {b}
              </span>
            ))}
          </div>

          {/* Exchange rate indicator */}
          <div className="inline-flex items-center gap-2 mt-6 text-muted-foreground font-inter text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${ratesLoading ? "animate-spin text-accent" : "text-accent"}`} />
            {ratesLoading ? (
              "Fetching live exchange rates…"
            ) : rates ? (
              <>
                Live rates{ratesDate ? ` · ${new Date(ratesDate).toLocaleDateString("en-GB")}` : ""}: 
                <span className="text-accent font-semibold">£1 = ${rates.USD?.toFixed(2)} / €{rates.EUR?.toFixed(2)}</span>
              </>
            ) : (
              "Exchange rates unavailable"
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>
        ) : plans.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground font-inter">No plans available yet. Check back soon!</div>
        ) : (
          <div className={`grid gap-6 ${plans.length === 1 ? "max-w-sm mx-auto" : plans.length === 2 ? "grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
            {plans.map(plan => {
              const isSubscribed = subscription?.plan_id === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`relative bg-card rounded-2xl p-7 flex flex-col border-2 transition-all ${
                    plan.highlight
                      ? "border-accent shadow-2xl shadow-accent/10 scale-105"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-accent text-black font-oswald font-bold text-xs px-4 py-1 rounded-full uppercase tracking-wider">
                      <Star className="w-3 h-3" /> Most Popular
                    </div>
                  )}

                  <div className="mb-5">
                    <h3 className="font-oswald font-bold text-white text-xl uppercase mb-1">{plan.name}</h3>
                    {plan.description && <p className="text-muted-foreground font-inter text-sm">{plan.description}</p>}
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className={`font-oswald font-bold text-4xl ${plan.highlight ? "text-accent" : "text-white"}`}>
                        £{plan.price}
                      </span>
                      <span className="text-muted-foreground font-inter text-sm">{intervalLabel(plan.interval)}</span>
                    </div>
                    {/* Converted currency prices */}
                    {rates && (
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground font-inter text-xs">
                        {fmtPrice(plan.price, "USD") && (
                          <span>{fmtPrice(plan.price, "USD")} {intervalLabel(plan.interval)}</span>
                        )}
                        {fmtPrice(plan.price, "EUR") && (
                          <span className="text-muted-foreground/70">· {fmtPrice(plan.price, "EUR")} {intervalLabel(plan.interval)}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {plan.features?.length > 0 && (
                    <ul className="space-y-2.5 mb-8 flex-1">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-foreground font-inter text-sm">
                          <Check className={`w-4 h-4 shrink-0 mt-0.5 ${plan.highlight ? "text-accent" : "text-primary"}`} />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}

                  <button
                    onClick={() => !isSubscribed && handleSubscribe(plan)}
                    className={`w-full py-3 font-oswald font-bold text-sm tracking-wider uppercase rounded-lg transition-all ${
                      isSubscribed
                        ? "bg-green-500/10 text-green-400 border border-green-500/30 cursor-default"
                        : plan.highlight
                        ? "bg-accent text-black hover:brightness-110"
                        : "bg-primary text-white hover:bg-red-700"
                    }`}
                  >
                    {isSubscribed ? "✓ Current Plan" : "Subscribe via PayPal"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-muted-foreground font-inter text-xs mt-10">
          Secure payments powered by PayPal. Cancel anytime.
        </p>
        <p className="text-center text-muted-foreground/70 font-inter text-xs mt-2">
          All DKO Club membership payments are non-refundable. Cancel anytime and you'll keep access until the end of your billing period.
        </p>
      </main>
    </div>
  );
}