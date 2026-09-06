import { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Crown, Plus, Edit2, Trash2, Check, X, Loader2, Star, Users, Lock, EyeOff, UserPlus } from "lucide-react";

export default function SubscriptionsManager() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("plans");
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "", interval: "monthly", features: "", is_active: true, highlight: false, paypal_plan_id: "", grants_paywall_access: false, is_hidden: false });

  // Assign plan modal state
  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState({ user_id: "", plan_id: "", status: "active" });
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (user?.role !== "admin") { navigate("/admin"); return; }
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const [p, s, u] = await Promise.all([
      base44.entities.SubscriptionPlan.list("sort_order", 50),
      base44.entities.UserSubscription.list("-created_date", 100),
      base44.entities.User.list("-created_date", 200),
    ]);
    setPlans(p);
    setSubscribers(s);
    setAllUsers(u.filter(usr => usr.email));
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
      is_hidden: plan.is_hidden || false,
    });
    setShowForm(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", description: "", price: "", interval: "monthly", features: "", is_active: true, highlight: false, paypal_plan_id: "", grants_paywall_access: false, is_hidden: false });
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
      is_hidden: form.is_hidden,
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

  const openAssign = () => {
    setAssignForm({ user_id: "", plan_id: "", status: "active" });
    setShowAssign(true);
  };

  const handleAssign = async () => {
    if (!assignForm.user_id || !assignForm.plan_id) return;
    setAssigning(true);
    const usr = allUsers.find(u => u.id === assignForm.user_id);
    const plan = plans.find(p => p.id === assignForm.plan_id);
    if (!usr || !plan) { setAssigning(false); return; }

    // Cancel any existing active subscription for this user first
    const existing = subscribers.filter(s => s.user_email === usr.email && s.status === "active");
    for (const s of existing) {
      await base44.entities.UserSubscription.update(s.id, { status: "cancelled", end_date: new Date().toISOString() });
    }

    await base44.entities.UserSubscription.create({
      user_email: usr.email,
      user_id: usr.id,
      plan_id: plan.id,
      plan_name: plan.name,
      status: assignForm.status,
      start_date: new Date().toISOString(),
      end_date: plan.interval === "one_time" ? null : undefined,
    });
    setShowAssign(false);
    setAssigning(false);
    load();
  };

  const handleCancelSub = async (subId) => {
    if (!confirm("Cancel this subscription?")) return;
    await base44.entities.UserSubscription.update(subId, { status: "cancelled", end_date: new Date().toISOString() });
    load();
  };

  const statusColor = (s) => s === "active" ? "bg-green-500/10 text-green-400" : s === "cancelled" ? "bg-red-500/10 text-red-400" : "bg-yellow-500/10 text-yellow-400";
  const intervalLabel = (i) => i === "one_time" ? "One-time" : i;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-oswald font-bold text-white text-3xl uppercase flex items-center gap-3">
            <Crown className="w-7 h-7 text-accent" /> Subscriptions
          </h1>
          <p className="text-muted-foreground font-inter text-sm mt-0.5">Manage plans and subscribers</p>
        </div>
        <div className="flex items-center gap-2">
          {tab === "subscribers" && (
            <button onClick={openAssign} className="flex items-center gap-2 px-5 py-2.5 bg-accent text-black font-oswald font-semibold text-sm tracking-wider uppercase rounded hover:brightness-110 transition-colors">
              <UserPlus className="w-4 h-4" /> Assign Plan
            </button>
          )}
          {tab === "plans" && (
            <button onClick={openNew} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-oswald font-semibold text-sm tracking-wider uppercase rounded hover:bg-red-700 transition-colors">
              <Plus className="w-4 h-4" /> New Plan
            </button>
          )}
        </div>
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
                    <option value="one_time">One-time (Lifetime)</option>
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
                <p className="text-muted-foreground font-inter text-xs mt-1">Leave blank for staff-assigned plans (e.g. Lifetime).</p>
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
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_hidden} onChange={e => setForm(f => ({ ...f, is_hidden: e.target.checked }))} className="rounded" />
                  <span className="text-white font-inter text-sm flex items-center gap-1"><EyeOff className="w-3.5 h-3.5 text-accent" /> Hidden from public</span>
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

      {/* Assign Plan Modal */}
      {showAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-oswald font-bold text-white text-xl uppercase flex items-center gap-2"><UserPlus className="w-5 h-5 text-accent" /> Assign Plan</h2>
              <button onClick={() => setShowAssign(false)} className="text-muted-foreground hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-inter font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">User *</label>
                <select value={assignForm.user_id} onChange={e => setAssignForm(f => ({ ...f, user_id: e.target.value }))} className="w-full bg-secondary border border-border rounded px-3 py-2.5 text-white font-inter text-sm focus:outline-none focus:border-accent">
                  <option value="">Select user…</option>
                  {allUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.email} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-inter font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Plan *</label>
                <select value={assignForm.plan_id} onChange={e => setAssignForm(f => ({ ...f, plan_id: e.target.value }))} className="w-full bg-secondary border border-border rounded px-3 py-2.5 text-white font-inter text-sm focus:outline-none focus:border-accent">
                  <option value="">Select plan…</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name} — £{p.price} ({intervalLabel(p.interval)}){p.is_hidden ? " [Hidden]" : ""}</option>
                  ))}
                </select>
                <p className="text-muted-foreground font-inter text-xs mt-1">Hidden plans (e.g. Lifetime) are only assignable here by staff.</p>
              </div>
              <div>
                <label className="block text-xs font-inter font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Status</label>
                <select value={assignForm.status} onChange={e => setAssignForm(f => ({ ...f, status: e.target.value }))} className="w-full bg-secondary border border-border rounded px-3 py-2.5 text-white font-inter text-sm focus:outline-none focus:border-accent">
                  <option value="active">Active</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAssign(false)} className="flex-1 px-4 py-2.5 bg-secondary border border-border text-foreground font-inter text-sm rounded hover:border-primary transition-colors">Cancel</button>
              <button onClick={handleAssign} disabled={assigning || !assignForm.user_id || !assignForm.plan_id} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-black font-oswald font-semibold text-sm uppercase rounded hover:brightness-110 transition-colors disabled:opacity-40">
                {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Assign
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
                    <h3 className="font-oswald font-bold text-white text-lg uppercase flex items-center gap-2">
                      {plan.name}
                      {plan.is_hidden && <EyeOff className="w-4 h-4 text-muted-foreground" />}
                    </h3>
                    <p className="text-muted-foreground font-inter text-xs">{plan.description}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {plan.is_hidden && (
                      <span className="text-xs font-inter px-2 py-0.5 rounded bg-secondary text-muted-foreground flex items-center gap-1"><EyeOff className="w-3 h-3" /> Hidden</span>
                    )}
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
                  <span className="text-muted-foreground font-inter text-sm">/{intervalLabel(plan.interval)}</span>
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
            <div className="text-center py-16 text-muted-foreground font-inter text-sm">No subscribers yet. Click "Assign Plan" to add one.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left px-4 py-3 font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Plan</th>
                  <th className="text-left px-4 py-3 font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Date</th>
                  <th className="px-4 py-3"></th>
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
                    <td className="px-4 py-3 text-right">
                      {s.status === "active" && (
                        <button onClick={() => handleCancelSub(s.id)} className="text-muted-foreground hover:text-red-400 font-inter text-xs transition-colors">Cancel</button>
                      )}
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