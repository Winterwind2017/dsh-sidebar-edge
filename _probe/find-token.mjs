// Try to recover the one-time launch token from an already-authenticated DSH tab
// in the user's own Edge: the tab landed on a clean URL, but the session history
// still holds the original `?token=...` entry.
const CDP = process.argv[2] ?? 'http://127.0.0.1:19222'

const list = await (await fetch(`${CDP}/json/list`)).json()
const dsh = list.filter((t) => t.url.includes('127.0.0.1:19387') || t.url.includes('localhost:19387'))
console.log('DSH-ish targets:', dsh.length)
for (const t of dsh) console.log(`  ${t.type}\t${t.url}`)

const target = dsh.find((t) => t.type === 'page')
if (!target) { console.log('no DSH page target on this CDP endpoint'); process.exit(0) }

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

const evalIn = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true })
  return r?.exceptionDetails ? `EXC ${JSON.stringify(r.exceptionDetails).slice(0, 200)}` : r?.result?.value
}

console.log('current url   :', await evalIn('location.href'))
console.log('title         :', await evalIn('document.title'))
const history = await send('Page.getNavigationHistory')
const entries = history?.entries ?? []
console.log('history size  :', entries.length)
entries.slice(0, 8).forEach((e, i) => console.log(`  [${i}] ${e.url}`))
const tokenEntry = entries.find((e) => e.url.includes('token='))
console.log('TOKEN FOUND   :', tokenEntry ? tokenEntry.url : '(none in history)')
ws.close()
