const statusEl = document.getElementById('status');

async function call(path, options = {}) {
  const headers = {
    ...(options.headers || {}),
  };

  const response = await fetch(path, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Request failed');
  }
  return response;
}

function setStatus(message) {
  statusEl.textContent = message;
}

async function importBrowser(browser) {
  if (!window.myriadDesktop || !window.myriadDesktop.selectBrowserExport) {
    setStatus('Desktop picker unavailable. Run with Electron to use browser buttons.');
    return;
  }

  setStatus(`Select your ${browser} export file...`);

  const result = await window.myriadDesktop.selectBrowserExport(browser);
  if (!result || !result.content) {
    setStatus('Import cancelled.');
    return;
  }

  const device = document.getElementById('deviceLabel').value;

  const response = await call('/api/import/browser-history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: result.content, device }),
  });

  const data = await response.json();
  setStatus(`Imported ${data.imported} entries from ${browser} (${device}). Opening statistics...`);
  window.location.href = '/stats';
}

for (const btn of document.querySelectorAll('.browser-btn')) {
  btn.addEventListener('click', async () => {
    try {
      await importBrowser(btn.dataset.browser);
    } catch (err) {
      setStatus(err.message);
    }
  });
}

document.getElementById('seedBtn').addEventListener('click', async () => {
  const response = await call('/api/events/sample-seed', { method: 'POST' });
  const data = await response.json();
  setStatus(`Loaded ${data.seeded} demo events. Opening statistics...`);
  window.location.href = '/stats';
});
