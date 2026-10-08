// Sanity check the mock server's WebSocket upgrade handler from outside the
// browser: without the session cookie it must refuse, with it must upgrade.
import { request } from 'node:http'

const PORT = Number(process.argv[2] ?? 39875)

const attempt = (label, headers) =>
  new Promise((resolve) => {
    const req = request({
      host: '127.0.0.1',
      port: PORT,
      path: '/ws',
      headers: {
        Connection: 'Upgrade',
        Upgrade: 'websocket',
        'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
        'Sec-WebSocket-Version': '13',
        ...headers,
      },
    })
    req.on('upgrade', (res, socket) => {
      socket.destroy()
      resolve(`${label} -> 101 upgraded (accept=${res.headers['sec-websocket-accept']})`)
    })
    req.on('response', (res) => resolve(`${label} -> ${res.statusCode} refused`))
    req.on('error', (e) => resolve(`${label} -> error ${e}`))
    req.end()
  })

console.log(await attempt('no cookie  ', {}))
console.log(await attempt('with cookie', { cookie: 'dsh-probe-session=ok' }))
