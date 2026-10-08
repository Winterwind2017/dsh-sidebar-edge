// Because the probe page and the DSH iframe share the same 127.0.0.1 origin, the
// extension page can reach into the frame's own JS realm. Use that to see why
// the frame's WebSocket never reached the server.
const CDP = 'http://127.0.0.1:19222'
const MOCK = process.argv[2] ?? 'http://127.0.0.1:39875'

const list = await (await fetch(`${CDP}/json/list`)).json()
const page = list.find((t) => t.type === 'page' && t.url.includes('probe.html'))
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
await send('Runtime.enable')

const evalIn = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r?.exceptionDetails) return 'EXC ' + JSON.stringify(r.exceptionDetails).slice(0, 300)
  return r?.result?.value
}

await send('Page.navigate', { url: 'chrome-extension://iiiimhjikkaaehaeacpnankokochbehf/probe.html?mock=' + encodeURIComponent(MOCK) + '&token=probe-token-abc123' })
await new Promise((r) => setTimeout(r, 7000))

console.log('frame location   :', await evalIn("document.getElementById('f')?.contentWindow?.location?.href"))
console.log('frame app text   :', await evalIn("document.getElementById('f')?.contentDocument?.getElementById('out')?.textContent"))
console.log('frame ws via ctor:', await evalIn(`(() => {
  const W = document.getElementById('f').contentWindow.WebSocket;
  const out = [];
  const w = new W('ws://127.0.0.1:39875/ws');
  w.onopen = () => out.push('open');
  w.onerror = () => out.push('error');
  w.onclose = (e) => out.push('close ' + e.code + ' ' + e.reason);
  return new Promise((res) => setTimeout(() => res(out.join(' | ') + ' | readyState=' + w.readyState), 3500));
})()`))
ws.close()
