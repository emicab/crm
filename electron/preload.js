// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

console.log("Preload script cargado.");

// Exponemos funciones seguras al proceso de renderizado (tu app Next.js)
// bajo el objeto global 'electronAPI'.
contextBridge.exposeInMainWorld('electronAPI', {
  // Función que la app web llamará para generar un PDF
  saveSaleAsPDF: () => ipcRenderer.invoke('save-sale-as-pdf'),
  backupDatabase: () => ipcRenderer.invoke('db:backup'),
  restoreDatabase: () => ipcRenderer.invoke('db:restore'),
});

contextBridge.exposeInMainWorld('licenseAPI', {
  activate: (licenseKey) => ipcRenderer.invoke('license:activate', licenseKey),
  check: () => ipcRenderer.invoke('license:check'),
});

// API de actualizaciones
contextBridge.exposeInMainWorld('updateAPI', {
  check: () => ipcRenderer.invoke('update:check'),
  onStatus: (callback) => {
    const handler = (_event, status) => callback(status);
    ipcRenderer.on('update:status', handler);
    return () => ipcRenderer.removeListener('update:status', handler);
  },
});