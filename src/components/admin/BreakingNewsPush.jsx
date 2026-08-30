import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, Loader2, Send, CheckCircle, AlertTriangle } from "lucide-react";

export default function BreakingNewsPush() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [actionUrl, setActionUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const handleSend = async () => {
    if (!title.trim() || !content.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke("sendBreakingNewsPush", {
        title: title.trim(),
        content: content.trim(),
        action_url: actionUrl.trim(),
        action_label: "Read Now",
      });
      setResult({ success: true, ...res.data });
    } catch (err) {
      setResult({ success: false, message: err.message || "Failed to send" });
    }
    setSending(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="font-oswald font-bold text-white text-base uppercase mb-1 flex items-center gap-2">
        <Bell className="w-4 h-4 text-accent" /> Breaking News Push
      </h3>
      <p className="text-muted-foreground font-inter text-xs mb-4">Send a push notification to all active DKO Club members.</p>
      <div className="space-y-3">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Headline (e.g. BREAKING: …)" maxLength={50} className="w-full bg-secondary border border-border rounded px-3 py-2 text-white font-inter text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Short message…" rows={2} maxLength={120} className="w-full bg-secondary border border-border rounded px-3 py-2 text-white font-inter text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none" />
        <input value={actionUrl} onChange={e => setActionUrl(e.target.value)} placeholder="Optional link (e.g. /article/slug)" className="w-full bg-secondary border border-border rounded px-3 py-2 text-white font-inter text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
        <button onClick={handleSend} disabled={sending || !title.trim() || !content.trim()} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white font-oswald font-semibold text-sm tracking-wider uppercase rounded hover:bg-red-700 transition-colors disabled:opacity-40">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send Push
        </button>
        {result && (
          result.success ? (
            <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded text-sm font-inter text-green-400">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Push sent to {result.sent} member{result.sent !== 1 ? "s" : ""}{result.failed ? `, ${result.failed} failed` : ""}.</span>
            </div>
          ) : (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded text-sm font-inter text-red-400">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{result.message}</span>
            </div>
          )
        )}
        <p className="text-muted-foreground/70 font-inter text-[11px] flex items-start gap-1.5">
          <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
          Push notifications reach the native mobile app only and require push credentials to be configured. Sends will report as failed until a mobile build with push is set up.
        </p>
      </div>
    </div>
  );
}