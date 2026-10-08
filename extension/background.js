/**
 * Background service worker.
 *
 * Why this extension opens the DSH GUI in its own window instead of framing it
 * inside the side panel: the `dsh web` browser session cookie is
 * `HttpOnly; SameSite=Strict` (documented in DSH's client-connection package).
 * Inside a `chrome-extension://` side panel the GUI is a cross-site iframe, so
 * the cookie is attached to the token exchange and to ordinary fetches, but NOT
 * to the WebSocket handshake — and every DSH RPC travels over WebSocket (the
 * handshake is refused with 401, the socket closes with 1006). As a top-level
 * document the app is same-site with itself and the handshake carries the
 * cookie. The side panel therefore acts as launcher/status surface, while the
 * GUI lives in a narrow top-level window that reads like a side panel.
 *
 * Settings live in chrome.storage.local:
 *   address  {string}  origin of the running `dsh web`, e.g. http://127.0.0.1:19387
 *   token    {string}  one-time launch token, consumed by the next navigation
 *   windowId {number}  window hosting the GUI, so reopening focuses it
 *   geometry {object}  last GUI window bounds, so reopening keeps its shape
 */

const DEFAULT_ADDRESS = 'http://127.0.0.1:19387'
const PROBE_PORTS = [19387, 3080, 3000, 4096, 5173, 8080, 8000, 9000]
const PANEL_WIDTH = 460
const PANEL_HEIGHT = 940

const getSettings = () =>
  chrome.storage.local.get({ address: DEFAULT_ADDRESS, token: '', windowId: null, windowUrl: '', geometry: null })

/** Split a pasted value into an origin plus an optional one-time token. */
const parseInput = (raw) => {
  const text = String(raw ?? '').trim()
  if (text === '') return { address: '', token: '' }
  const withScheme = /^https?:\/\//i.test(text) ? text : `http://${text}`
  try {
    const url = new URL(withScheme)
    // `localhost` and `127.0.0.1` are separate cookie jars; the extension always
    // speaks to the literal loopback address so one saved value keeps working.
    return { address: `http://127.0.0.1:${url.port || (url.protocol === 'https:' ? '443' : '80')}`, token: url.searchParams.get('token') ?? '' }
  } catch {
    return { address: '', token: '' }
  }
}

/** URL to load; the process token is consumed by the root exchange on first load. */
const buildLaunchUrl = (address, token) =>
  token ? `${address}/?token=${encodeURIComponent(token)}` : `${address}/`

/** A running `dsh web` answers even when it refuses the extension origin (401). */
const probeAddress = async (address) => {
  try {
    const response = await fetch(`${address}/`, { method: 'GET', cache: 'no-store' })
    return { reachable: true, status: response.status }
  } catch (error) {
    return { reachable: false, status: 0, error: String(error) }
  }
}

/** Find a running DSH: desktop-app port first, then common development ports. */
const discover = async () => {
  for (const port of PROBE_PORTS) {
    const address = `http://127.0.0.1:${port}`
    const result = await probeAddress(address)
    if (result.reachable) return { address, status: result.status }
  }
  return null
}

const clearWindowId = async (windowId) => {
  const { windowId: current } = await getSettings()
  if (current === windowId) await chrome.storage.local.set({ windowId: null })
}

chrome.windows.onRemoved.addListener((windowId) => { void clearWindowId(windowId) })

/** Keep the GUI window's own bounds so a reopened panel looks the same. */
chrome.windows.onBoundsChanged.addListener(async (win) => {
  const { windowId } = await getSettings()
  if (windowId === null || win.id !== windowId) return
  await chrome.storage.local.set({
    geometry: { left: win.left, top: win.top, width: win.width, height: win.height },
  })
})

const liveWindow = async (windowId) => {
  if (windowId === null) return false
  try {
    await chrome.windows.get(windowId)
    return true
  } catch {
    await chrome.storage.local.set({ windowId: null })
    return false
  }
}

/** Open (or focus) the GUI window. A stored token is spent by this navigation. */
const openGui = async ({ address, token, reload = false } = {}) => {
  const settings = await getSettings()
  const target = parseInput(address ?? settings.address).address || DEFAULT_ADDRESS
  const typedToken = typeof token === 'string' && token.trim() !== '' ? token.trim() : ''
  const launchToken = typedToken !== '' ? typedToken : settings.token
  const launchUrl = buildLaunchUrl(target, launchToken)
  const reuse = reload !== true

  // A live window is reused, but only when it already shows this address —
  // otherwise it is sent to the stored one so switching servers still works.
  if (reuse && (await liveWindow(settings.windowId))) {
    let navigated = false
    try {
      const [tab] = await chrome.tabs.query({ windowId: settings.windowId })
      if (tab?.id !== undefined && !(settings.windowUrl || '').startsWith(target)) {
        await chrome.tabs.update(tab.id, { url: launchUrl })
        navigated = true
      }
    } catch { /* tabs permission unavailable: focusing is still useful */ }
    await chrome.windows.update(settings.windowId, { focused: true, drawAttention: true })
    await chrome.storage.local.set({ address: target, windowUrl: navigated ? launchUrl : settings.windowUrl })
    // A typed token is consumed even when the window was already open.
    if (typedToken !== '') await chrome.storage.local.set({ token: '' })
    return { ok: true, windowId: settings.windowId, address: target, reused: true, navigated }
  }

  const geometry = settings.geometry ?? {}
  const win = await chrome.windows.create({
    url: launchUrl,
    type: 'popup',
    focused: true,
    width: geometry.width ?? PANEL_WIDTH,
    height: geometry.height ?? PANEL_HEIGHT,
    ...(typeof geometry.left === 'number' ? { left: geometry.left } : {}),
    ...(typeof geometry.top === 'number' ? { top: geometry.top } : {}),
  })
  await chrome.storage.local.set({ windowId: win.id ?? null, address: target, windowUrl: launchUrl, token: '' })
  return { ok: true, windowId: win.id, address: target, reused: false, navigated: true }
}

const handleMessage = async (message) => {
  switch (message?.type) {
    case 'status': {
      const settings = await getSettings()
      const windowOpen = await liveWindow(settings.windowId)
      const probe = await probeAddress(settings.address)
      return {
        ok: true,
        address: settings.address,
        hasToken: settings.token !== '',
        windowOpen,
        ...probe,
      }
    }
    case 'save': {
      const settings = await getSettings()
      const parsed = parseInput(message.address)
      const address = parsed.address || settings.address
      const explicit = typeof message.token === 'string' ? message.token.trim() : null
      const token = explicit !== null && explicit !== '' ? explicit : (parsed.token || settings.token)
      await chrome.storage.local.set({ address, token })
      const probe = await probeAddress(address)
      return { ok: true, address, hasToken: token !== '', ...probe }
    }
    case 'discover': {
      const found = await discover()
      if (found === null) return { ok: false, error: 'no-server' }
      const settings = await getSettings()
      await chrome.storage.local.set({ address: found.address, token: settings.token })
      return { ok: true, address: found.address, ...(await probeAddress(found.address)) }
    }
    case 'open':
      return await openGui({ address: message.address, token: message.token })
    case 'focus': {
      const { windowId } = await getSettings()
      if (!(await liveWindow(windowId))) return { ok: false, error: 'no-window' }
      await chrome.windows.update(windowId, { focused: true, drawAttention: true })
      return { ok: true }
    }
    case 'close': {
      const { windowId } = await getSettings()
      if (windowId !== null) {
        try {
          await chrome.windows.remove(windowId)
        } catch { /* already gone */ }
        await chrome.storage.local.set({ windowId: null })
      }
      return { ok: true }
    }
    default:
      return { ok: false, error: 'unknown-message' }
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: String(error) }))
  return true
})

// The toolbar icon opens the side panel rather than a popup.
const enablePanelBehavior = async () => {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  } catch (error) {
    console.warn('[dsh-sidebar] could not set panel behavior:', error)
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void enablePanelBehavior()
  void chrome.sidePanel.setOptions({ path: 'sidepanel.html', enabled: true })
})

chrome.runtime.onStartup.addListener(() => {
  void enablePanelBehavior()
  void (async () => {
    const { autoOpen } = await chrome.storage.local.get({ autoOpen: false })
    if (autoOpen === true) await openGui({})
  })()
})

void enablePanelBehavior()
