// Relay: the extension-origin page cannot read the cross-origin iframe's DOM,
// and the mock server cannot reach back into the extension. So the page hands
// its verdicts to this service worker, which posts them to the mock server's
// unprotected /verdict endpoint — the server log is our observation channel.
//
// It also opens the probe page itself: Edge refuses a command-line navigation
// straight to a chrome-extension:// URL (ERR_BLOCKED_BY_CLIENT), so the worker
// opens it as a normal tab instead.
const REPORT_URL = 'http://127.0.0.1:39875/verdict'

const openProbe = async () => {
  // Probe pages for the throwaway experiment only; the shipped extension has no
  // such auto-open behaviour.
  const url = chrome.runtime.getURL('probe.html')
  const existing = await chrome.tabs.query({ url })
  if (existing.length > 0) return
  const settings = await chrome.storage.local.get({ probe: false, probeUrl: '' })
  if (settings.probe !== true) return
  await chrome.tabs.create({ url: settings.probeUrl || url, active: false })
  console.log('[probe-sw] opened probe tab')
}

chrome.runtime.onInstalled.addListener(() => { void openProbe() })
chrome.runtime.onStartup.addListener(() => { void openProbe() })
void openProbe()

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'probe-popup') {
    // Hypothesis: as a top-level document the app is same-site with itself, so
    // the Strict cookie reaches the WebSocket handshake (which the iframe failed).
    chrome.tabs.create({ url: String(message.url ?? ''), active: false }, (tab) =>
      sendResponse({ ok: true, tabId: tab?.id }),
    )
    return true
  }
  if (message?.type !== 'probe-verdict') return false
  const text = String(message.text ?? '')
  console.log('[probe-sw] verdict:', text)
  fetch(`${REPORT_URL}?text=${encodeURIComponent(text)}`)
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({ ok: false, error: String(error) }))
  return true
})
