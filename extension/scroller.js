/**
 * Forces the entire conversation into the DOM by scrolling to the top
 * repeatedly until scroll-height stops growing.
 *
 * ChatGPT virtualises long threads — messages outside the viewport are
 * unmounted from the DOM.  Scrolling up forces them to re-render so the
 * scraper can read them.  Claude loads everything upfront, so this is a no-op.
 */

function findScrollContainer() {
  // Try every plausible scroll container in priority order.
  // We validate each by checking it actually has scrollable overflow.
  const selectors = [
    // ChatGPT specific — the conversation wrapper
    'div[class*="conversation"]',
    'div[class*="chat-pg"]',
    // Generic overflow containers
    'div[class*="overflow-y-auto"]',
    'div[class*="overflow-y-scroll"]',
    "main",
    "#__next",
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.scrollHeight > el.clientHeight) return el;
  }

  // Last resort: find the element with the most scrollable height
  const all = [...document.querySelectorAll("div, main")];
  const best = all.reduce(
    (prev, el) =>
      el.scrollHeight - el.clientHeight > (prev?.scrollHeight - prev?.clientHeight || 0)
        ? el
        : prev,
    null
  );
  return best || document.documentElement;
}

function scrollToLoadAll() {
  return new Promise((resolve) => {
    const container = findScrollContainer();

    const TICK_MS   = 500;  // ms between scroll pulses
    const MAX_STABLE = 4;   // consecutive unchanged heights = done
    const MAX_TICKS  = 60;  // hard cap (30 s)

    let lastHeight  = -1;
    let stableCount = 0;
    let ticks       = 0;

    function tick() {
      // Jump to the very top to trigger lazy rendering
      container.scrollTop = 0;
      window.scrollTo(0, 0); // belt-and-suspenders for window-level scroll

      setTimeout(() => {
        ticks++;
        const h = container.scrollHeight;

        if (h === lastHeight) {
          stableCount++;
        } else {
          stableCount = 0;
          lastHeight  = h;
        }

        if (stableCount >= MAX_STABLE || ticks >= MAX_TICKS) {
          // Restore to bottom so the user sees their conversation
          container.scrollTop = container.scrollHeight;
          window.scrollTo(0, document.body.scrollHeight);
          resolve();
        } else {
          tick();
        }
      }, TICK_MS);
    }

    tick();
  });
}
