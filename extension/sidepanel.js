// Side panel controller: shows whether a `dsh web` server answers, launches the
// GUI window, and keeps the small amount of connection configuration.

const el = {
  dot: document.getElementById('dot'),
  summary: document.getElementById('summary'),
  open: document.getElementById('open'),
  focus: document.getElementById('focus'),
  close: document.getElementById('close'),
  openHint: document.getElementById('openHint'),
  address: document.getElementById('address'),
  token: document.getElementById('token'),
  save: document.getElementById('save'),
  detect: document.getElementById('detect'),
  settingsHint: document.getElementById('settingsHint'),
}

const send = (message) =>
  new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (reply) => {
      if (chrome.runtime.lastError) resolve({ ok: false, error: chrome.runtime.lastError.message })
      else resolve(reply ?? { ok: false, error: 'no-reply' })
    })
  })

const setHint = (node, text, tone) => {
  node.textContent = text
  if (tone) node.dataset.tone = tone
  else delete node.dataset.tone
}

function renderStatus(status) {
  el.dot.dataset.state = status.reachable === true ? 'on' : 'off'

  if (status.reachable === true) {
    const auth = status.status === 401 ? t('onlineLogin') : t('onlineHttp', status.status)
    el.summary.textContent = `${status.address} · ${auth}`
  } else {
    el.summary.textContent = `${status.address} · ${t('offline')}`
  }

  el.focus.hidden = status.windowOpen !== true
  el.close.hidden = status.windowOpen !== true
  el.open.textContent = status.windowOpen ? t('openButtonReload') : t('openButton')

  setHint(el.openHint, status.hasToken ? t('hintHasToken') : t('hintNoToken'))
}

async function refresh() {
  const status = await send({ type: 'status' })
  if (status.ok !== true) {
    el.dot.dataset.state = 'unknown'
    el.summary.textContent = t('statusFailed', status.error ?? '?')
    return
  }
  if (document.activeElement !== el.address) el.address.value = status.address ?? ''
  renderStatus(status)
}

el.open.addEventListener('click', async () => {
  const status = await send({ type: 'status' })
  // A saved token is consumed by exactly one navigation, so read it here.
  const saved = await chrome.storage.local.get({ token: '' })
  const typed = el.token.value.trim()
  const reply = await send({
    type: 'open',
    address: el.address.value.trim() || status.address,
    token: typed !== '' ? typed : saved.token,
    // The button doubles as "focus" and "reload" once the window exists.
    reload: !el.focus.hidden,
  })
  if (reply.ok === true) {
    setHint(el.openHint, t('openedAt', reply.address, reply.windowId), 'ok')
    if (typed !== '' || saved.token !== '') {
      await chrome.storage.local.set({ token: '' })
      el.token.value = ''
    }
  } else {
    setHint(el.openHint, t('openFailed', reply.error ?? '?'), 'err')
  }
  void refresh()
})

el.focus.addEventListener('click', async () => {
  const reply = await send({ type: 'focus' })
  if (reply.ok !== true) setHint(el.openHint, t('windowGone'), 'err')
  void refresh()
})

el.close.addEventListener('click', async () => {
  await send({ type: 'close' })
  setHint(el.openHint, t('windowClosed'))
  void refresh()
})

el.save.addEventListener('click', async () => {
  const reply = await send({ type: 'save', address: el.address.value, token: el.token.value })
  if (reply.ok === true) {
    setHint(el.settingsHint, t('savedAt', reply.address), 'ok')
    if (reply.hasToken) el.token.value = ''
    renderStatus({ ...reply, windowOpen: false })
  } else {
    setHint(el.settingsHint, t('saveFailed', reply.error ?? '?'), 'err')
  }
})

el.detect.addEventListener('click', async () => {
  setHint(el.settingsHint, t('detecting'))
  const reply = await send({ type: 'discover' })
  if (reply.ok === true) {
    el.address.value = reply.address
    setHint(el.settingsHint, t('detectedAt', reply.address), 'ok')
  } else {
    setHint(el.settingsHint, t('detectFailed'), 'err')
  }
  void refresh()
})

applyStatic()
void refresh()
