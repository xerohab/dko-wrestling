import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ShieldCheck, Loader2, Play, KeyRound, Server, CheckCircle, Info } from "lucide-react";

export default function PerkSphereAdmin() {
  const { user } = useOutletContext();
  const [proof, setProof] = useState(null);
  const [probe, setProbe] = useState(null);
  const [busy, setBusy] = useState(null);

  const runProof = async () => {
    setBusy("proof"); setProof(null);
    try {
      const r = await base44.functions.invoke("partnerProofOfPossession", {});
      setProof(r.data || r);
    } catch (_e) { setProof({ ok: false, code: "error", message: "Request failed." }); }
    setBusy(null);
  };

  const runProbe = async () => {
    setBusy("probe"); setProbe(null);
    try {
      const r = await base44.functions.invoke("partnerProbe", {});
      setProbe(r.data || r);
    } catch (_e) { setProbe({ ok: false, code: "error", message: "Request failed." }); }
    setBusy(null);
  };

  if (user?.role !== "admin") {
    return <div className="p-8 text-muted-foreground font-inter text-sm">Admins only.</div>;
  }

  const Pill = ({ ok, label, tone }) => (
    <span className={`inline-flex items-center gap-1.5 text-xs font-inter px-2 py-1 rounded ${ok ? "bg-green-500/10 text-green-400" : tone === "warn" ? "bg-yellow-500/10 text-yellow-400" : "bg-red-500/10 text-red-400"}`}>
      {ok ? <CheckCircle className="w-3.5 h-3.5" /> : <Info className="w-3.5 h-3.5" />} {label}
    </span>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-oswald font-bold text-white text-3xl uppercase flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-accent" /> Perk Sphere
        </h1>
        <p className="text-muted-foreground font-inter text-sm mt-0.5">Integration status & testing (admin only)</p>
      </div>

      {/* Configuration */}
      <div className="bg-card border border-border rounded-xl p-5 mb-4">
        <h3 className="font-oswald font-bold text-white text-base uppercase mb-3 flex items-center gap-2"><Server className="w-4 h-4 text-primary" /> Configuration</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-inter">
          <div><span className="text-muted-foreground">Partner:</span> <span className="text-white">DKO Wrestling</span></div>
          <div><span className="text-muted-foreground">Domain:</span> <span className="text-white">dkowrestling.co.uk</span></div>
          <div><span className="text-muted-foreground">API base:</span> <span className="text-white font-mono text-xs">https://api.perksphere.org</span></div>
          <div><span className="text-muted-foreground">Key ID:</span> <span className="text-white font-mono text-xs">psp_ujlMGJtS1IV4U2llbKgWtaR-</span></div>
          <div className="flex items-center gap-2"><span className="text-muted-foreground">Partner status:</span> <Pill ok={false} tone="warn" label="setup_required" /></div>
          <div className="flex items-center gap-2"><span className="text-muted-foreground">Live mode:</span> <Pill ok={false} tone="warn" label="disabled (partner inactive)" /></div>
        </div>
        <div className="flex items-start gap-2 p-3 bg-secondary rounded-lg mt-4">
          <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-muted-foreground font-inter text-xs">Proof-of-possession is allowed while the partner is inactive. Account linking and event submission call the real signed Linux endpoints but return <span className="text-yellow-400">partner_not_active</span> until Perk Sphere activates the partner. Secret values are never displayed.</p>
        </div>
      </div>

      {/* Proof test */}
      <div className="bg-card border border-border rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-oswald font-bold text-white text-base uppercase flex items-center gap-2"><KeyRound className="w-4 h-4 text-accent" /> Proof-of-Possession</h3>
          <button onClick={runProof} disabled={busy === "proof"} className="flex items-center gap-2 px-4 py-2 bg-accent text-black font-oswald text-xs font-semibold tracking-wider uppercase rounded hover:brightness-110 disabled:opacity-40">
            {busy === "proof" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} Run Test
          </button>
        </div>
        {proof && (
          <div className="space-y-2 text-sm font-inter">
            <div className="flex flex-wrap items-center gap-2">
              <Pill ok={proof.ok} tone="warn" label={proof.ok ? "verified" : "failed"} />
              {proof.challengeStatus && <span className="text-xs text-muted-foreground">Challenge: HTTP {proof.challengeStatus}</span>}
              {proof.confirmStatus && <span className="text-xs text-muted-foreground">Confirm: HTTP {proof.confirmStatus}</span>}
              <span className="text-xs text-muted-foreground">Activated: {String(proof.activated)}</span>
            </div>
            {proof.errorCode && <div className="text-xs text-red-400">Error: {proof.errorCode}{proof.message ? ` — ${proof.message}` : ""}</div>}
            {proof.ok && <div className="text-xs text-green-400">Credential possession verified. Partner remains inactive (activated=false).</div>}
          </div>
        )}
      </div>

      {/* Probe */}
      <div className="bg-card border border-border rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-oswald font-bold text-white text-base uppercase flex items-center gap-2"><Server className="w-4 h-4 text-primary" /> Endpoint Probe</h3>
          <button onClick={runProbe} disabled={busy === "probe"} className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-oswald text-xs font-semibold tracking-wider uppercase rounded hover:bg-red-700 disabled:opacity-40">
            {busy === "probe" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} Run Probe
          </button>
        </div>
        <p className="text-muted-foreground font-inter text-xs mb-3">Signed probes against the real Linux endpoints. Both valid and invalid signatures are tested; while the partner is inactive both return <span className="text-yellow-400">partner_not_active</span> (the activation gate precedes signature validation).</p>
        {probe && probe.results && (
          <div className="space-y-1.5">
            {Object.entries(probe.results).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-xs font-inter bg-secondary rounded px-3 py-2">
                <span className="text-white font-mono">{k}</span>
                <span className={`flex items-center gap-1.5 ${v.ok ? "text-green-400" : v.errorCode === "partner_not_active" ? "text-yellow-400" : "text-red-400"}`}>
                  {v.status ? `HTTP ${v.status}` : "error"} {v.errorCode && <span className="text-muted-foreground">· {v.errorCode}</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Discovered endpoints */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-oswald font-bold text-white text-base uppercase mb-3">Discovered Endpoints</h3>
        <ul className="space-y-1.5 text-xs font-inter text-muted-foreground">
          <li><span className="text-white font-mono">POST /v1/partner-credentials/challenge</span> — credential challenge (live)</li>
          <li><span className="text-white font-mono">POST /v1/partner-credentials/confirm</span> — credential confirm (live)</li>
          <li><span className="text-white font-mono">POST /v1/partner-links/confirm</span> — account-link confirm (exists, activation-gated)</li>
          <li><span className="text-white font-mono">POST /v1/partners/events</span> — activity events (exists, activation-gated)</li>
          <li className="text-yellow-400">No server-side link-initiation or unlink endpoint found — initiation is a user-facing redirect; unlink is local until Linux exposes an endpoint.</li>
        </ul>
      </div>
    </div>
  );
}