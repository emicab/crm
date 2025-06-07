// electron/main.js
const { app, BrowserWindow, dialog, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// =======================================================
// --- ARRANQUE DE DOBLE ROL (LA SOLUCIÓN AL BUCLE) ---
// =======================================================
// Si este script es ejecutado con la bandera 'RUNNING_AS_SERVER',
// su única misión es cargar y ejecutar el servidor de Next.js.
if (process.env.RUNNING_AS_SERVER === 'true') {
  const serverPath = process.argv[2]; // La ruta al server.js se pasa como argumento
  console.log(`[Server Runner] Iniciando servidor Next.js desde: ${serverPath}`);
  require(serverPath);
} else {
  // Si no, este es el proceso principal de Electron. Ejecuta la aplicación completa.
  mainApp();
}

// Envolvemos toda la lógica de la aplicación en una función para mantenerla separada.
function mainApp() {
  // --- ESTADO GLOBAL Y CERROJOS DE SEGURIDAD ---
  let mainWindow = null;
  let serverProcess = null;
  let isServerReady = false;
  let isStartingUp = false;
  const PORT = 3001;

  // --- CONFIGURACIÓN DE LA BASE DE DATOS ---
  function ensureDatabaseIsReady() {
    const isDevMode = !app.isPackaged;
    console.log(`[DB Setup] Iniciando. Modo Desarrollo: ${isDevMode}`);

    if (isDevMode) {
      const devDbPath = process.env.DATABASE_URL || `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`;
      process.env.DATABASE_URL = devDbPath;
      console.log(`[DB Setup] Desarrollo: Usando DB desde ${devDbPath}`);
      return true;
    }

    // --- Lógica de Producción ---
    const userDataPath = app.getPath('userData');
    const dbPathInUserData = path.join(userDataPath, 'crm_prod.db');
    process.env.DATABASE_URL = `file:${dbPathInUserData.replace(/\\/g, '/')}`;
    console.log(`[DB Setup] Producción: DATABASE_URL establecida a: ${process.env.DATABASE_URL}`);

    try {
      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
      }
      if (!fs.existsSync(dbPathInUserData)) {
        console.log("[DB Setup] Copiando plantilla de base de datos...");
        const templateDbSrcPath = path.join(process.resourcesPath, 'crm_template.db');
        if (!fs.existsSync(templateDbSrcPath)) {
          throw new Error(`Plantilla de BD 'crm_template.db' NO ENCONTRADA en ${templateDbSrcPath}`);
        }
        fs.copyFileSync(templateDbSrcPath, dbPathInUserData);
        console.log("[DB Setup] Plantilla copiada exitosamente.");
      } else {
        console.log(`[DB Setup] Base de datos de producción encontrada.`);
      }
      return true;
    } catch (error) {
      console.error("[DB Setup] Error crítico de base de datos:", error);
      dialog.showErrorBox("Error Crítico de Base de Datos", error.message);
      app.quit();
      return false;
    }
  }

  // --- LÓGICA DE LA APLICACIÓN (FUNCIONES AUXILIARES) ---
  function createWindow() {
    console.log('[Electron] Creando la ventana principal...');
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 720,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    const url = `http://localhost:${PORT}`;
    mainWindow.loadURL(url).catch(err => {
      console.error(`[Electron] Error al cargar la URL: ${url}.`, err);
      dialog.showErrorBox("Error de Conexión", `No se pudo conectar a ${url}.`);
    });

    if (!app.isPackaged) {
      mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }

  /**
   * Inicia el proceso del servidor Next.js standalone.
   * Ahora, invoca a este mismo script con una bandera especial.
   */
  function startNextServer() {
    return new Promise((resolve, reject) => {
      if (!app.isPackaged) {
        console.log('[Server] Modo desarrollo, no se inicia servidor interno.');
        return resolve();
      }

      const serverPath = path.join(app.getAppPath(), '.next/standalone/server.js');
      if (!fs.existsSync(serverPath)) {
        return reject(new Error(`El servidor no se encuentra en ${serverPath}`));
      }

      console.log('[Server] Creando subproceso para el servidor Next.js...');
      serverProcess = spawn(
        process.execPath, // Sigue siendo el ejecutable de la app
        [
          __filename,   // El primer argumento es este mismo script
          serverPath    // El segundo argumento es la ruta al servidor real de Next.js
        ],
        {
          cwd: app.getAppPath(),
          env: {
            ...process.env,
            RUNNING_AS_SERVER: 'true', // La bandera mágica
            PORT: PORT.toString(),
          },
        }
      );

      serverProcess.stdout.on('data', (data) => console.log(`[Next.js]: ${data.toString().trim()}`));
      serverProcess.stderr.on('data', (data) => console.error(`[Next.js ERR]: ${data.toString().trim()}`));
      serverProcess.on('error', (err) => reject(err));
      serverProcess.on('close', (code) => {
        if (code !== 0 && !isServerReady) {
          reject(new Error(`El servidor se cerró inesperadamente con código ${code}`));
        }
      });
      resolve();
    });
  }

  /**
   * Verifica repetidamente si el servidor está aceptando conexiones.
   */
 function checkServerReady(timeout = 20000) {
        return new Promise((resolve, reject) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
                reject(new Error(`El servidor no respondió en ${timeout / 1000} segundos (usando fetch).`));
            }, timeout);

            const tryConnect = async () => {
                try {
                    console.log(`[Server Check con Fetch] Ping a http://127.0.0.1:${PORT}...`);
                    await fetch(`http://127.0.0.1:${PORT}`, { signal: controller.signal });
                    
                    clearTimeout(timeoutId); // Cancelar el timeout de error
                    console.log('[Server Check con Fetch] ¡Éxito! El servidor está listo.');
                    resolve();

                } catch (error) {
                    // Si el error no es por abortar el timeout, reintentamos
                    if (error.name !== 'AbortError') {
                        setTimeout(tryConnect, 1000);
                    }
                }
            };

            tryConnect();
        });
    }

  // --- FUNCIÓN DE ARRANQUE CENTRAL Y SEGURA ---
  async function startApp() {
    if (isStartingUp || isServerReady) return;
    isStartingUp = true;

    console.log('[Startup] Iniciando secuencia de arranque...');
    try {
      ensureDatabaseIsReady();
      await startNextServer();
      await checkServerReady();
      isServerReady = true;
      createWindow();
      console.log('[Startup] ¡Arranque completado exitosamente!');
    } catch (error) {
      console.error("[Startup] ERROR FATAL DURANTE EL ARRANQUE:", error);
      dialog.showErrorBox("Error Crítico de Arranque", error.message);
      app.quit();
    } finally {
      isStartingUp = false;
    }
  }

  // --- MANEJADORES DE EVENTOS DE ELECTRON ---
  app.on('ready', startApp);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('before-quit', () => {
    isServerReady = false;
    if (serverProcess) {
      console.log('[Electron] Terminando el proceso del servidor...');
      serverProcess.kill();
    }
  });

  app.on('activate', () => {
    if (mainWindow === null && isServerReady) {
      createWindow();
    }
  });
}