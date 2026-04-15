const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('myriadDesktop', {
  async selectBrowserExport(browser) {
    return ipcRenderer.invoke('select-browser-export', browser);
  },
  async showNudgeNotification(title, body, riskLevel) {
    return ipcRenderer.invoke('show-nudge-notification', { title, body, riskLevel });
  },
  async scheduleNudgeCheck(intervalMs) {
    return ipcRenderer.invoke('schedule-nudge-check', intervalMs);
  },
  onNudgeNotificationClicked(callback) {
    ipcRenderer.on('nudge-notification-clicked', (_event, data) => callback(data));
  },
  onNudgeCheckInterval(callback) {
    ipcRenderer.on('nudge-check-interval-tick', () => callback());
  },
});
