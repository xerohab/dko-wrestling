import { useState, useEffect } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { FileText, Image, Clock, CheckCircle, Edit3, AlertTriangle, Tag, Settings, Users } from "lucide-react";
import ArticleCard from "@/components/articles/ArticleCard";

function StatCard({ icon: IconComp, label, value, color = "text-primary" }) {
  const Icon = IconComp;
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <div className="font-oswald font-bold text-white text-2xl">{value}</div>
        <div className="font-inter text-muted-foreground text-sm">{label}</div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useOutletContext();
  const [stats, setStats] = useState({ total: 0, published: 0, drafts: 0, images: 0 });
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    const load = async () => {
      const filter = user.role === "editor" ? { author_email: user.email } : {};
      const [all, images] = await Promise.all([
        base44.entities.Article.filter(filter, "-created_date", 100),
        base44.entities.MediaImage.list("-created_date", 1),
      ]);
      setStats({
        total: all.length,
        published: all.filter(a => a.status === "published").length,
        drafts: all.filter(a => a.status === "draft").length,
        images: images.length,
      });
      setRecent(all.slice(0, 4));
    };
    load();
  }, []);

  return (
    <div>
      {/* Non-admin warning */}
      {user?.role !== "admin" && (
        <div className="mb-6 flex items-start gap-3 bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-inter text-sm text-yellow-300 font-medium">Limited Access — Editor Role</p>
            <p className="font-inter text-xs text-yellow-400/80 mt-0.5">You have the <strong>editor</strong> role. An admin needs to change your role to <strong>admin</strong> to unlock Categories, Users, and Settings pages.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-oswald font-bold text-white text-3xl uppercase">
          Welcome back, {user?.display_name || user?.full_name}
        </h1>
        <p className="text-muted-foreground font-inter text-sm mt-1 capitalize">{user?.role} · DKO Wrestling &amp; Entertainment</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={FileText} label="Total Articles" value={stats.total} />
        <StatCard icon={CheckCircle} label="Published" value={stats.published} />
        <StatCard icon={Clock} label="Drafts" value={stats.drafts} />
        <StatCard icon={Image} label="Media Files" value={stats.images} />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Link to="/admin/articles/new" className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-oswald font-semibold text-sm tracking-wider uppercase rounded hover:bg-red-700 transition-colors">
          <Edit3 className="w-4 h-4" />
          New Article
        </Link>
        <Link to="/admin/media" className="flex items-center gap-2 px-5 py-2.5 bg-secondary border border-border text-foreground font-inter text-sm rounded hover:border-primary transition-colors">
          <Image className="w-4 h-4" />
          Upload Media
        </Link>
        {user?.role === "admin" && (
          <>
            <Link to="/admin/categories" className="flex items-center gap-2 px-5 py-2.5 bg-secondary border border-border text-foreground font-inter text-sm rounded hover:border-primary transition-colors">
              <Tag className="w-4 h-4" />
              Categories
            </Link>
            <Link to="/admin/users" className="flex items-center gap-2 px-5 py-2.5 bg-secondary border border-border text-foreground font-inter text-sm rounded hover:border-primary transition-colors">
              <Users className="w-4 h-4" />
              Users
            </Link>
            <Link to="/admin/settings" className="flex items-center gap-2 px-5 py-2.5 bg-secondary border border-border text-foreground font-inter text-sm rounded hover:border-primary transition-colors">
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </>
        )}
      </div>

      {/* Recent Articles */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-primary rounded" />
            <h2 className="font-oswald font-bold text-white text-lg uppercase">Recent Articles</h2>
          </div>
          <Link to="/admin/articles" className="text-primary font-inter text-sm hover:underline">View All →</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {recent.map(a => <ArticleCard key={a.id} article={a} />)}
        </div>
      </div>
    </div>
  );
}