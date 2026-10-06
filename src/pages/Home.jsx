import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PublicNav from "@/components/layout/PublicNav";
import ArticleCard from "@/components/articles/ArticleCard";
import { Search, Loader2 } from "lucide-react";

export default function Home() {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 6;

  useEffect(() => {
    document.title = "DKO Wrestling | Latest News & Updates";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', "Stay updated with the latest wrestling news, articles, and stories from DKO Wrestling.");
    
    base44.entities.Category.list("sort_order", 200).then(setCategories).catch(() => {});
    loadArticles(1, "", "");
  }, []);

  const loadArticles = async (pageNum, searchVal, catVal) => {
    setLoading(true);
    const all = await base44.entities.Article.filter({ status: "published" }, "-published_date", 200);
    let filtered = all;
    if (searchVal) {
      const q = searchVal.toLowerCase();
      filtered = filtered.filter(a =>
        a.title?.toLowerCase().includes(q) ||
        a.excerpt?.toLowerCase().includes(q) ||
        a.author_name?.toLowerCase().includes(q)
      );
    }
    if (catVal) {
      filtered = filtered.filter(a =>
        a.categories?.includes(catVal) || a.category === catVal
      );
    }
    const total = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    setTotalPages(total);
    const start = (pageNum - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    setArticles(filtered.slice(start, end));
    setLoading(false);
  };

  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
    loadArticles(1, val, selectedCategory);
  };

  const handleCategory = (cat) => {
    setSelectedCategory(cat);
    setPage(1);
    loadArticles(1, search, cat);
  };

  const handlePageChange = (p) => {
    setPage(p);
    loadArticles(p, search, selectedCategory);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const topLevel = categories.filter(c => !c.parent_id);
  const hero = articles[0];
  const rest = articles.slice(1);

  const getCategoryColor = (article) => {
    if (!article.category) return "#CC0000";
    const cat = categories.find(c => c.name === article.category);
    return cat?.color || "#CC0000";
  };

  return (
    <div
      className="min-h-screen bg-background"
      onCopy={e => { e.preventDefault(); }}
      onContextMenu={e => e.preventDefault()}
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
    >
      <PublicNav />

      {/* Search + Filter Bar */}
      <div className="bg-card border-b border-border sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search articles..."
              className="w-full bg-secondary border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
            <button
              onClick={() => handleCategory("")}
              className={`shrink-0 px-3 py-1.5 rounded font-oswald text-xs uppercase tracking-wider transition-colors ${
                !selectedCategory ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-white"
              }`}
            >
              All
            </button>
            {topLevel.map(cat => {
              const isSelected = selectedCategory === cat.name;
              const bgColor = cat.color || "#CC0000";
              // Determine if color is light (use black text) or dark (use white text)
              const hex = bgColor.replace("#", "");
              const r = parseInt(hex.substring(0,2), 16);
              const g = parseInt(hex.substring(2,4), 16);
              const b = parseInt(hex.substring(4,6), 16);
              const luminance = (0.299*r + 0.587*g + 0.114*b) / 255;
              const textColor = luminance > 0.5 ? "#000000" : "#ffffff";
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategory(cat.name)}
                  className={`shrink-0 px-3 py-1.5 rounded font-oswald text-xs uppercase tracking-wider transition-colors ${
                    isSelected ? "" : "bg-secondary text-muted-foreground hover:text-white"
                  }`}
                  style={isSelected ? { backgroundColor: bgColor, color: textColor } : {}}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading && articles.length === 0 ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground font-inter">
            <p className="text-lg">No articles found.</p>
          </div>
        ) : (
          <>
            {/* Hero */}
            {hero && !search && !selectedCategory && (
              <div className="mb-8">
                <ArticleCard article={hero} size="hero" categoryColor={getCategoryColor(hero)} />
              </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {(search || selectedCategory ? articles : rest).map(article => (
                <ArticleCard key={article.id} article={article} categoryColor={getCategoryColor(article)} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-10">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-2 bg-secondary border border-border rounded font-oswald text-xs uppercase tracking-wider text-foreground hover:border-primary transition-colors disabled:opacity-30"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    className={`w-9 h-9 rounded font-oswald text-sm font-bold transition-colors ${
                      p === page ? "bg-primary text-white" : "bg-secondary border border-border text-foreground hover:border-primary"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  className="px-3 py-2 bg-secondary border border-border rounded font-oswald text-xs uppercase tracking-wider text-foreground hover:border-primary transition-colors disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-8 text-center">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center gap-2 mb-3">
            <img src="https://media.base44.com/images/public/6a0fab0df03ef3f099fbfaf0/c427e54b3_DKOWrestling_ChampionsCollide.png" alt="DKO Wrestling" className="h-10 w-auto" />
          </div>
          <p className="text-muted-foreground font-inter text-xs">© 2026 DKO Wrestling All rights reserved. Part of DKO LTD</p>
        </div>
      </footer>
    </div>
  );
}