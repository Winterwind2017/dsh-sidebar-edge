// Multi-step navigation helper: list targets, navigate a chosen page, and print
// its #status text, so each hypothesis step is observable.
const CDP = 'http://127.0.0.1:19222'

const listTargets = async () => (await (await fetch(`${CDP}/json/list`)).json())

const connect = async (target) => {
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  let id = 0
  const pending = new Map()
  const events = []
  const send = (method, params = {}) =>
    new Promise((resolve) => { const m = ++id; pending.set(m, resolve); ws.send(JSON.stringify({ id: m, method, params })) })
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data)
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result ?? msg.error); pending.delete(msg.id) }
    else if (msg.method) events.push(msg)
  })
  await new Promise((r) => ws.addEventListener('open', r))
  await send('Runtime.enable')
  await send('Log.enable')
  await send('Page.enable')
  return { send, events, close: () => ws.close() }
}

const mode = process.argv[2] ?? 'list'
const url = process.argv[3]
const waitMs = Number(process.argv[4] ?? 8000)

if (mode === 'list') {
  for (const t of await listTargets()) console.log(`${t.type}\t${t.url}`)
} else if (mode === 'nav') {
  const targets = await listTargets()
  const page = targets.find((t) => t.type === 'page' && t.url.includes('probe.html')) ?? targets.find((t) => t.type === 'page')
  if (!page) { console.log('no page target'); process.exit(1) }
  const c = await connect(page)
  console.log('driving:', page.url)
  await c.send('Page.navigate', { url })
  await new Promise((r) => setTimeout(r, waitMs))
  const out = await c.send('Runtime.evaluate', { expression: "document.getElementById('status') ? document.getElementById('status').textContent : '(no #status)'", returnByValue: true })
  console.log('status:', JSON.stringify(out?.result?.value))
  const errs = c.events.filter((e) => e.method === 'Log.entryAdded').map((e) => e.params.entry.text).slice(-6)
  if (errs.length) console.log('log entries:', errs.join(' || '))
  c.close()
} else if (mode === 'open') {
  // Navigate an existing non-probe page, else create a new target via CDP.
  const targets = await listTargets()
  console.log('targets before open:')
  for (const t of targets) console.log(`  ${t.type}\t${t.url}`)
  let page = targets.find((t) => t.type === 'page' && !t.url.includes('probe.html'))
  if (!page) {
    const created = await (await fetch(`${CDP}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })).json()
    console.log('created target:', created.url)
    page = created
  } else {
    const c = await connect(page)
    await c.send('Page.navigate', { url })
    c.close()
  }
  await new Promise((r) => setTimeout(r, waitMs))
  const after = await listTargets()
  console.log('targets after:')
  for (const t of after) console.log(`  ${t.type}\t${t.url}`)
}
