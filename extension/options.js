// Options page: same connection settings as the side panel, plus the auto-open
// preference. All privileged work happens in the background service worker.

const el = {
  address: document.getElementById('address'),
  token: document.getElementById('token'),
  autoOpen: document.getElementById('autoOpen'),
  save: document.getElementById('save'),
  detect: document.getElementById('detect'),
  open: document.getElementById('open'),
  close: document.getElementById('close'),
  hint: document.getElementById('hint'),
}

const send = (message) =>
  new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (reply) => {
      if (chrome.runtime.lastError) resolve({ ok: false, error: chrome.runtime.lastError.message })
      else resolve(reply ?? { ok: false, error: 'no-reply' })
    })
  })

const hint = (text, tone) => {
  el.hint.textContent = text
  if (tone) el.hint.dataset.tone = tone
  else delete el.hint.dataset.tone
}

const load = async () => {
  const stored = await chrome.storage.local.get({
    address: 'http://127.0.0.1:19387',
    token: '',
    autoOpen: false,
  })
  el.address.value = stored.address
  el.autoOpen.checked = stored.autoOpen === true
  const status = await send({ type: 'status' })
  if (status.ok === true) {
    if (status.reachable) {
      const auth = status.status === 401 ? t('onlineLogin') : t('onlineHttp', status.status)
      hint(`${status.address} · ${auth}${status.windowOpen ? ' · ' + t('windowOpenLabel') : ''}`, 'ok')
    } else {
      hint(`${status.address} · ${t('offline')}`, 'err')
    }
  }
}

el.save.addEventListener('click', async () => {
  const reply = await send({ type: 'save', address: el.address.value, token: el.token.value })
  await chrome.storage.local.set({ autoOpen: el.autoOpen.checked })
  if (reply.ok === true) {
    hint(`${t('savedAt', reply.address)}${reply.hasToken ? ' · ' + t('tokenStoredLabel') : ''}`, 'ok')
    el.token.value = ''
  } else {
    hint(t('saveFailed', reply.error ?? '?'), 'err')
  }
})

el.detect.addEventListener('click', async () => {
  hint(t('detecting'))
  const reply = await send({ type: 'discover' })
  if (reply.ok === true) {
    el.address.value = reply.address
    hint(t('detectedAt', reply.address), 'ok')
  } else {
    hint(t('detectFailed'), 'err')
  }
})

el.open.addEventListener('click', async () => {
  const stored = await chrome.storage.local.get({ token: '' })
  const typed = el.token.value.trim()
  const reply = await send({ type: 'open', address: el.address.value, token: typed || stored.token })
  if (reply.ok === true) {
    hint(`${t('openedAt', reply.address, reply.windowId)}${reply.reused ? ' · ' + t('windowOpenLabel') : ''}`, 'ok')
    if (typed || stored.token) {
      await chrome.storage.local.set({ token: '' })
      el.token.value = ''
    }
  } else {
    hint(t('openFailed', reply.error ?? '?'), 'err')
  }
})

el.close.addEventListener('click', async () => {
  await send({ type: 'close' })
  hint(t('windowClosed'))
})

applyStatic()
void load()
