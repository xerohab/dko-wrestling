import { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Plus, Edit, Trash2, Eye, Search, Loader2, AlertTriangle, ChevronDown, CheckSquare, Square, Minus } from "lucide-react";
import { format } from "date-fns";

export default function ArticlesList() {
  const { user } = useOutletContext();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleting, setDeleting] = useState(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [deletingSelected, setDeletingSelected] = useState(false);

  const load = async () => {
    setLoading(true);
    const arts = await base44.entities.Article.filter({}, "-created_date", 100);
    setArticles(arts);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (article) => {
    if (!confirm(`Delete "${article.title}"? This cannot be undone.`)) return;
    setDeleting(article.id);
    await base44.entities.Article.delete(article.id);
    setArticles(prev => prev.filter(a => a.id !== article.id));
    setDeleting(null);
  };

  const handleDeleteAll = async () => {
    if (!confirm(`DELETE ALL ${articles.length} ARTICLES? This CANNOT be undone!`)) return;
    if (!confirm("Are you absolutely sure? All articles will be permanently deleted.")) return;
    setDeletingAll(true);
    for (const a of articles) {
      await base44.entities.Article.delete(a.id);
    }
    setArticles([]);
    setDeletingAll(false);
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(a => a.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Delete ${selected.size} selected articles? This cannot be undone.`)) return;
    setDeletingSelected(true);
    for (const id of selected) {
      await base44.entities.Article.delete(id);
    }
    setArticles(prev => prev.filter(a => !selected.has(a.id)));
    setSelected(new Set());
    setDeletingSelected(false);
  };

  const filtered = articles.filter(a => {
    const matchSearch = !search || a.title?.toLowerCase().includes(search.toLowerCase()) || a.category?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-oswald font-bold text-white text-3xl uppercase">Articles</h1>
          <p className="text-muted-foreground font-inter text-sm mt-0.5">{articles.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          {user.role === "admin" && selected.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={deletingSelected}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-900/40 border border-red-700/50 text-red-400 font-oswald font-semibold text-sm tracking-wider uppercase rounded hover:bg-red-900/70 transition-colors disabled:opacity-40"
            >
              {deletingSelected ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete {selected.size} Selected
            </button>
          )}
          {user.role === "admin" && articles.length > 0 && (
            <button
              onClick={handleDeleteAll}
              disabled={deletingAll}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-900/40 border border-red-700/50 text-red-400 font-oswald font-semibold text-sm tracking-wider uppercase rounded hover:bg-red-900/70 transition-colors disabled:opacity-40"
            >
              {deletingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
              Delete All
            </button>
          )}
          <Link to="/admin/articles/new" className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-oswald font-semibold text-sm tracking-wider uppercase rounded hover:bg-red-700 transition-colors">
            <Plus className="w-4 h-4" />
            New Article
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search articles..."
            className="w-full bg-secondary border border-border rounded pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex gap-2">
          {["all", "published", "draft"].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded text-sm font-inter font-medium capitalize transition-colors ${statusFilter === s ? "bg-primary text-white" : "bg-secondary border border-border text-muted-foreground hover:text-white"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl text-center py-16">
          <p className="text-muted-foreground font-inter text-sm">No articles found.</p>
          <Link to="/admin/articles/new" className="text-primary font-inter text-sm mt-2 inline-block hover:underline">Create your first article →</Link>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-4 py-3 w-10">
                  <button onClick={toggleSelectAll} className="text-muted-foreground hover:text-white transition-colors">
                    {selected.size === filtered.length && filtered.length > 0 ? <CheckSquare className="w-4 h-4 text-primary" /> : selected.size > 0 ? <Minus className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="text-left px-4 py-3 font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider">Article</th>
                <th className="text-left px-4 py-3 font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Category</th>
                <th className="text-left px-4 py-3 font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Status</th>
                <th className="text-left px-4 py-3 font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Date</th>
                <th className="text-right px-4 py-3 font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(article => (
                <>
                  <tr
                   key={article.id}
                   onClick={() => setExpandedId(expandedId === article.id ? null : article.id)}
                   className={`hover:bg-secondary/30 transition-colors cursor-pointer ${selected.has(article.id) ? "bg-primary/5" : ""}`}
                  >
                   <td className="px-4 py-3" onClick={e => { e.stopPropagation(); toggleSelect(article.id); }}>
                     {selected.has(article.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                   </td>
                   <td className="px-4 py-3">
                     <div className="flex items-center gap-3">
                        {article.featured_image && (
                          <img src={article.featured_image} alt="" className="w-10 h-10 rounded object-cover shrink-0 hidden sm:block" />
                        )}
                        <div className="min-w-0">
                          <div className="font-inter font-medium text-white text-sm truncate max-w-[250px]">{article.title}</div>
                          <div className="text-muted-foreground font-inter text-xs">{article.author_name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="bg-primary/10 text-primary text-xs font-oswald font-semibold uppercase px-2 py-0.5 rounded">{article.category}</span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`text-xs font-inter font-medium px-2 py-0.5 rounded capitalize ${article.status === "published" ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                        {article.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-inter text-xs hidden lg:table-cell">
                      {article.published_date ? format(new Date(article.published_date), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronDown className={`w-4 h-4 text-muted-foreground inline-block transition-transform ${expandedId === article.id ? "rotate-180" : ""}`} />
                    </td>
                  </tr>
                  {expandedId === article.id && (
                    <tr key={`${article.id}-actions`} className="bg-secondary/20 border-b border-border">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <Link
                            to={`/admin/articles/${article.id}`}
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white font-oswald text-xs font-semibold tracking-wider uppercase rounded hover:bg-red-700 transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" /> Edit Article
                          </Link>
                          <Link
                            to={`/article/${article.slug || article.id}`}
                            target="_blank"
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1.5 px-4 py-2 bg-secondary border border-border text-white font-oswald text-xs font-semibold tracking-wider uppercase rounded hover:border-primary transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Live
                          </Link>
                          <button
                            onClick={e => { e.stopPropagation(); handleDelete(article); }}
                            disabled={deleting === article.id}
                            className="flex items-center gap-1.5 px-4 py-2 bg-red-900/30 border border-red-700/50 text-red-400 font-oswald text-xs font-semibold tracking-wider uppercase rounded hover:bg-red-900/60 transition-colors disabled:opacity-40"
                          >
                            {deleting === article.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}