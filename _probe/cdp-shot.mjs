// Screenshot helper over CDP: connect to a specific target and save a PNG.
import { writeFileSync } from 'node:fs'

const CDP = 'http://127.0.0.1:19222'
const urlPart = process.argv[2] ?? ''
const out = process.argv[3] ?? 'shot.png'
const waitMs = Number(process.argv[4] ?? 4000)

const list = await (await fetch(`${CDP}/json/list`)).json()
console.log('targets:')
for (const t of list) console.log(`  ${t.type}\t${t.url}`)

const target = list.find((t) => t.url.includes(urlPart) && t.webSocketDebuggerUrl)
if (!target) { console.log(`no target matching ${JSON.stringify(urlPart)}`); process.exit(1) }

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
await send('Page.bringToFront')
await new Promise((r) => setTimeout(r, waitMs))
const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
if (!shot?.data) { console.log('screenshot failed:', JSON.stringify(shot).slice(0, 300)); process.exit(1) }
writeFileSync(out, Buffer.from(shot.data, 'base64'))
console.log(`wrote ${out} from ${target.url}`)
ws.close()
