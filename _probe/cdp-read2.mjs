// Follow-up CDP probe: dump the extension page's real DOM/internal URL and a
// screenshot, so an unloaded or blank extension page is diagnosable.
const CDP_HTTP = 'http://127.0.0.1:19222'
const list = await (await fetch(`${CDP_HTTP}/json/list`)).json()
console.log('---- all targets ----')
for (const t of list) console.log(`${t.type}\t${t.url}`)

const target = list.find((t) => t.type === 'page' && t.url.includes('probe.html'))
if (!target) { console.log('no probe page target'); process.exit(1) }

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
await send('Page.enable')

const read = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  return r?.result?.value ?? (r?.exceptionDetails ? 'EXC ' + JSON.stringify(r.exceptionDetails).slice(0, 300) : r)
}

console.log('document.URL      :', await read('document.URL'))
console.log('readyState        :', await read('document.readyState'))
console.log('body.innerHTML    :', String(await read('document.body ? document.body.innerHTML : "(no body)"')).slice(0, 600))
console.log('script tags       :', await read('[...document.querySelectorAll("script")].map(s=>s.src).join(" | ")'))
console.log('child frames      :', await read('window.frames.length'))

// navigate explicitly and re-check, to bypass any auto-run weirdness
console.log('--- reloading ---')
await send('Page.navigate', { url: target.url })
await new Promise((r) => setTimeout(r, 4000))
console.log('after reload body :', String(await read('document.body ? document.body.innerHTML : "(no body)"')).slice(0, 600))
console.log('after reload frames:', await read('window.frames.length'))
ws.close()
