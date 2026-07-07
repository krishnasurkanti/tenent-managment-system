"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// ── tiny helpers ──────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  );
}

function LiveDot({ color = "green" }: { color?: "green" | "amber" | "red" | "indigo" }) {
  const colors: Record<string, string> = {
    green: "var(--success, #22c55e)",
    amber: "var(--warning, #f59e0b)",
    red: "var(--error, #ef4444)",
    indigo: "#818cf8",
  };
  return (
    <span style={{
      display: "inline-block", width: 7, height: 7, borderRadius: "50%",
      background: colors[color], boxShadow: `0 0 8px ${colors[color]}`,
      flexShrink: 0, animation: "pulse-dot 1.4s ease-in-out infinite",
    }} />
  );
}

function useCounter(target: number, active: boolean) {
  const [val, setVal] = useState(0);
  const animatedRef = useRef(false);
  useEffect(() => {
    if (!active || animatedRef.current) return;
    animatedRef.current = true;
    const duration = 1200;
    const start = performance.now();
    function step(now: number) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [active, target]);
  return val;
}

// ── Trial Modal ───────────────────────────────────────────────────────────────

function TrialModal({ open, initialPlan, onClose }: { open: boolean; initialPlan: string; onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [plan, setPlan] = useState(initialPlan);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const hostelRef = useRef<HTMLInputElement>(null);
  const roomsRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setPlan(initialPlan); setSubmitted(false); setSubmitting(false); }
  }, [open, initialPlan]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/trial-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameRef.current?.value ?? "",
          phone: phoneRef.current?.value ?? "",
          email: emailRef.current?.value ?? "",
          hostelName: hostelRef.current?.value ?? "",
          rooms: roomsRef.current?.value ?? "",
          plan,
        }),
      });
    } catch { /* non-fatal */ }
    setSubmitting(false);
    setSubmitted(true);
  };

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 8, padding: "10px 12px", fontSize: 13.5, color: "#f4f4f5",
    fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 10.5, fontWeight: 700, letterSpacing: ".16em",
    textTransform: "uppercase", color: "#71717a",
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, background: "rgba(5,5,8,.82)",
        backdropFilter: "blur(10px)", zIndex: 200,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 18,
      }}
    >
      <div style={{
        width: "100%", maxWidth: 440,
        background: "linear-gradient(180deg,#15151a,#0d0d12)",
        border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: 24,
        boxShadow: "0 28px 70px rgba(0,0,0,.6)",
        position: "relative", maxHeight: "90dvh", overflowY: "auto",
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: 12, right: 12, width: 30, height: 30, borderRadius: "50%",
          background: "rgba(255,255,255,.06)", border: "none", color: "#a1a1aa",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {!submitted ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8, fontSize: 10.5, fontWeight: 700, letterSpacing: ".22em", textTransform: "uppercase", color: "#fcd34d" }}>
              <LiveDot color="amber" /> Request Free Trial
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-.03em", marginBottom: 4 }}>
              Start your{" "}
              <span style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                free trial
              </span>
            </h3>
            <p style={{ fontSize: 12.5, color: "#71717a", lineHeight: 1.5, marginBottom: 18 }}>
              We'll contact you to activate your account. Takes about 10 minutes.
            </p>
            <form style={{ display: "flex", flexDirection: "column", gap: 11 }} onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={labelStyle}>Full Name</label>
                <input ref={nameRef} required type="text" placeholder="Raghuveer Reddy" style={inputStyle} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={labelStyle}>Phone</label>
                  <input ref={phoneRef} required type="tel" placeholder="9876543210" style={inputStyle} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={labelStyle}>Email</label>
                  <input ref={emailRef} required type="email" placeholder="you@hostel.com" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={labelStyle}>Hostel / PG Name</label>
                <input ref={hostelRef} required type="text" placeholder="e.g. Sai Krishna PG" style={inputStyle} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={labelStyle}>Rooms / Beds</label>
                  <input ref={roomsRef} type="text" placeholder="12 / 36" style={inputStyle} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={labelStyle}>Plan</label>
                  <select value={plan} onChange={(e) => setPlan(e.target.value)} style={{ ...inputStyle, appearance: "none" as const }}>
                    <option>Silver</option>
                    <option>Gold</option>
                    <option>Diamond</option>
                    <option>Not sure yet</option>
                  </select>
                </div>
              </div>
              <button type="submit" disabled={submitting} style={{
                marginTop: 6, padding: "12px 0", borderRadius: 8,
                background: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#1f1408",
                fontSize: 13.5, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer",
                border: "none", boxShadow: "0 10px 24px rgba(251,191,36,.3)",
                opacity: submitting ? 0.7 : 1,
              }}>
                {submitting ? "Sending…" : "Request Trial →"}
              </button>
              <p style={{ fontSize: 11, color: "#52525b", lineHeight: 1.5, textAlign: "center", marginTop: 4 }}>
                We'll contact you within 24 hours.
              </p>
            </form>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "18px 0" }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "rgba(34,197,94,.14)", color: "#4ade80",
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px",
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, letterSpacing: "-.02em", marginBottom: 6 }}>Request received!</div>
            <div style={{ fontSize: 12.5, color: "#71717a", lineHeight: 1.55, maxWidth: 280, margin: "0 auto 18px" }}>
              We'll contact you within 24 hours to set up your account.
            </div>
            <button onClick={onClose} style={{
              background: "rgba(99,102,241,.12)", border: "1px solid rgba(99,102,241,.32)",
              borderRadius: 9, padding: "11px 20px", fontSize: 13.5, fontWeight: 700,
              color: "#c7d2fe", cursor: "pointer",
            }}>
              Got it
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = "problem" | "solution" | "metrics" | "demos" | "pricing";

export default function HomePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("problem");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPlan, setModalPlan] = useState("Gold");
  const [navOpen, setNavOpen] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [dotIdx, setDotIdx] = useState(0);

  const openModal = useCallback((plan = "Gold") => {
    setModalPlan(plan);
    setModalOpen(true);
  }, []);

  const handleDemoLogin = useCallback(async () => {
    if (demoLoading) return;
    setDemoLoading(true);
    try {
      const res = await fetch("/api/auth/demo-login", { method: "POST" });
      if (res.ok) {
        router.push("/owner/dashboard");
        return;
      }
    } catch { /* fall through */ }
    setDemoLoading(false);
    router.push("/owner/login");
  }, [demoLoading, router]);

  const c18 = useCounter(18, tab === "metrics");
  const c12 = useCounter(12, tab === "metrics");
  const c100 = useCounter(100, tab === "metrics");

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const onScroll = () => {
      const cardW = 340;
      setDotIdx(Math.round(el.scrollLeft / cardW));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const scrollCarousel = (dir: -1 | 1) => {
    carouselRef.current?.scrollBy({ left: dir * 340, behavior: "smooth" });
  };

  const tabBtnStyle = (t: Tab): React.CSSProperties => ({
    flex: 1, padding: "9px 10px", borderRadius: 8, border: "none",
    cursor: "pointer", fontSize: 12, fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
    whiteSpace: "nowrap",
    background: tab === t ? "linear-gradient(135deg,#4f46e5,#6366f1)" : "transparent",
    color: tab === t ? "#fff" : "#71717a",
    boxShadow: tab === t ? "0 6px 14px rgba(99,102,241,.36)" : "none",
    transition: "all .2s",
  });

  return (
    <>
      <style>{`
        @keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.7)}}
        @keyframes flicker-a{0%,100%{opacity:.9}38%{opacity:.45}}
        @keyframes flicker-b{0%,100%{opacity:.55}30%{opacity:1}65%{opacity:.3}}
        @keyframes flicker-c{0%,100%{opacity:.4}50%{opacity:.85}}
        @keyframes flicker-d{0%,100%{opacity:.85}20%{opacity:.4}}
        @keyframes flicker-e{0%,100%{opacity:.6}45%{opacity:.95}}
        @keyframes flicker-f{0%,100%{opacity:.5}55%{opacity:.9}}
        @keyframes float-a{0%{transform:translateY(0)}100%{transform:translateY(-6px)}}
        @keyframes float-b{0%{transform:translateY(0)}100%{transform:translateY(-8px)}}
        @keyframes orb-drift{0%,100%{transform:translate(0,0)}50%{transform:translate(15px,-12px)}}
        .win-a{animation:flicker-a 1.1s ease-in-out infinite}
        .win-b{animation:flicker-b 1.3s ease-in-out infinite .2s}
        .win-c{animation:flicker-c 1.5s ease-in-out infinite .4s}
        .win-d{animation:flicker-d 1.2s ease-in-out infinite .7s}
        .win-e{animation:flicker-e 1.8s ease-in-out infinite .9s}
        .win-f{animation:flicker-f 1.0s ease-in-out infinite 1.1s}
        .lp-card-hover{transition:transform .2s,border-color .2s}
        .lp-card-hover:hover{transform:translateY(-3px)}
        .lp-btn-primary:hover{transform:translateY(-2px);box-shadow:0 14px 32px rgba(251,191,36,.42)!important}
        .lp-video-card:hover .lp-video-play{transform:scale(1.08)}
        .lp-nav-link:hover{color:#f4f4f5!important}
        .lp-footer-link:hover{color:#f4f4f5!important}
        .lp-carousel::-webkit-scrollbar{display:none}
        .lp-carousel{scrollbar-width:none}
        .lp-tabbar::-webkit-scrollbar{display:none}
        .lp-tabbar{scrollbar-width:none}
        @media(max-width:1024px){
          .lp-nav-links{display:none!important}
          .lp-nav-toggle{display:flex!important}
          .lp-hero-grid{grid-template-columns:1fr!important}
          .lp-hero-illus{height:280px!important;order:-1}
          .lp-problems-grid{grid-template-columns:repeat(2,1fr)!important}
          .lp-flow-row{grid-template-columns:repeat(4,1fr)!important}
          .lp-metrics-grid{grid-template-columns:1fr!important}
          .lp-pricing-grid{grid-template-columns:1fr!important}
          .lp-price-featured{transform:none!important}
          .lp-quick-grid{grid-template-columns:1fr!important;gap:10px!important}
        }
        @media(max-width:640px){
          .lp-hero-inner{padding:0 16px!important}
          .lp-tab-inner{padding:0 12px!important}
          .lp-problems-grid{grid-template-columns:1fr!important}
          .lp-flow-row{grid-template-columns:repeat(2,1fr)!important}
          .lp-vid-card{flex:0 0 calc(100vw - 40px)!important}
          .lp-footer-inner{flex-direction:column!important;text-align:center!important;gap:14px!important}
          .lp-hero-chips{display:none!important}
          .lp-hero-stat{display:none!important}
        }
      `}</style>

      {/* NAV */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 60,
        background: "rgba(9,9,11,.88)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,.07)",
      }}>
        <div style={{
          maxWidth: 1280, margin: "0 auto", padding: "11px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 15, fontWeight: 800, letterSpacing: "-.02em" }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: "linear-gradient(135deg,#4f46e5,#818cf8)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 14px rgba(99,102,241,.4)",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4v-7H10v7H5a2 2 0 0 1-2-2z"/>
              </svg>
            </div>
            StayManager
          </div>

          <div className="lp-nav-links" style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 13, fontWeight: 500, color: "#a1a1aa" }}>
            {[["Problem","problem"],["Solution","solution"],["Pricing","pricing"]].map(([label, t]) => (
              <button key={t} onClick={() => { setTab(t as Tab); document.getElementById("tabs")?.scrollIntoView({ behavior: "smooth" }); }}
                style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 13, fontWeight: 500 }}
                className="lp-nav-link"
              >{label}</button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => openModal()} style={{
              background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)",
              borderRadius: 8, padding: "7px 14px", fontSize: 12.5, fontWeight: 600, color: "#f4f4f5",
              cursor: "pointer",
            }}>
              Request Trial
            </button>
            <button
              onClick={handleDemoLogin}
              disabled={demoLoading}
              style={{
                background: "linear-gradient(135deg,#fbbf24,#f59e0b)", borderRadius: 8,
                padding: "8px 16px", fontSize: 12.5, fontWeight: 700, color: "#1f1408",
                boxShadow: "0 6px 16px rgba(251,191,36,.3)", border: "none",
                cursor: demoLoading ? "not-allowed" : "pointer", opacity: demoLoading ? 0.7 : 1,
              }}
            >
              {demoLoading ? "Loading…" : "Try Demo"}
            </button>
            <button
              className="lp-nav-toggle"
              onClick={() => setNavOpen(v => !v)}
              aria-label="Toggle navigation"
              style={{
                display: "none", width: 34, height: 34, borderRadius: 8,
                background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)",
                alignItems: "center", justifyContent: "center", color: "#f4f4f5", cursor: "pointer",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {navOpen && (
          <div style={{
            background: "rgba(9,9,11,.98)", backdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(255,255,255,.07)",
            padding: "14px 20px", display: "flex", flexDirection: "column", gap: 12,
          }}>
            {[["Problem","problem"],["Solution","solution"],["Pricing","pricing"]].map(([label, t]) => (
              <button key={t} onClick={() => { setTab(t as Tab); setNavOpen(false); document.getElementById("tabs")?.scrollIntoView({ behavior: "smooth" }); }}
                style={{ background: "none", border: "none", color: "#a1a1aa", cursor: "pointer", fontSize: 14, fontWeight: 500, textAlign: "left" }}
              >{label}</button>
            ))}
            <Link href="/owner/login" onClick={() => setNavOpen(false)} style={{ color: "#a1a1aa", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>
              Owner Login
            </Link>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section style={{
        position: "relative", overflow: "hidden", padding: "32px 0 36px",
        background: "radial-gradient(ellipse 80% 50% at 50% 0%,rgba(99,102,241,.12) 0%,transparent 60%),#09090b",
      }}>
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "radial-gradient(circle,rgba(255,255,255,.035) 1px,transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage: "linear-gradient(180deg,#000 0%,#000 60%,transparent 100%)",
          WebkitMaskImage: "linear-gradient(180deg,#000 0%,#000 60%,transparent 100%)",
        }}/>
        <div style={{
          position: "absolute", top: -100, right: -80, width: 500, height: 500,
          borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.2) 0%,transparent 60%)",
          pointerEvents: "none", animation: "orb-drift 12s ease-in-out infinite",
        }}/>

        <div className="lp-hero-grid" style={{
          position: "relative", maxWidth: 1280, margin: "0 auto", padding: "0 20px",
          display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 40, alignItems: "center", zIndex: 2,
        }}>
          {/* Left copy */}
          <div className="lp-hero-inner">
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 10, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase" as const, color: "#818cf8", marginBottom: 14 }}>
              <LiveDot /> Trusted by 42 hostels · 1,240 tenants
            </div>
            <h1 style={{ fontSize: "clamp(1.7rem,3.4vw,2.9rem)", fontWeight: 800, letterSpacing: "-.04em", lineHeight: 1.08, marginBottom: 12 }}>
              <span style={{ background: "linear-gradient(135deg,#fff 0%,#c7d2fe 50%,#818cf8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Manage rooms, tenants &amp; rent — </span>
              <span style={{ background: "linear-gradient(135deg,#fde047,#fbbf24,#f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>all in one place.</span>
            </h1>
            <p style={{ fontSize: 14, color: "#a1a1aa", lineHeight: 1.6, marginBottom: 20, maxWidth: 480 }}>
              Stop revenue leaks, track vacant beds, collect rent on time, and replace paper work with a live dashboard.
            </p>

            <div className="lp-hero-chips" style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, marginBottom: 22 }}>
              {["No missed rent","No paper confusion","Weekly clarity"].map(chip => (
                <span key={chip} style={{
                  display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px",
                  borderRadius: 999, background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.2)",
                  fontSize: 11, fontWeight: 600, color: "#4ade80", whiteSpace: "nowrap" as const,
                }}>
                  <CheckIcon />{chip}
                </span>
              ))}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 10, alignItems: "center" }}>
              <button
                onClick={handleDemoLogin}
                disabled={demoLoading}
                className="lp-btn-primary"
                style={{
                  background: "linear-gradient(135deg,#fbbf24,#f59e0b)", borderRadius: 9,
                  padding: "12px 22px", fontSize: 13.5, fontWeight: 700, color: "#1f1408",
                  boxShadow: "0 10px 24px rgba(251,191,36,.32)", border: "none",
                  cursor: demoLoading ? "not-allowed" : "pointer",
                  display: "inline-flex", alignItems: "center", gap: 7,
                  transition: "transform .15s,box-shadow .15s",
                  opacity: demoLoading ? 0.7 : 1,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                {demoLoading ? "Opening…" : "Try Demo"}
              </button>
              <button onClick={() => openModal()} style={{
                background: "rgba(99,102,241,.12)", border: "1px solid rgba(99,102,241,.32)",
                borderRadius: 9, padding: "11px 20px", fontSize: 13.5, fontWeight: 700, color: "#c7d2fe",
                display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer",
              }}>
                Request Trial
              </button>
              <Link href="/owner/login" style={{ color: "#a1a1aa", fontSize: 13, fontWeight: 600, textDecoration: "none", padding: "6px 4px" }}>
                Owner Login →
              </Link>
            </div>

            <div className="lp-hero-stat" style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "#71717a" }}>
              <LiveDot />
              18% rent leakage caught · 12 hrs saved/week · 100% visibility
            </div>
          </div>

          {/* Right illustration */}
          <div className="lp-hero-illus" style={{ position: "relative", height: 380, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 440, height: 30, background: "radial-gradient(ellipse 80% 100% at 50% 100%,rgba(99,102,241,.18),transparent 70%)", borderRadius: "50%" }}/>

            {[
              { text: "Occupancy 78% live", color: "green", style: { top: "5%", left: 0, animation: "float-a 4.2s ease-in-out infinite alternate" } as React.CSSProperties },
              { text: "Weekly view", color: "indigo", style: { top: "18%", right: "-4%", animation: "float-b 5s ease-in-out infinite alternate-reverse" } as React.CSSProperties },
              { text: "Rent due this week", color: "amber", style: { top: "34%", left: "-4%", animation: "float-a 4.8s ease-in-out infinite alternate-reverse" } as React.CSSProperties },
              { text: "Vacant: 12 beds", color: "red", style: { top: "54%", right: "-2%", animation: "float-b 5.4s ease-in-out infinite alternate" } as React.CSSProperties },
            ].map(({ text, color, style }) => {
              const chipColors: Record<string, { bg: string; border: string; color: string }> = {
                green: { bg: "rgba(34,197,94,.16)", border: "rgba(34,197,94,.32)", color: "#86efac" },
                indigo: { bg: "rgba(99,102,241,.2)", border: "rgba(99,102,241,.36)", color: "#c7d2fe" },
                amber: { bg: "rgba(245,158,11,.16)", border: "rgba(245,158,11,.32)", color: "#fcd34d" },
                red: { bg: "rgba(239,68,68,.14)", border: "rgba(239,68,68,.28)", color: "#fca5a5" },
              };
              const c = chipColors[color];
              return (
                <div key={text} style={{
                  position: "absolute", display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "5px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700,
                  backdropFilter: "blur(12px)", whiteSpace: "nowrap" as const,
                  boxShadow: "0 6px 20px rgba(0,0,0,.4)", zIndex: 5,
                  background: c.bg, border: `1px solid ${c.border}`, color: c.color, ...style,
                }}>
                  {color === "green" && <LiveDot color="green" />}
                  {text}
                </div>
              );
            })}

            {/* Dashboard card */}
            <div style={{
              position: "absolute", top: "46%", left: "50%", transform: "translate(-50%,-50%)",
              zIndex: 6, width: 165, borderRadius: 10,
              background: "rgba(13,13,18,.92)", border: "1px solid rgba(99,102,241,.5)",
              boxShadow: "0 0 0 1px rgba(129,140,248,.15) inset, 0 12px 38px rgba(99,102,241,.4)",
              padding: 10, backdropFilter: "blur(20px)",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase" as const, color: "#c7d2fe" }}>Live OS</span>
                <LiveDot />
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 28, marginBottom: 8 }}>
                {[48,72,62,88,76,94,82].map((h, i) => (
                  <div key={i} style={{ flex: 1, background: "linear-gradient(180deg,#818cf8,#6366f1)", borderRadius: "2px 2px 0 0", opacity: .85, height: `${h}%` }}/>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 3 }}>
                {[
                  { v: "42", l: "PGs", color: "#f4f4f5" },
                  { v: "₹2.4L", l: "Coll", color: "#5eead4" },
                  { v: "8", l: "Due", color: "#fbbf24" },
                ].map(({ v, l, color }) => (
                  <div key={l} style={{ background: "rgba(255,255,255,.04)", borderRadius: 5, padding: "4px 5px", textAlign: "center" as const }}>
                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1, color }}>{v}</div>
                    <div style={{ fontSize: 7.5, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase" as const, color: "#52525b", marginTop: 2 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Building SVG */}
            <svg width="100%" height="100%" viewBox="0 0 540 540" fill="none" xmlns="http://www.w3.org/2000/svg"
              style={{ maxWidth: 460, position: "relative", zIndex: 1 }} preserveAspectRatio="xMidYMax meet">
              <defs>
                <linearGradient id="bldFront" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1f1f2a"/><stop offset="100%" stopColor="#14141c"/></linearGradient>
                <linearGradient id="bldLeft" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#252531"/><stop offset="100%" stopColor="#18181f"/></linearGradient>
                <linearGradient id="bldTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2d2d3e"/><stop offset="100%" stopColor="#1f1f2c"/></linearGradient>
              </defs>
              <ellipse cx="270" cy="520" rx="220" ry="14" fill="rgba(99,102,241,.14)"/>
              <polygon points="60,250 120,212 120,470 60,500" fill="url(#bldFront)"/>
              <polygon points="20,278 60,250 60,500 20,520" fill="url(#bldLeft)"/>
              <polygon points="20,278 60,250 120,212 80,238" fill="url(#bldTop)"/>
              <rect x="65" y="262" width="14" height="9" rx="1.5" fill="#22c55e" className="win-e" opacity=".75" transform="skewY(26)"/>
              <rect x="85" y="251" width="14" height="9" rx="1.5" fill="#22c55e" className="win-b" opacity=".82" transform="skewY(26)"/>
              <rect x="65" y="318" width="14" height="9" rx="1.5" fill="#ef4444" className="win-a" opacity=".72" transform="skewY(26)"/>
              <rect x="85" y="307" width="14" height="9" rx="1.5" fill="#6366f1" className="win-c" opacity=".45" transform="skewY(26)"/>
              <polygon points="420,160 488,118 488,470 420,505" fill="url(#bldFront)"/>
              <polygon points="380,184 420,160 420,505 380,525" fill="url(#bldLeft)"/>
              <polygon points="380,184 420,160 488,118 450,142" fill="url(#bldTop)"/>
              <rect x="425" y="200" width="15" height="10" rx="1.5" fill="#f59e0b" className="win-a" opacity=".82" transform="skewY(22)"/>
              <rect x="448" y="188" width="15" height="10" rx="1.5" fill="#f59e0b" className="win-c" opacity=".68" transform="skewY(22)"/>
              <rect x="425" y="230" width="15" height="10" rx="1.5" fill="#22c55e" className="win-d" opacity=".88" transform="skewY(22)"/>
              <rect x="448" y="218" width="15" height="10" rx="1.5" fill="#22c55e" className="win-b" opacity=".72" transform="skewY(22)"/>
              <polygon points="270,80 380,32 380,475 270,500" fill="url(#bldFront)" stroke="rgba(99,102,241,.32)" strokeWidth="1"/>
              <polygon points="160,128 270,80 270,500 160,530" fill="url(#bldLeft)" stroke="rgba(99,102,241,.2)" strokeWidth="1"/>
              <polygon points="160,128 270,80 380,32 270,80" fill="url(#bldTop)" stroke="rgba(99,102,241,.22)" strokeWidth="1"/>
              <rect x="278" y="60" width="24" height="15" rx="2" fill="#22c55e" className="win-b" opacity=".88" transform="skewY(22)"/>
              <rect x="312" y="46" width="24" height="15" rx="2" fill="#f59e0b" className="win-c" opacity=".82" transform="skewY(22)"/>
              <rect x="278" y="214" width="24" height="15" rx="2" fill="#22c55e" className="win-e" opacity=".82" transform="skewY(22)"/>
              <rect x="312" y="200" width="24" height="15" rx="2" fill="#818cf8" className="win-b" opacity=".7" transform="skewY(22)"/>
              <rect x="346" y="186" width="24" height="15" rx="2" fill="#22c55e" className="win-a" opacity=".88" transform="skewY(22)"/>
              <rect x="168" y="224" width="26" height="16" rx="2" fill="#6366f1" className="win-b" opacity=".55" transform="skewY(-22)"/>
              <rect x="202" y="210" width="26" height="16" rx="2" fill="#22c55e" className="win-e" opacity=".88" transform="skewY(-22)"/>
              <rect x="236" y="196" width="26" height="16" rx="2" fill="#ef4444" className="win-d" opacity=".7" transform="skewY(-22)"/>
              <rect x="168" y="300" width="26" height="16" rx="2" fill="#22c55e" className="win-a" opacity=".88" transform="skewY(-22)"/>
              <line x1="270" y1="0" x2="270" y2="80" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" opacity=".75"/>
              <circle cx="270" cy="0" r="4" fill="#6366f1" opacity=".9"/>
            </svg>
          </div>
        </div>
      </section>

      {/* QUICK ACCESS — under hero */}
      <section style={{ background: "#09090b", borderBottom: "1px solid rgba(255,255,255,.07)", padding: "0 20px 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div className="lp-quick-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>

            {/* Try Demo */}
            <button
              onClick={handleDemoLogin}
              disabled={demoLoading}
              style={{
                display: "flex", alignItems: "center", gap: 14, padding: "16px 20px",
                borderRadius: 12, cursor: demoLoading ? "not-allowed" : "pointer", textAlign: "left",
                background: "linear-gradient(135deg,rgba(251,191,36,.14),rgba(245,158,11,.06))",
                border: "1px solid rgba(251,191,36,.3)", transition: "border-color .2s",
                opacity: demoLoading ? 0.7 : 1,
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: "linear-gradient(135deg,#fbbf24,#f59e0b)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 6px 16px rgba(251,191,36,.35)",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#1f1408"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#f4f4f5", marginBottom: 2 }}>
                  {demoLoading ? "Opening demo…" : "Try Demo"}
                </div>
                <div style={{ fontSize: 11.5, color: "#a1a1aa" }}>See a live hostel with sample data</div>
              </div>
            </button>

            {/* Request Trial */}
            <button
              onClick={() => openModal()}
              style={{
                display: "flex", alignItems: "center", gap: 14, padding: "16px 20px",
                borderRadius: 12, cursor: "pointer", textAlign: "left",
                background: "linear-gradient(135deg,rgba(99,102,241,.1),rgba(99,102,241,.04))",
                border: "1px solid rgba(99,102,241,.25)", transition: "border-color .2s",
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: "linear-gradient(135deg,#4f46e5,#6366f1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 6px 16px rgba(99,102,241,.35)",
              }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#f4f4f5", marginBottom: 2 }}>Request Trial</div>
                <div style={{ fontSize: 11.5, color: "#a1a1aa" }}>30 days free · we set it up for you</div>
              </div>
            </button>

            {/* Owner Login */}
            <Link href="/owner/login" style={{
              display: "flex", alignItems: "center", gap: 14, padding: "16px 20px",
              borderRadius: 12, textDecoration: "none",
              background: "rgba(255,255,255,.03)",
              border: "1px solid rgba(255,255,255,.08)", transition: "border-color .2s",
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: "rgba(255,255,255,.07)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#f4f4f5", marginBottom: 2 }}>Owner Login</div>
                <div style={{ fontSize: 11.5, color: "#a1a1aa" }}>Access your dashboard</div>
              </div>
            </Link>

          </div>
        </div>
      </section>

      {/* TABBED SECTION */}
      <section id="tabs" style={{ padding: "36px 0 48px", borderTop: "1px solid rgba(255,255,255,.07)", background: "#09090b" }}>
        <div className="lp-tab-inner" style={{ maxWidth: 1280, margin: "0 auto", padding: "0 20px" }}>

          <div className="lp-tabbar" style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
            marginBottom: 24, padding: 5,
            background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)",
            borderRadius: 12, maxWidth: 640, marginLeft: "auto", marginRight: "auto",
            overflowX: "auto" as const,
          }}>
            {([
              ["problem", "Problem", "4", "rgba(239,68,68,.18)", "#fca5a5"],
              ["solution", "Solution", null, null, null],
              ["metrics", "Savings", null, null, null],
              ["demos", "Demos", "4", "rgba(251,191,36,.18)", "#fcd34d"],
              ["pricing", "Pricing", null, null, null],
            ] as [Tab, string, string|null, string|null, string|null][]).map(([t, label, badge, badgeBg, badgeColor]) => (
              <button key={t} onClick={() => setTab(t)} style={tabBtnStyle(t)}>
                {label}
                {badge && (
                  <span style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: ".1em", padding: "2px 5px", borderRadius: 4,
                    background: tab === t ? "rgba(255,255,255,.2)" : (badgeBg ?? "rgba(239,68,68,.18)"),
                    color: tab === t ? "#fff" : (badgeColor ?? "#fca5a5"),
                  }}>{badge}</span>
                )}
              </button>
            ))}
          </div>

          {/* PROBLEM */}
          {tab === "problem" && (
            <div>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 10, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase" as const, color: "#fca5a5", marginBottom: 10 }}>
                  <LiveDot color="red" /> The Hidden Leaks
                </div>
                <h2 style={{ fontSize: "clamp(1.3rem,2.2vw,1.8rem)", fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.18 }}>
                  Hostel owners lose money{" "}
                  <span style={{ background: "linear-gradient(135deg,#f87171,#fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>every week.</span>
                </h2>
              </div>
              <div className="lp-problems-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                {[
                  { n: "01", title: "Empty beds not noticed", desc: "Vacancies go unfilled because owners realize on the 15th when collections drop.", cost: "₹4-8K lost / vacant week" },
                  { n: "02", title: "Rent due dates missed", desc: '"Pay tomorrow" becomes 3 weeks. Nothing reminds anyone — including the owner.', cost: "18% stuck in limbo" },
                  { n: "03", title: "Paper records mistakes", desc: "Notebooks, WhatsApp screenshots, memory. Nothing reconciles at month-end.", cost: "12 hrs / week wasted" },
                  { n: "04", title: "No weekly cash flow", desc: "Good week or bad week? No way to tell without an evening in Excel.", cost: "Decisions in the dark" },
                ].map(({ n, title, desc, cost }) => (
                  <div key={n} className="lp-card-hover" style={{
                    background: "linear-gradient(160deg,rgba(239,68,68,.06),rgba(245,158,11,.03))",
                    border: "1px solid rgba(239,68,68,.18)", borderRadius: 10, padding: "16px 14px",
                    position: "relative", overflow: "hidden",
                  }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,#ef4444,#f59e0b)" }}/>
                    <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase" as const, color: "#f87171", marginBottom: 8 }}>Problem {n}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#f4f4f5", lineHeight: 1.3, marginBottom: 5 }}>{title}</div>
                    <div style={{ fontSize: 11.5, color: "#71717a", lineHeight: 1.5 }}>{desc}</div>
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed rgba(239,68,68,.18)", fontSize: 10, color: "#f87171", fontWeight: 700 }}>↗ {cost}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SOLUTION */}
          {tab === "solution" && (
            <div>
              <div style={{ textAlign: "center", marginBottom: 22 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 10, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase" as const, color: "#818cf8", marginBottom: 10 }}>
                  <LiveDot color="indigo" /> The Operating System
                </div>
                <h2 style={{ fontSize: "clamp(1.3rem,2.2vw,1.8rem)", fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.18 }}>
                  One dashboard for{" "}
                  <span style={{ background: "linear-gradient(135deg,#fff,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>rooms, tenants, rent.</span>
                </h2>
              </div>
              <div className="lp-flow-row" style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 8 }}>
                {["Create Hostel","Add Rooms","Add Tenant","Assign Bed","Collect Rent","Track Due","View Reports"].map((label, i) => (
                  <div key={label} className="lp-card-hover" style={{
                    position: "relative",
                    background: "linear-gradient(160deg,rgba(99,102,241,.08),rgba(99,102,241,.02))",
                    border: "1px solid rgba(99,102,241,.22)", borderRadius: 9, padding: "14px 8px", textAlign: "center" as const,
                  }}>
                    <div style={{
                      position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)",
                      background: "linear-gradient(135deg,#4f46e5,#818cf8)", width: 18, height: 18,
                      borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9.5, fontWeight: 800, color: "#fff", boxShadow: "0 4px 10px rgba(99,102,241,.5)",
                    }}>{i + 1}</div>
                    <div style={{ marginTop: 10, fontSize: 10.5, fontWeight: 700, color: "#f4f4f5", lineHeight: 1.25 }}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8, justifyContent: "center", marginTop: 18 }}>
                {["One system, every room","Rent follow-up before loss","Weekly clarity"].map(chip => (
                  <span key={chip} style={{
                    display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px",
                    borderRadius: 999, background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.2)",
                    fontSize: 11, fontWeight: 600, color: "#4ade80",
                  }}>
                    <CheckIcon />{chip}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* METRICS */}
          {tab === "metrics" && (
            <div>
              <div style={{ textAlign: "center", marginBottom: 22 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 10, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase" as const, color: "#4ade80", marginBottom: 10 }}>
                  <LiveDot color="green" /> Real Results
                </div>
                <h2 style={{ fontSize: "clamp(1.3rem,2.2vw,1.8rem)", fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.18 }}>
                  Numbers that move the bottom line.
                </h2>
              </div>
              <div className="lp-metrics-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                {[
                  { val: c18, unit: "%", title: "Reduce rent leakage", desc: "Catch overdue tenants before 30+ days. Recover hidden losses.", bar: 78 },
                  { val: c12, unit: "hrs/wk", title: "Save admin hours", desc: "No notebooks, screenshots, or Excel evenings. The system does it.", bar: 88 },
                  { val: c100, unit: "%", title: "Vacant beds instantly", desc: "Every empty bed on the dashboard the moment a tenant moves out.", bar: 100 },
                ].map(({ val, unit, title, desc, bar }) => (
                  <div key={title} className="lp-card-hover" style={{
                    background: "linear-gradient(160deg,rgba(20,184,166,.06),rgba(34,197,94,.03))",
                    border: "1px solid rgba(20,184,166,.2)", borderRadius: 12, padding: "20px 20px",
                    position: "relative", overflow: "hidden",
                  }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,#14b8a6,#22c55e)" }}/>
                    <div style={{ fontSize: "clamp(1.6rem,2.8vw,2.4rem)", fontWeight: 800, letterSpacing: "-.05em", lineHeight: 1, background: "linear-gradient(135deg,#fff,#5eead4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 5 }}>
                      {val}<span style={{ fontSize: ".5em", fontWeight: 700, color: "#14b8a6", WebkitTextFillColor: "#14b8a6", marginLeft: 2 }}>{unit}</span>
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#f4f4f5", marginBottom: 4 }}>{title}</div>
                    <div style={{ fontSize: 12, color: "#71717a", lineHeight: 1.45 }}>{desc}</div>
                    <div style={{ marginTop: 12, height: 4, borderRadius: 999, background: "rgba(255,255,255,.05)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${bar}%`, borderRadius: 999, background: "linear-gradient(90deg,#14b8a6,#22c55e)" }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DEMOS */}
          {tab === "demos" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
                <div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 10, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase" as const, color: "#fcd34d", marginBottom: 7 }}>
                    <LiveDot color="amber" /> See it in action
                  </div>
                  <h2 style={{ fontSize: "clamp(1.3rem,2.2vw,1.8rem)", fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.18 }}>
                    Click any card to open the demo hostel.
                  </h2>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {([-1,1] as const).map(dir => (
                    <button key={dir} onClick={() => scrollCarousel(dir)} style={{
                      width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,.05)",
                      border: "1px solid rgba(255,255,255,.07)", color: "#f4f4f5", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                        {dir === -1 ? <path d="m15 18-6-6 6-6"/> : <path d="m9 18 6-6-6-6"/>}
                      </svg>
                    </button>
                  ))}
                </div>
              </div>

              <div ref={carouselRef} className="lp-carousel" style={{
                display: "flex", gap: 12, overflowX: "auto" as const,
                scrollSnapType: "x mandatory", scrollBehavior: "smooth", padding: "4px 0",
              }}>
                {[
                  { n: "01", title: "Owner setup", dur: "2:14", bullets: ["Create a hostel in under 60 sec","Add floors, rooms & beds","Set rent, deposit & sharing"] },
                  { n: "02", title: "Tenant management", dur: "3:42", bullets: ["Add tenant in seconds","Assign to a bed with one tap","Update / remove instantly"] },
                  { n: "03", title: "Rent collection", dur: "2:58", bullets: ["Record payments in seconds","See due & overdue live","Full payment history"] },
                  { n: "04", title: "Reports & insights", dur: "2:30", bullets: ["Weekly cash flow at a glance","Occupancy + collection trends","Export anytime"] },
                ].map(({ n, title, dur, bullets }) => (
                  <button key={n} className="lp-vid-card lp-video-card" onClick={handleDemoLogin} disabled={demoLoading} style={{
                    flex: "0 0 320px", scrollSnapAlign: "start",
                    background: "linear-gradient(160deg,rgba(255,255,255,.045),rgba(255,255,255,.015))",
                    border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, overflow: "hidden",
                    cursor: demoLoading ? "not-allowed" : "pointer", transition: "transform .2s,border-color .2s",
                    textAlign: "left", padding: 0,
                  }}>
                    <div style={{
                      position: "relative", aspectRatio: "16/9" as const,
                      background: "linear-gradient(135deg,#1a1a26,#0d0d14)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <div style={{
                        position: "absolute", inset: 10, border: "1px solid rgba(255,255,255,.06)",
                        borderRadius: 7, background: "rgba(13,13,18,.4)", padding: 8,
                        display: "flex", flexDirection: "column", gap: 5,
                      }}>
                        <div style={{ height: 4, borderRadius: 3, background: "linear-gradient(90deg,#6366f1,#818cf8)", width: "62%" }}/>
                        <div style={{ height: 4, borderRadius: 3, background: "rgba(255,255,255,.08)" }}/>
                        <div style={{ height: 4, borderRadius: 3, background: "rgba(255,255,255,.08)", width: "50%" }}/>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginTop: "auto" }}>
                          {[0,1,2,3].map(i => <div key={i} style={{ height: 12, borderRadius: 3, background: "rgba(255,255,255,.05)" }}/>)}
                        </div>
                      </div>
                      <div className="lp-video-play" style={{
                        position: "absolute", width: 44, height: 44, borderRadius: "50%",
                        background: "linear-gradient(135deg,#fbbf24,#f59e0b)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 10px 28px rgba(251,191,36,.45)", zIndex: 2, transition: "transform .2s",
                      }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="#1f1408"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      </div>
                      <div style={{
                        position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,.7)",
                        backdropFilter: "blur(6px)", padding: "2px 6px", borderRadius: 5,
                        fontSize: 10, fontWeight: 600, color: "#fff", zIndex: 2, fontFamily: "monospace",
                      }}>{dur}</div>
                    </div>
                    <div style={{ padding: "14px 16px" }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase" as const, color: "#fcd34d", marginBottom: 6 }}>Demo {n}</div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#f4f4f5", marginBottom: 8, lineHeight: 1.3 }}>{title}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {bullets.map(b => (
                          <div key={b} style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 11, color: "#a1a1aa", lineHeight: 1.4 }}>
                            <span style={{ color: "#4ade80", marginTop: 2, flexShrink: 0 }}><CheckIcon /></span>
                            {b}
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: 10, fontSize: 11, fontWeight: 600, color: "#fbbf24" }}>
                        {demoLoading ? "Opening…" : "Tap to open demo hostel →"}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 5, justifyContent: "center", marginTop: 12 }}>
                {[0,1,2,3].map(i => (
                  <button key={i} onClick={() => carouselRef.current?.scrollTo({ left: i * 340, behavior: "smooth" })} style={{
                    width: dotIdx === i ? 20 : 6, height: 6, borderRadius: 999, border: "none", cursor: "pointer",
                    background: dotIdx === i ? "linear-gradient(90deg,#6366f1,#818cf8)" : "rgba(255,255,255,.15)",
                    transition: "all .2s",
                  }}/>
                ))}
              </div>
            </div>
          )}

          {/* PRICING */}
          {tab === "pricing" && (
            <div id="pricing">
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 10, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase" as const, color: "#fcd34d", marginBottom: 10 }}>
                  <LiveDot color="amber" /> Pricing
                </div>
                <h2 style={{ fontSize: "clamp(1.3rem,2.2vw,1.8rem)", fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.18 }}>
                  Simple pricing for{" "}
                  <span style={{ background: "linear-gradient(135deg,#fff,#fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>every hostel stage.</span>
                </h2>
              </div>

              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                flexWrap: "wrap" as const, padding: "14px 18px", marginBottom: 20, borderRadius: 12,
                background: "linear-gradient(135deg,rgba(251,191,36,.16),rgba(245,158,11,.08))",
                border: "1px solid rgba(251,191,36,.32)",
              }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase" as const, color: "#fbbf24", marginBottom: 2 }}>Launch Offer</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#f4f4f5", letterSpacing: "-.02em", lineHeight: 1.3 }}>First 30 days free · No setup fee</div>
                </div>
                <button onClick={() => openModal("Silver")} style={{
                  flexShrink: 0, background: "linear-gradient(135deg,#fbbf24,#f59e0b)", borderRadius: 8,
                  padding: "9px 16px", fontSize: 12.5, fontWeight: 700, color: "#1f1408", border: "none", cursor: "pointer",
                }}>Claim →</button>
              </div>

              <div className="lp-pricing-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, alignItems: "stretch" }}>
                {[
                  {
                    tier: "Silver", desc: "For small PGs and first-time owners.", price: "₹299", period: "/ month",
                    trial: "First 30 days free · cancel anytime", featured: false, ctaLabel: "Try Silver",
                    ctaStyle: "ghost", plan: "Silver",
                    features: ["Up to 50 monthly tenants","1 hostel","Room & bed tracking","Rent due reminders","₹10 per extra tenant"],
                  },
                  {
                    tier: "Gold", desc: "For active hostels with regular rent collection.", price: "₹599", period: "/ month",
                    trial: "First 30 days free · no card needed", featured: true, ctaLabel: "Try Gold — Free 30 days",
                    ctaStyle: "gold", plan: "Gold",
                    features: ["Up to 150 monthly tenants","3 hostels","Payment tracking + receipts","Due & overdue live dashboard","₹7 per extra tenant","₹199 per extra hostel"],
                  },
                  {
                    tier: "Diamond", desc: "For owners managing many properties.", price: "₹999", period: "/ month",
                    trial: "First 30 days free · no card needed", featured: false, ctaLabel: "Try Diamond",
                    ctaStyle: "indigo", plan: "Diamond",
                    features: ["Up to 300 monthly tenants","5 hostels","Advanced reports","Backup & export","₹5 per extra tenant","₹199 per extra hostel"],
                  },
                ].map(({ tier, desc, price, period, trial, featured, ctaLabel, ctaStyle, plan, features }) => (
                  <div key={tier} className={featured ? "lp-price-featured" : "lp-card-hover"} style={{
                    background: featured ? "linear-gradient(180deg,rgba(99,102,241,.1),rgba(99,102,241,.02))" : "linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.015))",
                    border: featured ? "1px solid rgba(99,102,241,.4)" : "1px solid rgba(255,255,255,.07)",
                    borderRadius: 12, padding: "20px 18px", position: "relative",
                    display: "flex", flexDirection: "column",
                    boxShadow: featured ? "0 14px 40px rgba(99,102,241,.18)" : "none",
                    transform: featured ? "translateY(-6px)" : "none",
                    transition: "transform .2s,border-color .2s",
                  }}>
                    {featured && (
                      <div style={{
                        position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
                        padding: "3px 12px", borderRadius: 999, fontSize: 9.5, fontWeight: 800,
                        letterSpacing: ".16em", textTransform: "uppercase" as const,
                        background: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#1f1408",
                        boxShadow: "0 6px 16px rgba(251,191,36,.4)", whiteSpace: "nowrap" as const,
                      }}>★ Most Popular</div>
                    )}
                    <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase" as const, color: featured ? "#fcd34d" : "#818cf8", marginBottom: 5 }}>{tier}</div>
                    <div style={{ fontSize: 11.5, color: "#71717a", lineHeight: 1.45, marginBottom: 14 }}>{desc}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 3 }}>
                      <span style={{ fontSize: "1.9rem", fontWeight: 800, letterSpacing: "-.05em", color: "#f4f4f5", lineHeight: 1 }}>{price}</span>
                      <span style={{ fontSize: 11.5, color: "#71717a", fontWeight: 600 }}>{period}</span>
                    </div>
                    <div style={{ fontSize: 10.5, color: "#4ade80", fontWeight: 600, marginBottom: 14 }}>{trial}</div>
                    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 7, marginBottom: 16, flex: 1 }}>
                      {features.map(f => (
                        <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 12, color: "#a1a1aa", lineHeight: 1.4 }}>
                          <span style={{ color: "#4ade80", marginTop: 2, flexShrink: 0 }}><CheckIcon /></span>{f}
                        </li>
                      ))}
                    </ul>
                    <button onClick={() => openModal(plan)} style={{
                      display: "block", width: "100%", textAlign: "center", padding: "11px 0",
                      borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer", border: "none",
                      ...(ctaStyle === "gold" ? {
                        background: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#1f1408",
                        boxShadow: "0 8px 20px rgba(251,191,36,.3)",
                      } : ctaStyle === "indigo" ? {
                        background: "linear-gradient(135deg,#4f46e5,#6366f1)", color: "#fff",
                        boxShadow: "0 8px 20px rgba(99,102,241,.32)",
                      } : {
                        background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.07)", color: "#f4f4f5",
                      }),
                    }}>{ctaLabel}</button>
                  </div>
                ))}
              </div>

              <div style={{ textAlign: "center", marginTop: 16, fontSize: 11.5, color: "#52525b" }}>
                No card required · No setup fee · Cancel anytime
              </div>
            </div>
          )}
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{
        padding: "56px 20px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,.07)",
        background: "radial-gradient(ellipse 60% 50% at 50% 50%,rgba(99,102,241,.12),transparent 65%),#09090b",
      }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 10, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase" as const, color: "#818cf8", marginBottom: 14 }}>
          <LiveDot /> Ready in 10 Minutes
        </div>
        <h2 style={{ fontSize: "clamp(1.4rem,2.8vw,2.2rem)", fontWeight: 800, letterSpacing: "-.04em", lineHeight: 1.1, marginBottom: 12, maxWidth: 600, marginLeft: "auto", marginRight: "auto" }}>
          <span style={{ background: "linear-gradient(135deg,#fff,#fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Start with one hostel. Scale to every property.
          </span>
        </h2>
        <p style={{ fontSize: 13.5, color: "#a1a1aa", maxWidth: 460, margin: "0 auto 20px" }}>
          Join 42 hostel owners across India who stopped losing money.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8, justifyContent: "center" }}>
          <button onClick={handleDemoLogin} disabled={demoLoading} className="lp-btn-primary" style={{
            background: "linear-gradient(135deg,#fbbf24,#f59e0b)", borderRadius: 9,
            padding: "12px 22px", fontSize: 13.5, fontWeight: 700, color: "#1f1408",
            boxShadow: "0 10px 24px rgba(251,191,36,.32)", border: "none",
            cursor: demoLoading ? "not-allowed" : "pointer",
            display: "inline-flex", alignItems: "center", gap: 7, transition: "transform .15s,box-shadow .15s",
            opacity: demoLoading ? 0.7 : 1,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            {demoLoading ? "Opening…" : "Try Demo"}
          </button>
          <button onClick={() => openModal()} style={{
            background: "rgba(99,102,241,.12)", border: "1px solid rgba(99,102,241,.32)",
            borderRadius: 9, padding: "11px 20px", fontSize: 13.5, fontWeight: 700, color: "#c7d2fe",
            cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7,
          }}>
            Request Trial
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,.07)", padding: "20px 20px", background: "#0d0d12", fontSize: 12, color: "#52525b" }}>
        <div className="lp-footer-inner" style={{ maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" as const, gap: 10 }}>
          <div>© 2026 StayManager · Built for hostel owners across India</div>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            {[["Problem",()=>{ setTab("problem"); document.getElementById("tabs")?.scrollIntoView({behavior:"smooth"}); }],
              ["Pricing",()=>{ setTab("pricing"); document.getElementById("tabs")?.scrollIntoView({behavior:"smooth"}); }]].map(([label, fn]) => (
              <button key={label as string} onClick={fn as ()=>void} className="lp-footer-link"
                style={{ background: "none", border: "none", color: "#71717a", cursor: "pointer", fontSize: 12 }}>
                {label as string}
              </button>
            ))}
            <Link href="/owner/login" className="lp-footer-link" style={{ color: "#71717a", textDecoration: "none", fontSize: 12 }}>Owner Login</Link>
          </div>
        </div>
      </footer>

      <TrialModal open={modalOpen} initialPlan={modalPlan} onClose={() => setModalOpen(false)} />
    </>
  );
}
