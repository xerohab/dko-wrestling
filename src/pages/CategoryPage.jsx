import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PublicNav from "@/components/layout/PublicNav";
import ArticleCard from "@/components/articles/ArticleCard";
import { Loader2 } from "lucide-react";

export default function CategoryPage() {
  const { slug } = useParams();
  const [articles, setArticles] = useState([]);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const cats = await base44.entities.Category.filter({ slug });
      if (cats.length) setCategory(cats[0]);
      const catName = cats[0]?.name || slug;
      const allArts = await base44.entities.Article.filter({ status: "published" }, "-published_date", 200);
      const arts = allArts.filter(a => a.categories?.includes(catName) || a.category === catName);
      setArticles(arts);
      setLoading(false);
    };
    load();
  }, [slug]);

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Category Header */}
        <div className="mb-8 pb-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-10 bg-primary rounded" />
            <div>
              <h1 className="font-oswald font-bold text-white text-4xl uppercase tracking-wide">
                {category?.name || slug?.toUpperCase()} NEWS
              </h1>
              <p className="text-muted-foreground font-inter text-sm mt-0.5">{articles.length} articles</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-muted-foreground font-inter">No articles in this category yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {articles.map(a => <ArticleCard key={a.id} article={a} />)}
          </div>
        )}
      </main>
    </div>
  );
}