// Minimal replica of the DSH browser-auth handshake, used ONLY to decide whether
// a `SameSite=Strict; HttpOnly` session cookie survives inside a cross-site
// iframe. Mirrors the documented DSH behaviour:
//   GET /?token=...  -> 303 to clean "/" + Set-Cookie (host-only, Path=/, Strict)
//   GET /            -> 401 unless a valid cookie is present
//   GET /api/ping    -> 200 only when the cookie came back on a subresource fetch
//
// `/probe` plays the role of the top-level cross-site context (what the
// chrome-extension:// side panel document is) and embeds the app in an iframe.
import { createServer } from 'node:http'

const PORT = Number(process.argv[2] ?? 39871)
const TOKEN = 'probe-token-abc123'
const COOKIE_NAME = 'dsh-probe-session'

const APP_PAGE = `<!doctype html><meta charset="utf-8"><title>probe app</title>
<body style="font:13px system-ui;padding:10px">
<h3>probe app loaded (index served with valid session)</h3><pre id="out">running…</pre><pre id="wsout">ws: not attempted</pre>
<script>
  document.getElementById('out').textContent = 'inline script DID run';
  fetch('/api/ping').then(r => r.text()).then(t => {
    document.getElementById('out').textContent = 'api/ping -> ' + t;
    parent.postMessage('app page: api/ping -> ' + t, '*');
  }).catch(e => {
    document.getElementById('out').textContent = 'api/ping threw ' + e;
    parent.postMessage('app page: api/ping threw ' + e, '*');
  });
  // DSH carries every RPC over WebSocket; the handshake is the second thing a
  // Strict session cookie must survive inside the panel.
  const wslog = (line) => {
    // Tag every report with where this instance lives (iframe vs top level).
    const tag = new URLSearchParams(location.search).get('tag') ?? 'iframe';
    const text = '[' + tag + '] ' + line;
    document.getElementById('wsout').textContent = text;
    parent.postMessage('app page: ' + text, '*');
    fetch('/verdict?text=' + encodeURIComponent('WS ' + text)).catch(() => {});
  };
  try {
    const w = new WebSocket('ws://127.0.0.1:' + location.port + '/ws');
    wslog('constructed, readyState=' + w.readyState);
    w.onopen = () => wslog('OPEN (cookie survived the handshake)');
    w.onerror = () => wslog('ERROR readyState=' + w.readyState);
    w.onclose = (e) => wslog('CLOSE code=' + e.code + ' reason="' + e.reason + '" clean=' + e.wasClean);
  } catch (e) { wslog('threw ' + e); }
</script></body>`

const PROBE_PAGE = `<!doctype html><meta charset="utf-8"><title>cross-site top level</title>
<body style="font:13px system-ui;padding:10px">
<div id="status">probing…</div>
<iframe id="f" src="/?token=${TOKEN}" style="width:100%;height:200px;border:1px solid #999"></iframe>
<script>
  const report = (t) => { document.getElementById('status').textContent = t; fetch('/verdict?text=' + encodeURIComponent('TOPLEVEL ' + t)); };
  window.addEventListener('message', e => report(String(e.data)));
  setTimeout(() => { try { report('dom read: ' + (document.getElementById('f').contentDocument.getElementById('out').textContent)); } catch (e) { report('dom read threw ' + e); } }, 4000);
</script></body>`

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`)
  const cookie = req.headers.cookie ?? ''
  const hasSession = cookie.includes(`${COOKIE_NAME}=ok`)
  console.log(
    `[req] ${req.method} ${url.pathname}${url.search ? '?' + url.searchParams.toString() : ''}` +
      ` | cookie=${hasSession ? 'YES' : 'no'} | origin=${req.headers.origin ?? '(none)'}` +
      ` | site=${req.headers['sec-fetch-site'] ?? '(none)'} | dest=${req.headers['sec-fetch-dest'] ?? '(none)'}`,
  )

  if (url.pathname === '/probe') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
    return res.end(PROBE_PAGE)
  }

  if (url.pathname === '/') {
    if (url.searchParams.get('token') === TOKEN) {
      res.writeHead(303, {
        location: './',
        'set-cookie': `${COOKIE_NAME}=ok; Path=/; HttpOnly; SameSite=Strict`,
        'cache-control': 'no-store',
      })
      console.log('[auth] token accepted -> 303 + Set-Cookie SameSite=Strict')
      return res.end()
    }
    if (hasSession) {
      console.log('[auth] index served from session cookie')
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
      return res.end(APP_PAGE)
    }
    console.log('[auth] 401 - session cookie ABSENT on index request')
    res.writeHead(401, { 'content-type': 'text/plain; charset=utf-8' })
    return res.end('401 unauthorized (no valid session cookie)')
  }

  if (url.pathname === '/api/ping') {
    if (!hasSession) {
      console.log('[api] 403 - session cookie ABSENT on subresource fetch')
      res.writeHead(403, { 'content-type': 'text/plain' })
      return res.end('403 forbidden (cookie not sent on fetch)')
    }
    console.log('[api] 200 - session cookie PRESENT on subresource fetch')
    res.writeHead(200, { 'content-type': 'text/plain' })
    return res.end('200 ok (cookie WAS sent on fetch)')
  }

  if (url.pathname === '/verdict') {
    console.log(`[VERDICT] ${url.searchParams.get('text') ?? ''}`)
    res.writeHead(200, { 'content-type': 'text/plain', 'access-control-allow-origin': '*' })
    return res.end('logged')
  }

  res.writeHead(404).end('nope')
})

server.listen(PORT, '127.0.0.1', () => console.log(`[mock] listening on http://127.0.0.1:${PORT}/ (token=${TOKEN})`))

// WebSocket handshake observation: accept only when the session cookie arrives
// (mirrors the DSH carrier requiring the browser session on /api streams).
import { createHash } from 'node:crypto'
server.on('upgrade', (req, socket) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`)
  const cookie = req.headers.cookie ?? ''
  const hasSession = cookie.includes(`${COOKIE_NAME}=ok`)
  console.log(
    `[ws] upgrade ${url.pathname} | cookie=${hasSession ? 'YES' : 'no'}` +
      ` | origin=${req.headers.origin ?? '(none)'} | site=${req.headers['sec-fetch-site'] ?? '(none)'}`,
  )
  if (!hasSession) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
    return socket.destroy()
  }
  const accept = createHash('sha1')
    .update(`${req.headers['sec-websocket-key']}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest('base64')
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\nConnection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
  )
  console.log('[ws] 101 accepted (cookie WAS sent on handshake)')
})
