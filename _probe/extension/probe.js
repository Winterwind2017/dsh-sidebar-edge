// Probe driver. Runs at the chrome-extension:// origin (this directory is used
// directly as the extension root), embeds the mock DSH app in an iframe, and
// relays verdicts to the service worker so they land in the mock server's log.
//
// Target and token come from the query string so the probe can be pointed at a
// fresh mock port without editing files.
const params = new URLSearchParams(location.search)
const MOCK = params.get('mock') ?? 'http://127.0.0.1:39871'
const TOKEN = params.get('token') ?? 'probe-token-abc123'

const status = document.getElementById('status')
const frame = document.getElementById('f')
const seen = []

function record(line) {
  if (seen.includes(line)) return
  seen.push(line)
  status.textContent = line
  globalThis.__probeVerdicts = seen
  chrome.runtime.sendMessage({ type: 'probe-verdict', text: line }, () => void chrome.runtime.lastError)
}

// Primary signal: the mock app posts its own results up to us.
window.addEventListener('message', (event) => record(`postMessage: ${event.data}`))

// Secondary signal: same-origin iframe DOM read, which also proves the token
// exchange survived as a navigation.
setTimeout(() => {
  let dom = 'unreadable (cross-origin)'
  try {
    const text = frame.contentDocument?.getElementById('out')?.textContent
    if (text) dom = text
  } catch { /* cross-origin, ignore */ }
  record(`dom check after 5s: ${dom}`)
}, 5000)

// Third signal: the same app opened as a TOP-LEVEL window. If the WebSocket
// works there but not in the iframe, the panel must host its UI in a window.
if (params.get('popup') === '1') {
  setTimeout(() => {
    record('opening app as a top-level window')
    chrome.runtime.sendMessage({ type: 'probe-popup', url: `${MOCK}/?token=${TOKEN}&tag=toplevel` }, (reply) =>
      void chrome.runtime.lastError ?? record(`popup reply: ${JSON.stringify(reply)}`),
    )
  }, 3000)
}

setTimeout(() => record('probe finished'), 12000)

frame.src = `${MOCK}/?token=${TOKEN}`
