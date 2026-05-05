import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default function Home() {
  const { userId } = auth();
  if (userId) redirect("/dashboard");
  return <LandingPage />;
}

function LandingPage() {
  return (
    <div style={{ background: "#06060a", color: "#e8e8f4", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif" }}>
      <Navbar />
      <Hero />
      <ColorStripe />
      <StatsStrip />
      <TrustedBy />
      <BeforeAfterSection />
      <HowItWorksSection />
      <DemoSection />
      <UseCases />
      <Testimonials />
      <CtaBlock />
      <Footer />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   NAVBAR
═══════════════════════════════════════════════════════════ */
function Navbar() {
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(6,6,10,0.94)", backdropFilter: "blur(20px)", borderBottom: "1px solid #1c1c28" }}>
      <div style={{ maxWidth: "1160px", margin: "0 auto", padding: "0 32px", display: "flex", alignItems: "center", height: "64px", gap: "40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          <div style={C.logoMark}>⚡</div>
          <span style={{ fontSize: "16px", fontWeight: 800, color: "#f0f0f8", letterSpacing: "-0.3px" }}>ReSync AI</span>
        </div>
        <nav style={{ display: "flex", alignItems: "center", gap: "28px", flex: 1 }} className="hide-mobile">
          {["Features","Before & After","How it works","Demo"].map(l => (
            <a key={l} href="#features" className="lp-nav-link">{l}</a>
          ))}
          <Link href="/dashboard" className="lp-nav-link">Dashboard</Link>
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
          <Link href="/sign-in" className="lp-nav-link" style={{ fontWeight: 500 }}>Sign in</Link>
          <button disabled className="lp-btn-primary" style={{ padding: "9px 22px", fontSize: "14px" }}>Try it free</button>
        </div>
      </div>
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════
   HERO  — headline left, flow diagram right
═══════════════════════════════════════════════════════════ */
function Hero() {
  return (
    <section style={{ padding: "72px 32px 64px", background: "#06060a", overflow: "hidden" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div className="hero-grid" style={{ display: "flex", alignItems: "center", gap: "72px" }}>

          {/* Left — copy */}
          <div style={{ flex: "0 0 440px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#1a1030", border: "1px solid #2d1b52", borderRadius: "50px", padding: "6px 16px", marginBottom: "28px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#a78bfa" }} className="pulse" />
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#a78bfa" }}>Public beta · Free forever</span>
            </div>

            <h1 style={{ fontSize: "clamp(36px, 4.5vw, 58px)", fontWeight: 900, color: "#f0f0f8", lineHeight: 1.1, letterSpacing: "-1.5px", margin: "0 0 22px" }}>
              Stop re-explaining<br />
              your project to<br />
              <span style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI every time</span>
            </h1>

            <p style={{ fontSize: "17px", color: "#7070a0", lineHeight: 1.75, margin: "0 0 36px", maxWidth: "380px" }}>
              One click extracts your entire AI session — code, errors, decisions, next steps —
              and gives you a paste-ready resume prompt in seconds.
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "36px", flexWrap: "wrap" }}>
              <button disabled className="lp-btn-primary" style={{ fontSize: "16px", padding: "14px 36px" }}>
                Get started free
              </button>
              <a href="#how" style={{ fontSize: "15px", color: "#4a4a64", textDecoration: "none", fontWeight: 500 }}>
                See how it works ↓
              </a>
            </div>

            {/* Social proof */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ display: "flex" }}>
                {[["A","#7c3aed"],["R","#3b82f6"],["M","#10b981"],["D","#f59e0b"],["S","#ef4444"]].map(([l, bg], i) => (
                  <div key={i} style={{ width: "30px", height: "30px", borderRadius: "50%", background: bg as string, border: "2px solid #06060a", marginLeft: i > 0 ? "-9px" : 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: "#fff", position: "relative", zIndex: 5 - i }}>
                    {l}
                  </div>
                ))}
              </div>
              <span style={{ fontSize: "13px", color: "#3a3a52" }}>
                <span style={{ color: "#c4c4d4", fontWeight: 700 }}>500+</span> devs saving time daily
              </span>
            </div>
          </div>

          {/* Right — Flow Diagram (problem → solution) */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <HeroFlowDiagram />
          </div>

        </div>
      </div>
    </section>
  );
}

/* ── Hero: Problem → Solution flow visual ── */
function HeroFlowDiagram() {
  return (
    <div style={{ position: "relative" }}>
      {/* Glow */}
      <div style={{ position: "absolute", top: "30%", left: "20%", width: "60%", height: "40%", background: "radial-gradient(ellipse,rgba(124,58,237,0.15) 0%,transparent 70%)", pointerEvents: "none" }} />

      {/* PROBLEM block */}
      <div style={{ background: "#120a0a", border: "1px solid #3d1515", borderRadius: "16px", padding: "22px 24px", marginBottom: "14px", position: "relative" }}>
        <div style={{ fontSize: "10px", fontWeight: 800, color: "#ef4444", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "16px", display: "flex", alignItems: "center", gap: "7px" }}>
          <span>😵</span> Without ReSync AI
        </div>
        {[
          { icon: "💬", text: "Open new AI session", sub: "context is gone" },
          { icon: "⏳", text: "Re-explain your project", sub: "~8 minutes every time" },
          { icon: "📋", text: "Re-paste all your code", sub: "manually hunting for snippets" },
          { icon: "🤔", text: "Describe errors from memory", sub: "hope you remember the line number" },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", background: "#1a0808", borderRadius: "8px", marginBottom: "8px", border: "1px solid #2a0f0f" }}>
            <span style={{ fontSize: "16px", flexShrink: 0 }}>{item.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13px", color: "#9090a0", fontWeight: 500 }}>{item.text}</div>
              <div style={{ fontSize: "10px", color: "#4a2020", marginTop: "2px" }}>{item.sub}</div>
            </div>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#5a2020", background: "#2a0f0f", borderRadius: "4px", padding: "2px 7px" }}>SLOW</div>
          </div>
        ))}
        <div style={{ background: "#2a0f0f", borderRadius: "8px", padding: "10px 14px", marginTop: "4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "13px", color: "#f87171", fontWeight: 600 }}>Total time lost</span>
          <span style={{ fontSize: "20px", fontWeight: 900, color: "#ef4444" }}>10 min</span>
        </div>
      </div>

      {/* Bridge */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px", justifyContent: "center" }}>
        <div style={{ height: "1px", flex: 1, background: "linear-gradient(to right,transparent,#7c3aed)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#1a1030", border: "1px solid #2d1b52", borderRadius: "50px", padding: "9px 18px", whiteSpace: "nowrap" }}>
          <span style={{ fontSize: "16px" }}>⚡</span>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#a78bfa" }}>ReSync AI</span>
        </div>
        <div style={{ height: "1px", flex: 1, background: "linear-gradient(to left,transparent,#7c3aed)" }} />
      </div>

      {/* SOLUTION block */}
      <div style={{ background: "#061a10", border: "1px solid #0d3020", borderRadius: "16px", padding: "22px 24px", position: "relative" }}>
        <div style={{ fontSize: "10px", fontWeight: 800, color: "#34d399", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "16px", display: "flex", alignItems: "center", gap: "7px" }}>
          <span>⚡</span> With ReSync AI
        </div>
        {[
          { icon: "🔌", text: "Click Extract in extension", sub: "one click on any AI tab" },
          { icon: "✅", text: "Full session captured", sub: "code, errors, decisions — all of it" },
          { icon: "📝", text: "Context prompt auto-generated", sub: "structured and ready to paste" },
          { icon: "🚀", text: "Paste into new session", sub: "AI knows everything instantly" },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", background: "#0a2018", borderRadius: "8px", marginBottom: "8px", border: "1px solid #0d3020" }}>
            <span style={{ fontSize: "16px", flexShrink: 0 }}>{item.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13px", color: "#9090a0", fontWeight: 500 }}>{item.text}</div>
              <div style={{ fontSize: "10px", color: "#1a4a2a", marginTop: "2px" }}>{item.sub}</div>
            </div>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#1a5030", background: "#0d3020", borderRadius: "4px", padding: "2px 7px" }}>FAST</div>
          </div>
        ))}
        <div style={{ background: "#0d3020", borderRadius: "8px", padding: "10px 14px", marginTop: "4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "13px", color: "#34d399", fontWeight: 600 }}>Total time spent</span>
          <span style={{ fontSize: "20px", fontWeight: 900, color: "#34d399" }}>30 sec</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COLOR STRIPE
═══════════════════════════════════════════════════════════ */
function ColorStripe() {
  return (
    <div style={{ display: "flex", height: "4px" }}>
      {["#7c3aed","#a78bfa","#3b82f6","#06b6d4","#10b981","#f59e0b","#f43f5e","#8b5cf6"].map((c, i) => (
        <div key={i} style={{ flex: 1, background: c }} />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STATS STRIP
═══════════════════════════════════════════════════════════ */
function StatsStrip() {
  const stats = [
    { n: "10 min",  label: "saved per session" },
    { n: "1 click", label: "to capture context" },
    { n: "6+",      label: "AI tools supported" },
    { n: "∞",       label: "sessions stored free" },
  ];
  return (
    <div style={{ background: "#0a0a12", borderBottom: "1px solid #1c1c28" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 32px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
        {stats.map((s, i) => (
          <div key={s.label} style={{ textAlign: "center", padding: "36px 16px", borderRight: i < 3 ? "1px solid #1c1c28" : "none" }}>
            <div style={{ fontSize: "clamp(22px, 3vw, 36px)", fontWeight: 900, marginBottom: "6px", background: "linear-gradient(135deg,#f0f0f8,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.n}</div>
            <div style={{ fontSize: "13px", color: "#3a3a52" }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TRUSTED BY
═══════════════════════════════════════════════════════════ */
function TrustedBy() {
  const tools = [
    { name: "ChatGPT",        dot: "#10b981" },
    { name: "Claude",         dot: "#a78bfa" },
    { name: "GitHub Copilot", dot: "#e8e8f4" },
    { name: "VS Code",        dot: "#3b82f6" },
    { name: "Cursor",         dot: "#f59e0b" },
    { name: "Windsurf",       dot: "#06b6d4" },
  ];
  return (
    <section style={{ padding: "48px 32px", borderBottom: "1px solid #1c1c28" }}>
      <div style={C.wrap}>
        <p style={{ textAlign: "center", fontSize: "12px", fontWeight: 700, color: "#2a2a3e", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "24px" }}>
          Works with every major AI coding tool
        </p>
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "10px" }}>
          {tools.map(t => (
            <div key={t.name} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 20px", background: "#0e0e16", border: "1px solid #1c1c28", borderRadius: "50px", fontSize: "13px", fontWeight: 600, color: "#5a5a72" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: t.dot, flexShrink: 0 }} />
              {t.name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   BEFORE vs AFTER  — full section
═══════════════════════════════════════════════════════════ */
function BeforeAfterSection() {
  const before = [
    { time: "0:00",  emoji: "💬", label: "Open new AI session",         note: "all previous context is gone" },
    { time: "2:00",  emoji: "😮‍💨", label: "\"Let me explain my project…\"", note: "typing the same intro again" },
    { time: "5:00",  emoji: "📋", label: "Paste old code snippets",       note: "hunting through old chats" },
    { time: "8:00",  emoji: "🤔", label: "Describe errors from memory",   note: "forgot the exact line number" },
    { time: "10:00", emoji: "😤", label: "Finally start coding again",    note: "10 minutes wasted every day" },
  ];
  const after = [
    { time: "0:00", emoji: "⚡", label: "Click Extract on AI tab",       note: "works on ChatGPT and Claude" },
    { time: "0:08", emoji: "✅", label: "Full session captured",          note: "code, errors, decisions — all" },
    { time: "0:15", emoji: "📝", label: "Context prompt auto-written",    note: "structured, ready to paste" },
    { time: "0:22", emoji: "💬", label: "Paste into new AI session",      note: "AI knows everything instantly" },
    { time: "0:30", emoji: "🚀", label: "Back to coding",                 note: "exactly where you left off" },
  ];

  return (
    <section id="features" style={{ padding: "88px 32px", background: "#06060a" }}>
      <div style={C.wrap}>
        <div style={{ textAlign: "center", marginBottom: "64px" }}>
          <PillTag>Before &amp; After</PillTag>
          <h2 style={C.h2}>You&apos;re losing 10 minutes<br />every single morning</h2>
          <p style={C.sub}>Here&apos;s exactly what your workflow looks like before and after ReSync AI.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "24px", alignItems: "start", maxWidth: "960px", margin: "0 auto" }}>

          {/* BEFORE */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "#2a0f0f", border: "2px solid #ef4444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>✗</div>
              <div>
                <div style={{ fontSize: "17px", fontWeight: 800, color: "#f87171" }}>Before</div>
                <div style={{ fontSize: "11px", color: "#4a2020" }}>Without ReSync AI</div>
              </div>
            </div>
            <div style={{ background: "#120a0a", border: "1px solid #3d1515", borderRadius: "16px", overflow: "hidden" }}>
              {before.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: "14px", padding: "14px 18px", borderBottom: i < before.length - 1 ? "1px solid #1e0808" : "none", alignItems: "flex-start" }}>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#4a2020", width: "38px", flexShrink: 0, paddingTop: "3px", fontFamily: "monospace" }}>{item.time}</div>
                  <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#1a0808", border: "1px solid #2a0f0f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}>{item.emoji}</div>
                  <div>
                    <div style={{ fontSize: "13px", color: "#c4a0a0", fontWeight: 500, lineHeight: 1.4 }}>{item.label}</div>
                    <div style={{ fontSize: "11px", color: "#4a2020", marginTop: "3px" }}>{item.note}</div>
                  </div>
                </div>
              ))}
              <div style={{ background: "#2a0f0f", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", color: "#f87171", fontWeight: 600 }}>⏳ Time wasted</span>
                <span style={{ fontSize: "22px", fontWeight: 900, color: "#ef4444" }}>10:00</span>
              </div>
            </div>
          </div>

          {/* VS divider */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: "64px", gap: "8px" }}>
            <div style={{ width: "1px", height: "80px", background: "linear-gradient(to bottom,transparent,#1c1c28)" }} />
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#0e0e16", border: "1px solid #1c1c28", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 800, color: "#3a3a52" }}>VS</div>
            <div style={{ width: "1px", height: "80px", background: "linear-gradient(to top,transparent,#1c1c28)" }} />
          </div>

          {/* AFTER */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "#0d3020", border: "2px solid #34d399", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>✓</div>
              <div>
                <div style={{ fontSize: "17px", fontWeight: 800, color: "#34d399" }}>After</div>
                <div style={{ fontSize: "11px", color: "#1a4a2a" }}>With ReSync AI</div>
              </div>
            </div>
            <div style={{ background: "#061a10", border: "1px solid #0d3020", borderRadius: "16px", overflow: "hidden" }}>
              {after.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: "14px", padding: "14px 18px", borderBottom: i < after.length - 1 ? "1px solid #091e12" : "none", alignItems: "flex-start" }}>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#1a4a2a", width: "38px", flexShrink: 0, paddingTop: "3px", fontFamily: "monospace" }}>{item.time}</div>
                  <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#0a2018", border: "1px solid #0d3020", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}>{item.emoji}</div>
                  <div>
                    <div style={{ fontSize: "13px", color: "#90c4a8", fontWeight: 500, lineHeight: 1.4 }}>{item.label}</div>
                    <div style={{ fontSize: "11px", color: "#1a4a2a", marginTop: "3px" }}>{item.note}</div>
                  </div>
                </div>
              ))}
              <div style={{ background: "#0d3020", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", color: "#34d399", fontWeight: 600 }}>⚡ Back in flow</span>
                <span style={{ fontSize: "22px", fontWeight: 900, color: "#34d399" }}>0:30</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   HOW IT WORKS  — 3 steps with concept visuals
═══════════════════════════════════════════════════════════ */
function HowItWorksSection() {
  return (
    <section id="how" style={{ padding: "88px 32px", background: "#0a0a12", borderTop: "1px solid #1c1c28" }}>
      <div style={C.wrap}>
        <div style={{ textAlign: "center", marginBottom: "64px" }}>
          <PillTag>How it works</PillTag>
          <h2 style={C.h2}>Three steps.<br />Thirty seconds.</h2>
          <p style={C.sub}>From losing your session to being back in flow — in less time than it takes to open a new tab.</p>
        </div>

        <div className="steps-row" style={{ display: "flex", gap: "28px", alignItems: "stretch" }}>

          {/* Step 1 */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ background: "#0e0e16", border: "1px solid #1c1c28", borderRadius: "20px", overflow: "hidden", flex: 1 }}>
              {/* Visual */}
              <div style={{ background: "#13131e", borderBottom: "1px solid #1c1c28", padding: "28px 24px", minHeight: "180px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <StepInstallVisual />
              </div>
              {/* Text */}
              <div style={{ padding: "24px" }}>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#7c3aed", letterSpacing: "1.5px", marginBottom: "10px" }}>STEP 01</div>
                <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#f0f0f8", margin: "0 0 10px", lineHeight: 1.25 }}>Install the extension</h3>
                <p style={{ fontSize: "14px", color: "#6060808", lineHeight: 1.7, margin: 0 }}>
                  Add ReSync AI to Chrome in 30 seconds. Works on any tab — ChatGPT, Claude, Gemini, and more.
                </p>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div style={{ display: "flex", alignItems: "center", paddingBottom: "80px", flexShrink: 0 }} className="hide-mobile">
            <div style={{ fontSize: "20px", color: "#2a2a3e" }}>→</div>
          </div>

          {/* Step 2 */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ background: "#0e0e16", border: "1px solid #1c1c28", borderRadius: "20px", overflow: "hidden", flex: 1 }}>
              <div style={{ background: "#13131e", borderBottom: "1px solid #1c1c28", padding: "28px 24px", minHeight: "180px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <StepExtractVisual />
              </div>
              <div style={{ padding: "24px" }}>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#3b82f6", letterSpacing: "1.5px", marginBottom: "10px" }}>STEP 02</div>
                <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#f0f0f8", margin: "0 0 10px", lineHeight: 1.25 }}>Click Extract</h3>
                <p style={{ fontSize: "14px", color: "#6060808", lineHeight: 1.7, margin: 0 }}>
                  One click on any open AI chat tab. The extension reads the full conversation and structures everything automatically.
                </p>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div style={{ display: "flex", alignItems: "center", paddingBottom: "80px", flexShrink: 0 }} className="hide-mobile">
            <div style={{ fontSize: "20px", color: "#2a2a3e" }}>→</div>
          </div>

          {/* Step 3 */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ background: "#0e0e16", border: "1px solid #1c1c28", borderRadius: "20px", overflow: "hidden", flex: 1 }}>
              <div style={{ background: "#13131e", borderBottom: "1px solid #1c1c28", padding: "28px 24px", minHeight: "180px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <StepResumeVisual />
              </div>
              <div style={{ padding: "24px" }}>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#10b981", letterSpacing: "1.5px", marginBottom: "10px" }}>STEP 03</div>
                <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#f0f0f8", margin: "0 0 10px", lineHeight: 1.25 }}>Resume anywhere</h3>
                <p style={{ fontSize: "14px", color: "#6060808", lineHeight: 1.7, margin: 0 }}>
                  Paste the generated context into any new Claude, ChatGPT, or Gemini chat. AI knows your full project instantly.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

/* Step visuals */
function StepInstallVisual() {
  return (
    <div style={{ width: "100%", maxWidth: "200px" }}>
      {/* Chrome extension install card */}
      <div style={{ background: "#0e0e16", border: "1px solid #1c1c28", borderRadius: "12px", overflow: "hidden" }}>
        <div style={{ background: "#0a0a12", padding: "10px 14px", borderBottom: "1px solid #1c1c28", display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ fontSize: "10px", color: "#3a3a52" }}>🌐 Chrome Web Store</div>
        </div>
        <div style={{ padding: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <div style={{ width: "36px", height: "36px", background: "linear-gradient(135deg,#7c3aed,#a78bfa)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>⚡</div>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#e8e8f4" }}>ReSync AI</div>
              <div style={{ fontSize: "9px", color: "#3a3a52" }}>★★★★★ · Free</div>
            </div>
          </div>
          <div style={{ background: "#7c3aed", borderRadius: "7px", padding: "8px", fontSize: "11px", fontWeight: 700, color: "#fff", textAlign: "center" }}>
            Add to Chrome
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px", background: "#0d3020", border: "1px solid #0d3020", borderRadius: "20px", padding: "4px 12px" }}>
          <span style={{ fontSize: "10px", color: "#34d399" }}>✓ Installed in 30 seconds</span>
        </div>
      </div>
    </div>
  );
}

function StepExtractVisual() {
  return (
    <div style={{ width: "100%", maxWidth: "220px" }}>
      {/* Mini chat interface with Extract button */}
      <div style={{ background: "#0e0e16", border: "1px solid #1c1c28", borderRadius: "12px", overflow: "hidden" }}>
        <div style={{ background: "#0a0a12", padding: "9px 12px", borderBottom: "1px solid #1c1c28", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: "10px", color: "#3a3a52" }}>claude.ai</div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#10b981" }} className="pulse" />
            <span style={{ fontSize: "9px", color: "#a78bfa" }}>Active</span>
          </div>
        </div>
        {/* Chat messages (mini) */}
        <div style={{ padding: "10px 12px" }}>
          {[{ from: "you", text: "Fix the auth bug..." },{ from: "ai", text: "Sure! The issue is..." },{ from: "you", text: "Now add the test..." },].map((m, i) => (
            <div key={i} style={{ display: "flex", gap: "6px", marginBottom: "6px", justifyContent: m.from === "you" ? "flex-end" : "flex-start" }}>
              <div style={{ fontSize: "9px", padding: "5px 8px", borderRadius: "8px", background: m.from === "you" ? "#1a1030" : "#0e0e16", border: `1px solid ${m.from === "you" ? "#2d1b52" : "#1c1c28"}`, color: m.from === "you" ? "#a78bfa" : "#7070a0", maxWidth: "80%" }}>{m.text}</div>
            </div>
          ))}
          <div style={{ fontSize: "9px", color: "#3a3a52", textAlign: "center", margin: "6px 0" }}>48 messages · 2 hours ago</div>
        </div>
        {/* Extract button — highlighted */}
        <div style={{ padding: "0 12px 12px" }}>
          <div style={{ background: "#7c3aed", borderRadius: "8px", padding: "10px", textAlign: "center", boxShadow: "0 0 20px rgba(124,58,237,0.4)" }}>
            <div style={{ fontSize: "11px", fontWeight: 800, color: "#fff" }}>⚡ Extract Context</div>
            <div style={{ fontSize: "9px", color: "#c4b5fd", marginTop: "2px" }}>Click to capture session</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepResumeVisual() {
  return (
    <div style={{ width: "100%", maxWidth: "220px" }}>
      {/* New chat with pasted context */}
      <div style={{ background: "#0e0e16", border: "1px solid #1c1c28", borderRadius: "12px", overflow: "hidden" }}>
        <div style={{ background: "#0a0a12", padding: "9px 12px", borderBottom: "1px solid #1c1c28", display: "flex", gap: "5px" }}>
          {[{ name: "ChatGPT", color: "#10b981" }, { name: "Claude", color: "#a78bfa" }, { name: "Gemini", color: "#3b82f6" }].map(t => (
            <div key={t.name} style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "9px", padding: "2px 7px", borderRadius: "10px", background: "#1c1c28", color: "#4a4a64" }}>
              <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: t.color }} />
              {t.name}
            </div>
          ))}
        </div>
        <div style={{ padding: "10px 12px" }}>
          <div style={{ background: "#1a1030", border: "1px solid #2d1b52", borderRadius: "8px", padding: "10px", marginBottom: "8px" }}>
            <div style={{ fontSize: "8px", fontWeight: 800, color: "#a78bfa", letterSpacing: "1px", marginBottom: "6px" }}>CONTEXT PASTED ⚡</div>
            {[["Project","FastAPI Auth"],["File","middleware.py:42"],["Next","Fix token refresh"]].map(([k,v]) => (
              <div key={k} style={{ display: "flex", gap: "6px", fontSize: "9px", marginBottom: "4px", fontFamily: "monospace" }}>
                <span style={{ color: "#3a3a52", width: "44px" }}>{k}:</span>
                <span style={{ color: "#c4c4d4" }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "5px", alignItems: "center", padding: "8px 10px", background: "#0a1e14", borderRadius: "8px" }}>
            <div style={{ display: "flex", gap: "2px" }}>
              {[1,2,3].map(i => <div key={i} style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#34d399", opacity: i * 0.35 }} />)}
            </div>
            <span style={{ fontSize: "9px", color: "#34d399", fontWeight: 600 }}>AI knows your full project</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DEMO SECTION  — real dashboard screenshot
═══════════════════════════════════════════════════════════ */
function DemoSection() {
  const rows = [
    { name: "FastAPI Auth System",   src: "Claude",  tags: ["Python","FastAPI"],   t: "2m ago",    err: true  },
    { name: "React Dashboard UI",    src: "ChatGPT", tags: ["React","TypeScript"], t: "1h ago",    err: false },
    { name: "Supabase Integration",  src: "Claude",  tags: ["Next.js","Supabase"], t: "3h ago",    err: false },
    { name: "Chrome Extension MV3",  src: "Claude",  tags: ["JavaScript"],         t: "Yesterday", err: true  },
  ];

  return (
    <section id="demo" style={{ padding: "88px 32px", background: "#06060a", borderTop: "1px solid #1c1c28" }}>
      <div style={C.wrap}>
        <div style={{ textAlign: "center", marginBottom: "52px" }}>
          <PillTag>Live Demo</PillTag>
          <h2 style={C.h2}>Your contexts,<br />beautifully organized</h2>
          <p style={C.sub}>Every extracted session is stored in your personal dashboard — searchable, detailed, and always ready.</p>
        </div>

        {/* Dashboard mockup */}
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", top: "10%", left: "20%", width: "60%", height: "80%", background: "radial-gradient(ellipse,rgba(124,58,237,0.1) 0%,transparent 70%)", pointerEvents: "none" }} />
          <div style={{ background: "#0a0a14", borderRadius: "20px", overflow: "hidden", border: "1px solid #1c1c28", boxShadow: "0 40px 100px rgba(0,0,0,0.7)", position: "relative" }}>
            {/* Browser bar */}
            <div style={{ background: "#0a0a12", padding: "12px 20px", borderBottom: "1px solid #1c1c28", display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ display: "flex", gap: "7px" }}>
                {["#ef4444","#f59e0b","#22c55e"].map(c => <div key={c} style={{ width: "12px", height: "12px", borderRadius: "50%", background: c }} />)}
              </div>
              <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                <div style={{ fontSize: "12px", color: "#2a2a3e", background: "#131320", border: "1px solid #1c1c28", borderRadius: "8px", padding: "4px 28px" }}>
                  app.resyncai.com/dashboard
                </div>
              </div>
            </div>
            {/* Layout */}
            <div style={{ display: "flex", height: "440px" }}>
              {/* Sidebar */}
              <div style={{ width: "200px", borderRight: "1px solid #1c1c28", background: "#08080f", display: "flex", flexDirection: "column", padding: "16px 0" }}>
                <div style={{ padding: "4px 12px 16px", borderBottom: "1px solid #131320" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "28px", height: "28px", background: "linear-gradient(135deg,#7c3aed,#a78bfa)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>⚡</div>
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#e8e8f4" }}>Context Engine</div>
                      <div style={{ fontSize: "9px", color: "#2a2a3e" }}>AI Session Manager</div>
                    </div>
                  </div>
                </div>
                <div style={{ padding: "10px 8px", flex: 1 }}>
                  {[
                    { label: "Dashboard",   icon: "⊞", active: false },
                    { label: "My Contexts", icon: "≡", active: true  },
                    { label: "Settings",    icon: "⚙", active: false },
                  ].map(item => (
                    <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", borderRadius: "6px", background: item.active ? "#1c1c28" : "transparent", color: item.active ? "#e8e8f4" : "#2a2a3e", fontSize: "12px", marginBottom: "3px", fontWeight: item.active ? 600 : 400 }}>
                      <span style={{ fontSize: "11px" }}>{item.icon}</span>
                      {item.label}
                    </div>
                  ))}
                </div>
                {/* User */}
                <div style={{ padding: "10px 12px", borderTop: "1px solid #131320" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: "#fff" }}>A</div>
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 600, color: "#c4c4d4" }}>Ayush</div>
                      <div style={{ fontSize: "9px", color: "#2a2a3e" }}>udayvimal08@gmail.com</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main */}
              <div style={{ flex: 1, background: "#09090b", overflowY: "auto" }}>
                {/* Install banner */}
                <div style={{ margin: "16px 20px 0", borderRadius: "10px", background: "linear-gradient(135deg,#0e0c1e,#0d0d13)", border: "1px solid #1e1a3a", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "9px", fontWeight: 800, color: "#6c63ff", letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: "4px" }}>Chrome Extension</div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#e8e8f4" }}>Never lose your coding progress again</div>
                  </div>
                  <div style={{ padding: "7px 16px", background: "#6c63ff", borderRadius: "7px", fontSize: "11px", fontWeight: 700, color: "#fff", whiteSpace: "nowrap", flexShrink: 0 }}>📦 Install Extension</div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "#f0f0f8" }}>My Contexts</span>
                    <span style={{ fontSize: "10px", background: "#1c1c28", color: "#5a5a72", padding: "2px 8px", borderRadius: "10px" }}>{rows.length}</span>
                  </div>
                  <span style={{ fontSize: "11px", color: "#2a2a3e", border: "1px solid #1c1c28", padding: "5px 12px", borderRadius: "7px" }}>↻ Refresh</span>
                </div>

                <div style={{ background: "#111113", border: "1px solid #1a1a22", borderRadius: "10px", overflow: "hidden", margin: "0 20px" }}>
                  {rows.map((r, i) => (
                    <div key={r.name} style={{ display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: i < rows.length - 1 ? "1px solid #13131e" : "none", gap: "12px" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: r.err ? "#ef4444" : "#10b981", flexShrink: 0, boxShadow: r.err ? "0 0 6px #ef444455" : "0 0 6px #10b98155" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#c4c4d4", marginBottom: "4px" }}>{r.name}</div>
                        <div style={{ display: "flex", gap: "5px" }}>
                          {r.tags.map(t => <span key={t} style={{ fontSize: "9px", padding: "1px 7px", background: "#1c1c28", borderRadius: "4px", color: "#4a4a64" }}>{t}</span>)}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <span style={{ fontSize: "9px", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: r.src === "Claude" ? "#1a1030" : "#0a1e14", color: r.src === "Claude" ? "#a78bfa" : "#34d399" }}>{r.src.toUpperCase()}</span>
                        <span style={{ fontSize: "11px", color: "#2a2a3e" }}>{r.t}</span>
                        <span style={{ color: "#1c1c28" }}>›</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: "36px" }}>
          <Link href="/sign-up" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "14px 36px", background: "#7c3aed", border: "none", borderRadius: "50px", color: "#fff", fontSize: "15px", fontWeight: 700, textDecoration: "none" }}>
            Open your dashboard →
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   USE CASES
═══════════════════════════════════════════════════════════ */
function UseCases() {
  const cases = [
    { bg: "linear-gradient(135deg,#10b981,#059669)", icon: "💻", title: "Engineers",       desc: "Stop the daily re-explaining grind. Pick up any AI session mid-thought, every time." },
    { bg: "linear-gradient(135deg,#8b5cf6,#6d28d9)", icon: "🎓", title: "Students",        desc: "Every lesson and breakthrough captured. Resume your AI tutor exactly where you paused." },
    { bg: "linear-gradient(135deg,#f59e0b,#d97706)", icon: "🤖", title: "AI Builders",     desc: "Manage complex multi-session LLM workflows without ever losing your thread." },
    { bg: "linear-gradient(135deg,#3b82f6,#2563eb)", icon: "🚀", title: "Founders",        desc: "Move fast without losing context. Juggle features, bugs, and pivots effortlessly." },
  ];
  return (
    <section style={{ padding: "88px 32px", background: "#0a0a12", borderTop: "1px solid #1c1c28" }}>
      <div style={C.wrap}>
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <PillTag>Use cases</PillTag>
          <h2 style={C.h2}>Built for everyone<br />who codes with AI</h2>
        </div>
        <div className="uc-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "20px" }}>
          {cases.map(c => (
            <div key={c.title} className="lp-uc-card">
              <div style={{ height: "130px", background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "44px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "90px", height: "90px", borderRadius: "50%", background: "rgba(255,255,255,0.12)" }} />
                <div style={{ position: "absolute", bottom: "-36px", left: "-12px", width: "110px", height: "110px", borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
                <span style={{ position: "relative", zIndex: 1 }}>{c.icon}</span>
              </div>
              <div style={{ padding: "22px 20px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#e8e8f4", margin: "0 0 10px" }}>{c.title}</h3>
                <p style={{ margin: 0, fontSize: "13px", color: "#5a5a72", lineHeight: 1.75 }}>{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   TESTIMONIALS
═══════════════════════════════════════════════════════════ */
function Testimonials() {
  const quotes = [
    { company: "YC Startup",  quote: "This extension is a game changer. I was spending 10 minutes every morning re-explaining my project to Claude. Now I paste the context and I'm back in flow instantly.", name: "Alex Chen",   role: "Senior Software Engineer" },
    { company: "Solo Dev",    quote: "I work on 4 different projects simultaneously. Before this, switching between AI sessions was a nightmare. Now I just paste the context and continue exactly where I left off.", name: "Priya Sharma", role: "Freelance Full-Stack Dev" },
    { company: "CS Student",  quote: "As a student learning through AI tutoring, losing my session was the worst. Now every session builds on the last. My learning speed has literally doubled.", name: "Marcus Wei",   role: "Computer Science, Final Year" },
  ];
  return (
    <section style={{ padding: "88px 32px", background: "#06060a", borderTop: "1px solid #1c1c28" }}>
      <div style={C.wrap}>
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <PillTag>Testimonials</PillTag>
          <h2 style={C.h2}>Real developers,<br />real results</h2>
        </div>
        {/* Featured */}
        <div style={{ maxWidth: "860px", margin: "0 auto 36px", borderRadius: "20px", overflow: "hidden", border: "1px solid #1c1c28", display: "flex" }} className="feat-block">
          <div style={{ flex: "0 0 220px", background: "linear-gradient(160deg,#1a1030,#0e0916)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", gap: "10px" }}>
            <div style={{ fontSize: "44px" }}>⚡</div>
            <div style={{ fontSize: "20px", fontWeight: 900, textAlign: "center", lineHeight: 1.2, background: "linear-gradient(135deg,#f0f0f8,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Context<br />Engine</div>
            <div style={{ display: "flex", gap: "2px", marginTop: "6px" }}>
              {[1,2,3,4,5].map(s => <span key={s} style={{ color: "#fbbf24", fontSize: "13px" }}>★</span>)}
            </div>
          </div>
          <div style={{ flex: 1, padding: "40px 36px", background: "#0e0e16" }}>
            <blockquote style={{ margin: "0 0 22px", fontSize: "clamp(14px, 1.8vw, 17px)", color: "#e8e8f4", lineHeight: 1.8, fontStyle: "normal" }}>
              &ldquo;{quotes[0].quote}&rdquo;
            </blockquote>
            <div style={{ fontSize: "13px", fontWeight: 800, color: "#f0f0f8", textTransform: "uppercase", letterSpacing: "0.5px" }}>{quotes[0].name}</div>
            <div style={{ fontSize: "12px", color: "#a78bfa", marginTop: "3px" }}>{quotes[0].role} · {quotes[0].company}</div>
          </div>
        </div>
        {/* 3 small cards */}
        <div className="uc-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px", maxWidth: "860px", margin: "0 auto" }}>
          {quotes.map((q, i) => (
            <div key={i} style={{ background: "#0e0e16", borderRadius: "16px", padding: "24px 20px", border: "1px solid #1c1c28" }}>
              <div style={{ display: "flex", gap: "2px", marginBottom: "14px" }}>
                {[1,2,3,4,5].map(s => <span key={s} style={{ color: "#fbbf24", fontSize: "11px" }}>★</span>)}
              </div>
              <p style={{ margin: "0 0 18px", fontSize: "13px", color: "#7070a0", lineHeight: 1.8 }}>&ldquo;{q.quote}&rdquo;</p>
              <div style={{ borderTop: "1px solid #1c1c28", paddingTop: "14px" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#e8e8f4" }}>{q.name}</div>
                <div style={{ fontSize: "11px", color: "#3a3a52", marginTop: "2px" }}>{q.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   CTA BLOCK
═══════════════════════════════════════════════════════════ */
function CtaBlock() {
  return (
    <section style={{ background: "#1a0b38", padding: "96px 32px", textAlign: "center", borderTop: "1px solid #2d1b52", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "700px", height: "400px", background: "radial-gradient(ellipse,rgba(124,58,237,0.22) 0%,transparent 70%)", pointerEvents: "none" }} />
      <div style={{ maxWidth: "560px", margin: "0 auto", position: "relative" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(124,58,237,0.18)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: "50px", padding: "6px 18px", marginBottom: "28px" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#c4b5fd" }}>Free forever · No credit card needed</span>
        </div>
        <h2 style={{ fontSize: "clamp(32px, 4.5vw, 52px)", fontWeight: 900, color: "#fff", margin: "0 0 18px", letterSpacing: "-1px", lineHeight: 1.1 }}>
          Get unstuck today
        </h2>
        <p style={{ fontSize: "17px", color: "rgba(255,255,255,0.48)", margin: "0 auto 40px", lineHeight: 1.7 }}>
          Join 500+ developers who stopped re-explaining their projects to AI and started shipping faster.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "14px", flexWrap: "wrap" }}>
          <button disabled style={{ padding: "15px 44px", background: "#fbbf24", border: "none", borderRadius: "50px", fontSize: "17px", fontWeight: 800, color: "#111827", cursor: "not-allowed", fontFamily: "inherit", boxShadow: "0 4px 24px rgba(251,191,36,0.3)" }}>
            Get started free
          </button>
          <Link href="/sign-in" style={{ padding: "15px 36px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.14)", borderRadius: "50px", fontSize: "17px", fontWeight: 600, color: "#e8e8f4", textDecoration: "none" }}>
            Sign in →
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   FOOTER
═══════════════════════════════════════════════════════════ */
function Footer() {
  const cols = [
    { title: "Product",    links: ["Features","How it works","Changelog","Roadmap","Pricing"] },
    { title: "Developers", links: ["Documentation","API Reference","Chrome Extension","GitHub","Status"] },
    { title: "Solutions",  links: ["For Engineers","For Students","For AI Builders","For Startups","Enterprise"] },
    { title: "Company",    links: ["About","Blog","Careers","Contact","Privacy"] },
  ];
  return (
    <footer style={{ background: "#06060a", borderTop: "1px solid #1c1c28" }}>
      <div style={{ maxWidth: "1160px", margin: "0 auto", padding: "0 32px" }}>
        <div className="footer-cols" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: "48px", padding: "64px 0 48px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div style={C.logoMark}>⚡</div>
              <span style={{ fontSize: "16px", fontWeight: 800, color: "#f0f0f8" }}>ReSync AI</span>
            </div>
            <p style={{ fontSize: "14px", color: "#2a2a3e", lineHeight: 1.75, margin: "0 0 24px", maxWidth: "220px" }}>
              Never lose your coding progress. Resume any AI session instantly.
            </p>
            <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
              {["𝕏 Twitter","GitHub","Discord"].map(s => (
                <a key={s} href="#" style={{ padding: "6px 12px", background: "#0e0e16", border: "1px solid #1c1c28", borderRadius: "7px", fontSize: "12px", color: "#2a2a3e", textDecoration: "none" }}>{s}</a>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#10b981" }} className="pulse" />
              <span style={{ fontSize: "12px", color: "#1e1e28" }}>All systems operational</span>
            </div>
          </div>
          {cols.map(col => (
            <div key={col.title}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#c4c4d4", letterSpacing: "0.5px", marginBottom: "18px" }}>{col.title}</div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "13px" }}>
                {col.links.map(l => <li key={l}><a href="#" className="lp-footer-link">{l}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid #1c1c28", padding: "24px 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <span style={{ fontSize: "13px", color: "#1a1a24" }}>© {new Date().getFullYear()} ReSync AI. All rights reserved.</span>
          <div style={{ display: "flex", gap: "24px" }}>
            {["Privacy Policy","Terms of Service","Cookie Policy"].map(t => (
              <a key={t} href="#" style={{ fontSize: "13px", color: "#1a1a24", textDecoration: "none" }}>{t}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════════════
   SHARED PRIMITIVES
═══════════════════════════════════════════════════════════ */
function PillTag({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#1a1030", border: "1px solid #2d1b52", borderRadius: "50px", padding: "6px 16px", marginBottom: "20px" }}>
      <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#a78bfa" }} />
      <span style={{ fontSize: "12px", fontWeight: 600, color: "#a78bfa" }}>{children}</span>
    </div>
  );
}

function Tag({ children, color = "#a78bfa", bg = "#180d30" }: { children: React.ReactNode; color?: string; bg?: string }) {
  return (
    <div style={{ display: "inline-block", fontSize: "11px", fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", color, background: bg, borderRadius: "5px", padding: "4px 12px", marginBottom: "18px" }}>
      {children}
    </div>
  );
}

const C = {
  wrap:     { maxWidth: "1100px", margin: "0 auto" } as React.CSSProperties,
  logoMark: { width: "30px", height: "30px", borderRadius: "8px", background: "linear-gradient(135deg,#7c3aed,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 } as React.CSSProperties,
  h2:       { fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 900, color: "#f0f0f8", margin: "0 0 16px", lineHeight: 1.12, letterSpacing: "-0.8px" } as React.CSSProperties,
  h3:       { fontSize: "clamp(20px, 2.5vw, 28px)", fontWeight: 800, color: "#f0f0f8", margin: "0 0 14px", lineHeight: 1.22, letterSpacing: "-0.4px" } as React.CSSProperties,
  sub:      { fontSize: "17px", color: "#5a5a72", margin: "0 auto", lineHeight: 1.7, maxWidth: "480px" } as React.CSSProperties,
  bodyText: { fontSize: "15px", color: "#6060808", lineHeight: 1.8, margin: "0 0 24px" } as React.CSSProperties,
  learnMore:{ fontSize: "15px", fontWeight: 700, color: "#a78bfa", textDecoration: "none" } as React.CSSProperties,
};
