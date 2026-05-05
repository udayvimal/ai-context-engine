const BACKEND_DEFAULT = "https://ai-context-engine-production.up.railway.app";

// ── Refs ──────────────────────────────────────────────────────────────────────
const extractBtn    = document.getElementById("extractBtn");
const btnText       = document.getElementById("btnText");
const btnSpinner    = document.getElementById("btnSpinner");
const statusEl      = document.getElementById("status");
const resultsEl     = document.getElementById("results");
const projectInput  = document.getElementById("projectName");
const scrollToggle  = document.getElementById("scrollToggle");
const backendInput  = document.getElementById("backendUrl");
const additionalCtx = document.getElementById("additionalContext");

// ── Auth badge — show login status from clerk ─────────────────────────────────
const authBadge = document.getElementById("authBadge");

function updateAuthBadge() {
  chrome.storage.local.get(["user_id"], ({ user_id }) => {
    if (user_id) {
      authBadge.textContent = "Logged in";
      authBadge.className   = "auth-badge auth-ok";
      authBadge.title       = `user_id: ${user_id}`;
    } else {
      authBadge.textContent = "Not logged in";
      authBadge.className   = "auth-badge auth-no";
      authBadge.title       = "Open the ReSync AI dashboard and log in first";
    }
  });
}

// Actively read user_id from any open dashboard tab via scripting API.
// This works even if auth-bridge.js never ran (tab was open before extension loaded).
async function syncUserIdNow() {
  try {
    const DASHBOARD_PATTERNS = ["http://localhost:3000/*", "https://ai-context-engine-iota.vercel.app/*"];
    let tabs = [];
    for (const pattern of DASHBOARD_PATTERNS) {
      const found = await chrome.tabs.query({ url: pattern });
      if (found.length) { tabs = found; break; }
    }
    // No dashboard tab open, or tab is on an error page — use cached value
    if (!tabs.length || tabs[0].status !== "complete") return;

    const results = await chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func:   () => localStorage.getItem("user_id"),
    });

    const userId = results?.[0]?.result;
    console.log("[AI Context Engine] Synced user_id from dashboard:", userId);

    if (userId) {
      await chrome.storage.local.set({ user_id: userId });
    } else {
      await chrome.storage.local.remove("user_id");
    }
  } catch (_) {
    // Tab not injectable (error page, dev server down) — cached user_id still works
  } finally {
    updateAuthBadge();
  }
}

// Show cached badge immediately, then sync latest value from dashboard tab
updateAuthBadge();
syncUserIdNow();

// ── Persist settings ──────────────────────────────────────────────────────────
chrome.storage.sync.get(["backendUrl", "scrollEnabled"], (s) => {
  if (s.backendUrl) backendInput.value = s.backendUrl;
  if (s.scrollEnabled === false) scrollToggle.checked = false;
});
backendInput.addEventListener("change", () =>
  chrome.storage.sync.set({ backendUrl: backendInput.value.trim() })
);
scrollToggle.addEventListener("change", () =>
  chrome.storage.sync.set({ scrollEnabled: scrollToggle.checked })
);

// ── UI helpers ────────────────────────────────────────────────────────────────
function setLoading(on) {
  extractBtn.disabled = on;
  btnSpinner.classList.toggle("hidden", !on);
  btnText.textContent = on ? "Extracting…" : "Extract Full Context";
}
function showStatus(msg, type = "info") {
  statusEl.textContent = msg;
  statusEl.className   = `status ${type}`;
  statusEl.classList.remove("hidden");
}
function hideStatus() { statusEl.classList.add("hidden"); }

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val || "";
}
function showEl(id, show = true) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle("hidden", !show);
}

function makeList(listId, items, transform) {
  const ul = document.getElementById(listId);
  if (!ul) return;
  ul.innerHTML = "";
  (items || []).forEach((item) => {
    if (!item) return;
    const li = document.createElement("li");
    li.textContent = transform ? transform(item) : item;
    ul.appendChild(li);
  });
}

// ── Client-side resume prompt builder (fallback) ──────────────────────────────
function buildResumePrompt(data) {
  const ts  = data.tech_stack || {};
  const lc  = data.last_code  || {};
  const le  = data.last_error || {};
  const lines = [];

  lines.push(`Project: ${data.project_name || "Unnamed"}`);

  const stack = [ts.language, ts.framework, ts.database, ts.runtime]
    .filter(Boolean).concat(ts.other || []);
  if (stack.length) lines.push(`Tech: ${stack.join(", ")}`);

  if (data.active_file)     lines.push(`Active file: ${data.active_file}`);
  if (data.active_function) lines.push(`Active function: ${data.active_function}`);

  const files = (data.files_touched || []).map(f => f.path || f).filter(Boolean);
  if (files.length) lines.push(`Files touched: ${files.join(", ")}`);

  if ((data.working || []).length)  lines.push(`Working: ${data.working.join("; ")}`);
  if ((data.broken  || []).length)  lines.push(`Broken: ${data.broken.join("; ")}`);

  if (le.message)
    lines.push(`Last error: ${le.message}${le.file ? ` in ${le.file}` : ""}${le.line ? ` line ${le.line}` : ""}. ${le.resolved ? "Resolved." : "NOT resolved."}`);

  if ((data.decisions || []).length) {
    const ds = data.decisions.map(d => d.chose).filter(Boolean).join("; ");
    lines.push(`Decisions: ${ds}`);
  }

  if ((data.commands_run || []).length)
    lines.push(`Commands run: ${data.commands_run.join("; ")}`);

  if (lc.code) lines.push(`Last code (${lc.language || ""}${lc.file ? ` in ${lc.file}` : ""}): ${lc.purpose}`);

  if (data.context_paragraph) lines.push(`\nContext:\n${data.context_paragraph}`);
  lines.push(`\nNext action: ${data.next_action}`);
  lines.push("\n---\nYou are now fully up to speed. Resume helping me from exactly where we left off. Do not ask me to re-explain anything.");

  return lines.join("\n");
}

// ── Render ────────────────────────────────────────────────────────────────────
function render(data) {
  const ts = data.tech_stack  || {};
  const lc = data.last_code   || {};
  const le = data.last_error  || {};

  // ── Active file / function bar ─────────────────────────────────────────────
  if (data.active_file || data.active_function) {
    showEl("activeBar", true);
    setText("activeFile", data.active_file || "");
    setText("activeFunc", data.active_function ? `fn: ${data.active_function}` : "");
    showEl("activeFunc", !!data.active_function);
  } else {
    showEl("activeBar", false);
  }

  // ── Tech stack bar ─────────────────────────────────────────────────────────
  const hasTech = ts.language || ts.framework || ts.database || ts.runtime || (ts.other || []).length;
  showEl("techBar", !!hasTech);
  if (hasTech) {
    const setTag = (id, val) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (val) { el.textContent = val; el.classList.remove("hidden"); }
      else      el.classList.add("hidden");
    };
    setTag("techLang",      ts.language);
    setTag("techFramework", ts.framework);
    setTag("techDb",        ts.database);
    setTag("techRuntime",   ts.runtime);

    const otherEl = document.getElementById("techOther");
    if (otherEl) {
      otherEl.innerHTML = "";
      (ts.other || []).forEach((t) => {
        const span = document.createElement("span");
        span.className = "tag lib";
        span.textContent = t;
        otherEl.appendChild(span);
      });
    }
  }

  // 1. Next action ─────────────────────────────────────────────────────────────
  setText("nextAction", data.next_action || "—");

  // 2. Active error ─────────────────────────────────────────────────────────────
  if (le.message) {
    showEl("errorCard", true);
    showEl("noError",   false);
    setText("errorMsg",  le.message);
    setText("errorFile", le.file ? `📄 ${le.file}` : "");
    setText("errorLine", le.line ? `line ${le.line}` : "");
    setText("errorCause", le.cause ? `Cause: ${le.cause}` : "");
    setText("errorFix",   le.fix   ? `Tried: ${le.fix}`   : "");
    const badge = document.getElementById("errorResolved");
    if (badge) {
      badge.textContent = le.resolved ? "RESOLVED" : "OPEN";
      badge.className   = `badge-resolved ${le.resolved ? "resolved" : "open"}`;
    }
  } else {
    showEl("errorCard", false);
    showEl("noError",   true);
  }

  // 3. Last code ─────────────────────────────────────────────────────────────────
  if (lc.code) {
    showEl("codeCard",   true);
    showEl("codeHeader", true);
    setText("codeLang",    lc.language || "code");
    setText("codeFile",    lc.file     || "");
    setText("codePurpose", lc.purpose  || "");
    const pre = document.getElementById("codeBlock");
    if (pre) pre.textContent = lc.code;
  } else {
    showEl("codeCard",   false);
    showEl("codeHeader", false);
  }

  // 4. Working ───────────────────────────────────────────────────────────────────
  const hasWorking = (data.working || []).length > 0;
  showEl("workingCard",   hasWorking);
  showEl("workingHeader", hasWorking);
  if (hasWorking) makeList("workingList", data.working);

  // 5. Broken ────────────────────────────────────────────────────────────────────
  const hasBroken = (data.broken || []).length > 0;
  showEl("brokenCard",   hasBroken);
  showEl("brokenHeader", hasBroken);
  if (hasBroken) makeList("brokenList", data.broken);

  // 6. Technical decisions ──────────────────────────────────────────────────────
  const decisions = data.decisions || [];
  const decisionsWrap = document.getElementById("decisionsWrap");
  showEl("decisionsHeader", decisions.length > 0);
  if (decisionsWrap) {
    decisionsWrap.innerHTML = "";
    decisions.forEach((d) => {
      const card = document.createElement("div");
      card.className = "card decision-card";

      const text = document.createElement("div");
      text.className   = "decision-text";
      text.textContent = d.chose || "";
      card.appendChild(text);

      const meta = document.createElement("div");
      meta.className = "decision-meta";
      if (d.why) {
        const r = document.createElement("span");
        r.className   = "decision-reason";
        r.textContent = `✓ ${d.why}`;
        meta.appendChild(r);
      }
      if (d.rejected) {
        const x = document.createElement("span");
        x.className   = "decision-rejected";
        x.textContent = `✗ ${d.rejected}`;
        meta.appendChild(x);
      }
      card.appendChild(meta);
      decisionsWrap.appendChild(card);
    });
  }

  // 7. Context paragraph ─────────────────────────────────────────────────────────
  setText("contextParagraph", data.context_paragraph || "No summary generated — try on a longer coding session.");

  // Files touched ────────────────────────────────────────────────────────────────
  const files = data.files_touched || [];
  showEl("filesCard",   files.length > 0);
  showEl("filesHeader", files.length > 0);
  if (files.length) makeList("filesTouched", files, (f) => f.path ? `${f.path}${f.purpose ? "  —  " + f.purpose : ""}` : String(f));

  // Commands run ─────────────────────────────────────────────────────────────────
  const cmds = data.commands_run || [];
  showEl("cmdsCard",   cmds.length > 0);
  showEl("cmdsHeader", cmds.length > 0);
  if (cmds.length) makeList("cmdsList", cmds);

  // Resume prompt ────────────────────────────────────────────────────────────────
  const ta = document.getElementById("resumePrompt");
  if (ta) {
    ta.value = buildResumePrompt(data);
  }

  // Meta ─────────────────────────────────────────────────────────────────────────
  setText("msgCount",    `${data.message_count} messages`);
  setText("sourceLabel", data.source || "unknown");

  resultsEl.classList.remove("hidden");
}

// ── Copy button ───────────────────────────────────────────────────────────────
document.getElementById("copyBtn").addEventListener("click", async () => {
  const text = document.getElementById("resumePrompt").value;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.getElementById("resumePrompt");
    ta.select();
    document.execCommand("copy");
  }
  const btn   = document.getElementById("copyBtn");
  const label = document.getElementById("copyText");
  btn.classList.add("copied");
  label.textContent = "Copied!";
  setTimeout(() => {
    btn.classList.remove("copied");
    label.textContent = "Copy to Clipboard";
  }, 2000);
});

// ── Scroll status ticker ──────────────────────────────────────────────────────
function startScrollTicker() {
  const steps = [
    "Scrolling to load full conversation…",
    "Loading older messages…",
    "Long conversation — still loading…",
    "Almost there…",
  ];
  let i = 0;
  showStatus(steps[0], "info");
  const timer = setInterval(() => {
    i = Math.min(i + 1, steps.length - 1);
    showStatus(steps[i], "info");
  }, 3500);
  return () => clearInterval(timer);
}

// ── Main flow ─────────────────────────────────────────────────────────────────
extractBtn.addEventListener("click", async () => {
  hideStatus();
  resultsEl.classList.add("hidden");
  setLoading(true);

  let stopTicker = () => {};

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active tab found.");

    let host;
    try { host = new URL(tab.url).hostname; }
    catch { throw new Error("Cannot read the current tab URL."); }

    if (!host.includes("chatgpt.com") && !host.includes("openai.com") && !host.includes("claude.ai"))
      throw new Error("Open a ChatGPT or Claude conversation, then click Extract.");

    const scrollFirst = scrollToggle.checked;
    if (scrollFirst) stopTicker = startScrollTicker();
    else showStatus("Scraping conversation…", "info");

    let extraction;
    try {
      extraction = await chrome.tabs.sendMessage(tab.id, { action: "extract", scroll: scrollFirst });
    } catch {
      throw new Error("Cannot reach the page — reload the conversation tab and try again.");
    }

    stopTicker();

    if (!extraction?.success)
      throw new Error(extraction?.error || "Scraping failed. Check the browser console (F12).");

    const { messages, source, projectName: autoName } = extraction;
    if (!messages?.length)
      throw new Error("No messages found. Make sure a conversation is open.");

    const projectName = projectInput.value.trim() || autoName || "Unnamed Project";
    showStatus(`Scraped ${messages.length} messages. Analysing with AI…`, "info");

    const backendUrl = (backendInput.value || "").trim() || BACKEND_DEFAULT;

    const result = await chrome.runtime.sendMessage({
      action:            "processContext",
      messages,
      projectName,
      source,
      backendUrl,
      additionalContext: additionalCtx.value.trim(),
    });

    if (!result?.success)
      throw new Error(result?.error || "Backend call failed — is the server running?");

    hideStatus();
    render(result.data);

  } catch (err) {
    stopTicker();
    showStatus(err.message, "error");
  } finally {
    setLoading(false);
  }
});
