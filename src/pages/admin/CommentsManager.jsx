import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { MessageCircle, Trash2, Check, X, Loader2, Search } from "lucide-react";
import { format } from "date-fns";

export default function CommentsManager() {
  const { user } = /** @type {{user: any}} */ (useOutletContext()) || { user: null };
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const c = await base44.entities.Comment.list("-created_date", 200);
    setComments(c);
    setLoading(false);
  };

  const updateStatus = async (id, status) => {
    await base44.entities.Comment.update(id, { status });
    setComments(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this comment?")) return;
    setDeleting(id);
    await base44.entities.Comment.delete(id);
    setComments(prev => prev.filter(c => c.id !== id));
    setDeleting(null);
  };

  const filtered = comments.filter(c => {
    const matchFilter = filter === "all" || c.status === filter;
    const matchSearch = !search || c.body?.toLowerCase().includes(search.toLowerCase()) || c.author_name?.toLowerCase().includes(search.toLowerCase()) || c.article_title?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const statusColors = {
    approved: "bg-green-500/10 text-green-400",
    pending: "bg-yellow-500/10 text-yellow-400",
    rejected: "bg-red-500/10 text-red-400",
  };

  const counts = {
    all: comments.length,
    approved: comments.filter(c => c.status === "approved").length,
    pending: comments.filter(c => c.status === "pending").length,
    rejected: comments.filter(c => c.status === "rejected").length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-oswald font-bold text-white text-3xl uppercase flex items-center gap-3">
            <MessageCircle className="w-7 h-7 text-accent" /> Comments
          </h1>
          <p className="text-muted-foreground font-inter text-sm mt-0.5">Moderate reader comments</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search comments..." className="w-full bg-secondary border border-border rounded pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent" />
        </div>
        <div className="flex gap-2">
          {["all", "approved", "pending", "rejected"].map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`px-3 py-2 rounded text-xs font-inter font-medium capitalize transition-colors ${filter === s ? "bg-primary text-white" : "bg-secondary border border-border text-muted-foreground hover:text-white"}`}>
              {s} ({counts[s]})
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl text-center py-16 text-muted-foreground font-inter text-sm">No comments found.</div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {filtered.map((c, i) => (
            <div key={c.id} className={`p-5 ${i < filtered.length - 1 ? "border-b border-border" : ""} hover:bg-secondary/20 transition-colors`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="font-inter font-semibold text-white text-sm">{c.author_name}</span>
                    {c.author_email && <span className="text-muted-foreground font-inter text-xs">{c.author_email}</span>}
                    <span className={`text-xs font-inter px-2 py-0.5 rounded capitalize ${statusColors[c.status] || statusColors.pending}`}>{c.status}</span>
                    <span className="text-muted-foreground font-inter text-xs">{c.created_date ? format(new Date(c.created_date), "MMM d, yyyy 'at' h:mm a") : ""}</span>
                  </div>
                  <p className="text-foreground font-inter text-sm mb-2 leading-relaxed">{c.body}</p>
                  {c.article_title && (
                    <div className="text-muted-foreground font-inter text-xs">
                      On: <span className="text-accent">{c.article_title}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {c.status !== "approved" && (
                    <button onClick={() => updateStatus(c.id, "approved")} className="p-1.5 text-muted-foreground hover:text-green-400 transition-colors" title="Approve">
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  {c.status !== "rejected" && (
                    <button onClick={() => updateStatus(c.id, "rejected")} className="p-1.5 text-muted-foreground hover:text-yellow-400 transition-colors" title="Reject">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id} className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-40">
                    {deleting === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}