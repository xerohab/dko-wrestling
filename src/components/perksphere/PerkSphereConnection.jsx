import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Link2, Unlink, ExternalLink, ShieldCheck, Info, AlertCircle, CheckCircle } from "lucide-react";

export default function PerkSphereConnection() {
  const [user, setUser] = useState(null);
  const [link, setLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [msg, setMsg] = useState(null);

  const loadLink = async (u) => {
    try {
      const res = await base44.entities.PerkSphereLink.filter(
        { user_id: u.id },
        { limit: 10, sort: "-created_date" }
      );
      const items = Array.isArray(res) ? res : (res.items || []);
      setLink(items.find(i => i.status === "linked") || items.find(i => i.status === "pending") || null);
    } catch (_e) {
      // RLS may hide records if not yet linked — that's fine.
    }
  };

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      await loadLink(u);
      setLoading(false);

      // Challenge handoff: Perk Sphere redirects back to DKO with ?challenge=...
      // partnerLinkConfirm calls POST /v1/partner-links/confirm (partner HMAC).
      const urlParams = new URLSearchParams(window.location.search);
      const challenge = urlParams.get("challenge");
      if (challenge) {
        window.history.replaceState({}, "", window.location.pathname);
        setBusy(true);
        try {
          const r = await base44.functions.invoke("partnerLinkConfirm", { challenge });
          const data = r.data || {};
          if (data.ok) {
            setMsg({ type: "success", text: "Your Perk Sphere account is connected." });
          } else if (data.code === "setup_required") {
            setMsg({ type: "info", text: "Perk Sphere linking is not live yet." });
          } else {
            setMsg({ type: "error", text: data.message || "Linking confirmation failed." });
          }
        } catch (_e) {
          setMsg({ type: "error", text: "Linking confirmation failed." });
        } finally {
          setBusy(false);
          await loadLink(u);
        }
      }
    }).catch(() => setLoading(false));
  }, []);

  const handleConnect = async () => {
    setShowConsent(false);
    setBusy(true);
    setMsg(null);
    try {
      const r = await base44.functions.invoke("partnerLinkConsent", {});
      const data = r.data || {};
      if (data.ok && data.consentUrl) {
        window.location.href = data.consentUrl;
        return;
      }
      if (data.code === "setup_required") {
        setMsg({ type: "info", text: "Perk Sphere account linking is not live yet. The DKO Wrestling partner is still completing verification." });
      } else if (data.code === "consent_url_unavailable") {
        setMsg({ type: "info", text: "The Perk Sphere linking redirect is not configured yet. Linking will be available once the handoff is confirmed." });
      } else {
        setMsg({ type: "error", text: data.message || "Could not start linking." });
      }
    } catch (_e) {
      setMsg({ type: "error", text: "Could not start linking." });
    } finally {
      setBusy(false);
      if (user) await loadLink(user);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Disconnect your Perk Sphere account? You can reconnect anytime.")) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await base44.functions.invoke("partnerUnlink", {});
      const data = r.data || {};
      if (data.ok) {
        setLink(null);
        setMsg({ type: data.serverConfirmed === false ? "info" : "success", text: data.message || "Perk Sphere account disconnected." });
      } else if (data.code === "setup_required") {
        setMsg({ type: "info", text: "Perk Sphere unlinking is not live yet." });
      } else {
        setMsg({ type: "error", text: data.message || "Could not disconnect." });
      }
    } catch (_e) {
      setMsg({ type: "error", text: "Could not disconnect." });
    } finally {
      setBusy(false);
    }
  };

  const isLinked = link?.status === "linked";
  const isPending = link?.status === "pending";

  return (
    <div className="bg-card border border-border rounded-xl p-5 mb-4">
      <h3 className="font-oswald font-bold text-white text-base uppercase mb-1 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-accent" /> Perk Sphere
      </h3>
      <p className="text-muted-foreground font-inter text-xs mb-4">
        Connect your DKO Wrestling account to Perk Sphere to earn rewards and loyalty XP from eligible activities.
      </p>

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-muted-foreground animate-spin" /></div>
      ) : isLinked ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-inter px-2 py-1 rounded bg-green-500/10 text-green-400">
              <CheckCircle className="w-3.5 h-3.5" /> Connected
            </span>
            <a href="https://perksphere.org" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent font-inter text-xs hover:underline">
              Perk Sphere <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <button onClick={handleDisconnect} disabled={busy} className="flex items-center gap-1.5 px-4 py-2 bg-secondary border border-red-500/40 text-red-400 font-oswald text-xs font-semibold tracking-wider uppercase rounded hover:border-red-500 transition-colors disabled:opacity-40">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />} Disconnect
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {isPending && (
            <span className="inline-flex items-center gap-1.5 text-xs font-inter px-2 py-1 rounded bg-yellow-500/10 text-yellow-400">
              <AlertCircle className="w-3.5 h-3.5" /> Linking in progress
            </span>
          )}
          <button onClick={() => setShowConsent(true)} disabled={busy} className="flex items-center gap-1.5 px-4 py-2 bg-accent text-black font-oswald text-xs font-semibold tracking-wider uppercase rounded hover:brightness-110 transition-colors disabled:opacity-40">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />} Connect to Perk Sphere
          </button>
          <div className="flex items-start gap-2 p-3 bg-secondary rounded-lg">
            <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-muted-foreground font-inter text-xs">
              Connecting lets Perk Sphere track eligible DKO Wrestling activities for rewards. You can disconnect anytime. DKO Wrestling does not share your password.
            </p>
          </div>
        </div>
      )}

      {msg && (
        <div className={`mt-3 flex items-start gap-2 p-3 rounded-lg text-xs font-inter ${msg.type === "error" ? "bg-red-500/10 text-red-400" : msg.type === "success" ? "bg-green-500/10 text-green-400" : "bg-accent/10 text-accent"}`}>
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {msg.text}
        </div>
      )}

      {showConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6">
            <h4 className="font-oswald font-bold text-white text-lg uppercase mb-2">Connect to Perk Sphere</h4>
            <p className="text-muted-foreground font-inter text-sm mb-4">
              You're about to link your DKO Wrestling account (<span className="text-white">{user?.email}</span>) to Perk Sphere. This lets Perk Sphere record eligible activities for rewards and loyalty XP. You can disconnect at any time.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConsent(false)} className="flex-1 px-4 py-2.5 bg-secondary border border-border text-foreground font-inter text-sm rounded hover:border-primary transition-colors">Cancel</button>
              <button onClick={handleConnect} className="flex-1 px-4 py-2.5 bg-accent text-black font-oswald font-semibold text-sm uppercase rounded hover:brightness-110 transition-colors">I Agree, Connect</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}