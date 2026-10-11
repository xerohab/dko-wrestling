import { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Edit2, Save, X, Loader2, Megaphone, Upload } from "lucide-react";

const SLOTS = [
  { value: "top", label: "Top Banner" },
  { value: "mid", label: "Mid-Article" },
  { value: "bottom", label: "Bottom Banner" },
  { value: "sidebar", label: "Sidebar" },
];

const AD_TYPES = [
  { value: "image", label: "Image Ad" },
  { value: "text", label: "Text Ad" },
  { value: "html", label: "Custom HTML" },
  { value: "adsense", label: "Google AdSense" },
];

const EMPTY_FORM = { name: "", slot: "mid", type: "image", image_url: "", link_url: "", headline: "", body_text: "", custom_html: "", adsense_publisher_id: "", is_active: true };

export default function AdsManager() {
  const { user } = /** @type {{user: {id: string, email?: string, role?: string, display_name?: string, full_name?: string}}} */ (useOutletContext());
  const navigate = useNavigate();
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user?.role !== "admin") { navigate("/admin"); return; }
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.Ad.list("-created_date", 100);
    setAds(data);
    setLoading(false);
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleEdit = (ad) => {
    setEditId(ad.id);
    setForm({
      name: ad.name || "",
      slot: ad.slot || "mid",
      type: ad.type || "image",
      image_url: ad.image_url || "",
      link_url: ad.link_url || "",
      headline: ad.headline || "",
      body_text: ad.body_text || "",
      custom_html: ad.custom_html || "",
      adsense_publisher_id: ad.adsense_publisher_id || "",
      is_active: ad.is_active !== false,
    });
    setShowForm(true);
  };

  const handleNew = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    if (editId) {
      await base44.entities.Ad.update(editId, form);
    } else {
      await base44.entities.Ad.create(form);
    }
    setSaving(false);
    setShowForm(false);
    setEditId(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this ad?")) return;
    await base44.entities.Ad.delete(id);
    load();
  };

  const handleToggle = async (ad) => {
    await base44.entities.Ad.update(ad.id, { is_active: !ad.is_active });
    load();
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set("image_url", file_url);
    setUploading(false);
    e.target.value = "";
  };

  const slotLabel = (slot) => SLOTS.find(s => s.value === slot)?.label || slot;
  const typeLabel = (type) => AD_TYPES.find(t => t.value === type)?.label || type;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-oswald font-bold text-white text-3xl uppercase flex items-center gap-3">
            <Megaphone className="w-6 h-6 text-accent" /> Ads Manager
          </h1>
          <p className="text-muted-foreground font-inter text-sm mt-0.5">Manage advertising slots. Pro members see no ads.</p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-oswald font-semibold text-sm tracking-wider uppercase rounded hover:bg-red-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Ad
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-card border border-primary rounded-xl p-6 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-oswald font-bold text-white text-base uppercase">{editId ? "Edit Ad" : "New Ad"}</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-white"><X className="w-5 h-5" /></button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Ad Name *</label>
              <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Summer Banner" className="w-full bg-secondary border border-border rounded px-3 py-2.5 text-white font-inter text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Slot</label>
              <select value={form.slot} onChange={e => set("slot", e.target.value)} className="w-full bg-secondary border border-border rounded px-3 py-2.5 text-white font-inter text-sm focus:outline-none focus:border-primary">
                {SLOTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Ad Type</label>
              <select value={form.type} onChange={e => set("type", e.target.value)} className="w-full bg-secondary border border-border rounded px-3 py-2.5 text-white font-inter text-sm focus:outline-none focus:border-primary">
                {AD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3 pt-5">
              <label className="font-inter text-sm text-foreground">Active</label>
              <button type="button" onClick={() => set("is_active", !form.is_active)} className={`relative w-10 h-5 rounded-full transition-colors ${form.is_active ? "bg-green-500" : "bg-secondary border border-border"}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.is_active ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>

          {/* Type-specific fields */}
          {form.type === "image" && (
            <div className="space-y-3">
              <div>
                <label className="block font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Ad Image</label>
                {form.image_url ? (
                  <div className="relative inline-block">
                    <img src={form.image_url} alt="Ad" className="max-h-32 rounded border border-border" />
                    <button onClick={() => set("image_url", "")} className="absolute top-1 right-1 bg-black/70 rounded-full p-0.5 text-white hover:text-red-400"><X className="w-3 h-3" /></button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 px-4 py-2.5 bg-secondary border border-dashed border-border rounded cursor-pointer hover:border-primary transition-colors w-fit">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Upload className="w-4 h-4 text-muted-foreground" />}
                    <span className="font-inter text-sm text-muted-foreground">{uploading ? "Uploading..." : "Upload Image"}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                  </label>
                )}
              </div>
              <div>
                <label className="block font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Click URL</label>
                <input value={form.link_url} onChange={e => set("link_url", e.target.value)} placeholder="https://..." className="w-full bg-secondary border border-border rounded px-3 py-2.5 text-white font-inter text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
              </div>
            </div>
          )}

          {form.type === "text" && (
            <div className="space-y-3">
              <div>
                <label className="block font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Headline</label>
                <input value={form.headline} onChange={e => set("headline", e.target.value)} placeholder="Ad headline..." className="w-full bg-secondary border border-border rounded px-3 py-2.5 text-white font-inter text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Body Text</label>
                <textarea value={form.body_text} onChange={e => set("body_text", e.target.value)} placeholder="Ad body text..." rows={2} className="w-full bg-secondary border border-border rounded px-3 py-2.5 text-white font-inter text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none" />
              </div>
              <div>
                <label className="block font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Click URL</label>
                <input value={form.link_url} onChange={e => set("link_url", e.target.value)} placeholder="https://..." className="w-full bg-secondary border border-border rounded px-3 py-2.5 text-white font-inter text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
              </div>
            </div>
          )}

          {form.type === "html" && (
            <div>
              <label className="block font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Custom HTML</label>
              <textarea value={form.custom_html} onChange={e => set("custom_html", e.target.value)} placeholder="Paste HTML code..." rows={4} className="w-full bg-secondary border border-border rounded px-3 py-2.5 text-white font-inter text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none font-mono" />
            </div>
          )}

          {form.type === "adsense" && (
            <div>
              <label className="block font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">AdSense Publisher ID</label>
              <input value={form.adsense_publisher_id} onChange={e => set("adsense_publisher_id", e.target.value)} placeholder="ca-pub-XXXXXXXXXX" className="w-full bg-secondary border border-border rounded px-3 py-2.5 text-white font-inter text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleSave} disabled={saving || !form.name} className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-oswald font-semibold text-sm tracking-wider uppercase rounded hover:bg-red-700 transition-colors disabled:opacity-40">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Ad
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2.5 bg-secondary border border-border text-foreground font-oswald text-sm uppercase rounded hover:border-primary transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Ads List */}
      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>
      ) : ads.length === 0 ? (
        <div className="bg-card border border-border rounded-xl text-center py-16 text-muted-foreground font-inter text-sm">No ads yet. Create your first ad above.</div>
      ) : (
        <div className="space-y-3">
          {ads.map(ad => (
            <div key={ad.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              {ad.image_url && (
                <img src={ad.image_url} alt={ad.name} className="w-16 h-12 object-cover rounded shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-oswald font-bold text-white text-sm">{ad.name}</span>
                  <span className="text-xs font-inter px-2 py-0.5 rounded bg-secondary text-muted-foreground">{slotLabel(ad.slot)}</span>
                  <span className="text-xs font-inter px-2 py-0.5 rounded bg-secondary text-muted-foreground">{typeLabel(ad.type)}</span>
                  <span className={`text-xs font-inter px-2 py-0.5 rounded ${ad.is_active ? "bg-green-500/10 text-green-400" : "bg-secondary text-muted-foreground"}`}>
                    {ad.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                {(ad.headline || ad.link_url) && (
                  <p className="text-muted-foreground font-inter text-xs mt-1 truncate">{ad.headline || ad.link_url}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => handleToggle(ad)} className={`px-3 py-1.5 font-oswald text-xs uppercase rounded transition-colors ${ad.is_active ? "bg-secondary text-muted-foreground hover:text-red-400" : "bg-green-500/10 text-green-400 hover:bg-green-500/20"}`}>
                  {ad.is_active ? "Disable" : "Enable"}
                </button>
                <button onClick={() => handleEdit(ad)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(ad.id)} className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
