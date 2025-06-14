// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

console.log("Preload script cargado.");

// Exponemos funciones seguras al proceso de renderizado (tu app Next.js)
// bajo el objeto global 'electronAPI'.
contextBridge.exposeInMainWorld('electronAPI', {
  // Función que la app web llamará para generar un PDF
  saveSaleAsPDF: () => ipcRenderer.invoke('save-sale-as-pdf'),

  activate: (licenseKey) => ipcRenderer.invoke('license:activate', licenseKey),
  check: () => ipcRenderer.invoke('license:check'),
});