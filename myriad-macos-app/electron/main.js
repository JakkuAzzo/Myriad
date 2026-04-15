const { app, BrowserWindow, dialog, ipcMain, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const { createApp } = require('../src/server');

let serverHandle;
let mainWindow;
const PORT = Number(process.env.PORT || 3000);

function waitForServer(url, timeoutMs = 15000) {
  const started = Date.now();

  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          resolve();
          return;
        }
      } catch (_) {
        // Retry until timeout.
      }

      if (Date.now() - started > timeoutMs) {
        reject(new Error('Server startup timeout.'));
        return;
      }

      setTimeout(tick, 300);
    };

    tick();
  });
}

function startServerInProcess() {
  return new Promise((resolve, reject) => {
    const webApp = createApp();
    serverHandle = webApp.listen(PORT, () => {
      resolve();
    });

    serverHandle.on('error', (err) => {
      // If another server is already running, reuse it.
      if (err && err.code === 'EADDRINUSE') {
        resolve();
        return;
      }
      reject(err);
    });
  });
}

async function createWindow() {
  await startServerInProcess();
  await waitForServer(`http://localhost:${PORT}/api/health`);

  mainWindow = new BrowserWindow({
    width: 1180,
    height: 840,
    backgroundColor: '#f4efe6',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  await mainWindow.loadURL(`http://localhost:${PORT}`);
}

ipcMain.handle('select-browser-export', async (_event, browser) => {
  const filters = [
    { name: `${browser} export`, extensions: ['json', 'csv', 'txt'] },
    { name: 'All files', extensions: ['*'] },
  ];

  const result = await dialog.showOpenDialog({
    title: `Select ${browser} history export`,
    properties: ['openFile'],
    filters,
  });

  if (result.canceled || !result.filePaths.length) {
    return { cancelled: true };
  }

  const filePath = result.filePaths[0];
  const content = fs.readFileSync(filePath, 'utf8');
  return {
    cancelled: false,
    filePath,
    content,
  };
});

ipcMain.handle('show-nudge-notification', (_event, { title, body, riskLevel }) => {
  if (!Notification.isSupported()) {
    return false;
  }

  const urgency = riskLevel === 'critical' ? 'critical' : riskLevel === 'high' ? 'normal' : 'low';
  const notification = new Notification({
    title: title || '⏱️ Behavior Nudge',
    body: body || 'Check your usage patterns in the dashboard.',
    urgency,
    timeoutType: 'default',
  });

  notification.on('click', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('nudge-notification-clicked', {
        title,
        riskLevel,
      });
      mainWindow.focus();
    }
  });

  notification.show();
  return true;
});

ipcMain.handle('schedule-nudge-check', (_event, intervalMs = 300000) => {
  const timer = setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('nudge-check-interval-tick', {});
    }
  }, intervalMs);

  return {
    timerId: timer,
    intervalMs,
  };
});


app.whenReady()
  .then(createWindow)
  .catch((err) => {
    dialog.showErrorBox('Myriad Startup Error', String(err && err.message ? err.message : err));
    app.quit();
  });

app.on('window-all-closed', () => {
  if (serverHandle && typeof serverHandle.close === 'function') {
    serverHandle.close();
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});
