import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Crown, X, Check } from "lucide-react";

const STORAGE_KEY = "dko_club_promo_dismissed";

const BENEFITS = [
  "Behind-the-scenes videos",
  "Extra clips & footage",
  "Exclusive premium content",
  "Ad-free browsing",
];

export default function DkoClubPromo() {
  const [isMember, setIsMember] = useState(false);
  const [checking, setChecking] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") { setDismissed(true); setChecking(false); return; }
    } catch {}
    base44.auth.isAuthenticated().then(async (authed) => {
      if (!authed) { setIsMember(false); setChecking(false); return; }
      try {
        const me = await base44.auth.me();
        const [byEmail, byId] = await Promise.all([
          base44.entities.UserSubscription.filter({ user_email: me.email, status: "active" }),
          base44.entities.UserSubscription.filter({ user_id: me.id, status: "active" }),
        ]);
        setIsMember(byEmail.length > 0 || byId.length > 0);
      } catch {
        setIsMember(false);
      }
      setChecking(false);
    }).catch(() => setChecking(false));
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    setDismissed(true);
  };

  if (checking || isMember || dismissed) return null;

  return (
    <div className="relative my-8 rounded-xl border border-accent/30 bg-gradient-to-br from-accent/10 to-primary/5 p-5 sm:p-6">
      <button onClick={dismiss} className="absolute top-3 right-3 text-muted-foreground hover:text-white transition-colors" aria-label="Dismiss">
        <X className="w-4 h-4" />
      </button>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 pr-6">
        <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
          <Crown className="w-6 h-6 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-oswald font-bold text-white text-lg uppercase mb-1">Join DKO Club</h3>
          <p className="text-muted-foreground font-inter text-sm mb-2">Unlock the full DKO experience:</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {BENEFITS.map(b => (
              <li key={b} className="flex items-center gap-1.5 text-foreground font-inter text-xs">
                <Check className="w-3.5 h-3.5 text-accent shrink-0" /> {b}
              </li>
            ))}
          </ul>
        </div>
        <Link to="/pricing" className="shrink-0 inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary text-white font-oswald font-semibold text-sm tracking-wider uppercase rounded hover:bg-red-700 transition-colors">
          <Crown className="w-4 h-4" /> Join Now
        </Link>
      </div>
    </div>
  );
}