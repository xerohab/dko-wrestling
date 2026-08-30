import { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Crown, Plus, Edit2, Trash2, Check, X, Loader2, Star, Users, Lock } from "lucide-react";

export default function SubscriptionsManager() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("plans");
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "", interval: "monthly", features: "", is_active: true, highlight: false, paypal_plan_id: "", grants_paywall_access: false });

  useEffect(() => {
    if (user?.role !== "admin") { navigate("/admin"); return; }
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const [p, s] = await Promise.all([
      base44.entities.SubscriptionPlan.list("sort_order", 50),
      base44.entities.UserSubscription.list("-created_date", 100),
    ]);
    setPlans(p);
    setSubscribers(s);
    setLoading(false);
  };

  const openEdit = (plan) => {
    setEditing(plan.id);
    setForm({
      name: plan.name || "",
      description: plan.description || "",
      price: plan.price?.toString() || "",
      interval: plan.interval || "monthly",
      features: (plan.features || []).join("\n"),
      is_active: plan.is_active !== false,
      highlight: plan.highlight || false,
      paypal_plan_id: plan.paypal_plan_id || "",
      grants_paywall_access: plan.grants_paywall_access || false,
    });
    setShowForm(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", description: "", price: "", interval: "monthly", features: "", is_active: true, highlight: false, paypal_plan_id: "", grants_paywall_access: false });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price) return;
    setSaving(true);
    const data = {
      name: form.name,
      description: form.description,
      price: parseFloat(form.price),
      interval: form.interval,
      features: form.features.split("\n").filter(f => f.trim()),
      is_active: form.is_active,
      highlight: form.highlight,
      paypal_plan_id: form.paypal_plan_id,
      grants_paywall_access: form.grants_paywall_access,
      sort_order: plans.length,
    };
    if (editing) {
      await base44.entities.SubscriptionPlan.update(editing, data);
    } else {
      await base44.entities.SubscriptionPlan.create(data);
    }
    setShowForm(false);
    setEditing(null);
    setSaving(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this plan?")) return;
    await base44.entities.SubscriptionPlan.delete(id);
    setPlans(prev => prev.filter(p => p.id !== id));
  };

  const statusColor = (s) => s === "active" ? "bg-green-500/10 text-green-400" : s === "cancelled" ? "bg-red-500/10 text-red-400" : "bg-yellow-500/10 text-yellow-400";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-oswald font-bold text-white text-3xl uppercase flex items-center gap-3">
            <Crown className="w-7 h-7 text-accent" /> Subscriptions
          </h1>
          <p className="text-muted-foreground font-inter text-sm mt-0.5">Manage plans and subscribers</p>
        </div>
        {tab === "plans" && (
          <button onClick={openNew} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-oswald font-semibold text-sm tracking-wider uppercase rounded hover:bg-red-700 transition-colors">
            <Plus className="w-4 h-4" /> New Plan
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-oswald font-bold text-white">{plans.filter(p => p.is_active).length}</div>
          <div className="text-muted-foreground font-inter text-xs mt-0.5">Active Plans</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-oswald font-bold text-white">{subscribers.filter(s => s.status === "active").length}</div>
          <div className="text-muted-foreground font-inter text-xs mt-0.5">Active Subscribers</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-oswald font-bold text-accent">
            £{subscribers.filter(s => s.status === "active").reduce((acc, s) => {
              const plan = plans.find(p => p.id === s.plan_id);
              return acc + (plan?.price || 0);
            }, 0).toFixed(2)}
          </div>
          <div className="text-muted-foreground font-inter text-xs mt-0.5">Monthly Revenue</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {["plans", "subscribers"].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded font-oswald text-sm uppercase tracking-wider transition-colors ${tab === t ? "bg-primary text-white" : "bg-secondary border border-border text-muted-foreground hover:text-white"}`}>
            {t === "plans" ? `Plans (${plans.length})` : `Subscribers (${subscribers.length})`}
          </button>
        ))}
      </div>

      {/* Plan Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-oswald font-bold text-white text-xl uppercase">{editing ? "Edit Plan" : "New Plan"}</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-inter font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Plan Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Gold Member" className="w-full bg-secondary border border-border rounded px-3 py-2.5 text-white font-inter text-sm focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-xs font-inter font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Description</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short plan description" className="w-full bg-secondary border border-border rounded px-3 py-2.5 text-white font-inter text-sm focus:outline-none focus:border-accent" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-inter font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Price (£) *</label>
                  <input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="4.99" className="w-full bg-secondary border border-border rounded px-3 py-2.5 text-white font-inter text-sm focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="block text-xs font-inter font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Billing</label>
                  <select value={form.interval} onChange={e => setForm(f => ({ ...f, interval: e.target.value }))} className="w-full bg-secondary border border-border rounded px-3 py-2.5 text-white font-inter text-sm focus:outline-none focus:border-accent">
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-inter font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Features (one per line)</label>
                <textarea value={form.features} onChange={e => setForm(f => ({ ...f, features: e.target.value }))} placeholder={"Ad-free browsing\nExclusive content\nEarly access"} rows={4} className="w-full bg-secondary border border-border rounded px-3 py-2.5 text-white font-inter text-sm focus:outline-none focus:border-accent resize-none" />
              </div>
              <div>
                <label className="block text-xs font-inter font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">PayPal Plan ID</label>
                <input value={form.paypal_plan_id} onChange={e => setForm(f => ({ ...f, paypal_plan_id: e.target.value }))} placeholder="P-XXXXXXXXXXXXXXXXXX" className="w-full bg-secondary border border-border rounded px-3 py-2.5 text-white font-inter text-sm focus:outline-none focus:border-accent" />
                <p className="text-muted-foreground font-inter text-xs mt-1">Create subscription plans in your PayPal dashboard and paste the plan ID here.</p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.highlight} onChange={e => setForm(f => ({ ...f, highlight: e.target.checked }))} className="rounded" />
                  <span className="text-white font-inter text-sm flex items-center gap-1"><Star className="w-3.5 h-3.5 text-accent" /> Featured plan</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
                  <span className="text-white font-inter text-sm">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.grants_paywall_access} onChange={e => setForm(f => ({ ...f, grants_paywall_access: e.target.checked }))} className="rounded" />
                  <span className="text-white font-inter text-sm flex items-center gap-1"><Lock className="w-3.5 h-3.5 text-accent" /> Unlocks paywall</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 bg-secondary border border-border text-foreground font-inter text-sm rounded hover:border-primary transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white font-oswald font-semibold text-sm uppercase rounded hover:bg-red-700 transition-colors disabled:opacity-40">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>
      ) : tab === "plans" ? (
        plans.length === 0 ? (
          <div className="bg-card border border-border rounded-xl text-center py-16 text-muted-foreground font-inter text-sm">No plans yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map(plan => (
              <div key={plan.id} className={`bg-card border rounded-xl p-5 relative ${plan.highlight ? "border-accent" : "border-border"}`}>
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-black text-xs font-oswald font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">Most Popular</div>
                )}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-oswald font-bold text-white text-lg uppercase">{plan.name}</h3>
                    <p className="text-muted-foreground font-inter text-xs">{plan.description}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-inter px-2 py-0.5 rounded ${plan.is_active ? "bg-green-500/10 text-green-400" : "bg-secondary text-muted-foreground"}`}>
                      {plan.is_active ? "Active" : "Inactive"}
                    </span>
                    {plan.grants_paywall_access && (
                      <span className="text-xs font-inter px-2 py-0.5 rounded bg-accent/10 text-accent flex items-center gap-1"><Lock className="w-3 h-3" /> Paywall</span>
                    )}
                  </div>
                </div>
                <div className="mb-4">
                  <span className="font-oswald font-bold text-3xl text-accent">£{plan.price}</span>
                  <span className="text-muted-foreground font-inter text-sm">/{plan.interval}</span>
                </div>
                {plan.features?.length > 0 && (
                  <ul className="space-y-1 mb-4">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-foreground font-inter text-xs">
                        <Check className="w-3 h-3 text-accent shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                )}
                {plan.paypal_plan_id && (
                  <div className="text-muted-foreground font-inter text-xs mb-3 font-mono truncate">{plan.paypal_plan_id}</div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => openEdit(plan)} className="flex-1 flex items-center justify-center gap-1 py-2 bg-secondary border border-border text-white font-inter text-xs rounded hover:border-accent transition-colors">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => handleDelete(plan.id)} className="p-2 text-muted-foreground hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {subscribers.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground font-inter text-sm">No subscribers yet.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left px-4 py-3 font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Plan</th>
                  <th className="text-left px-4 py-3 font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subscribers.map(s => (
                  <tr key={s.id} className="hover:bg-secondary/20">
                    <td className="px-4 py-3 text-white font-inter text-sm">{s.user_email}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-accent font-oswald text-sm font-semibold uppercase">{s.plan_name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-inter px-2 py-0.5 rounded capitalize ${statusColor(s.status)}`}>{s.status}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-inter text-xs hidden md:table-cell">
                      {s.start_date ? new Date(s.start_date).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}