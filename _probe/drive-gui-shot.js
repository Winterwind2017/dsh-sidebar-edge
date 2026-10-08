(async () => {
  const ask = (message) => new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
  const closed = await ask({ type: 'close' });
  const opened = await ask({ type: 'open', reload: true, address: 'http://127.0.0.1:3099' });
  await new Promise((r) => setTimeout(r, 10000));
  return JSON.stringify({ closed, opened });
})()
