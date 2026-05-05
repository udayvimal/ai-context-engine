// Runs on localhost:3000 (the dashboard).
// Reads user_id from localStorage → writes to chrome.storage.local
// so background.js can include it in every backend request.

function syncUserId() {
  const userId = localStorage.getItem("user_id");
  if (userId) {
    chrome.storage.local.set({ user_id: userId }, () => {
      console.log("[AI Context Engine] user_id synced:", userId);
    });
    return true;
  }
  return false;
}

// Attempt 1 — immediate (returning visitor already has it in localStorage)
syncUserId();

// Attempt 2 & 3 — delayed, catches React useEffect hydration on first load
setTimeout(syncUserId, 800);
setTimeout(syncUserId, 2000);

// Attempt 4 — instant when DashboardClient fires the event after useEffect
window.addEventListener("user_id_ready", (e) => {
  const userId = e.detail?.userId;
  if (userId) {
    chrome.storage.local.set({ user_id: userId }, () => {
      console.log("[AI Context Engine] user_id synced via event:", userId);
    });
  }
});
