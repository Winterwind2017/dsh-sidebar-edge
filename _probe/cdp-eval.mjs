// Drive the side panel page through CDP: evaluate an expression in its context
// (used to trigger the real open-window flow and read the reply).
const CDP = 'http://127.0.0.1:19222'
const urlPart = process.argv[2] ?? 'sidepanel.html'
const expression = process.argv[3] ?? 'document.title'
const waitMs = Number(process.argv[4] ?? 5000)

const list = await (await fetch(`${CDP}/json/list`)).json()
const target = list.find((t) => t.url.includes(urlPart) && t.webSocketDebuggerUrl)
if (!target) { console.log('no target matching', urlPart); process.exit(1) }

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
console.log('result:', JSON.stringify(r?.result?.value ?? r?.exceptionDetails ?? r).slice(0, 600))
await new Promise((r2) => setTimeout(r2, waitMs))
const after = await (await fetch(`${CDP}/json/list`)).json()
console.log('---- targets after ----')
for (const t of after) console.log(`  ${t.type}\t${t.url}`)
ws.close()
