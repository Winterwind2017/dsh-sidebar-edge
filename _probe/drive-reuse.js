(async () => {
  const ask = (message) => new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
  const out = {};
  // 1) first open: real DSH on 19387 requires a token
  out.firstOpen = await ask({ type: 'open', reload: true, address: 'http://127.0.0.1:19387' });
  await new Promise((r) => setTimeout(r, 4000));
  // 2) reuse: same address must focus, not navigate
  out.reuse = await ask({ type: 'open', address: 'http://127.0.0.1:19387' });
  await new Promise((r) => setTimeout(r, 2500));
  // 3) address switch: must navigate the existing window to the mock app
  out.switchAddress = await ask({
    type: 'open',
    address: 'http://127.0.0.1:39877',
    token: 'probe-token-abc123',
  });
  await new Promise((r) => setTimeout(r, 6000));
  out.status = await ask({ type: 'status' });
  return JSON.stringify(out);
})()
