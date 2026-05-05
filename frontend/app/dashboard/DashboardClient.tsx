"use client";

import { useEffect, useState, useCallback } from "react";
import { useClerk } from "@clerk/nextjs";

// ── Types ──────────────────────────────────────────────────────────────────
interface ContextData {
  project_name?: string;
  next_action?: string;
  context_paragraph?: string;
  source?: string;
  message_count?: number;
  active_file?: string;
  active_function?: string;
  tech_stack?: {
    language?: string; framework?: string;
    database?: string; runtime?: string; other?: string[];
  };
  last_error?: {
    message?: string; file?: string; line?: string;
    cause?: string; fix?: string; resolved?: boolean;
  };
  last_code?: {
    code?: string; language?: string; file?: string; purpose?: string;
  };
  working?: string[];
  broken?: string[];
  files_touched?: Array<{ path: string; purpose?: string }>;
  commands_run?: string[];
  decisions?: Array<{ chose?: string; why?: string; rejected?: string }>;
}
interface ContextRow {
  id: string; user_id: string;
  context_json: ContextData; created_at: string;
}
type ViewState = "list" | "detail" | "settings";

// ── Helpers ────────────────────────────────────────────────────────────────
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function SourceBadge({ source }: { source?: string }) {
  if (!source) return null;
  const isClaude = source.toLowerCase().includes("claude");
  return (
    <span style={{
      fontSize: "9px", fontWeight: 700, padding: "3px 8px",
      borderRadius: "5px", letterSpacing: "0.6px", textTransform: "uppercase",
      background: isClaude ? "#1e1535" : "#0c1f18",
      color: isClaude ? "#a78bfa" : "#34d399",
      border: `1px solid ${isClaude ? "#2e1f55" : "#0d3020"}`,
      flexShrink: 0,
    }}>
      {isClaude ? "Claude" : "ChatGPT"}
    </span>
  );
}

function Tag({ label, color = "#3a3a4e" }: { label: string; color?: string }) {
  return (
    <span style={{
      fontSize: "10px", padding: "2px 8px", borderRadius: "4px",
      background: "#151520", border: "1px solid #252535",
      color: "#7070a0", fontWeight: 500,
    }}>
      {label}
    </span>
  );
}

// ── Section card ───────────────────────────────────────────────────────────
function Section({
  label, accent, children, action,
}: {
  label: string; accent: string;
  children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div style={{
      background: "#111113", border: "1px solid #1f1f27",
      borderLeft: `3px solid ${accent}`, borderRadius: "10px", padding: "16px 18px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <span style={{
          fontSize: "9px", fontWeight: 800, letterSpacing: "1.4px",
          textTransform: "uppercase", color: accent,
        }}>
          {label}
        </span>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────
function Sidebar({
  view, setView, name, email, onSignOut,
}: {
  view: ViewState; setView: (v: ViewState) => void;
  name: string; email: string; onSignOut: () => void;
}) {
  const initials = (name || email).charAt(0).toUpperCase();

  return (
    <aside style={L.sidebar}>
      {/* Brand */}
      <div style={L.brand}>
        <div style={L.brandMark}>⚡</div>
        <div>
          <div style={L.brandName}>ReSync AI</div>
          <div style={L.brandSub}>AI Session Manager</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: "8px", flex: 1 }}>
        <button
          className={`nav-item ${view === "list" ? "active" : ""}`}
          onClick={() => setView("list")}
        >
          <span style={L.navIcon}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1 2h6v6H1V2zm8 0h6v6H9V2zM1 10h6v4H1v-4zm8 0h6v4H9v-4z" opacity=".85"/>
            </svg>
          </span>
          Dashboard
        </button>
        <button
          className={`nav-item ${view === "list" ? "active" : ""}`}
          onClick={() => setView("list")}
          style={{ marginTop: "2px" }}
        >
          <span style={L.navIcon}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 3h12v1.5H2V3zm0 4h12v1.5H2V7zm0 4h8v1.5H2V11z"/>
            </svg>
          </span>
          My Contexts
        </button>
        <button
          className={`nav-item ${view === "settings" ? "active" : ""}`}
          onClick={() => setView("settings")}
          style={{ marginTop: "2px" }}
        >
          <span style={L.navIcon}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 5a3 3 0 1 0 0 6A3 3 0 0 0 8 5zm-1 3a1 1 0 1 1 2 0 1 1 0 0 1-2 0z"/>
              <path d="M7.2 1h1.6l.4 1.6a5.1 5.1 0 0 1 1.2.7l1.6-.5 1.1 1.4-.9 1.4c.1.4.1.7.1 1 0 .4 0 .7-.1 1l.9 1.4-1.1 1.4-1.6-.5a5.1 5.1 0 0 1-1.2.7L8.8 15H7.2l-.4-1.6a5.1 5.1 0 0 1-1.2-.7l-1.6.5-1.1-1.4.9-1.4A5 5 0 0 1 3.7 9a5 5 0 0 1 .1-1L3 6.6l1.1-1.4 1.6.5a5.1 5.1 0 0 1 1.2-.7L7.2 1z" opacity=".5"/>
            </svg>
          </span>
          Settings
        </button>
      </nav>

      {/* Bottom — user + sign out */}
      <div style={L.sidebarBottom}>
        <div style={L.sidebarDivider} />
        <div style={L.userBlock}>
          <div style={L.userAvatar}>{initials}</div>
          <div style={{ minWidth: 0 }}>
            <div style={L.userName}>{name || "User"}</div>
            <div style={L.userEmail}>{email}</div>
          </div>
        </div>
        <button className="nav-item danger" onClick={onSignOut} style={{ marginTop: "4px" }}>
          <span style={L.navIcon}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6 2H2v12h4v-1.5H3.5v-9H6V2zm4.7 2.8L14 8l-3.3 3.2-1.1-1.1 1.7-1.6H6V7h5.3l-1.7-1.6 1.1-1.6z"/>
            </svg>
          </span>
          Sign out
        </button>
      </div>
    </aside>
  );
}

// ── Top bar ────────────────────────────────────────────────────────────────
function TopBar({
  title, count, onRefresh, loading,
}: {
  title: string; count?: number; onRefresh?: () => void; loading?: boolean;
}) {
  return (
    <div style={L.topBar}>
      <div style={L.topBarLeft}>
        <span style={L.topBarTitle}>{title}</span>
        {count !== undefined && (
          <span style={L.countPill}>{count}</span>
        )}
      </div>
      {onRefresh && (
        <button className="icon-btn" onClick={onRefresh} disabled={loading}>
          <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" style={loading ? { animation: "spin 1s linear infinite" } : {}}>
            <path d="M13.6 2.4A7 7 0 1 0 15 8h-1.5a5.5 5.5 0 1 1-1.1-3.4l-1.9 1.9H14V2l-1.9 1.9-.5-.5-.4.5-1.1-1z" opacity=".85"/>
          </svg>
          {loading ? "Loading…" : "Refresh"}
        </button>
      )}
    </div>
  );
}

// ── Hero install banner ────────────────────────────────────────────────────
function HeroBanner() {
  return (
    <div style={L.heroBanner}>
      <div style={L.heroGlow} />
      <div style={L.heroContent}>
        <div style={L.heroLeft}>
          <div style={L.heroLabel}>Chrome Extension</div>
          <div style={L.heroTitle}>Never lose your coding progress again</div>
          <div style={L.heroSub}>
            Install the extension → extract any ChatGPT or Claude session → see it here instantly.
          </div>
        </div>
        <button disabled className="install-hero-btn">
          📦 Install Extension
        </button>
      </div>
    </div>
  );
}

// ── Context list row ───────────────────────────────────────────────────────
function ContextRow({ row, onClick }: { row: ContextRow; onClick: () => void }) {
  const d = row.context_json;
  const ts = d.tech_stack || {};
  const techTags = [ts.language, ts.framework, ts.database].filter(Boolean) as string[];
  const hasOpenError = !!d.last_error?.message && !d.last_error?.resolved;

  return (
    <button className="ctx-row" onClick={onClick}>
      {/* Status dot */}
      <div style={{ marginRight: "14px", flexShrink: 0 }}>
        <div style={{
          width: "8px", height: "8px", borderRadius: "50%",
          background: hasOpenError ? "#ef4444" : "#34d399",
          boxShadow: hasOpenError ? "0 0 6px #ef444466" : "0 0 6px #34d39966",
        }} />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px", flexWrap: "wrap" }}>
          <span style={L.rowProject}>{d.project_name || "Unnamed Project"}</span>
          {techTags.map((t) => <Tag key={t} label={t} />)}
        </div>
        {d.next_action && (
          <div style={L.rowPreview}>{d.next_action}</div>
        )}
      </div>

      {/* Right meta */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0, marginLeft: "16px" }}>
        <SourceBadge source={d.source} />
        <span style={L.rowTime}>{timeAgo(row.created_at)}</span>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="#3a3a4e">
          <path d="M6 3l5 5-5 5-1.1-1.1L8.8 8 4.9 4.1 6 3z"/>
        </svg>
      </div>
    </button>
  );
}

// ── Context list view ──────────────────────────────────────────────────────
function ContextListView({
  contexts, loading, error, onSelect, onRefresh,
}: {
  contexts: ContextRow[];
  loading: boolean;
  error: string | null;
  onSelect: (r: ContextRow) => void;
  onRefresh: () => void;
}) {
  return (
    <>
      <HeroBanner />

      <div style={{ padding: "0 28px 28px" }}>
        <TopBar
          title="My Contexts"
          count={loading ? undefined : contexts.length}
          onRefresh={onRefresh}
          loading={loading}
        />

        {error && (
          <div style={L.errorBar}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="#f87171">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm-.75 4h1.5v4.5h-1.5V5zm0 5.5h1.5V12h-1.5v-1.5z"/>
            </svg>
            {error} — make sure the backend is running at {BACKEND}
          </div>
        )}

        {loading && (
          <div style={L.emptyState}>
            <div style={{ fontSize: "24px", marginBottom: "10px", opacity: 0.4 }}>⋯</div>
            Loading your contexts…
          </div>
        )}

        {!loading && !error && contexts.length === 0 && (
          <div style={L.emptyState}>
            <div style={{ fontSize: "36px", marginBottom: "14px" }}>📭</div>
            <div style={{ fontSize: "14px", color: "#c4c4d4", marginBottom: "8px", fontWeight: 600 }}>
              No contexts saved yet
            </div>
            <div style={{ fontSize: "12px", color: "#4a4a5a", maxWidth: "280px" }}>
              Open a ChatGPT or Claude conversation and click Extract in the extension
            </div>
          </div>
        )}

        {!loading && contexts.length > 0 && (
          <div style={L.contextTable}>
            {contexts.map((row) => (
              <ContextRow key={row.id} row={row} onClick={() => onSelect(row)} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ── Context detail view ────────────────────────────────────────────────────
function ContextDetailView({ row, onBack }: { row: ContextRow; onBack: () => void }) {
  const d = row.context_json;
  const ts = d.tech_stack || {};
  const le = d.last_error || {};
  const lc = d.last_code || {};
  const [copied, setCopied] = useState(false);

  const techTags = [ts.language, ts.framework, ts.database, ts.runtime, ...(ts.other || [])].filter(Boolean) as string[];

  async function copyParagraph() {
    try { await navigator.clipboard.writeText(d.context_paragraph || ""); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ padding: "0 28px 48px" }}>
      {/* Breadcrumb */}
      <div style={L.breadcrumb}>
        <button className="icon-btn" onClick={onBack} style={{ fontSize: "12px" }}>
          ← All Contexts
        </button>
        <span style={L.breadcrumbSep}>/</span>
        <span style={L.breadcrumbCurrent}>{d.project_name || "Unnamed Project"}</span>
      </div>

      {/* Detail header */}
      <div style={L.detailHeader}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px", flexWrap: "wrap" }}>
            <h1 style={L.detailTitle}>{d.project_name || "Unnamed Project"}</h1>
            <SourceBadge source={d.source} />
          </div>
          <div style={L.detailMeta}>
            <span>{timeAgo(row.created_at)}</span>
            {d.message_count && <><span style={L.metaDot}>·</span><span>{d.message_count} messages</span></>}
            {d.active_file   && <><span style={L.metaDot}>·</span><span>📄 {d.active_file}</span></>}
          </div>
          {techTags.length > 0 && (
            <div style={{ display: "flex", gap: "6px", marginTop: "12px", flexWrap: "wrap" }}>
              {techTags.map((t) => <Tag key={t} label={t} />)}
            </div>
          )}
        </div>
      </div>

      {/* Sections */}
      <div style={L.sections}>

        {/* 1. Next action */}
        {d.next_action && (
          <Section label="Next Action" accent="#7c6ff7">
            <p style={{ margin: 0, fontSize: "15px", color: "#e4e4f0", lineHeight: 1.65, fontWeight: 500 }}>
              {d.next_action}
            </p>
          </Section>
        )}

        {/* 2. Last error */}
        {le.message && (
          <Section
            label={`Last Error — ${le.resolved ? "Resolved" : "Open"}`}
            accent={le.resolved ? "#22c55e" : "#ef4444"}
          >
            <p style={{ margin: "0 0 10px", fontSize: "13px", color: "#f4c0c0", lineHeight: 1.55 }}>
              {le.message}
            </p>
            {(le.file || le.line) && (
              <div style={{ fontSize: "11px", color: "#5a5a72", marginBottom: "4px" }}>
                {le.file && <><code style={{ color: "#a78bfa" }}>{le.file}</code></>}
                {le.line && <span> · line {le.line}</span>}
              </div>
            )}
            {le.cause && <div style={{ fontSize: "11px", color: "#5a5a72", marginBottom: "3px" }}>Cause: {le.cause}</div>}
            {le.fix   && <div style={{ fontSize: "11px", color: "#5a5a72" }}>Tried: {le.fix}</div>}
          </Section>
        )}

        {/* 3. Last code */}
        {lc.code && (
          <Section
            label={["Last Code", lc.language, lc.file].filter(Boolean).join(" · ")}
            accent="#f59e0b"
          >
            {lc.purpose && (
              <p style={{ margin: "0 0 10px", fontSize: "11px", color: "#5a5a72" }}>{lc.purpose}</p>
            )}
            <pre style={L.codeBlock}><code>{lc.code}</code></pre>
          </Section>
        )}

        {/* 4 & 5. Working / Broken */}
        {((d.working?.length ?? 0) > 0 || (d.broken?.length ?? 0) > 0) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            {(d.working?.length ?? 0) > 0 && (
              <Section label="What is Working" accent="#22c55e">
                <ul style={L.ul}>
                  {d.working!.map((w, i) => (
                    <li key={i} style={L.li}>
                      <span style={{ color: "#22c55e", marginRight: "6px", fontSize: "10px" }}>✓</span>{w}
                    </li>
                  ))}
                </ul>
              </Section>
            )}
            {(d.broken?.length ?? 0) > 0 && (
              <Section label="What is Broken" accent="#ef4444">
                <ul style={L.ul}>
                  {d.broken!.map((b, i) => (
                    <li key={i} style={L.li}>
                      <span style={{ color: "#ef4444", marginRight: "6px", fontSize: "10px" }}>✗</span>{b}
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>
        )}

        {/* 6. Context paragraph */}
        {d.context_paragraph && (
          <Section
            label="Context Summary"
            accent="#4a4a6a"
            action={
              <button
                className={`copy-btn ${copied ? "copied" : ""}`}
                onClick={copyParagraph}
              >
                {copied ? "✓ Copied" : "Copy"}
              </button>
            }
          >
            <p style={{ margin: 0, fontSize: "13px", color: "#9090a8", lineHeight: 1.75 }}>
              {d.context_paragraph}
            </p>
          </Section>
        )}

        {/* Files touched */}
        {(d.files_touched?.length ?? 0) > 0 && (
          <Section label="Files Touched" accent="#3a3a5a">
            <ul style={L.ul}>
              {d.files_touched!.map((f, i) => (
                <li key={i} style={L.li}>
                  <code style={{ color: "#a78bfa", fontSize: "11px" }}>{f.path}</code>
                  {f.purpose && <span style={{ color: "#4a4a62", marginLeft: "8px" }}>— {f.purpose}</span>}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Commands run */}
        {(d.commands_run?.length ?? 0) > 0 && (
          <Section label="Commands Run" accent="#3a3a5a">
            <ul style={L.ul}>
              {d.commands_run!.map((c, i) => (
                <li key={i} style={L.li}>
                  <code style={{ color: "#34d399", fontSize: "11px" }}>{c}</code>
                </li>
              ))}
            </ul>
          </Section>
        )}

      </div>
    </div>
  );
}

// ── Settings view ──────────────────────────────────────────────────────────
function SettingsView({ userId, email, name }: { userId: string; email: string; name: string }) {
  return (
    <div style={{ padding: "0 28px 48px" }}>
      <TopBar title="Settings" />
      <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "4px" }}>
        <div style={L.settingsCard}>
          <div style={L.settingsLabel}>Account</div>
          <div style={L.settingsRow}>
            <span style={L.settingsKey}>Name</span>
            <span style={L.settingsVal}>{name || "—"}</span>
          </div>
          <div style={L.settingsRow}>
            <span style={L.settingsKey}>Email</span>
            <span style={L.settingsVal}>{email}</span>
          </div>
          <div style={L.settingsRow}>
            <span style={L.settingsKey}>User ID</span>
            <code style={{ fontSize: "11px", color: "#6c63ff", wordBreak: "break-all" }}>{userId}</code>
          </div>
        </div>
        <div style={L.settingsCard}>
          <div style={L.settingsLabel}>Extension</div>
          <div style={L.settingsRow}>
            <span style={L.settingsKey}>Backend URL</span>
            <code style={{ fontSize: "11px", color: "#9090a8" }}>{BACKEND}</code>
          </div>
          <div style={{ marginTop: "14px", fontSize: "11px", color: "#3a3a52", lineHeight: 1.65 }}>
            Your user ID is automatically stored in localStorage when you visit this page.
            The Chrome extension reads it and links all extractions to your account.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
interface Props { userId: string; email: string; name: string; }

export default function DashboardClient({ userId, email, name }: Props) {
  const { signOut } = useClerk();
  const [contexts, setContexts] = useState<ContextRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [view,     setView]     = useState<ViewState>("list");
  const [selected, setSelected] = useState<ContextRow | null>(null);

  useEffect(() => {
    localStorage.setItem("user_id", userId);
    window.dispatchEvent(new CustomEvent("user_id_ready", { detail: { userId } }));
  }, [userId]);

  const fetchContexts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND}/api/v1/contexts?user_id=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const data = await res.json();
      setContexts(data.contexts || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchContexts(); }, [fetchContexts]);

  function openDetail(row: ContextRow) {
    setSelected(row);
    setView("detail");
  }

  function backToList() {
    setSelected(null);
    setView("list");
  }

  function handleSetView(v: ViewState) {
    if (v !== "detail") setSelected(null);
    setView(v);
  }

  return (
    <div style={L.appShell}>
      <Sidebar
        view={view}
        setView={handleSetView}
        name={name}
        email={email}
        onSignOut={() => signOut({ redirectUrl: "/" })}
      />
      <main style={L.mainArea}>
        {view === "list" && (
          <ContextListView
            contexts={contexts}
            loading={loading}
            error={error}
            onSelect={openDetail}
            onRefresh={fetchContexts}
          />
        )}
        {view === "detail" && selected && (
          <ContextDetailView row={selected} onBack={backToList} />
        )}
        {view === "settings" && (
          <SettingsView userId={userId} email={email} name={name} />
        )}
      </main>
    </div>
  );
}

// ── Layout styles ──────────────────────────────────────────────────────────
const L: Record<string, React.CSSProperties> = {
  appShell: {
    display: "flex",
    height: "100vh",
    background: "#09090b",
    overflow: "hidden",
  },
  sidebar: {
    width: "220px",
    flexShrink: 0,
    background: "#0d0d10",
    borderRight: "1px solid #1a1a22",
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "20px 18px 16px",
    borderBottom: "1px solid #151520",
  },
  brandMark: {
    width: "30px", height: "30px", borderRadius: "8px",
    background: "linear-gradient(135deg, #6c63ff, #4a42cc)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "14px", flexShrink: 0,
  },
  brandName: { fontSize: "13px", fontWeight: 700, color: "#e4e4f0" },
  brandSub:  { fontSize: "9px",  color: "#3a3a52", marginTop: "1px" },

  navIcon: { display: "flex", alignItems: "center", opacity: 0.7 },

  sidebarBottom: { padding: "8px" },
  sidebarDivider: { height: "1px", background: "#151520", margin: "4px 0 12px" },
  userBlock: {
    display: "flex", alignItems: "center", gap: "10px",
    padding: "8px 10px", marginBottom: "2px",
  },
  userAvatar: {
    width: "28px", height: "28px", borderRadius: "50%",
    background: "linear-gradient(135deg, #6c63ff, #4a42cc)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "12px", fontWeight: 700, color: "#fff", flexShrink: 0,
  },
  userName:  { fontSize: "12px", fontWeight: 600, color: "#c4c4d4" },
  userEmail: { fontSize: "10px", color: "#3a3a52", marginTop: "1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },

  mainArea: {
    flex: 1,
    overflowY: "auto",
    background: "#09090b",
  },

  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "24px 28px 16px",
  },
  topBarLeft: { display: "flex", alignItems: "center", gap: "10px" },
  topBarTitle: { fontSize: "16px", fontWeight: 700, color: "#f4f4f5" },
  countPill: {
    fontSize: "11px", fontWeight: 600,
    background: "#18181f", color: "#5a5a72",
    padding: "2px 9px", borderRadius: "10px",
    border: "1px solid #22222e",
  },

  heroBanner: {
    margin: "20px 28px 0",
    borderRadius: "14px",
    border: "1px solid #1e1a3a",
    background: "linear-gradient(135deg, #0e0c1e 0%, #0d0d13 60%)",
    overflow: "hidden",
    position: "relative",
  },
  heroGlow: {
    position: "absolute",
    top: "-40px", right: "-40px",
    width: "200px", height: "200px",
    borderRadius: "50%",
    background: "radial-gradient(circle, #6c63ff22 0%, transparent 70%)",
    pointerEvents: "none",
  },
  heroContent: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "24px 28px",
    gap: "20px",
    flexWrap: "wrap",
    position: "relative",
  },
  heroLeft: { flex: 1, minWidth: "200px" },
  heroLabel: {
    fontSize: "9px", fontWeight: 800, letterSpacing: "1.5px",
    textTransform: "uppercase", color: "#6c63ff", marginBottom: "8px",
  },
  heroTitle: {
    fontSize: "17px", fontWeight: 700, color: "#f4f4f5",
    marginBottom: "6px", lineHeight: 1.4,
  },
  heroSub: {
    fontSize: "12px", color: "#4a4a62", lineHeight: 1.6,
  },

  contextTable: {
    background: "#111113",
    border: "1px solid #1a1a22",
    borderRadius: "12px",
    overflow: "hidden",
    marginTop: "8px",
  },

  rowProject: { fontSize: "13px", fontWeight: 600, color: "#e4e4f0" },
  rowPreview: {
    fontSize: "11px", color: "#4a4a62",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
    maxWidth: "400px", marginTop: "2px",
  },
  rowTime: { fontSize: "11px", color: "#3a3a52" },

  errorBar: {
    display: "flex", alignItems: "center", gap: "8px",
    background: "#180d0d", border: "1px solid #3d1515",
    borderRadius: "8px", padding: "11px 14px",
    fontSize: "12px", color: "#f87171", marginTop: "8px",
  },
  emptyState: {
    textAlign: "center", padding: "80px 20px",
    color: "#3a3a52", fontSize: "13px",
  },

  breadcrumb: {
    display: "flex", alignItems: "center", gap: "8px",
    paddingTop: "20px", paddingBottom: "20px",
  },
  breadcrumbSep:     { color: "#2a2a36", fontSize: "13px" },
  breadcrumbCurrent: { fontSize: "13px", color: "#6060808" },

  detailHeader: {
    paddingBottom: "24px",
    borderBottom: "1px solid #1a1a22",
    marginBottom: "20px",
  },
  detailTitle: { fontSize: "22px", fontWeight: 800, color: "#f4f4f5", margin: 0 },
  detailMeta:  { display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#4a4a62" },
  metaDot:     { color: "#2a2a36" },

  sections: { display: "flex", flexDirection: "column", gap: "12px" },

  codeBlock: {
    margin: 0,
    background: "#07070e",
    border: "1px solid #1a1a24",
    borderRadius: "8px",
    padding: "14px 16px",
    fontSize: "11.5px",
    color: "#86efac",
    overflowX: "auto",
    maxHeight: "300px",
    overflowY: "auto",
    fontFamily: "'Menlo', 'Consolas', 'SF Mono', monospace",
    lineHeight: 1.65,
    whiteSpace: "pre",
  },
  ul: { margin: 0, padding: 0, listStyle: "none" },
  li: { fontSize: "12px", color: "#9090a8", lineHeight: 1.85, display: "flex", alignItems: "baseline", gap: "4px" },

  settingsCard: {
    background: "#111113",
    border: "1px solid #1a1a22",
    borderRadius: "12px",
    padding: "20px 22px",
  },
  settingsLabel: {
    fontSize: "9px", fontWeight: 800, letterSpacing: "1.2px",
    textTransform: "uppercase", color: "#3a3a52", marginBottom: "14px",
  },
  settingsRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "8px 0", borderBottom: "1px solid #141420",
  },
  settingsKey: { fontSize: "12px", color: "#4a4a62" },
  settingsVal: { fontSize: "12px", color: "#9090a8" },
};
