import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PublicNav from "@/components/layout/PublicNav";
import { Crown, Check, Loader2, AlertCircle, LogIn } from "lucide-react";

export default function JoinLink() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // loading | success | error | unauthenticated
  const [planName, setPlanName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!code) { setStatus("error"); setErrorMsg("No invite code provided."); return; }
    redeem();
  }, [code]);

  const redeem = async () => {
    try {
      const authed = await base44.auth.isAuthenticated();
      if (!authed) {
        setStatus("unauthenticated");
        return;
      }
      const res = await base44.functions.invoke("redeemSubscriptionLink", { code });
      if (res.error) {
        setStatus("error");
        setErrorMsg(res.error);
      } else {
        setPlanName(res.plan_name || "DKO Club");
        setStatus("success");
      }
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || "Something went wrong.");
    }
  };

  const handleLoginRedirect = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="max-w-lg mx-auto px-4 py-20">
        {status === "loading" && (
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-accent animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground font-inter text-sm">Redeeming your invite link…</p>
          </div>
        )}

        {status === "success" && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 mb-6">
              <Check className="w-10 h-10 text-green-400" />
            </div>
            <h1 className="font-oswald font-bold text-white text-3xl uppercase mb-3">Welcome to DKO Club!</h1>
            <p className="text-muted-foreground font-inter text-base mb-2">
              Your <span className="text-accent font-semibold">{planName}</span> membership is now active.
            </p>
            <p className="text-muted-foreground font-inter text-sm mb-8">Enjoy your exclusive access to premium content.</p>
            <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-black font-oswald font-bold text-sm tracking-wider uppercase rounded hover:brightness-110 transition-colors">
              <Crown className="w-4 h-4" /> Start Reading
            </Link>
          </div>
        )}

        {status === "unauthenticated" && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent/10 border-2 border-accent/30 mb-6">
              <Crown className="w-10 h-10 text-accent" />
            </div>
            <h1 className="font-oswald font-bold text-white text-3xl uppercase mb-3">You're Invited!</h1>
            <p className="text-muted-foreground font-inter text-base mb-8">
              Log in or create an account to claim your free DKO Club membership.
            </p>
            <button onClick={handleLoginRedirect} className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-oswald font-bold text-sm tracking-wider uppercase rounded hover:bg-red-700 transition-colors">
              <LogIn className="w-4 h-4" /> Log In / Sign Up
            </button>
            <p className="text-muted-foreground font-inter text-xs mt-4">Your membership will be activated automatically after you log in.</p>
          </div>
        )}

        {status === "error" && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/30 mb-6">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="font-oswald font-bold text-white text-3xl uppercase mb-3">Link Invalid</h1>
            <p className="text-muted-foreground font-inter text-base mb-8">{errorMsg}</p>
            <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 bg-secondary border border-border text-white font-oswald font-bold text-sm tracking-wider uppercase rounded hover:border-primary transition-colors">
              Go Home
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}