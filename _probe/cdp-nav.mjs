// Navigate the probe page to a URL and print the observed status text.
const CDP = 'http://127.0.0.1:19222'
const targetUrl = process.argv[2]
const waitMs = Number(process.argv[3] ?? 10000)

const list = await (await fetch(`${CDP}/json/list`)).json()
const page = list.find((t) => t.type === 'page' && (t.url.includes('probe.html') || t.url.startsWith('chrome-extension://iiiimhjikkaaehaeacpnankokochbehf')))
if (!page) {
  console.log('NO PROBE PAGE TARGET. Targets:')
  for (const t of list) console.log(`  ${t.type} ${t.url}`)
  process.exit(1)
}

const ws = new WebSocket(page.webSocketDebuggerUrl)
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
await send('Page.navigate', { url: targetUrl })
console.log('navigated ->', targetUrl)
await new Promise((r) => setTimeout(r, waitMs))
const r = await send('Runtime.evaluate', { expression: "document.getElementById('status') ? document.getElementById('status').textContent : '(no #status)'", returnByValue: true })
console.log('status:', JSON.stringify(r?.result?.value))
ws.close()
