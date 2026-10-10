import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, FileText, Image, Tag, Settings, Users, LogOut, ChevronRight, UserCircle, MessageCircle, TrendingUp, Crown, Megaphone, Mail, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";

const adminLinks = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/articles", label: "Articles", icon: FileText },
  { to: "/admin/media", label: "Media Library", icon: Image },
  { to: "/admin/analytics", label: "Analytics", icon: TrendingUp },
  { to: "/admin/comments", label: "Comments", icon: MessageCircle },
  { to: "/admin/communications", label: "Communications", icon: Mail },
  { to: "/admin/subscriptions", label: "Subscriptions", icon: Crown, adminOnly: true },
  { to: "/admin/ads", label: "Ads Manager", icon: Megaphone, adminOnly: true },
  { to: "/admin/categories", label: "Categories", icon: Tag, adminOnly: true },
  { to: "/admin/users", label: "Users", icon: Users, adminOnly: true },
  { to: "/admin/perksphere", label: "Perk Sphere", icon: ShieldCheck, adminOnly: true },
  { to: "/admin/settings", label: "Settings", icon: Settings, adminOnly: true },
];

export default function AdminSidebar({ user }) {
  const location = useLocation();
  const isAdmin = user?.role === "admin";

  const links = adminLinks.filter(l => !l.adminOnly || isAdmin);

  const isActive = (link) => {
    if (link.exact) return location.pathname === link.to;
    return location.pathname.startsWith(link.to);
  };

  return (
    <aside className="w-60 shrink-0 bg-sidebar border-r border-sidebar-border min-h-screen flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-sidebar-border">
        <Link to="/" className="block">
          <div className="font-oswald font-bold text-white text-base tracking-wide leading-tight">DKO Wrestling</div>
          <div className="font-oswald font-light text-muted-foreground text-xs tracking-wide">&amp; Entertainment</div>
        </Link>
        <div className="mt-2 text-xs font-inter text-muted-foreground">
          {isAdmin ? "Admin Panel" : "Editor Panel"}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map(link => {
          const Icon = link.icon;
          const active = isActive(link);
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm font-inter font-medium transition-all group ${
                active
                  ? "bg-primary text-white"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{link.label}</span>
              {active && <ChevronRight className="w-3 h-3" />}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-4 py-4 border-t border-sidebar-border">
        <Link to="/profile" className="flex items-center gap-3 mb-3 hover:opacity-80 transition-opacity">
           <div className="w-8 h-8 rounded-full bg-primary overflow-hidden flex items-center justify-center text-white text-xs font-oswald font-bold shrink-0">
             {user?.avatar
               ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
               : (user?.full_name?.[0]?.toUpperCase() || "U")
             }
           </div>
           <div className="flex-1 min-w-0">
             <div className="text-sm font-inter font-medium text-white truncate">{user?.display_name || user?.full_name || "User"}</div>
             <div className="text-xs text-muted-foreground capitalize">{user?.role || "editor"}</div>
           </div>
         </Link>
         <Link
           to="/profile"
           className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-muted-foreground hover:text-white hover:bg-sidebar-accent transition-colors mb-1"
         >
           <UserCircle className="w-4 h-4" />
           My Profile
         </Link>
        <button
          onClick={() => base44.auth.logout("/")}
          className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-muted-foreground hover:text-white hover:bg-sidebar-accent transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}