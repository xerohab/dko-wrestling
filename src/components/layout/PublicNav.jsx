import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useContentProtection } from "@/hooks/useContentProtection";
import { Menu, X, Search, ChevronDown, LogIn, LogOut, User, Shield, Bookmark } from "lucide-react";

function NavDropdown({ cat, subs, location }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isActive = location.pathname.startsWith(`/category/${cat.slug}`);

  if (!subs || subs.length === 0) {
    if (cat.link_url) {
      return (
        <a href={cat.link_url} target="_blank" rel="noopener noreferrer" className="px-3 py-2 font-oswald font-medium text-sm tracking-wider uppercase transition-colors hover:text-primary text-foreground">
          {cat.name}
        </a>
      );
    }
    return (
      <Link
        to={`/category/${cat.slug}`}
        className={`px-3 py-2 font-oswald font-medium text-sm tracking-wider uppercase transition-colors hover:text-primary ${isActive ? "text-primary" : "text-foreground"}`}
      >
        {cat.name}
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 px-3 py-2 font-oswald font-medium text-sm tracking-wider uppercase transition-colors hover:text-primary ${isActive ? "text-primary" : "text-foreground"}`}
      >
        {cat.name}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-black border border-border rounded-lg shadow-2xl shadow-black/50 min-w-48 z-50 py-1">
          {subs.map(sub => (
            <SubDropdownItem key={sub.id} sub={sub} grandchildren={sub._grandchildren || []} location={location} onClose={() => setOpen(false)} />
          ))}
        </div>
      )}
    </div>
  );
}

function SubDropdownItem({ sub, allCats = [], location, onClose, grandchildren = [] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const isActive = location.pathname.startsWith(`/category/${sub.slug}`);

  if (grandchildren.length === 0) {
    if (sub.link_url) {
      return (
        <a
          href={sub.link_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          className="block px-4 py-2 font-oswald text-sm uppercase hover:text-white hover:bg-secondary/50 transition-colors text-foreground"
        >
          {sub.name}
        </a>
      );
    }
    return (
      <Link
        to={`/category/${sub.slug}`}
        onClick={onClose}
        className={`block px-4 py-2 font-oswald text-sm uppercase hover:text-white hover:bg-secondary/50 transition-colors ${isActive ? "text-primary" : "text-foreground"}`}
      >
        {sub.name}
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative group">
      <div className="flex items-center justify-between px-4 py-2 hover:bg-secondary/50 cursor-pointer" onClick={() => setOpen(!open)}>
        <span className={`font-oswald text-sm uppercase ${isActive ? "text-primary" : "text-foreground"}`}>{sub.name}</span>
        <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </div>
      {open && (
        <div className="bg-secondary/30 border-t border-border/30">
          {grandchildren.map(gc => (
            gc.link_url ? (
              <a key={gc.id} href={gc.link_url} target="_blank" rel="noopener noreferrer" onClick={onClose} className="block pl-8 pr-4 py-2 font-oswald text-xs uppercase hover:text-white hover:bg-secondary/50 transition-colors text-muted-foreground">
                {gc.name}
              </a>
            ) : (
              <Link
                key={gc.id}
                to={`/category/${gc.slug}`}
                onClick={onClose}
                className={`block pl-8 pr-4 py-2 font-oswald text-xs uppercase hover:text-white hover:bg-secondary/50 transition-colors ${location.pathname === `/category/${gc.slug}` ? "text-primary" : "text-muted-foreground"}`}
              >
                {gc.name}
              </Link>
            )
          ))}
        </div>
      )}
    </div>
  );
}

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isAdmin = user.role === "admin";
  const isEditor = user.role === "editor";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 bg-secondary border border-border rounded hover:border-primary transition-colors"
      >
        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-oswald font-bold text-xs">
          {user.full_name?.[0]?.toUpperCase() || "U"}
        </div>
        <span className="hidden sm:block font-oswald text-xs font-medium text-white uppercase tracking-wide max-w-24 truncate">
          {user.full_name || user.email}
        </span>
        <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-black border border-border rounded-lg shadow-2xl shadow-black/50 min-w-48 z-50 py-1">
          <div className="px-4 py-2 border-b border-border/50">
            <p className="font-inter text-xs text-white font-medium truncate">{user.full_name || "Account"}</p>
            <p className="font-inter text-xs text-muted-foreground truncate">{user.email}</p>
            <span className={`inline-block mt-1 text-xs font-oswald font-semibold uppercase px-1.5 py-0.5 rounded ${
              isAdmin ? "bg-primary/10 text-primary" :
              isEditor ? "bg-blue-500/10 text-blue-400" :
              "bg-secondary text-muted-foreground"
            }`}>
              {isAdmin ? "Admin" : isEditor ? "Editor" : "Member"}
            </span>
          </div>
          <Link
            to="/saved"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2 font-oswald text-sm uppercase text-foreground hover:text-white hover:bg-secondary/50 transition-colors"
          >
            <Bookmark className="w-3.5 h-3.5" /> Saved Articles
          </Link>
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2 font-oswald text-sm uppercase text-foreground hover:text-white hover:bg-secondary/50 transition-colors"
          >
            <User className="w-3.5 h-3.5" /> My Profile
          </Link>
          {(isAdmin || isEditor) && (
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 font-oswald text-sm uppercase text-foreground hover:text-white hover:bg-secondary/50 transition-colors"
            >
              <Shield className="w-3.5 h-3.5" /> Admin Panel
            </Link>
          )}
          <button
            onClick={() => { setOpen(false); onLogout(); }}
            className="w-full flex items-center gap-2 px-4 py-2 font-oswald text-sm uppercase text-muted-foreground hover:text-red-400 hover:bg-secondary/50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Log Out
          </button>
        </div>
      )}
    </div>
  );
}

export default function PublicNav() {
  useContentProtection();
  const [allCats, setAllCats] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    base44.entities.Category.list("sort_order", 200).then(setAllCats).catch(() => {});
    base44.auth.isAuthenticated().then(authed => {
      if (authed) base44.auth.me().then(setCurrentUser).catch(() => {});
    });
  }, []);

  const topLevel = allCats.filter(c => !c.parent_id && (c.usage === "menu" || c.usage === "both" || !c.usage));
  const getSubs = (parentId) => allCats.filter(c => c.parent_id === parentId);

  const handleSearch = (e) => {
    if (e.key === "Enter" && searchVal.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchVal.trim())}`);
      setSearchOpen(false);
      setSearchVal("");
    }
  };

  const handleLogout = () => {
    base44.auth.logout(window.location.href);
  };

  const renderMobileTree = (cats, depth = 0) =>
    cats.map(cat => {
      const children = getSubs(cat.id);
      return (
        <div key={cat.id}>
          <Link
            to={`/category/${cat.slug}`}
            className="flex items-center py-2 font-oswald font-medium text-sm tracking-wider uppercase text-foreground hover:text-primary transition-colors"
            style={{ paddingLeft: `${16 + depth * 16}px` }}
            onClick={() => setMobileOpen(false)}
          >
            {depth > 0 && <ChevronDown className="w-3 h-3 mr-1 rotate-[-90deg] text-muted-foreground" />}
            {cat.name}
          </Link>
          {children.length > 0 && renderMobileTree(children, depth + 1)}
        </div>
      );
    });

  return (
    <header className="bg-black border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src="https://media.base44.com/images/public/6a0fab0df03ef3f099fbfaf0/c427e54b3_DKOWrestling_ChampionsCollide.png" alt="DKO Wrestling" className="h-12 w-auto max-w-[140px] object-contain" />
            <span className="hidden sm:block font-oswald font-bold text-white text-lg tracking-wide">DKO Wrestling</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            <Link
              to="/"
              className={`px-3 py-2 font-oswald font-medium text-sm tracking-wider uppercase transition-colors hover:text-primary ${location.pathname === "/" ? "text-primary" : "text-foreground"}`}
            >
              HOME
            </Link>
            {topLevel.map(cat => (
              <NavDropdown
                key={cat.id}
                cat={cat}
                location={location}
                subs={getSubs(cat.id).map(sub => ({
                  ...sub,
                  _grandchildren: getSubs(sub.id),
                }))}
              />
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {searchOpen ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={searchVal}
                  onChange={e => setSearchVal(e.target.value)}
                  onKeyDown={handleSearch}
                  placeholder="Search..."
                  className="w-40 bg-secondary border border-border rounded px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
                <button onClick={() => { setSearchOpen(false); setSearchVal(""); }} className="p-1.5 text-muted-foreground hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button onClick={() => setSearchOpen(true)} className="p-2 text-muted-foreground hover:text-primary transition-colors">
                <Search className="w-5 h-5" />
              </button>
            )}
            <Link to="/pricing" className="hidden md:inline-flex px-3 py-1.5 bg-accent/10 border border-accent/40 text-accent font-oswald text-xs font-medium tracking-wider uppercase rounded hover:bg-accent/20 transition-colors">
              MEMBERSHIP
            </Link>
            {currentUser ? (
              <div className="hidden md:block">
                <UserMenu user={currentUser} onLogout={handleLogout} />
              </div>
            ) : (
              <button
                onClick={() => base44.auth.redirectToLogin(window.location.href)}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white font-oswald text-xs font-medium tracking-wider uppercase rounded hover:bg-red-700 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" /> LOGIN
              </button>
            )}
            <button className="md:hidden p-2 text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <nav className="md:hidden border-t border-border py-3 flex flex-col">
            <Link to="/" className="px-4 py-2 font-oswald font-medium text-sm tracking-wider uppercase text-foreground hover:text-primary" onClick={() => setMobileOpen(false)}>HOME</Link>
            {renderMobileTree(topLevel)}
            <Link to="/pricing" className="px-4 py-2 font-oswald font-medium text-sm tracking-wider uppercase text-accent" onClick={() => setMobileOpen(false)}>MEMBERSHIP</Link>
            {currentUser ? (
              <>
                <div className="px-4 py-2 border-t border-border/50 mt-1">
                  <p className="font-inter text-xs text-muted-foreground">{currentUser.email}</p>
                  <p className="font-oswald text-sm font-bold text-white uppercase">{currentUser.full_name}</p>
                </div>
                <Link
                  to="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-2 font-oswald font-medium text-sm tracking-wider uppercase text-foreground hover:text-white hover:bg-secondary/50 transition-colors flex items-center gap-2"
                >
                  <User className="w-4 h-4" /> MY PROFILE
                </Link>
                {(currentUser.role === "admin" || currentUser.role === "editor") && (
                  <Link to="/admin" className="px-4 py-2 font-oswald font-medium text-sm tracking-wider uppercase text-primary flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                    <Shield className="w-4 h-4" /> ADMIN PANEL
                  </Link>
                )}
                <button onClick={() => { setMobileOpen(false); handleLogout(); }} className="px-4 py-2 font-oswald font-medium text-sm tracking-wider uppercase text-red-400 flex items-center gap-2">
                  <LogOut className="w-4 h-4" /> LOG OUT
                </button>
              </>
            ) : (
              <button
                onClick={() => { setMobileOpen(false); base44.auth.redirectToLogin(window.location.href); }}
                className="px-4 py-2 mt-1 font-oswald font-medium text-sm tracking-wider uppercase text-primary flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" /> LOGIN
              </button>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}