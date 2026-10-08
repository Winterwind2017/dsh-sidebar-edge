// Inspect the iframe's own JS realm: why did its WebSocket never reach the
// server? Reads the frame's execution context through the CDP session.
const CDP = 'http://127.0.0.1:19222'
const list = await (await fetch(`${CDP}/json/list`)).json()
const page = list.find((t) => t.type === 'page' && t.url.includes('probe.html'))
if (!page) { console.log('no probe page'); process.exit(1) }

const ws = new WebSocket(page.webSocketDebuggerUrl)
let id = 0
const pending = new Map()
const events = []
const send = (method, params = {}, sessionId) =>
  new Promise((resolve) => { const m = ++id; pending.set(m, resolve); ws.send(JSON.stringify({ id: m, method, params, ...(sessionId ? { sessionId } : {}) })) })
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data)
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result ?? msg.error); pending.delete(msg.id) }
  else if (msg.method) events.push(msg)
})
await new Promise((r) => ws.addEventListener('open', r))
await send('Runtime.enable')
await send('Log.enable')
await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true })

await new Promise((r) => setTimeout(r, 2000))

// Find the iframe target (it is a separate page target because it is cross-origin)
const targetsResult = await send('Target.getTargets')
const iframeTarget = targetsResult.targetInfos.find((t) => t.url.includes('127.0.0.1'))
console.log('iframe target:', iframeTarget ? `${iframeTarget.type} ${iframeTarget.url}` : '(none found)')

// Evaluate a fresh WebSocket inside the top-level extension page and inside any
// attached iframe session.
const direct = await send('Runtime.evaluate', {
  expression: `(() => {
    const results = [];
    const w = new WebSocket('ws://127.0.0.1:39875/ws');
    results.push('created');
    w.addEventListener('open', () => results.push('open'));
    w.addEventListener('error', (e) => results.push('error'));
    w.addEventListener('close', (e) => results.push('close code=' + e.code + ' reason=' + e.reason + ' clean=' + e.wasClean));
    return new Promise((res) => setTimeout(() => res(results.join(' | ') + ' readyState=' + w.readyState), 4000));
  })()`,
  returnByValue: true,
  awaitPromise: true,
})
console.log('extension-page ws:', JSON.stringify(direct?.result?.value))

await new Promise((r) => setTimeout(r, 1000))
console.log('---- relevant events ----')
const relevant = events
  .filter((e) => /Log\.entryAdded|Runtime\.exceptionThrown|Runtime\.consoleAPICalled|Target\.attached/.test(e.method))
  .map((e) => `${e.method} ${JSON.stringify(e.params).slice(0, 500)}`)
console.log(relevant.join('\n') || '(none)')
ws.close()
