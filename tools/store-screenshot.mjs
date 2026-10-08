// Capture exact-size store screenshots (Edge Add-ons accepts 640x480 or
// 1280x800) by overriding device metrics on an extension page and clipping the
// result to the required box.
import { writeFileSync } from 'node:fs'

const CDP = 'http://127.0.0.1:19222'
const waitMs = Number(process.argv[2] ?? 6000)

const list = await (await fetch(`${CDP}/json/list`)).json()
const target = list.find((t) => t.url.includes('sidepanel.html') && t.webSocketDebuggerUrl)
if (!target) {
  console.log('no sidepanel page target. targets:')
  for (const t of list) console.log(`  ${t.type}\t${t.url}`)
  process.exit(1)
}

const ws = new WebSocket(target.webSocketDebuggerUrl)
let id = 0
const pending = new Map()
const send = (method, params = {}) =>
  new Promise((resolve) => { const m = ++id; pending.set(m, resolve); ws.send(JSON.stringify({ id: m, method, params })) })
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data)
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result ?? msg.error); pending.delete(msg.id) }
})
await new Promise((r) => ws.addEventListener('open', r))
await send('Page.enable')
await send('Runtime.enable')

// Deterministic CSS layout regardless of the host DPI/theme.
await send('Emulation.setDeviceMetricsOverride', {
  width: 1280,
  height: 800,
  deviceScaleFactor: 1,
  mobile: false,
})
await send('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-color-scheme', value: 'dark' }],
})

const read = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true })
  return r?.exceptionDetails ? `EXC ${JSON.stringify(r.exceptionDetails).slice(0, 200)}` : r?.result?.value
}

console.log('url    :', await read('location.href'))
console.log('lang   :', await read('document.documentElement.lang'))
console.log('title  :', await read('document.querySelector("h1")?.textContent'))
console.log('summary:', await read('document.getElementById("summary")?.textContent'))

await new Promise((r) => setTimeout(r, waitMs))

const shot = await send('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: false,
  clip: { x: 0, y: 0, width: 1280, height: 800, scale: 1 },
})
if (!shot?.data) { console.log('capture failed:', JSON.stringify(shot).slice(0, 300)); process.exit(1) }
writeFileSync(process.argv[3] ?? 'store-shot.png', Buffer.from(shot.data, 'base64'))
console.log('wrote', process.argv[3] ?? 'store-shot.png')
ws.close()
