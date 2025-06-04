// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

console.log('Script de Preload cargado exitosamente!');

// Ejemplo de cómo exponer una API simple al proceso de renderizado (tu app Next.js)
// contextBridge.exposeInMainWorld('electronAPI', {
//   saludar: (nombre) => ipcRenderer.invoke('saludar', nombre),
//   // Puedes añadir más funciones aquí
// });