// MV3 service worker — receives processed messages from popup and calls the
// backend API.  Runs outside any page context so it can reach localhost freely.

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action !== "processContext") return false;

  const { messages, projectName, source, backendUrl, additionalContext } = message;

  fetch(`${backendUrl}/api/v1/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      project_name:       projectName,
      source,
      additional_context: additionalContext || "",
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

  return true; // keep message channel open for async response
});
