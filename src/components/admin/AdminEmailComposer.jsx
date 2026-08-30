import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Mail, Loader2, Send, CheckCircle, AlertTriangle, Users } from "lucide-react";

export default function AdminEmailComposer() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState("all");
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    base44.functions.invoke("manageUsers", { action: "list" })
      .then(res => setUsers(res.data?.users || res.users || []))
      .catch(() => {});
  }, []);

  const toggleUser = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) return;
    if (mode === "selected" && selected.length === 0) return;
    setSending(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke("sendAdminEmail", {
        subject: subject.trim(),
        body: message,
        mode,
        user_ids: mode === "selected" ? selected : [],
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
        <Mail className="w-4 h-4 text-accent" /> Email Users
      </h3>
      <p className="text-muted-foreground font-inter text-xs mb-4">Send an email to all users or pick specific recipients.</p>
      <div className="space-y-3">
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" className="w-full bg-secondary border border-border rounded px-3 py-2 text-white font-inter text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
        <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Type your message…" rows={4} className="w-full bg-secondary border border-border rounded px-3 py-2 text-white font-inter text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none" />

        <div className="flex items-center gap-2">
          <button onClick={() => setMode("all")} className={`flex-1 px-3 py-2 rounded font-oswald text-xs font-semibold uppercase tracking-wider transition-colors ${mode === "all" ? "bg-primary text-white" : "bg-secondary border border-border text-muted-foreground hover:text-white"}`}>All Users</button>
          <button onClick={() => setMode("selected")} className={`flex-1 px-3 py-2 rounded font-oswald text-xs font-semibold uppercase tracking-wider transition-colors ${mode === "selected" ? "bg-primary text-white" : "bg-secondary border border-border text-muted-foreground hover:text-white"}`}>Select Users</button>
        </div>

        {mode === "selected" && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-inter text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> {selected.length} selected</span>
              <button onClick={() => setSelected([])} className="text-xs font-inter text-muted-foreground hover:text-white">Clear</button>
            </div>
            <div className="max-h-40 overflow-y-auto border border-border rounded bg-secondary/40">
              {users.map(u => (
                <label key={u.id} className="flex items-center gap-2 px-3 py-2 hover:bg-secondary/60 cursor-pointer border-b border-border/40 last:border-0">
                  <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggleUser(u.id)} className="accent-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white font-inter truncate">{u.full_name || u.display_name || u.email}</p>
                    <p className="text-xs text-muted-foreground font-inter truncate">{u.email}</p>
                  </div>
                </label>
              ))}
              {users.length === 0 && <p className="text-xs text-muted-foreground font-inter p-3 text-center">No users found</p>}
            </div>
          </div>
        )}

        <button onClick={handleSend} disabled={sending || !subject.trim() || !message.trim() || (mode === "selected" && selected.length === 0)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white font-oswald font-semibold text-sm tracking-wider uppercase rounded hover:bg-red-700 transition-colors disabled:opacity-40">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send Email
        </button>

        {result && (
          result.success ? (
            <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded text-sm font-inter text-green-400">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Email sent to {result.sent} user{result.sent !== 1 ? "s" : ""}{result.failed ? `, ${result.failed} failed` : ""}.</span>
            </div>
          ) : (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded text-sm font-inter text-red-400">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{result.message}</span>
            </div>
          )
        )}
      </div>
    </div>
  );
}