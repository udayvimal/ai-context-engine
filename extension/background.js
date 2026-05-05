// MV3 service worker — receives messages from popup, calls the backend API.

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action !== "processContext") return false;

  const { messages, projectName, source, backendUrl, additionalContext } = message;

  // Read user_id synced by auth-bridge.js from the dashboard
  chrome.storage.local.get(["user_id"], ({ user_id }) => {
    console.log("[AI Context Engine] Sending request — user_id:", user_id ?? "anonymous");

    fetch(`${backendUrl}/api/v1/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        project_name:       projectName,
        source,
        additional_context: additionalContext || "",
        user_id:            user_id || null,
      }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.text().then((t) => {
            throw new Error(`Backend returned ${res.status}: ${t.slice(0, 120)}`);
          });
        }
        return res.json();
      })
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
  });

  return true;
});
