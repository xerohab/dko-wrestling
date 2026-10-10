import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, Eye, MessageCircle, Loader2 } from "lucide-react";
import { format, subDays } from "date-fns";

export default function ArticleAnalytics() {
  const { user } = /** @type {{user: any}} */ (useOutletContext()) || { user: null };
  const [loading, setLoading] = useState(true);
  const [views, setViews] = useState([]);
  const [comments, setComments] = useState([]);
  const [articles, setArticles] = useState([]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const filter = user.role === "editor" ? { author_email: user.email } : {};
    const [v, c, a] = await Promise.all([
      base44.entities.ArticleView.list("-created_date", 1000),
      base44.entities.Comment.list("-created_date", 500),
      base44.entities.Article.filter(filter, "-published_date", 100),
    ]);
    setViews(v);
    setComments(c);
    setArticles(a);
    setLoading(false);
  };

  // Per-article stats
  const articleStats = articles.map(a => ({
    ...a,
    views: views.filter(v => v.article_id === a.id).length,
    comments: comments.filter(c => c.article_id === a.id && c.status === "approved").length,
  })).sort((a, b) => b.views - a.views);

  // Last 7 days views
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(new Date(), 6 - i);
    const dateStr = format(day, "yyyy-MM-dd");
    return {
      date: format(day, "MMM d"),
      views: views.filter(v => v.created_date?.startsWith(dateStr)).length,
    };
  });

  const totalViews = views.length;
  const totalComments = comments.filter(c => c.status === "approved").length;
  const todayViews = views.filter(v => v.created_date?.startsWith(format(new Date(), "yyyy-MM-dd"))).length;
  const yesterdayViews = views.filter(v => v.created_date?.startsWith(format(subDays(new Date(), 1), "yyyy-MM-dd"))).length;

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="w-7 h-7 text-accent" />
        <div>
          <h1 className="font-oswald font-bold text-white text-3xl uppercase">Analytics</h1>
          <p className="text-muted-foreground font-inter text-sm mt-0.5">Article performance overview</p>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Views", value: totalViews, icon: Eye, color: "text-primary" },
          { label: "Today's Views", value: todayViews, icon: TrendingUp, color: "text-accent", sub: yesterdayViews > 0 ? `${todayViews > yesterdayViews ? "+" : ""}${todayViews - yesterdayViews} vs yesterday` : null },
          { label: "Total Comments", value: totalComments, icon: MessageCircle, color: "text-blue-400" },
          { label: "Published Articles", value: articles.filter(a => a.status === "published").length, icon: TrendingUp, color: "text-green-400" },
        ].map(stat => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <span className="text-muted-foreground font-inter text-xs uppercase tracking-wider">{stat.label}</span>
            </div>
            <div className="font-oswald font-bold text-white text-2xl">{stat.value.toLocaleString()}</div>
            {stat.sub && <div className="text-muted-foreground font-inter text-xs mt-1">{stat.sub}</div>}
          </div>
        ))}
      </div>

      {/* 7-Day Chart */}
      <div className="bg-card border border-border rounded-xl p-6 mb-8">
        <h2 className="font-oswald font-bold text-white text-base uppercase mb-4">Views — Last 7 Days</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={last7}>
            <XAxis dataKey="date" tick={{ fill: "#888", fontSize: 11, fontFamily: "Inter" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#888", fontSize: 11, fontFamily: "Inter" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: 6, fontFamily: "Inter", fontSize: 12 }} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
            <Bar dataKey="views" radius={[4, 4, 0, 0]}>
              {last7.map((_, i) => <Cell key={i} fill={i === 6 ? "hsl(43,90%,48%)" : "hsl(0,90%,40%)"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Per-Article Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-oswald font-bold text-white text-base uppercase">Article Performance</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="text-left px-4 py-3 font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider">Article</th>
              <th className="text-left px-4 py-3 font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Category</th>
              <th className="text-left px-4 py-3 font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider">Views</th>
              <th className="text-left px-4 py-3 font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Comments</th>
              <th className="text-left px-4 py-3 font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {articleStats.map((a, i) => (
              <tr key={a.id} className="hover:bg-secondary/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-inter text-xs w-5 text-right shrink-0">{i + 1}</span>
                    <div className="min-w-0">
                      <div className="font-inter text-white text-sm truncate max-w-[220px]">{a.title}</div>
                      <div className="text-muted-foreground font-inter text-xs">{a.author_name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className="text-xs font-oswald font-semibold uppercase text-primary">{a.category}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-oswald font-bold text-white">{a.views.toLocaleString()}</span>
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <div className="flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-white font-inter text-sm">{a.comments}</span>
                  </div>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className={`text-xs font-inter px-2 py-0.5 rounded capitalize ${a.status === "published" ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>{a.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}