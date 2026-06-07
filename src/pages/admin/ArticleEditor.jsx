import { useState, useEffect } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import RichEditor from "@/components/editor/RichEditor";
import ImagePickerModal from "@/components/media/ImagePickerModal";
import { Save, Send, ArrowLeft, Image as ImageIcon, X, Loader2, Twitter, Tag, Search, Trash2, RefreshCw, CheckCircle2 } from "lucide-react";

export default function ArticleEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useOutletContext();
  const isNew = !id || id === "new";

  const [allCategories, setAllCategories] = useState([]);
  const [allAuthors, setAllAuthors] = useState([]);
  const [form, setForm] = useState({
    title: "", slug: "", excerpt: "", body: "",
    category: "", categories: [],
    featured_image: "", status: "draft",
    published_date: "", seo_title: "", seo_description: "",
    author_name: "",
  });
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [catSearch, setCatSearch] = useState("");
  const [testingTweet, setTestingTweet] = useState(false);
  const [tweetResult, setTweetResult] = useState(null);

  useEffect(() => {
    base44.entities.Category.list("sort_order", 200).then(setAllCategories);
    base44.functions.invoke("manageUsers", { action: "list" }).then(res => {
      const authors = (res.data?.users || res.users || []).filter(u => u.role === "admin" || u.role === "editor");
      setAllAuthors(authors);
    });
    if (!isNew) {
      base44.entities.Article.filter({ id }).then(arts => {
        if (arts.length) {
          const a = arts[0];
          setForm({
            title: a.title || "",
            slug: a.slug || "",
            excerpt: a.excerpt || "",
            body: a.body || "",
            category: a.category || "",
            categories: a.categories || (a.category ? [a.category] : []),
            featured_image: a.featured_image || "",
            status: a.status || "draft",
            published_date: a.published_date || "",
            seo_title: a.seo_title || "",
            seo_description: a.seo_description || "",
            author_name: a.author_name || "",
          });
        }
        setLoading(false);
      });
    }
  }, [id]);

  const generateSlug = (title) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleTitleChange = (e) => {
    const title = e.target.value;
    setForm(f => ({ ...f, title, slug: generateSlug(title) }));
  };

  const toggleCategory = (catName) => {
    setForm(f => {
      const exists = f.categories.includes(catName);
      const updated = exists
        ? f.categories.filter(c => c !== catName)
        : [...f.categories, catName];
      return { ...f, categories: updated, category: updated[0] || "" };
    });
  };

  const handleUpdate = async () => {
    setUpdating(true);
    const data = {
      ...form,
      author_email: form.author_email || user.email,
      author_name: form.author_name || user.display_name || user.full_name,
    };
    await base44.entities.Article.update(id, data);
    setUpdating(false);
    setUpdateSuccess(true);
    setTimeout(() => setUpdateSuccess(false), 3000);
  };

  const handleSave = async (publish = false) => {
    setSaving(true);
    const now = new Date().toISOString();
    const selectedAuthor = allAuthors.find(a => (a.author_name || a.display_name || a.full_name) === form.author_name);
    const data = {
      ...form,
      status: publish ? "published" : "draft",
      author_email: selectedAuthor?.email || user.email,
      ...(publish && !form.published_date ? { published_date: now } : {}),
    };
    if (isNew) {
      const created = await base44.entities.Article.create(data);
      if (publish) {
        base44.functions.invoke("autoTweetArticle", { articleId: created.id }).catch(() => {});
      }
      navigate("/admin/articles");
    } else {
      await base44.entities.Article.update(id, data);
      if (publish && data.status === "published") {
        base44.functions.invoke("autoTweetArticle", { articleId: id }).catch(() => {});
      }
      navigate("/admin/articles");
    }
    setSaving(false);
  };

  const handleTestTweet = async () => {
    if (isNew) {
      alert("Please save the article first before testing tweet");
      return;
    }
    setTestingTweet(true);
    setTweetResult(null);
    try {
      const res = await base44.functions.invoke("autoTweetArticle", { articleId: id, force: true });
      setTweetResult({ success: true, message: "Tweet sent successfully!" });
    } catch (err) {
      setTweetResult({ success: false, message: err.message });
    }
    setTestingTweet(false);
  };

  // Build flat category list with colours, showing hierarchy
  const articleCats = allCategories.filter(c => c.usage === "article" || c.usage === "both" || !c.usage);
  const topLevel = articleCats.filter(c => !c.parent_id);
  const getSubs = (parentId) => articleCats.filter(c => c.parent_id === parentId);

  const flattenedCats = [];
  topLevel.forEach(top => {
    flattenedCats.push({ ...top, _depth: 0 });
    getSubs(top.id).forEach(sub => {
      flattenedCats.push({ ...sub, _depth: 1, _parentColor: top.color });
      getSubs(sub.id).forEach(subsub => {
        flattenedCats.push({ ...subsub, _depth: 2, _parentColor: top.color });
      });
    });
  });

  const filteredCats = catSearch
    ? flattenedCats.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()))
    : flattenedCats;

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button onClick={() => navigate("/admin/articles")} className="text-muted-foreground hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-oswald font-bold text-white text-xl uppercase flex-1 min-w-0 truncate">
          {isNew ? "New Article" : "Edit Article"}
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          {!isNew && (
            <button
              onClick={handleUpdate}
              disabled={updating || !form.title}
              className={`flex items-center gap-1.5 px-3 py-2 border rounded font-inter text-sm transition-colors disabled:opacity-40 ${
                updateSuccess
                  ? "bg-green-500/10 border-green-500/40 text-green-400"
                  : "bg-secondary border-border text-foreground hover:border-accent hover:text-accent"
              }`}
            >
              {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : updateSuccess ? <CheckCircle2 className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
              <span className="hidden sm:inline">{updateSuccess ? "Updated!" : "Update"}</span>
            </button>
          )}
          <button
            onClick={() => handleSave(false)}
            disabled={saving || !form.title}
            className="flex items-center gap-1.5 px-3 py-2 bg-secondary border border-border rounded text-foreground font-inter text-sm hover:border-primary transition-colors disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span className="hidden sm:inline">Save Draft</span>
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving || !form.title || form.categories.length === 0 || !form.author_name}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white font-oswald font-semibold tracking-wider uppercase text-sm rounded hover:bg-red-700 transition-colors disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Publish
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-5">
          {/* Title */}
          <div>
            <label className="block font-inter text-sm font-medium text-foreground mb-1.5">Headline *</label>
            <input
              value={form.title}
              onChange={handleTitleChange}
              placeholder="Enter article headline..."
              className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-white font-oswald text-xl placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block font-inter text-sm font-medium text-foreground mb-1.5">
              URL Slug <span className="text-muted-foreground text-xs">(auto-generated from title)</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-inter text-sm shrink-0">/article/</span>
              <input
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                placeholder="url-slug"
                className="flex-1 bg-secondary border border-border rounded px-4 py-2 text-foreground font-inter text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* Excerpt */}
          <div>
            <label className="block font-inter text-sm font-medium text-foreground mb-1.5">Excerpt <span className="text-muted-foreground text-xs">(shown on article cards)</span></label>
            <textarea
              value={form.excerpt}
              onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))}
              placeholder="Short summary..."
              rows={2}
              className="w-full bg-secondary border border-border rounded px-4 py-2 text-foreground font-inter text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          {/* Author */}
          <div>
            <label className="block font-inter text-sm font-medium text-foreground mb-1.5">Author *</label>
            <select
              value={form.author_name}
              onChange={e => setForm(f => ({ ...f, author_name: e.target.value }))}
              disabled={user?.role !== "admin" && !isNew}
              className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-foreground font-inter text-sm focus:outline-none focus:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select an author...</option>
              {allAuthors.map(author => (
                <option key={author.id} value={author.author_name || author.display_name || author.full_name}>
                  {author.author_name || author.display_name || author.full_name} ({author.role})
                </option>
              ))}
            </select>
          </div>

          {/* Body */}
          <div>
            <label className="block font-inter text-sm font-medium text-foreground mb-1.5">Article Body *</label>
            <RichEditor
              value={form.body}
              onChange={v => setForm(f => ({ ...f, body: v }))}
              placeholder="Write your article here..."
            />
          </div>

          {/* SEO */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-oswald font-bold text-white text-base uppercase flex items-center gap-2">
              <Search className="w-4 h-4 text-accent" /> SEO / Meta
            </h3>
            <div>
              <label className="block font-inter text-xs font-medium text-muted-foreground mb-1">Meta Title <span className="text-muted-foreground">(defaults to headline)</span></label>
              <input
                value={form.seo_title}
                onChange={e => setForm(f => ({ ...f, seo_title: e.target.value }))}
                placeholder={form.title || "SEO title..."}
                className="w-full bg-secondary border border-border rounded px-4 py-2 text-foreground font-inter text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block font-inter text-xs font-medium text-muted-foreground mb-1">Meta Description</label>
              <textarea
                value={form.seo_description}
                onChange={e => setForm(f => ({ ...f, seo_description: e.target.value }))}
                placeholder="SEO description (150-160 characters recommended)..."
                rows={2}
                maxLength={160}
                className="w-full bg-secondary border border-border rounded px-4 py-2 text-foreground font-inter text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none"
              />
              <div className="text-right text-xs text-muted-foreground mt-1">{form.seo_description.length}/160</div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Publish */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-oswald font-bold text-white text-base uppercase mb-4">Publish</h3>
            <div className="space-y-3">
              <div>
                <label className="block font-inter text-xs font-medium text-muted-foreground mb-1">Publish Date</label>
                <input
                  type="datetime-local"
                  value={form.published_date ? form.published_date.slice(0, 16) : ""}
                  onChange={e => setForm(f => ({ ...f, published_date: e.target.value ? new Date(e.target.value).toISOString() : "" }))}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground font-inter text-sm focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div className="border-t border-border pt-3 space-y-2">
                {!isNew && (
                  <button
                    onClick={handleUpdate}
                    disabled={updating || !form.title}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 border rounded font-inter text-sm transition-colors disabled:opacity-40 ${
                      updateSuccess
                        ? "bg-green-500/10 border-green-500/40 text-green-400"
                        : "bg-secondary border-border text-foreground hover:border-accent hover:text-accent"
                    }`}
                  >
                    {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : updateSuccess ? <CheckCircle2 className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                    {updateSuccess ? "Updated!" : "Update Article"}
                  </button>
                )}
                <button
                  onClick={() => handleSave(false)}
                  disabled={saving || !form.title}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary border border-border rounded text-foreground font-inter text-sm hover:border-primary transition-colors disabled:opacity-40"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Draft
                </button>
                <button
                  onClick={() => handleSave(true)}
                  disabled={saving || !form.title || form.categories.length === 0 || !form.author_name}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white font-oswald font-semibold tracking-wider uppercase text-sm rounded hover:bg-red-700 transition-colors disabled:opacity-40"
                  >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Publish
                  </button>
              </div>
            </div>
            <p className="text-muted-foreground font-inter text-xs mt-3 flex items-center gap-1">
              <Twitter className="w-3 h-3" /> Auto-tweets on publish
            </p>
            {!isNew && (
              <button
                onClick={handleTestTweet}
                disabled={testingTweet || !form.title || !form.featured_image}
                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-secondary border border-border rounded text-foreground font-inter text-sm hover:border-primary transition-colors disabled:opacity-40"
              >
                {testingTweet ? <Loader2 className="w-4 h-4 animate-spin" /> : <Twitter className="w-4 h-4" />}
                Test Tweet
              </button>
            )}
            {tweetResult && (
              <div className={`mt-2 p-2 rounded text-xs font-inter ${tweetResult.success ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                {tweetResult.message}
              </div>
            )}
          </div>

          {/* Categories — multi-select */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-oswald font-bold text-white text-base uppercase mb-1 flex items-center gap-2">
              <Tag className="w-4 h-4 text-accent" /> Categories *
            </h3>
            <p className="text-muted-foreground font-inter text-xs mb-3">Select one or more</p>

            {/* Selected badges */}
            {form.categories.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {form.categories.map(catName => {
                  const cat = allCategories.find(c => c.name === catName);
                  const color = cat?.color || "#CC0000";
                  return (
                    <button
                      key={catName}
                      onClick={() => toggleCategory(catName)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-oswald font-semibold uppercase"
                      style={{ backgroundColor: `${color}25`, color, border: `1px solid ${color}60` }}
                    >
                      {catName} <X className="w-3 h-3" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Search */}
            <input
              value={catSearch}
              onChange={e => setCatSearch(e.target.value)}
              placeholder="Search categories..."
              className="w-full bg-secondary border border-border rounded px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary mb-2 transition-colors"
            />

            {/* Category list */}
            <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1">
              {filteredCats.map(cat => {
                const selected = form.categories.includes(cat.name);
                const color = cat.color || cat._parentColor || "#CC0000";
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.name)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded text-left transition-colors ${selected ? "bg-secondary/80" : "hover:bg-secondary/40"}`}
                    style={{ paddingLeft: `${12 + cat._depth * 14}px` }}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span
                      className={`font-oswald text-xs font-semibold uppercase flex-1 ${selected ? "" : "text-muted-foreground"}`}
                      style={selected ? { color } : {}}
                    >
                      {cat.name}
                    </span>
                    {selected && (
                      <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: color }}>
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
              {filteredCats.length === 0 && (
                <p className="text-muted-foreground font-inter text-xs text-center py-4">No categories found</p>
              )}
            </div>
          </div>

          {/* Featured Image */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-oswald font-bold text-white text-base uppercase mb-3">Featured Image</h3>
            {form.featured_image ? (
              <div className="relative">
                <img src={form.featured_image} alt="Featured" className="w-full aspect-video object-cover rounded-lg" />
                <button
                  onClick={() => setForm(f => ({ ...f, featured_image: "" }))}
                  className="absolute top-2 right-2 bg-black/70 rounded-full p-1 text-white hover:text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowImagePicker(true)}
                className="w-full aspect-video bg-secondary border border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary transition-colors group"
              >
                <ImageIcon className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="font-inter text-xs text-muted-foreground">Select Image</span>
              </button>
            )}
            {form.featured_image && (
              <button
                onClick={() => setShowImagePicker(true)}
                className="mt-2 w-full text-xs text-primary font-inter hover:underline"
              >
                Change image
              </button>
            )}
          </div>
        </div>
      </div>

      {showImagePicker && (
        <ImagePickerModal
          onSelect={url => { setForm(f => ({ ...f, featured_image: url })); setShowImagePicker(false); }}
          onClose={() => setShowImagePicker(false)}
        />
      )}
    </div>
  );
}