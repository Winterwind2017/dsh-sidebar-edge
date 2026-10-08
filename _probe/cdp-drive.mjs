// Drive the side panel by reading the expression from a file (avoids shell
// quoting problems with nested callbacks), then report the reply and targets.
import { readFileSync } from 'node:fs'

const CDP = 'http://127.0.0.1:19222'
const expression = readFileSync(process.argv[2], 'utf8')
const waitMs = Number(process.argv[3] ?? 5000)

const list = await (await fetch(`${CDP}/json/list`)).json()
const target = list.find((t) => t.url.includes('sidepanel.html') && t.webSocketDebuggerUrl)
if (!target) { console.log('no sidepanel target'); process.exit(1) }

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
await send('Runtime.enable')
const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
if (r?.exceptionDetails) console.log('EXCEPTION:', JSON.stringify(r.exceptionDetails).slice(0, 400))
else console.log('result:', JSON.stringify(r?.result?.value))
await new Promise((r2) => setTimeout(r2, waitMs))
const after = await (await fetch(`${CDP}/json/list`)).json()
console.log('---- targets after ----')
for (const t of after) console.log(`  ${t.type}\t${t.url}`)
ws.close()
