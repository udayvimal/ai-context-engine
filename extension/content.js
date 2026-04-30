// ── Platform detection ────────────────────────────────────────────────────────

function detectSource() {
  const h = window.location.hostname;
  if (h.includes("chatgpt.com") || h.includes("openai.com")) return "chatgpt";
  if (h.includes("claude.ai")) return "claude";
  return "unknown";
}

// ── Project name ──────────────────────────────────────────────────────────────

function inferProjectName() {
  return (
    document.title
      .replace(/\s*[-–|].*$/, "")           // strip "- ChatGPT" / "| Claude"
      .replace(/ChatGPT|Claude/gi, "")
      .trim() || "Unnamed Project"
  );
}

// ── DOM position helper ───────────────────────────────────────────────────────

function beforeInDom(a, b) {
  return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
    ? -1
    : 1;
}

// ── ChatGPT scraper ───────────────────────────────────────────────────────────
//
// ChatGPT wraps each turn in an <article> and stamps the inner bubble with
// data-message-author-role.  For user turns we grab the first direct
// text-bearing child to avoid "Copy / Edit" button text; for assistant turns
// we prefer the rendered .markdown / prose container.

function scrapeChatGPT() {
  const messages = [];

  // Each conversation turn lives inside an <article>
  const articles = document.querySelectorAll(
    'article[data-testid^="conversation-turn"]'
  );

  if (articles.length > 0) {
    articles.forEach((article) => {
      const bubble = article.querySelector("[data-message-author-role]");
      if (!bubble) return;
      const role = bubble.getAttribute("data-message-author-role");
      if (role !== "user" && role !== "assistant") return;

      let contentEl;
      if (role === "user") {
        // User bubble: grab the whitespace-pre-wrap div (pure text, no buttons)
        contentEl =
          bubble.querySelector('[class*="whitespace-pre-wrap"]') ||
          bubble.querySelector('[class*="text-base"]') ||
          bubble.querySelector("p") ||
          bubble;
      } else {
        // Assistant bubble: rendered markdown div
        contentEl =
          bubble.querySelector(".markdown") ||
          bubble.querySelector('[class*="prose"]') ||
          bubble.querySelector('[class*="message-content"]') ||
          bubble;
      }

      const content = contentEl.innerText.trim();
      if (content) messages.push({ role, content });
    });
  }

  // Fallback: no <article> wrappers found — use attribute selector directly
  if (messages.length === 0) {
    document.querySelectorAll("[data-message-author-role]").forEach((el) => {
      const role = el.getAttribute("data-message-author-role");
      if (role !== "user" && role !== "assistant") return;

      const contentEl =
        el.querySelector(".markdown") ||
        el.querySelector('[class*="prose"]') ||
        el.querySelector('[class*="whitespace-pre-wrap"]') ||
        el;

      const content = contentEl.innerText.trim();
      if (content) messages.push({ role, content });
    });
  }

  return messages;
}

// ── Claude.ai scraper ─────────────────────────────────────────────────────────
//
// Claude wraps user turns in [data-testid="user-message"] and AI turns in
// a sibling container.  We collect both, sort by DOM order, then merge
// consecutive same-role blocks that appear when Claude regenerates a reply.

function scrapeClaude() {
  const pairs = [];

  // User messages
  document.querySelectorAll('[data-testid="user-message"]').forEach((el) => {
    pairs.push({ el, role: "user" });
  });

  // Assistant messages — ordered by likelihood of matching current Claude UI
  const assistantSelectors = [
    '[data-testid="assistant-message"]',
    ".font-claude-message",
    ".assistant-message",
    "[class*='assistant-message']",
    // broader: any prose block that's NOT inside a user-message container
    ".prose",
  ];

  let foundAssistant = false;
  for (const sel of assistantSelectors) {
    const found = [...document.querySelectorAll(sel)].filter(
      (el) => !el.closest('[data-testid="user-message"]')
    );
    if (found.length) {
      found.forEach((el) => pairs.push({ el, role: "assistant" }));
      foundAssistant = true;
      break;
    }
  }

  if (pairs.length === 0) return [];

  // Sort by actual DOM position
  pairs.sort((a, b) => beforeInDom(a.el, b.el));

  const messages = [];
  let lastRole = null;

  pairs.forEach(({ el, role }) => {
    const content = el.innerText.trim();
    if (!content) return;
    if (role === lastRole && messages.length > 0) {
      // Merge consecutive same-role blocks (regenerated responses)
      messages[messages.length - 1].content += "\n\n" + content;
      return;
    }
    messages.push({ role, content });
    lastRole = role;
  });

  return messages;
}

// ── Main entry ────────────────────────────────────────────────────────────────

async function extractMessages(shouldScroll) {
  const source = detectSource();

  if (shouldScroll) {
    await scrollToLoadAll(); // defined in scroller.js, loaded first
  }

  const messages =
    source === "chatgpt" ? scrapeChatGPT() : scrapeClaude();

  console.log(
    `[AI Context Engine] scraped ${messages.length} messages from ${source}`,
    messages.slice(0, 3)
  );

  return {
    messages,
    source,
    projectName: inferProjectName(),
  };
}

// ── Message listener (called by popup.js) ─────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action !== "extract") return false;

  extractMessages(message.scroll !== false)
    .then((result) => sendResponse({ success: true, ...result }))
    .catch((err) => sendResponse({ success: false, error: err.message }));

  return true; // keep the channel open for the async response
});
