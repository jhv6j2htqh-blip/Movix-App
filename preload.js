const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  appVersion: '1.0.0',
  appName: 'Movix'
});
