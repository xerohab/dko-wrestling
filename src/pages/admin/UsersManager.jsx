import { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { UserPlus, Edit2, Loader2, Mail, ChevronDown, Crown, X } from "lucide-react";
import { Link } from "react-router-dom";

export default function UsersManager() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const [inviting, setInviting] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [grantingPro, setGrantingPro] = useState(null);
  const [allPlans, setAllPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState("");

  useEffect(() => {
    if (user?.role !== "admin") { navigate("/admin"); return; }
    base44.functions.invoke("manageUsers", { action: "list" }).then(res => {
      setUsers(res.data?.users || res.users || []);
    }).finally(() => setLoading(false));
    base44.entities.UserSubscription.filter({ status: "active" }).then(setSubscriptions);
    base44.entities.SubscriptionPlan.list("sort_order", 100).then(setAllPlans);
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    await base44.users.inviteUser(inviteEmail.trim(), inviteRole);
    setInviteEmail("");
    setInviting(false);
    alert(`Invitation sent to ${inviteEmail.trim()} as ${inviteRole}`);
  };

  const userSub = (u) => subscriptions.find(s => s.user_email === u.email && s.status === "active");
  const hasProSub = (u) => !!userSub(u);

  const handleAssignSub = async (u) => {
    const plan = allPlans.find(p => p.id === selectedPlan);
    if (!plan) return;
    setGrantingPro(u.id);
    const data = { plan_id: plan.id, plan_name: plan.name, status: "active", start_date: new Date().toISOString() };
    const existing = userSub(u);
    if (existing) {
      await base44.entities.UserSubscription.update(existing.id, data);
    } else {
      await base44.entities.UserSubscription.create({ user_email: u.email, user_id: u.id, ...data });
    }
    const updated = await base44.entities.UserSubscription.filter({ status: "active" });
    setSubscriptions(updated);
    setGrantingPro(null);
    setSelectedPlan("");
  };

  const handleRevokePro = async (u) => {
    if (!window.confirm(`Revoke Pro access for ${u.full_name || u.email}?`)) return;
    setGrantingPro(u.id);
    const sub = subscriptions.find(s => s.user_email === u.email && s.status === "active");
    if (sub) await base44.entities.UserSubscription.update(sub.id, { status: "cancelled" });
    const updated = await base44.entities.UserSubscription.filter({ status: "active" });
    setSubscriptions(updated);
    setGrantingPro(null);
  };

  const roleColor = (role) => {
    if (role === "admin") return "bg-primary/10 text-primary";
    if (role === "editor") return "bg-blue-500/10 text-blue-400";
    return "bg-secondary text-muted-foreground";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-oswald font-bold text-white text-3xl uppercase">Users</h1>
          <p className="text-muted-foreground font-inter text-sm mt-0.5">Manage admins and editors</p>
        </div>
      </div>

      {/* Invite Form */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <h3 className="font-oswald font-bold text-white text-base uppercase mb-4 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-primary" />
          Invite User
        </h3>
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full bg-secondary border border-border rounded pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
          </div>
          <select
            value={inviteRole}
            onChange={e => setInviteRole(e.target.value)}
            className="bg-secondary border border-border rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
          >
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
          <button
            onClick={handleInvite}
            disabled={inviting || !inviteEmail}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-oswald font-semibold text-sm tracking-wider uppercase rounded hover:bg-red-700 transition-colors disabled:opacity-40"
          >
            {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Send Invite
          </button>
        </div>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-4 py-3 font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3 font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-3 font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                <th className="text-right px-4 py-3 font-inter text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map(u => (
                <>
                  <tr
                    key={u.id}
                    onClick={() => setExpandedId(expandedId === u.id ? null : u.id)}
                    className="hover:bg-secondary/30 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-oswald font-bold text-sm">
                          {u.full_name?.[0]?.toUpperCase() || "U"}
                        </div>
                        <span className="text-white font-inter text-sm">{u.full_name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-inter text-sm hidden sm:table-cell">{u.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs font-inter font-medium px-2 py-0.5 rounded capitalize ${roleColor(u.role)}`}>
                          {u.role || "user"}
                        </span>
                        {hasProSub(u) ? (
                          <span className="text-xs font-oswald font-semibold px-2 py-0.5 rounded bg-accent/10 text-accent flex items-center gap-1">
                            <Crown className="w-3 h-3" /> {userSub(u)?.plan_name || "DKO Club"}
                          </span>
                        ) : (
                          <span className="text-xs font-inter px-2 py-0.5 rounded bg-secondary text-muted-foreground">No subscription</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronDown className={`w-4 h-4 text-muted-foreground inline-block transition-transform ${expandedId === u.id ? "rotate-180" : ""}`} />
                    </td>
                  </tr>
                  {expandedId === u.id && (
                    <tr key={`${u.id}-actions`} className="bg-secondary/20 border-b border-border">
                      <td colSpan={4} className="px-4 py-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <Link
                            to={`/admin/users/${u.id}`}
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white font-oswald text-xs font-semibold tracking-wider uppercase rounded hover:bg-red-700 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Edit User
                          </Link>
                          <a
                            href={`mailto:${u.email}`}
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1.5 px-4 py-2 bg-secondary border border-border text-white font-oswald text-xs font-semibold tracking-wider uppercase rounded hover:border-primary transition-colors"
                          >
                            <Mail className="w-3.5 h-3.5" /> Email User
                          </a>
                          <div className="flex items-center gap-2 flex-wrap mt-2 pt-2 border-t border-border/50 w-full">
                            <span className="text-xs font-inter text-muted-foreground uppercase tracking-wider">Subscription</span>
                            <select
                              value={selectedPlan}
                              onChange={e => { e.stopPropagation(); setSelectedPlan(e.target.value); }}
                              onClick={e => e.stopPropagation()}
                              className="bg-secondary border border-border rounded px-2 py-1.5 text-xs text-foreground font-inter focus:outline-none focus:border-primary"
                            >
                              <option value="">{hasProSub(u) ? "Change plan…" : "Select plan…"}</option>
                              {allPlans.map(p => (
                                <option key={p.id} value={p.id}>{p.name} (£{p.price})</option>
                              ))}
                            </select>
                            <button
                              onClick={e => { e.stopPropagation(); handleAssignSub(u); }}
                              disabled={grantingPro === u.id || !selectedPlan}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 border border-accent/40 text-accent font-oswald text-xs font-semibold tracking-wider uppercase rounded hover:bg-accent/20 transition-colors disabled:opacity-40"
                            >
                              {grantingPro === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crown className="w-3.5 h-3.5" />}
                              {hasProSub(u) ? "Change" : "Assign"}
                            </button>
                            {hasProSub(u) && (
                              <button
                                onClick={e => { e.stopPropagation(); handleRevokePro(u); }}
                                disabled={grantingPro === u.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-red-500/40 text-red-400 font-oswald text-xs font-semibold tracking-wider uppercase rounded hover:border-red-500 transition-colors disabled:opacity-40"
                              >
                                {grantingPro === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />} Revoke
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}