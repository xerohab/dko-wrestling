import { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Save, Twitter, Eye, EyeOff, Loader2, Settings, CheckCircle, CreditCard, Megaphone, Info } from "lucide-react";

const TWITTER_V1_FIELDS = [
  { key: "twitter_api_key", label: "API Key (Consumer Key)", placeholder: "Enter Twitter API Key" },
  { key: "twitter_api_secret", label: "API Secret (Consumer Secret)", placeholder: "Enter Twitter API Secret" },
  { key: "twitter_access_token", label: "Access Token", placeholder: "Enter Access Token" },
  { key: "twitter_access_secret", label: "Access Token Secret", placeholder: "Enter Access Token Secret" },
];

const TWITTER_V2_FIELDS = [
  { key: "twitter_oauth2_client_id", label: "OAuth 2.0 Client ID", placeholder: "Enter OAuth 2.0 Client ID" },
  { key: "twitter_oauth2_client_secret", label: "OAuth 2.0 Client Secret", placeholder: "Enter OAuth 2.0 Client Secret" },
  { key: "twitter_oauth2_bearer_token", label: "Bearer Token", placeholder: "Enter Bearer Token" },
];

const PAYPAL_FIELDS = [
  { key: "paypal_client_id", label: "PayPal Client ID", placeholder: "Enter PayPal Client ID", secret: false },
  { key: "paypal_client_secret", label: "PayPal Client Secret", placeholder: "Enter PayPal Client Secret", secret: true },
  { key: "paypal_mode", label: "Mode", type: "select", options: ["sandbox", "live"] },
];
// Note: PayPal Plan ID removed — managed per-plan in Subscriptions

const AD_SLOTS = [
  { key: "ad_top", label: "Top Banner (above article)", description: "Shown at the top of article pages" },
  { key: "ad_mid", label: "Mid-Article Ad", description: "Shown in the middle of articles" },
  { key: "ad_bottom", label: "Bottom Banner", description: "Shown after article content" },
  { key: "ad_google_publisher_id", label: "Google AdSense Publisher ID", description: "e.g. ca-pub-1234567890. When set, auto-fills all slots with Google ads.", placeholder: "ca-pub-XXXXXXXXXX" },
];

function SectionCard({ icon: Icon, iconColor, title, subtitle, children }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 md:p-6 mb-5">
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-oswald font-bold text-white text-base uppercase">{title}</h3>
          {subtitle && <p className="text-muted-foreground font-inter text-xs">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function SecretField({ label, fieldKey, value, onChange }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block font-inter text-sm font-medium text-foreground mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value || ""}
          onChange={e => onChange(fieldKey, e.target.value)}
          className="w-full bg-secondary border border-border rounded px-4 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
        />
        <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

export default function SiteSettings() {
  const { user } = /** @type {{user: any}} */ (useOutletContext()) || { user: null };
  const navigate = useNavigate();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user?.role !== "admin") { navigate("/admin"); return; }
    base44.entities.SiteSettings.list().then(rows => {
      const map = {};
      rows.forEach(r => { map[r.key] = r.value; });
      setSettings(map);
      setLoading(false);
    });
  }, []);

  const set = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    const existing = await base44.entities.SiteSettings.list();
    const existingMap = {};
    existing.forEach(r => { existingMap[r.key] = r.id; });

    for (const [key, value] of Object.entries(settings)) {
      if (existingMap[key]) {
        await base44.entities.SiteSettings.update(existingMap[key], { value: value || "" });
      } else if (value) {
        await base44.entities.SiteSettings.create({ key, value: value || "" });
      }
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="font-oswald font-bold text-white text-2xl md:text-3xl uppercase flex items-center gap-3">
          <Settings className="w-6 h-6 text-primary" /> Site Settings
        </h1>
        <p className="text-muted-foreground font-inter text-sm mt-1">Configure integrations and site options</p>
      </div>

      {/* Twitter */}
      <SectionCard icon={Twitter} iconColor="bg-[#1DA1F2]/10 text-[#1DA1F2]" title="Twitter / X Integration" subtitle="Auto-tweets when articles are published">
        <p className="text-muted-foreground font-inter text-xs font-semibold uppercase tracking-wider mb-3">v1.1 Keys (OAuth 1.0a)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          {TWITTER_V1_FIELDS.map(f => (
            <SecretField key={f.key} label={f.label} fieldKey={f.key} value={settings[f.key]} onChange={set} />
          ))}
        </div>
        <div className="border-t border-border/50 pt-5">
          <p className="text-muted-foreground font-inter text-xs font-semibold uppercase tracking-wider mb-3">v2 Keys (OAuth 2.0)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TWITTER_V2_FIELDS.map(f => (
              <SecretField key={f.key} label={f.label} fieldKey={f.key} value={settings[f.key]} onChange={set} />
            ))}
          </div>
        </div>
      </SectionCard>

      {/* PayPal */}
      <SectionCard icon={CreditCard} iconColor="bg-blue-500/10 text-blue-400" title="PayPal Integration" subtitle="Used for membership subscription payments">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PAYPAL_FIELDS.map(f => {
            if (f.type === "select") return (
              <div key={f.key}>
                <label className="block font-inter text-sm font-medium text-foreground mb-1.5">{f.label}</label>
                <select
                  value={settings[f.key] || "sandbox"}
                  onChange={e => set(f.key, e.target.value)}
                  className="w-full bg-secondary border border-border rounded px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  {f.options.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                </select>
              </div>
            );
            if (f.secret) return <SecretField key={f.key} label={f.label} fieldKey={f.key} value={settings[f.key]} onChange={set} />;
            return (
              <div key={f.key}>
                <label className="block font-inter text-sm font-medium text-foreground mb-1.5">{f.label}</label>
                <input
                  value={settings[f.key] || ""}
                  onChange={e => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full bg-secondary border border-border rounded px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>
            );
          })}
        </div>
        <div className="mt-4 p-3 bg-secondary rounded-lg flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-muted-foreground font-inter text-xs">Set Mode to <strong className="text-foreground">sandbox</strong> for testing, <strong className="text-foreground">live</strong> for real payments. Add these credentials to the Subscriptions plan settings as well.</p>
        </div>
      </SectionCard>

      {/* Ads */}
      <SectionCard icon={Megaphone} iconColor="bg-accent/10 text-accent" title="Advertising" subtitle="Ads shown to non-members. Pro members see no ads.">
        <div className="space-y-4">
          <div className="p-3 bg-secondary rounded-lg flex items-start gap-2 mb-2">
            <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <p className="text-muted-foreground font-inter text-xs">
              For <strong className="text-foreground">Google AdSense</strong>: enter your Publisher ID (ca-pub-XXXX) in the field below.<br/>
              For <strong className="text-foreground">Custom ads</strong>: paste raw HTML/embed code (e.g. an image + link) into any slot below.<br/>
              Leave empty to show no ad in that position.
            </p>
          </div>
          {AD_SLOTS.map(slot => (
            <div key={slot.key}>
              <label className="block font-inter text-sm font-medium text-foreground mb-0.5">{slot.label}</label>
              <p className="text-muted-foreground font-inter text-xs mb-1.5">{slot.description}</p>
              <textarea
                value={settings[slot.key] || ""}
                onChange={e => set(slot.key, e.target.value)}
                placeholder={slot.placeholder || "Paste HTML ad code or leave empty..."}
                rows={2}
                className="w-full bg-secondary border border-border rounded px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none font-mono"
              />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Save */}
      <div className="flex items-center gap-3 pb-10">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-oswald font-semibold text-sm tracking-wider uppercase rounded hover:bg-red-700 transition-colors disabled:opacity-40"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Settings
        </button>
        {saved && (
          <div className="flex items-center gap-1.5 text-green-400 font-inter text-sm">
            <CheckCircle className="w-4 h-4" /> Saved!
          </div>
        )}
      </div>
    </div>
  );
}