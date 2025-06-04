// electron/main.js
const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = require('electron-is-dev');
const { spawn } = require('child_process'); // Usaremos spawn

let mainWindow;
let nextServerProcess;

// --- Configuración de la Base de Datos para Producción ---
const dbName = 'crm_prod.db'; // Nombre de la BD en la carpeta del usuario
const userDataPath = app.getPath('userData'); // Ej: C:\Users\TuUsuario\AppData\Roaming\TuAppName
const dbPathInUserData = path.join(userDataPath, dbName);

// Esta es la URL que usará Prisma en la app empaquetada
const prodDatabaseUrl = `file:${dbPathInUserData}`;

// Función para asegurar la base de datos en producción
function ensureDatabaseIsReady() {
  if (isDev) {
    // En desarrollo, Prisma usa DATABASE_URL del .env (file:./dev.db)
    console.log(`Desarrollo: Usando DB definida en .env (${process.env.DATABASE_URL || 'file:./dev.db'})`);
    // Podrías ejecutar migraciones aquí también si es necesario para dev, pero usualmente se hace manual.
    // execSync(`npx prisma migrate dev`, { stdio: 'inherit', env: process.env });
    return true;
  }

  // En Producción:
  console.log(`Producción: Ruta de base de datos esperada: ${dbPathInUserData}`);
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  if (!fs.existsSync(dbPathInUserData)) {
    console.log("Base de datos de producción no encontrada. Copiando plantilla...");
    try {
      // La plantilla se empaqueta con la app (ver config de electron-builder)
      // process.resourcesPath apunta a la carpeta 'resources' dentro de la app instalada (macOS)
      // o a la raíz de la app (Windows/Linux) donde electron-builder puede poner extraResources.
      // El nombre 'crm_template.db' debe coincidir con el que empaquetas.
      const templateDbSrcPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'prisma', 'crm_template.db'); 
      // Ajusta 'app.asar.unpacked/prisma/crm_template.db' si lo pones en otra subcarpeta de resources o si no usas asarUnpack para él.
      // Una forma más simple si lo pones en la raíz de 'extraResources' podría ser:
      // const templateDbSrcPath = path.join(process.resourcesPath, 'crm_template.db');

      if (!fs.existsSync(templateDbSrcPath)) {
          // Si la plantilla no se encuentra donde se espera, intenta una ruta alternativa
          // Esto es muy dependiente de la estructura final del empaquetado.
          // Una alternativa es que el build de Electron copie crm_template.db a la raíz de app.asar.unpacked
          const fallbackTemplatePath = path.join(app.getAppPath(), '..', 'app.asar.unpacked', 'prisma', 'crm_template.db');
          if (fs.existsSync(fallbackTemplatePath)) {
            console.log(`Plantilla encontrada en: ${fallbackTemplatePath}`);
            fs.copyFileSync(fallbackTemplatePath, dbPathInUserData);
            console.log("Plantilla de base de datos copiada exitosamente a la carpeta de usuario.");
          } else {
             throw new Error(`Plantilla de base de datos no encontrada en ${templateDbSrcPath} ni en ${fallbackTemplatePath}`);
          }
      } else {
          fs.copyFileSync(templateDbSrcPath, dbPathInUserData);
          console.log("Plantilla de base de datos copiada exitosamente a la carpeta de usuario.");
      }
    } catch (error) {
      console.error("Error al copiar la plantilla de base de datos:", error);
      dialog.showErrorBox("Error Crítico de Base de Datos", `No se pudo configurar la base de datos: ${error.message}`);
      app.quit();
      return false;
    }
  } else {
    console.log("Base de datos de producción encontrada.");
    // Aquí podrías añadir lógica para aplicar nuevas migraciones si actualizas la app,
    // pero eso es más avanzado (requiere empaquetar Prisma CLI y migraciones).
  }
  return true;
}


function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    // icon: path.join(isDev ? process.cwd() : process.resourcesPath, 'assets', 'icon.png') // Ajusta la ruta al ícono
  });

  if (isDev) {
    process.env.DATABASE_URL = process.env.DATABASE_URL || "file:./dev.db"; // Usar .env o dev.db por defecto
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // En Producción
    process.env.DATABASE_URL = prodDatabaseUrl; // Establecer DATABASE_URL para el proceso de Next.js

    const standaloneDir = path.join(app.getAppPath(), ".next/standalone");
    const serverPath = path.join(standaloneDir, "server.js");
    const port = process.env.PORT || 3001; // Elige un puerto para el servidor de producción interno

    console.log(`Producción: Iniciando servidor Next.js desde: ${serverPath} en puerto ${port}`);
    
    nextServerProcess = spawn(
      process.execPath, // Node.js ejecutable que viene con Electron
      [serverPath],
      {
        cwd: standaloneDir,
        env: {
          ...process.env, // Hereda variables de entorno (incluyendo DATABASE_URL ya seteado)
          PORT: port.toString(),
          NODE_ENV: 'production',
        },
        stdio: ['ignore', 'pipe', 'pipe'] // Ignorar stdin, capturar stdout/stderr
      }
    );

    let serverReady = false;
    nextServerProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`Next.js Server: ${output}`);
      if (!serverReady && (output.includes('ready - started server on') || output.includes(`listening on port ${port}`))) {
        serverReady = true;
        console.log('Servidor Next.js de producción listo. Cargando URL en Electron...');
        mainWindow.loadURL(`http://localhost:${port}`);
      }
    });
    nextServerProcess.stderr.on('data', (data) => {
      console.error(`Next.js Server Error: ${data}`);
      if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && !serverReady) {
         // Si el servidor falla antes de estar listo, muestra un error
         dialog.showErrorBox("Error del Servidor", `El servidor interno falló al iniciar: ${data.toString().substring(0, 500)}... Revisa los logs.`);
      }
    });
    nextServerProcess.on('error', (err) => {
      console.error('Fallo al iniciar el proceso del servidor Next.js:', err);
      dialog.showErrorBox("Error Crítico", `No se pudo iniciar el servidor interno: ${err.message}`);
      app.quit();
    });
  }

  mainWindow.on('closed', () => mainWindow = null);
}

app.on('ready', () => {
  if (!ensureDatabaseIsReady()) { // Llama a la función que prepara la BD
    // Si ensureDatabaseIsReady devuelve false (fallo crítico), la app ya debería haber salido.
    return; 
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (nextServerProcess) {
    console.log("Cerrando proceso del servidor Next.js...");
    nextServerProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null && app.isReady()) { // Asegura que la app esté lista
    if (!ensureDatabaseIsReady()) return;
    createWindow();
  }
});