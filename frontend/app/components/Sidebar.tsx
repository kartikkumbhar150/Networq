import { Link, useLocation, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import {
  Newspaper, MessageSquare, Trophy, Users, Globe, Ticket, User,
  Home, Lock, UserPlus, CheckCircle, LogOut, LayoutDashboard, Menu, X
} from "lucide-react";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [totalUnread, setTotalUnread] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) {
      const parsed = JSON.parse(u);
      setUser(parsed);

      const fetchUnread = async () => {
        try {
          const res = await fetch(`http://localhost:5000/api/chat/unread/${parsed.id}`, { headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` } });
          const data = await res.json();
          if (data.success) setTotalUnread(data.totalUnread);
        } catch (e) {}
      };

      const fetchProfile = async () => {
        try {
          const res = await fetch(`http://localhost:5000/api/users/${parsed.id}/profile`, { headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` } });
          const data = await res.json();
          if (data.success) setProfileData(data.user);
        } catch (e) {}
      };

      fetchUnread();
      fetchProfile();
      const interval = setInterval(fetchUnread, 30000);
      return () => clearInterval(interval);
    } else {
      setUser(null);
    }
  }, [location.pathname]);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setDrawerOpen(false);
    navigate("/login");
  }

  const navItems = [
    { icon: <LayoutDashboard size={18} />, mobileIcon: <LayoutDashboard size={20} />, label: "Dashboard", href: "/dashboard" },
    { icon: <Newspaper size={18} />, mobileIcon: <Newspaper size={20} />, label: "Feed", href: "/feed" },
    { icon: <MessageSquare size={18} />, mobileIcon: <MessageSquare size={20} />, label: "Messages", href: "/chat", badge: totalUnread },
    { icon: <Users size={18} />, mobileIcon: <Users size={20} />, label: "Network", href: "/network" },
    { icon: <Globe size={18} />, mobileIcon: <Globe size={20} />, label: "Opportunities", href: "/opportunities" },
    { icon: <Ticket size={18} />, mobileIcon: <Ticket size={20} />, label: "Events", href: "/events" },
    { icon: <Trophy size={18} />, mobileIcon: <Trophy size={20} />, label: "Leaderboard", href: "/leaderboard" },
    { icon: <User size={18} />, mobileIcon: <User size={20} />, label: "Profile", href: "/profile" },
  ];

  if (!user) {
    navItems.unshift({ icon: <Home size={18} />, mobileIcon: <Home size={20} />, label: "Home", href: "/" });
    navItems.push({ icon: <Lock size={18} />, mobileIcon: <Lock size={20} />, label: "Sign In", href: "/login" });
    navItems.push({ icon: <UserPlus size={18} />, mobileIcon: <UserPlus size={20} />, label: "Sign Up", href: "/signup" });
  }

  const isActive = (href: string) =>
    location.pathname === href || (href !== "/feed" && location.pathname.startsWith(href));

  // Items shown in bottom bar (most important 5)
  const bottomNavItems = navItems.slice(0, 5);

  // ── Shared Profile Block (used in both sidebar and drawer)
  const ProfileBlock = () => user ? (
    <div className="sidebar-profile">
      <Link to="/profile" className="sidebar-avatar" onClick={() => setDrawerOpen(false)}>
        {profileData?.profile?.profilePhoto
          ? <img src={profileData.profile.profilePhoto} alt={user.name} />
          : <span>{user.name?.[0]?.toUpperCase()}</span>}
      </Link>
      <Link to="/profile" className="sidebar-name" onClick={() => setDrawerOpen(false)}>{user.name}</Link>
      <p className="sidebar-role">
        {profileData?.profile?.headline || user.accountType}
        {user.isVerifiedCompany && <CheckCircle size={12} style={{ color: "var(--accent-from)", marginLeft: 4 }} />}
      </p>
      <div className="sidebar-stats">
        <Link to="/network" className="sidebar-stat-item" onClick={() => setDrawerOpen(false)}>
          <span className="sidebar-stat-num">{profileData?.connectionCount || 0}</span>
          <span className="sidebar-stat-txt">Connections</span>
        </Link>
        <Link to="/profile" className="sidebar-stat-item" onClick={() => setDrawerOpen(false)}>
          <span className="sidebar-stat-num">{profileData?.postCount || 0}</span>
          <span className="sidebar-stat-txt">Posts</span>
        </Link>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* ─────────────────────────────────────
          DESKTOP SIDEBAR (hidden on mobile via CSS)
          ───────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Link to="/" className="logo">HireX</Link>
        </div>

        <ProfileBlock />

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className={`sidebar-link ${isActive(item.href) ? "active" : ""}`}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="sidebar-badge">{item.badge}</span>
              )}
            </Link>
          ))}
        </nav>

        {user && (
          <div className="sidebar-bottom">
            <button className="sidebar-signout" onClick={handleLogout}>
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </aside>

      {/* ─────────────────────────────────────
          MOBILE: Hamburger button (top-left)
          ───────────────────────────────────── */}
      <button
        className="mobile-menu-btn"
        style={{ display: "none" }} // shown by CSS on mobile
        onClick={() => setDrawerOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={20} color="var(--text-primary)" />
      </button>

      {/* ─────────────────────────────────────
          MOBILE: Backdrop overlay
          ───────────────────────────────────── */}
      <div
        className={`mobile-drawer-overlay ${drawerOpen ? "open" : ""}`}
        style={{ display: "none" }} // shown by CSS on mobile
        onClick={() => setDrawerOpen(false)}
      />

      {/* ─────────────────────────────────────
          MOBILE: Slide-in Drawer
          ───────────────────────────────────── */}
      <div
        className={`mobile-drawer ${drawerOpen ? "open" : ""}`}
        style={{ display: "none" }} // shown by CSS on mobile
      >
        {/* Drawer Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 16px", borderBottom: "1px solid var(--border)" }}>
          <Link to="/" className="logo" style={{ fontSize: 22 }} onClick={() => setDrawerOpen(false)}>HireX</Link>
          <button
            onClick={() => setDrawerOpen(false)}
            style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <X size={18} color="var(--text-secondary)" />
          </button>
        </div>

        <ProfileBlock />

        {/* Drawer Nav */}
        <nav style={{ flex: 1, padding: "10px 10px" }}>
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className={`sidebar-link ${isActive(item.href) ? "active" : ""}`}
              onClick={() => setDrawerOpen(false)}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="sidebar-badge">{item.badge}</span>
              )}
            </Link>
          ))}
        </nav>

        {/* Drawer Sign Out */}
        {user && (
          <div className="sidebar-bottom">
            <button className="sidebar-signout" onClick={handleLogout}>
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────
          MOBILE: Bottom Navigation Bar
          ───────────────────────────────────── */}
      <nav
        className="mobile-bottom-nav"
        style={{ display: "none" }} // shown by CSS on mobile
      >
        {bottomNavItems.map((item) => (
          <Link
            key={item.label}
            to={item.href}
            className={`mobile-nav-item ${isActive(item.href) ? "active" : ""}`}
          >
            {item.badge !== undefined && item.badge > 0 && (
              <span className="mobile-nav-item-badge">{item.badge > 9 ? "9+" : item.badge}</span>
            )}
            {item.mobileIcon}
            <span>{item.label}</span>
          </Link>
        ))}

        {/* "More" button opens the drawer */}
        <button
          className="mobile-nav-item"
          onClick={() => setDrawerOpen(true)}
          aria-label="More pages"
        >
          <Menu size={20} />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
