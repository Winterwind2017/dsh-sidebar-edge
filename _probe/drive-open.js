(async () => {
  const ask = (message) => new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
  const closed = await ask({ type: 'close' });
  const opened = await ask({ type: 'open', address: 'http://127.0.0.1:3099', token: '5x3wzbrc--ApnMxIVi4rx6MZLESQHaBY9r8_QK26VuA' });
  await new Promise((r) => setTimeout(r, 9000));
  const status = await ask({ type: 'status' });
  return JSON.stringify({ closed, opened, status });
})()
