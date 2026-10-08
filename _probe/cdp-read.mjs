// Minimal CDP client (no deps): attach to the probe page, read its visible
// status text and any console/page errors, so a blocked iframe is diagnosable.
const CDP_HTTP = 'http://127.0.0.1:19222'
const wanted = process.argv[2] ?? 'probe.html'

const list = await (await fetch(`${CDP_HTTP}/json/list`)).json()
const target = list.find((t) => t.type === 'page' && t.url.includes(wanted))
if (!target) {
  console.log('NO TARGET for', wanted)
  console.log(JSON.stringify(list.map((t) => `${t.type} ${t.url}`), null, 2))
  process.exit(1)
}

const ws = new WebSocket(target.webSocketDebuggerUrl)
let id = 0
const pending = new Map()
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const msgId = ++id
    pending.set(msgId, resolve)
    ws.send(JSON.stringify({ id: msgId, method, params }))
  })

const events = []
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data)
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result ?? msg.error)
    pending.delete(msg.id)
  } else if (msg.method) {
    events.push(msg)
  }
})

await new Promise((resolve) => ws.addEventListener('open', resolve))
await send('Runtime.enable')
await send('Log.enable')
await send('Page.enable')

const read = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  return r?.result?.value
}

console.log('target url      :', target.url)
console.log('status text     :', await read("document.getElementById('status')?.textContent"))
console.log('iframe src      :', await read("document.getElementById('f')?.src"))
console.log('iframe doc state:', await read("(()=>{try{const d=document.getElementById('f').contentDocument;return d?('same-origin, body=' + (d.body?.innerText||'').slice(0,200)):'no contentDocument'}catch(e){return 'cross-origin: '+e}})()"))
console.log('verdicts        :', await read('JSON.stringify(globalThis.__probeVerdicts ?? [])'))

// give the page a moment to surface late console output
await new Promise((r) => setTimeout(r, 2500))
const logged = events
  .filter((e) => e.method === 'Log.entryAdded' || e.method === 'Runtime.consoleAPICalled' || e.method === 'Runtime.exceptionThrown')
  .map((e) => e.method + ' :: ' + JSON.stringify(e.params).slice(0, 400))
console.log('---- console/log events ----')
console.log(logged.join('\n') || '(none)')
ws.close()
