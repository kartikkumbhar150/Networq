import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  ChevronDown,
  ArrowRight,
  BadgeCheck,
  Briefcase,
  TrendingUp,
  Handshake,
  Zap,
  Users,
  Star,
} from "lucide-react";
import landingStyles from "../styles/landing.css?url";

export function meta() {
  return [
    { title: "HireX | Where Professionals, Founders & Investors Connect" },
    {
      name: "description",
      content:
        "A unified platform for career growth, capital raising, and enterprise alliances — with biometric trust, AI-powered matching, and real-time collaboration built in.",
    },
  ];
}

export function links() {
  return [{ rel: "stylesheet", href: landingStyles }];
}

const PILLARS = [
  {
    icon: Briefcase,
    title: "Jobs & Gigs",
    description:
      "Full-time roles, freelance work, and internships — with fixed-price or milestone-based payouts built in.",
    stat: "12,400+ open roles",
  },
  {
    icon: TrendingUp,
    title: "Funding",
    description:
      "Founders raise from Seed to Series C. List your round, equity offered, and valuation to reach vetted investors.",
    stat: "$84M+ raised on HireX",
  },
  {
    icon: Handshake,
    title: "Partnerships",
    description:
      "Find joint ventures, co-marketing deals, and API integrations with companies who are ready to move.",
    stat: "3,100+ alliances formed",
  },
];

export default function Home() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* ── Navigation ── */}
      <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
        <div className="nav-left">
          <Link to="/" className="nav-logo">
            <svg className="nav-logo-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-5l4 2.5-4 2.5zm1-9.5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
            </svg>
            HireX
          </Link>
          <ul className="nav-links">
            <li><span>Features</span> <ChevronDown /></li>
            <li><span>Opportunities</span></li>
            <li><span>How It Works</span></li>
            <li><span>Stories</span></li>
          </ul>
        </div>
        <div className="nav-right">
          <Link to="/login" className="nav-login">Sign In</Link>
          <Link to="/signup" className="btn-primary">Join Free</Link>
        </div>
      </nav>

      <main>
        {/* ── Hero ── */}
        <section className="hero-section">
          {/* Left: Copy */}
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="dot" />
              Verified professionals only
            </span>

            <h1 className="hero-title">
              Where Professionals,<br />
              Founders &amp; Investors<br />
              <span className="highlight">Connect.</span>
            </h1>

            <p className="hero-sub">
              A unified platform for career growth, capital raising, and
              enterprise alliances — biometric trust and AI matching built in.
            </p>

            <div className="hero-actions">
              <Link to="/signup" className="btn-primary btn-hero">
                Get Started Free <ArrowRight size={16} />
              </Link>
              <a href="#features" className="btn-secondary btn-hero">
                See How It Works
              </a>
            </div>

            <div className="hero-trust">
              <div className="trust-avatars">
                <span style={{ background: "#F26522" }}>MK</span>
                <span style={{ background: "#1A1A1A" }}>RS</span>
                <span style={{ background: "#6B7280" }}>AN</span>
                <span style={{ background: "#2E9E5B" }}>PL</span>
              </div>
              <p className="trust-text">
                <strong>48,000+</strong> verified members already inside
              </p>
            </div>
          </div>

          {/* Right: Image + Floating Badges */}
          <div className="hero-visual">
            {/* Soft blob behind the image */}
            <div className="hero-blob" />

            {/* The person image */}
            <img
              src="/hero-person.png"
              alt="Professional using HireX"
              className="hero-img"
            />

            {/* ── Floating Badge 1: Top-left — Verified */}
            <div className="chip chip-verified chip-top-left">
              <BadgeCheck size={15} />
              Biometric Verified
            </div>

            {/* ── Floating Badge 2: Top-right — AI Match */}
            <div className="chip chip-match chip-top-right">
              <div className="chip-match-score">98%</div>
              <div className="chip-match-meta">
                <span className="chip-match-label">AI Synergy Match</span>
                <span className="chip-match-sub">↑ Top 2% of candidates</span>
              </div>
            </div>

            {/* ── Floating Badge 3: Mid-left — Live role */}
            <div className="chip chip-role chip-mid-left">
              <div className="chip-role-avatar">AT</div>
              <div>
                <div className="chip-role-title">Senior ML Engineer</div>
                <div className="chip-role-meta">Atlas Robotics · $140k · Remote</div>
              </div>
              <span className="chip-role-badge">New</span>
            </div>

            {/* ── Floating Badge 4: Bottom-right — Funding */}
            <div className="chip chip-funding chip-bot-right">
              <div className="chip-funding-icon">
                <Zap size={14} />
              </div>
              <div>
                <div className="chip-funding-amount">$2.5M Seed</div>
                <div className="chip-funding-label">Horizon Ventures — Open</div>
              </div>
            </div>

            {/* ── Floating Badge 5: Bottom-left — Social proof */}
            <div className="chip chip-social chip-bot-left">
              <div className="chip-stars">
                <Star size={11} fill="#F26522" stroke="none" />
                <Star size={11} fill="#F26522" stroke="none" />
                <Star size={11} fill="#F26522" stroke="none" />
                <Star size={11} fill="#F26522" stroke="none" />
                <Star size={11} fill="#F26522" stroke="none" />
              </div>
              <span>"Closed my seed round in 3 weeks."</span>
            </div>
          </div>
        </section>

        {/* ── Pillars ── */}
        <section className="pillars" id="features">
          <div className="pillars-head">
            <span className="eyebrow">
              <span className="dot" />
              The Opportunities Hub
            </span>
            <h2>Three ways to grow, one platform</h2>
            <p>
              Every opportunity on HireX is verified and structured — so you
              spend your time deciding, not digging.
            </p>
          </div>

          <div className="pillars-grid">
            {PILLARS.map(({ icon: Icon, title, description, stat }) => (
              <div className="pillar-card" key={title}>
                <div className="pillar-icon">
                  <Icon />
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
                <div className="pillar-stat">
                  <span>●</span> {stat}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Social Proof Bar ── */}
        <div className="proof-bar">
          {[
            { icon: Users, value: "48k+", label: "Verified Members" },
            { icon: Briefcase, value: "12.4k+", label: "Open Roles" },
            { icon: TrendingUp, value: "$84M+", label: "Capital Raised" },
            { icon: Handshake, value: "3,100+", label: "Alliances Formed" },
          ].map(({ icon: Icon, value, label }) => (
            <div className="proof-item" key={label}>
              <Icon size={20} />
              <span className="proof-value">{value}</span>
              <span className="proof-label">{label}</span>
            </div>
          ))}
        </div>

        {/* ── CTA strip ── */}
        <section className="cta-strip">
          <div className="cta-inner">
            <div className="cta-copy">
              <h2>Get verified. Get matched. Get moving.</h2>
              <p>
                Complete biometric verification in minutes and start seeing
                opportunities built for exactly who you are.
              </p>
            </div>
            <Link to="/signup" className="btn-primary btn-hero">
              Join for Free <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}