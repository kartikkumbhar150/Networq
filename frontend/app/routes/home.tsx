import { useEffect } from "react";
import { Link } from "react-router";
import landingStyles from "../styles/landing.css?url";

export function meta() {
  return [
    { title: "HireX – The Professional Network, Reimagined" },
    {
      name: "description",
      content:
        "HireX is a next-generation professional network combining a social feed, AI-powered opportunity discovery, biometric trust, and real-time collaboration — for professionals, founders, and investors.",
    },
  ];
}

export function links() {
  return [
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap",
    },
    { rel: "stylesheet", href: landingStyles },
  ];
}

export default function Home() {
  useEffect(() => {
    // ── Scattered decorative squares ──
    const bgSquaresContainer = document.getElementById("bg-squares");
    if (bgSquaresContainer && bgSquaresContainer.children.length === 0) {
      const squareData = [
        // [top%, left%, size, opacity, delay]
        [8,  14, 8,  0.22, 0],
        [12, 32, 5,  0.16, 1.2],
        [6,  68, 7,  0.18, 0.5],
        [15, 82, 5,  0.14, 2.1],
        [22, 6,  10, 0.20, 0.8],
        [28, 44, 6,  0.15, 1.8],
        [35, 88, 8,  0.18, 0.3],
        [42, 18, 5,  0.14, 2.4],
        [48, 56, 7,  0.16, 1.0],
        [55, 78, 9,  0.20, 0.6],
        [62, 8,  6,  0.17, 1.5],
        [68, 36, 5,  0.13, 2.8],
        [72, 62, 8,  0.19, 0.2],
        [78, 90, 6,  0.15, 1.7],
        [82, 26, 7,  0.16, 0.9],
        [88, 50, 5,  0.14, 2.2],
        [92, 74, 9,  0.21, 0.4],
        [96, 12, 6,  0.15, 1.3],
        [18, 95, 7,  0.17, 2.6],
        [38, 2,  5,  0.14, 0.7],
        [58, 47, 6,  0.16, 3.0],
        [74, 3,  8,  0.18, 1.1],
        [4,  48, 5,  0.13, 2.9],
        [50, 97, 7,  0.17, 0.1],
      ];
      squareData.forEach(([top, left, size, opacity, delay]) => {
        const sq = document.createElement("div");
        sq.className = "bg-sq";
        sq.style.cssText = `top:${top}%;left:${left}%;width:${size}px;height:${size}px;opacity:${opacity};animation-delay:${delay}s;animation-duration:${10 + Math.random() * 6}s;`;
        bgSquaresContainer.appendChild(sq);
      });
    }

    // ── Three.js particle network ──
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    script.async = true;
    script.onload = initThree;
    document.body.appendChild(script);

    function initThree() {
      // @ts-ignore
      const THREE = window.THREE;
      if (!THREE) return;

      const canvas = document.getElementById("c") as HTMLCanvasElement;
      if (!canvas) return;

      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.z = 90;

      // ── Particles ──
      const N = 1800;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(N * 3);
      const col = new Float32Array(N * 3);

      // Warm orange-cream palette matching the screenshot
      const palettes = [
        [242 / 255, 101 / 255,  34 / 255],  // orange
        [255 / 255, 140 / 255,  66 / 255],  // orange-2
        [255 / 255, 179 / 255, 128 / 255],  // orange-3
        [220 / 255, 170 / 255, 130 / 255],  // warm tan
        [255 / 255, 220 / 255, 190 / 255],  // light cream-orange
      ];

      for (let i = 0; i < N; i++) {
        const i3 = i * 3;
        const r = 190 * Math.cbrt(Math.random());
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        pos[i3]     = r * Math.sin(phi) * Math.cos(theta);
        pos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.52;
        pos[i3 + 2] = r * Math.cos(phi) * 0.68;

        const p = palettes[Math.floor(Math.random() * palettes.length)];
        col[i3]     = p[0];
        col[i3 + 1] = p[1];
        col[i3 + 2] = p[2];
      }

      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("color",    new THREE.BufferAttribute(col, 3));

      const mat = new THREE.PointsMaterial({
        size: 1.0, vertexColors: true,
        transparent: true, opacity: 0.45, sizeAttenuation: true,
      });
      const points = new THREE.Points(geo, mat);
      scene.add(points);

      // ── Connection lines ──
      const SAMPLE = 150;
      const lineVerts: number[] = [];
      for (let i = 0; i < SAMPLE; i++) {
        const i3 = i * 3;
        for (let j = i + 1; j < SAMPLE; j++) {
          const j3 = j * 3;
          const dx = pos[i3] - pos[j3];
          const dy = pos[i3 + 1] - pos[j3 + 1];
          const dz = pos[i3 + 2] - pos[j3 + 2];
          if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 44) {
            lineVerts.push(pos[i3], pos[i3 + 1], pos[i3 + 2], pos[j3], pos[j3 + 1], pos[j3 + 2]);
          }
        }
      }
      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(lineVerts, 3));
      scene.add(new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({
        color: 0xF26522, transparent: true, opacity: 0.065,
      })));

      // ── Wireframe orbs — matching the screenshot's left/right spheres ──
      const orbGeo = new THREE.SphereGeometry(1, 14, 14);
      const orbConfigs = [
        { x: -68, y: 18,  z: -25, s: 20, op: 0.10 },  // left large sphere
        { x:  78, y: -18, z: -45, s: 26, op: 0.08 },  // right large sphere
        { x:  15, y: -52, z: -12, s: 13, op: 0.10 },  // bottom center
        { x: -30, y:  50, z: -30, s: 10, op: 0.07 },  // top left small
        { x:  65, y:  40, z: -35, s: 16, op: 0.07 },  // top right
      ];

      const orbs = orbConfigs.map((d) => {
        const m = new THREE.MeshBasicMaterial({
          color: 0xF26522, transparent: true, opacity: d.op, wireframe: true,
        });
        const mesh = new THREE.Mesh(orbGeo, m);
        mesh.scale.setScalar(d.s);
        mesh.position.set(d.x, d.y, d.z);
        scene.add(mesh);
        return mesh;
      });

      // ── Mouse + scroll tracking ──
      let mx = 0, my = 0, tmx = 0, tmy = 0, scrollY = 0;

      const onMouseMove = (e: MouseEvent) => {
        mx = (e.clientX / window.innerWidth  - 0.5) * 2;
        my = (e.clientY / window.innerHeight - 0.5) * 2;
      };
      document.addEventListener("mousemove", onMouseMove);

      const onScroll = () => { scrollY = window.scrollY; };
      window.addEventListener("scroll", onScroll, { passive: true });

      const clock = new THREE.Clock();
      let reqId: number;

      (function animate() {
        reqId = requestAnimationFrame(animate);
        const t = clock.getElapsedTime();
        tmx += (mx - tmx) * 0.04;
        tmy += (my - tmy) * 0.04;

        points.rotation.y = t * 0.013 + tmx * 0.045;
        points.rotation.x = tmy * 0.030 + scrollY * 0.00022;

        orbs.forEach((o, idx) => {
          o.rotation.x = t * 0.11 * (idx % 2 === 0 ? 1 : -1);
          o.rotation.y = t * 0.07 * (idx % 2 === 0 ? -1 : 1);
          o.position.y = orbConfigs[idx].y + Math.sin(t * 0.38 + idx * 1.2) * 4.5;
        });

        mat.opacity = 0.40 + Math.sin(t * 0.35) * 0.07;
        camera.position.y = -scrollY * 0.032;
        camera.lookAt(0, -scrollY * 0.009, 0);
        renderer.render(scene, camera);
      })();

      const onResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener("resize", onResize, { passive: true });

      // cleanup stored on canvas for later use
      (canvas as any)._cleanup = () => {
        cancelAnimationFrame(reqId);
        document.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onResize);
        renderer.dispose();
      };
    }

    // ── Nav scroll ──
    const nav = document.getElementById("nav");
    const handleScroll = () => {
      nav?.classList.toggle("stuck", window.scrollY > 30);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    // ── Intersection observers ──
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

    const bio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in-view"); bio.unobserve(e.target); }
      });
    }, { threshold: 0.3 });
    document.querySelectorAll(".bento-card").forEach((el) => bio.observe(el));

    // ── Count-up numbers ──
    function countUp(el: Element, target: number, suffix: string, duration: number) {
      const isDecimal = String(target).includes(".");
      const start = performance.now();
      function tick(now: number) {
        const p = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 4);
        const v = isDecimal ? (target * ease).toFixed(1) : Math.round(target * ease);
        el.textContent = v + suffix;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const el = e.target as HTMLElement;
          countUp(el, parseFloat(el.dataset.target!), el.dataset.suffix!, 2000);
          cio.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    document.querySelectorAll("[data-target]").forEach((el) => cio.observe(el));

    // ── Ticker marquee ──
    const items = [
      "Professional Network", "AI Research Assistant", "Biometric Verified",
      "Startup Funding", "Jobs & Gigs", "Partnership Hub", "Real-Time Chat",
      "Verified Blue Tick", "Gamification & Rewards", "Global Community",
      "DigiLocker Integration", "Live Leaderboards",
    ];
    const track = document.getElementById("ticker");
    if (track && track.children.length === 0) {
      [0, 1].forEach(() => {
        items.forEach((item, i) => {
          const span = document.createElement("span");
          span.className = "ti";
          span.innerHTML = `<span>${item}</span>${i < items.length - 1 ? '<div class="ti-dot"></div>' : ""}`;
          track.appendChild(span);
        });
      });
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
      const canvas = document.getElementById("c") as any;
      if (canvas?._cleanup) canvas._cleanup();
    };
  }, []);

  return (
    <>
      {/* Fixed background: scattered squares */}
      <div className="bg-squares" id="bg-squares"></div>

      {/* Three.js canvas */}
      <canvas id="c"></canvas>

      {/* ── Navigation ── */}
      <nav id="nav">
        <Link to="/" className="nav-logo">Hire<em>X</em></Link>
        <ul className="nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#opportunities">Opportunities</a></li>
          <li><a href="#how">How It Works</a></li>
          <li><a href="#stories">Stories</a></li>
        </ul>
        <div className="nav-right">
          <Link to="/login"  className="btn btn-ghost">Sign In</Link>
          <Link to="/signup" className="btn btn-solid">Join Free</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-eyebrow">
          <div className="pulse-dot"></div>
          The Professional Network, Reimagined
        </div>
        <h1 className="hero-title">
          Where Professionals,<br />
          <span className="grad">Founders</span>
          <span className="stroke-text"> &amp; Investors</span><br />
          <span className="grad">Connect.</span>
        </h1>
        <p className="hero-sub">
          A unified platform for career growth, capital raising, and enterprise alliances — with biometric trust, AI-powered matching, and real-time collaboration built in.
        </p>
        <div className="hero-actions">
          <Link to="/signup" className="btn btn-solid btn-hero">Join for Free &rarr;</Link>
          <a href="#features" className="btn-hero-outline">Explore Platform</a>
        </div>
        <div className="hero-pillars">
          <div className="hero-pill"><div className="dot"></div>Jobs &amp; Gigs</div>
          <div className="hero-pill"><div className="dot"></div>Startup Funding</div>
          <div className="hero-pill"><div className="dot"></div>Partnerships</div>
          <div className="hero-pill"><div className="dot"></div>Social Feed</div>
          <div className="hero-pill"><div className="dot"></div>AI Research</div>
        </div>
        <div className="hero-trust">
          <div className="trust-avatars">
            <span className="ta1">SR</span>
            <span className="ta2">MK</span>
            <span className="ta3">AP</span>
            <span className="ta4">LT</span>
          </div>
          <div className="trust-text">Trusted by <strong>2.4M+ professionals</strong> worldwide</div>
        </div>
      </section>

      {/* ── Ticker ── */}
      <div className="ticker-section">
        <div className="ticker-track" id="ticker"></div>
      </div>

      {/* ── Stats ── */}
      <section className="stats reveal">
        <div className="stats-inner">
          <div className="stat">
            <span className="stat-n" data-target="2.4" data-suffix="M+">0</span>
            <div className="stat-l">Verified Members</div>
          </div>
          <div className="stat">
            <span className="stat-n" data-target="48" data-suffix="K+">0</span>
            <div className="stat-l">Active Opportunities</div>
          </div>
          <div className="stat">
            <span className="stat-n" data-target="120" data-suffix="+">0</span>
            <div className="stat-l">Countries Represented</div>
          </div>
          <div className="stat">
            <span className="stat-n" data-target="500" data-suffix="+">0</span>
            <div className="stat-l">Funded Startups</div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="features" id="features">
        <div className="sec-header reveal">
          <div className="sec-label">Platform Features</div>
          <h2 className="sec-title">Everything a <span className="g">Modern Network</span> Needs</h2>
          <p className="sec-sub">From your social feed to your next funding round — HireX is built for every stage of your professional journey.</p>
        </div>
        <div className="feat-grid">
          <div className="feat-card reveal">
            <div className="feat-icon">&#128081;</div>
            <h3>Professional Social Feed</h3>
            <p>A dynamic, LinkedIn-style feed for sharing updates, writing posts, and engaging with industry leaders and peers across your verified network.</p>
          </div>
          <div className="feat-card reveal" style={{ transitionDelay: ".07s" }}>
            <div className="feat-icon">&#129302;</div>
            <h3>AI Research Assistant</h3>
            <p>Powered by Groq (LLaMA 3.3 70B) — instantly generate structured research briefs on any company covering market position, team background, financial viability, and risk factors.</p>
          </div>
          <div className="feat-card reveal" style={{ transitionDelay: ".14s" }}>
            <div className="feat-icon">&#128737;</div>
            <h3>Biometric Verification</h3>
            <p>ML-powered facial liveness detection and DigiLocker integration ensure every verified profile is a real, trusted person or company — zero bots, zero impersonation.</p>
          </div>
          <div className="feat-card reveal" style={{ transitionDelay: ".21s" }}>
            <div className="feat-icon">&#9889;</div>
            <h3>Instant Live Chat</h3>
            <p>Pivot from any opportunity directly to a real-time negotiation. Discuss terms, share context, and close deals without ever leaving the platform.</p>
          </div>
          <div className="feat-card reveal" style={{ transitionDelay: ".28s" }}>
            <div className="feat-icon">&#127942;</div>
            <h3>Gamification &amp; Rewards</h3>
            <p>Earn promo credits through referrals and profile milestones. Spend them on 24-hour visibility boosts and climb city-based and global leaderboards.</p>
          </div>
          <div className="feat-card reveal" style={{ transitionDelay: ".35s" }}>
            <div className="feat-icon">&#128274;</div>
            <h3>Enterprise-Grade Security</h3>
            <p>JWT auth, role-based access control, end-to-end encrypted messaging, and Dockerized AWS-ready infrastructure — built to scale with confidence.</p>
          </div>
        </div>
      </section>

      {/* ── Pillars ── */}
      <section className="pillars-section" id="opportunities">
        <div className="sec-header reveal">
          <div className="sec-label">Opportunities Hub</div>
          <h2 className="sec-title">Three Pillars of <span className="g">Professional Growth</span></h2>
          <p className="sec-sub">One platform. Three structured paths to find the right role, the right investor, or the right partner.</p>
        </div>
        <div className="pillars-grid">
          <div className="pillar-card reveal">
            <div className="pillar-num">01</div>
            <div className="pillar-icon">&#128188;</div>
            <div className="pillar-tag">Jobs &amp; Gigs</div>
            <h3>Procurement</h3>
            <p>Discover full-time roles, freelance tasks, and internships from verified companies. Fixed-price or milestone-based — your terms.</p>
            <ul className="pillar-list">
              <li>Full-time, freelance &amp; internship roles</li>
              <li>Fixed-price &amp; milestone payments</li>
              <li>Verified company postings only</li>
            </ul>
          </div>
          <div className="pillar-card reveal" style={{ transitionDelay: ".08s" }}>
            <div className="pillar-num">02</div>
            <div className="pillar-icon">&#128200;</div>
            <div className="pillar-tag">Funding</div>
            <h3>Capital</h3>
            <p>A dedicated portal for startups to raise from Seed to Series C. List your total raise, equity offered, and valuation — investors come to you.</p>
            <ul className="pillar-list">
              <li>Seed to Series C funding rounds</li>
              <li>Equity &amp; valuation transparency</li>
              <li>AI-generated investor research briefs</li>
            </ul>
          </div>
          <div className="pillar-card reveal" style={{ transitionDelay: ".16s" }}>
            <div className="pillar-num">03</div>
            <div className="pillar-icon">&#129309;</div>
            <div className="pillar-tag">Alliances</div>
            <h3>Partnerships</h3>
            <p>Find joint ventures, co-marketing opportunities, and API integrations with companies that complement your own — structured and discoverable.</p>
            <ul className="pillar-list">
              <li>Joint ventures &amp; co-marketing</li>
              <li>API &amp; technology integrations</li>
              <li>Verified alliance partners only</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Bento ── */}
      <section className="bento-section">
        <div className="sec-header reveal">
          <div className="sec-label">By The Numbers</div>
          <h2 className="sec-title">Results That <span className="g">Speak</span></h2>
        </div>
        <div className="bento-grid">
          <div className="bento-card span-2 reveal">
            <div>
              <div className="bento-big-num">98%</div>
              <h3>Verification Accuracy</h3>
              <p>Our biometric liveness detection and DigiLocker integration maintains near-perfect accuracy, issuing verified blue ticks to real professionals and companies only.</p>
            </div>
            <div>
              <div className="bento-bar"><div className="bento-bar-fill" style={{ "--pct": "98%" } as React.CSSProperties}></div></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
                <span style={{ fontSize: "12px", color: "var(--ink-4)" }}>Identity trust score</span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--orange)" }}>98 / 100</span>
              </div>
            </div>
          </div>
          <div className="bento-card orange-card reveal" style={{ transitionDelay: ".08s" }}>
            <div className="bento-big-num">3x</div>
            <h3>Faster Deals</h3>
            <p>Members close opportunities 3x faster using in-platform live chat compared to traditional email-based outreach.</p>
            <div className="bento-pill">&#8593; vs. email outreach</div>
          </div>
          <div className="bento-card reveal" style={{ transitionDelay: ".16s" }}>
            <div className="bento-big-num" style={{ fontSize: "48px", letterSpacing: "-2px" }}>Zero</div>
            <h3>Bot Accounts</h3>
            <p>Since biometric onboarding launched, no confirmed bot or impersonation accounts have passed the liveness check.</p>
          </div>
          <div className="bento-card reveal" style={{ transitionDelay: ".24s" }}>
            <div className="bento-big-num">4.8&#9733;</div>
            <h3>Member Rating</h3>
            <p>Members consistently rate HireX as the most transparent and trust-first professional network they've used.</p>
          </div>
          <div className="bento-card reveal" style={{ transitionDelay: ".32s" }}>
            <div style={{ fontSize: "36px", marginBottom: "8px" }}>&#127760;</div>
            <h3>120+ Countries</h3>
            <p>A global verified network with localized compliance and opportunity discovery built in from day one.</p>
            <div className="bento-bar"><div className="bento-bar-fill" style={{ "--pct": "78%" } as React.CSSProperties}></div></div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="how" id="how">
        <div className="sec-header reveal">
          <div className="sec-label">The Process</div>
          <h2 className="sec-title">Up and Running in <span className="g">Four Steps</span></h2>
          <p className="sec-sub">From signup to your first opportunity, connection, or funded round — in days, not months.</p>
        </div>
        <div className="how-steps reveal">
          <div className="how-step">
            <div className="how-num">1</div>
            <h4>Create Profile</h4>
            <p>Sign up, complete biometric liveness verification, and earn your verified blue tick in under 3 minutes.</p>
          </div>
          <div className="how-step">
            <div className="how-num">2</div>
            <h4>Build Your Network</h4>
            <p>Connect with professionals, follow founders and investors, and engage via the dynamic social feed.</p>
          </div>
          <div className="how-step">
            <div className="how-num">3</div>
            <h4>Discover Opportunities</h4>
            <p>Browse jobs, funding rounds, and partnerships. Use the AI Research Assistant to brief yourself on any company instantly.</p>
          </div>
          <div className="how-step">
            <div className="how-num">4</div>
            <h4>Connect &amp; Close</h4>
            <p>Jump into live chat, negotiate terms, and seal the deal — all within a single verified, trusted ecosystem.</p>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="testimonials" id="stories">
        <div className="sec-header reveal">
          <div className="sec-label">Community Voices</div>
          <h2 className="sec-title">Loved by <span className="g">Professionals Everywhere</span></h2>
          <p className="sec-sub">Founders, investors, and individual contributors — HireX works for every professional journey.</p>
        </div>
        <div className="testi-grid">
          <div className="testi-card reveal">
            <div className="testi-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
            <p className="testi-quote">We closed our Seed round in 3 weeks using HireX's Capital hub. The AI research briefs meant every investor who reached out was already informed — conversations started at a completely different level.</p>
            <div className="testi-author">
              <div className="tav">SR</div>
              <div><div className="tname">Saanvi Reddy</div><div className="trole">Founder &amp; CEO &middot; Navara AI</div></div>
            </div>
          </div>
          <div className="testi-card reveal" style={{ transitionDelay: ".09s" }}>
            <div className="testi-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
            <p className="testi-quote">The biometric verification changes everything. Every connection request, every partnership inquiry is from a real, verified entity. That level of trust simply doesn't exist anywhere else.</p>
            <div className="testi-author">
              <div className="tav v2">MK</div>
              <div><div className="tname">Marcus Klein</div><div className="trole">Partner &middot; Horizon Ventures</div></div>
            </div>
          </div>
          <div className="testi-card reveal" style={{ transitionDelay: ".18s" }}>
            <div className="testi-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
            <p className="testi-quote">Found my first freelance contract through the Gigs hub within a week of joining. Live chat made negotiating terms instant — no endless email chains, just a real conversation and a signed brief.</p>
            <div className="testi-author">
              <div className="tav v3">AP</div>
              <div><div className="tname">Aditya Patil</div><div className="trole">Freelance Engineer &middot; Previously Google</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta" id="about">
        <div className="cta-box reveal">
          <h2 className="cta-title">
            Your next opportunity<br />
            <span className="cta-grad">is one connection away.</span>
          </h2>
          <p className="cta-sub">Join 2.4 million verified professionals, founders, and investors building meaningful careers and companies on HireX.</p>
          <div className="cta-btns">
            <Link to="/signup" className="btn btn-solid btn-hero">Create Free Account &rarr;</Link>
            <a href="#features" className="btn-hero-outline">See How It Works</a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer>
        <Link to="/" className="footer-logo">Hire<em>X</em></Link>
        <div className="footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Security</a>
          <a href="#">Blog</a>
          <a href="#">Careers</a>
        </div>
        <div className="footer-copy">&copy; 2026 HireX Inc. All rights reserved.</div>
      </footer>
    </>
  );
}