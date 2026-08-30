import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PublicNav from "@/components/layout/PublicNav";
import ArticleCard from "@/components/articles/ArticleCard";
import CommentsSection from "@/components/article/CommentsSection";
import AdBanner from "@/components/ads/AdBanner";
import AuthorBio from "@/components/articles/AuthorBio";
import PaywallCard from "@/components/articles/PaywallCard";
import { format } from "date-fns";
import { Loader2, User, Calendar, Eye, MessageCircle, Bookmark, BookmarkCheck, ArrowLeft } from "lucide-react";

export default function ArticlePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewCount, setViewCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [savedId, setSavedId] = useState(null);
  const [savingBookmark, setSavingBookmark] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const tracked = useRef(false);
  const sessionId = useRef(`sess_${Math.random().toString(36).slice(2)}`);
  const presenceId = useRef(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (authed) {
        const me = await base44.auth.me();
        setCurrentUser(me);
      }
      setAuthChecked(true);
    });
  }, []);

  useEffect(() => {
    tracked.current = false;
    const load = async () => {
      setLoading(true);
      let arts = await base44.entities.Article.filter({ slug, status: "published" });
      if (!arts.length) arts = await base44.entities.Article.filter({ id: slug, status: "published" });
      if (arts.length) {
        const a = arts[0];
        setArticle(a);
        
        // Update page title and meta description
        const pageTitle = a.seo_title || a.title;
        const pageDescription = a.seo_description || a.excerpt || "Read more on DKO Wrestling";
        document.title = `${pageTitle} | DKO Wrestling`;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute('content', pageDescription);
        
        const [rel, vc, cc] = await Promise.all([
          base44.entities.Article.filter({ status: "published", category: a.category }, "-published_date", 4),
          base44.entities.ArticleView.filter({ article_id: a.id }),
          base44.entities.Comment.filter({ article_id: a.id, status: "approved" }),
        ]);
        setRelated(rel.filter(r => r.id !== a.id).slice(0, 3));
        setViewCount(vc.length + 1);
        setCommentCount(cc.length);

        if (!tracked.current) {
          tracked.current = true;
          base44.entities.ArticleView.create({
            article_id: a.id,
            article_title: a.title,
            article_slug: a.slug || a.id,
            referrer: document.referrer || "",
          }).catch(() => {});
        }

        // Register presence heartbeat
        const sid = sessionId.current;
        const now = new Date().toISOString();
        const existing = await base44.entities.ArticlePresence.filter({ article_id: a.id, session_id: sid });
        if (existing.length) {
          presenceId.current = existing[0].id;
          base44.entities.ArticlePresence.update(presenceId.current, { last_seen: now }).catch(() => {});
        } else {
          const p = await base44.entities.ArticlePresence.create({ article_id: a.id, session_id: sid, last_seen: now });
          presenceId.current = p.id;
        }
      }
      setLoading(false);
    };
    load();

    // Heartbeat every 20s
    const interval = setInterval(() => {
      if (presenceId.current) {
        base44.entities.ArticlePresence.update(presenceId.current, { last_seen: new Date().toISOString() }).catch(() => {});
      }
    }, 20000);

    // Cleanup on leave
    return () => {
      clearInterval(interval);
      if (presenceId.current) {
        base44.entities.ArticlePresence.delete(presenceId.current).catch(() => {});
      }
    };
  }, [slug]);

  useEffect(() => {
    if (currentUser && article) {
      base44.entities.SavedArticle.filter({ article_id: article.id, user_email: currentUser.email })
        .then(existing => { if (existing.length > 0) setSavedId(existing[0].id); })
        .catch(() => {});
    }
  }, [currentUser, article]);

  useEffect(() => {
    if (!article) return;
    if (!article.is_paywalled) { setHasAccess(true); setCheckingAccess(false); return; }
    if (!authChecked) { setCheckingAccess(true); return; }
    setCheckingAccess(true);
    (async () => {
      if (!currentUser) { setHasAccess(false); setCheckingAccess(false); return; }
      try {
        const [subs, premiumPlans] = await Promise.all([
          base44.entities.UserSubscription.filter({ user_email: currentUser.email, status: "active" }),
          base44.entities.SubscriptionPlan.filter({ grants_paywall_access: true }),
        ]);
        const premiumIds = new Set(premiumPlans.map(p => p.id));
        const now = new Date();
        setHasAccess(subs.some(s => premiumIds.has(s.plan_id) && (!s.end_date || new Date(s.end_date) >= now)));
      } catch {
        setHasAccess(false);
      }
      setCheckingAccess(false);
    })();
  }, [article, currentUser, authChecked]);

  const handleBookmark = async () => {
    setSavingBookmark(true);
    if (savedId) {
      await base44.entities.SavedArticle.delete(savedId);
      setSavedId(null);
    } else {
      const s = await base44.entities.SavedArticle.create({
        user_email: currentUser.email,
        user_id: currentUser.id,
        article_id: article.id,
        article_title: article.title,
        article_slug: article.slug || article.id,
        article_image: article.featured_image || "",
      });
      setSavedId(s.id);
    }
    setSavingBookmark(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PublicNav />
        <div className="flex justify-center py-32"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background">
        <PublicNav />
        <div className="text-center py-32">
          <h2 className="font-oswald font-bold text-white text-3xl uppercase">Article Not Found</h2>
          <Link to="/" className="text-primary font-inter text-sm mt-4 inline-block hover:underline">← Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-background"
      onCopy={e => { e.preventDefault(); alert("Content is copy protected."); }}
      onContextMenu={e => e.preventDefault()}
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
    >
      <PublicNav />
      <article className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-primary hover:text-red-400 transition-colors mb-6 font-inter text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Category */}
        <div className="mb-4">
          <Link to={`/category/${article.category?.toLowerCase()}`}>
            <span className="inline-block bg-primary text-white text-xs font-oswald font-semibold tracking-widest uppercase px-3 py-1 rounded hover:bg-red-700 transition-colors">
              {article.category}
            </span>
          </Link>
        </div>

        {/* Title */}
        <h1 className="font-oswald font-bold text-white text-3xl md:text-4xl lg:text-5xl uppercase leading-tight mb-4">
          {article.title}
        </h1>

        {/* Save button */}
        {currentUser && (
          <div className="flex justify-end mb-2">
            <button
              onClick={handleBookmark}
              disabled={savingBookmark}
              className={`flex items-center gap-2 px-4 py-2 rounded font-oswald text-xs uppercase tracking-wider transition-colors ${
                savedId
                  ? "bg-accent/10 text-accent border border-accent/40 hover:bg-red-500/10 hover:text-red-400 hover:border-red-400/40"
                  : "bg-secondary border border-border text-muted-foreground hover:text-white hover:border-primary"
              }`}
            >
              {savedId ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              {savedId ? "Saved" : "Save Article"}
            </button>
          </div>
        )}

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 mb-6 pb-6 border-b border-border">
          {article.author_name && (
            <div className="flex items-center gap-1.5 text-muted-foreground font-inter text-sm">
              <User className="w-4 h-4" />
              <span>{article.author_name}</span>
            </div>
          )}
          {article.published_date && (
            <div className="flex items-center gap-1.5 text-muted-foreground font-inter text-sm">
              <Calendar className="w-4 h-4" />
              <span>{format(new Date(article.published_date), "MMMM d, yyyy")}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-muted-foreground font-inter text-sm">
            <Eye className="w-4 h-4" />
            <span>{viewCount.toLocaleString()} views</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground font-inter text-sm">
            <MessageCircle className="w-4 h-4" />
            <span>{commentCount} comments</span>
          </div>
        </div>

        {/* Top Ad */}
        <AdBanner slot="top" className="mb-6" />

        {/* Featured Image */}
        {article.featured_image && (
          <div className="mb-8 rounded-xl overflow-hidden border border-border">
            <img src={article.featured_image} alt={article.title} className="w-full object-cover max-h-[500px]" />
          </div>
        )}

        {/* Body or Paywall */}
        {article.is_paywalled && !hasAccess ? (
          checkingAccess ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
          ) : (
            <>
              {article.excerpt && (
                <p className="font-inter text-foreground text-lg leading-relaxed mb-6">{article.excerpt}</p>
              )}
              <PaywallCard />
            </>
          )
        ) : (
          <>
            <div
              className="
                max-w-none font-inter text-foreground leading-relaxed
                [&_h1]:font-oswald [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:uppercase [&_h1]:my-5
                [&_h2]:font-oswald [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:uppercase [&_h2]:my-4
                [&_h3]:font-oswald [&_h3]:text-2xl [&_h3]:font-bold [&_h3]:text-white [&_h3]:my-3
                [&_h4]:font-oswald [&_h4]:text-xl [&_h4]:font-bold [&_h4]:text-white [&_h4]:my-3
                [&_p]:my-3 [&_p]:leading-relaxed
                [&_a]:text-primary [&_a]:underline [&_a]:hover:text-red-400 [&_a]:transition-colors
                [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3
                [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-3
                [&_li]:my-1
                [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-5 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:my-5 [&_blockquote]:bg-secondary/30 [&_blockquote]:py-2 [&_blockquote]:rounded-r
                [&_hr]:border-border [&_hr]:my-6
                [&_img]:rounded-xl [&_img]:max-w-full [&_img]:h-auto [&_img]:my-4 [&_img]:border [&_img]:border-border
                [&_iframe]:w-full [&_iframe]:rounded-xl
                [&_strong]:text-white [&_strong]:font-semibold
              "
              dangerouslySetInnerHTML={{ __html: article.body }}
            />

            {/* Mid Ad */}
            <AdBanner slot="mid" className="my-8" />
          </>
        )}

        {/* Author Bio - always visible */}
        <AuthorBio authorEmail={article.author_email} authorName={article.author_name} />

        {/* Comments - only when unlocked */}
        {(!article.is_paywalled || hasAccess) && <CommentsSection article={article} />}
      </article>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-8 text-center">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center gap-2 mb-3">
            <img src="https://media.base44.com/images/public/6a0fab0df03ef3f099fbfaf0/782e6a111_dkowrestl.jpg" alt="DKO Wrestling" className="h-10 w-auto" />
          </div>
          <p className="text-muted-foreground font-inter text-xs">© 2026 DKO Wrestling All rights reserved. Part of DKO LTD</p>
        </div>
      </footer>

      {/* Related */}
      {related.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 pb-16">
          <div className="border-t border-border pt-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-6 bg-primary rounded" />
              <h2 className="font-oswald font-bold text-white text-xl uppercase tracking-wider">More {article.category} News</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {related.map(r => <ArticleCard key={r.id} article={r} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}