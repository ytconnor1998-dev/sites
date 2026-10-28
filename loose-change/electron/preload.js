// Gives the game a small `steam` object. Every call is safe when Steam isn't running.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('steam', {
  available: () => ipcRenderer.sendSync('steam:available'),
  unlock: (id) => ipcRenderer.send('steam:unlock', String(id)),
  cloudSave: (json) => ipcRenderer.send('steam:cloudSave', json),
  cloudLoad: () => ipcRenderer.sendSync('steam:cloudLoad'),
  screenshot: () => ipcRenderer.send('steam:screenshot'),
});
