// Capture a 1280x800 screenshot of the DSH GUI window that the extension opens,
// used as a store screenshot.
import { writeFileSync } from 'node:fs'

const CDP = 'http://127.0.0.1:19222'
const port = process.argv[2] ?? '3099'
const out = process.argv[3] ?? 'gui.png'
const waitMs = Number(process.argv[4] ?? 8000)

const list = await (await fetch(`${CDP}/json/list`)).json()
const target = list.find((t) => t.type === 'page' && t.url.includes(`127.0.0.1:${port}`) && t.webSocketDebuggerUrl)
if (!target) {
  console.log('no DSH page target. targets:')
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
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false })
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] })
await send('Page.bringToFront')
await new Promise((r) => setTimeout(r, waitMs))

const shot = await send('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: false,
  clip: { x: 0, y: 0, width: 1280, height: 800, scale: 1 },
})
if (!shot?.data) { console.log('capture failed:', JSON.stringify(shot).slice(0, 300)); process.exit(1) }
writeFileSync(out, Buffer.from(shot.data, 'base64'))
console.log('wrote', out, 'from', target.url)
ws.close()
