const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('myriadDesktop', {
  async selectBrowserExport(browser) {
    return ipcRenderer.invoke('select-browser-export', browser);
  },
});
