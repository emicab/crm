// electron/main.js
const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow;
let nextServerProcess;

// --- Configuración de la Base de Datos ---
const dbName = 'crm_prod.db'; // Nombre para tu base de datos de producción
const userDataPath = app.getPath('userData'); // Carpeta estándar para datos de aplicación por usuario
const dbPathInUserData = path.join(userDataPath, dbName);
const prodDatabaseUrl = `file:${dbPathInUserData.replace(/\\/g, '/')}`; // URL para Prisma en producción

// Función para asegurar que la base de datos y las migraciones estén aplicadas
function ensureDatabaseIsReady() {
  const isDevMode = !app.isPackaged;
  console.log(`[DB Setup] Iniciando configuración de BD. Modo Desarrollo: ${isDevMode}`);

  if (isDevMode) {
    // En desarrollo, Prisma usa DATABASE_URL del .env (o la que definas aquí)
    // Asegúrate que tu .env apunte a prisma/dev.db o similar
    const devDbPath = process.env.DATABASE_URL || `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`;
    process.env.DATABASE_URL = devDbPath; // Asegurar que esté seteada para el proceso
    console.log(`[DB Setup] Desarrollo: Usando DB desde ${devDbPath}`);
    // En desarrollo, las migraciones se manejan manualmente con `npx prisma migrate dev`
    return true;
  }

  // --- Lógica para Producción ---
  process.env.DATABASE_URL = prodDatabaseUrl;
  console.log(`[DB Setup] Producción: DATABASE_URL establecida a: ${process.env.DATABASE_URL}`);
  console.log(`[DB Setup] Carpeta de datos de usuario (userDataPath): ${userDataPath}`);
  console.log(`[DB Setup] Ruta completa de BD de producción (dbPathInUserData): ${dbPathInUserData}`);

  if (!fs.existsSync(userDataPath)) {
    console.log(`[DB Setup] Creando userDataPath: ${userDataPath}`);
    try {
      fs.mkdirSync(userDataPath, { recursive: true });
      console.log(`[DB Setup] userDataPath creado exitosamente.`);
    } catch (error) {
      console.error("[DB Setup] Error crítico al crear userDataPath:", error);
      dialog.showErrorBox("Error Crítico de Directorio", `No se pudo crear la carpeta de datos de usuario (${userDataPath}): ${error.message}`);
      app.quit();
      return false;
    }
  }

  if (!fs.existsSync(dbPathInUserData)) {
    console.log("[DB Setup] Base de datos de producción no encontrada en userData. Intentando copiar plantilla...");
    // La plantilla 'crm_template.db' debería estar en la raíz de la carpeta 'resources' de la app empaquetada
    // gracias a la configuración de 'extraResources' en package.json: { "from": "prisma/crm_template.db", "to": "crm_template.db" }
    const templateDbSrcPath = path.join(process.resourcesPath, 'crm_template.db');
    console.log(`[DB Setup] Buscando plantilla de BD en (process.resourcesPath + crm_template.db): ${templateDbSrcPath}`);

    if (!fs.existsSync(templateDbSrcPath)) {
      const errMsg = `Plantilla de base de datos 'crm_template.db' NO ENCONTRADA en los recursos de la aplicación (${templateDbSrcPath}).\n\nAsegúrate de que esté listada en 'extraResources' en tu package.json con "to": "crm_template.db" y que el archivo exista en 'prisma/crm_template.db' en tu proyecto antes de empaquetar.`;
      console.error(errMsg);
      dialog.showErrorBox("Error Crítico de Base de Datos", errMsg);
      app.quit();
      return false;
    }
    
    try {
      fs.copyFileSync(templateDbSrcPath, dbPathInUserData);
      console.log(`[DB Setup] Plantilla de BD copiada exitosamente de ${templateDbSrcPath} a ${dbPathInUserData}`);
    } catch (error) {
      console.error("[DB Setup] Error al copiar la plantilla de base de datos:", error);
      dialog.showErrorBox("Error Crítico de Base de Datos", `No se pudo copiar la plantilla de BD de ${templateDbSrcPath} a ${dbPathInUserData}: ${error.message}`);
      app.quit();
      return false;
    }
  } else {
    console.log(`[DB Setup] Base de datos de producción encontrada en: ${dbPathInUserData}`);
  }
  return true;
}

function createWindow() {
  const isDevMode = !app.isPackaged;
  console.log(`[createWindow] Iniciando. Modo Desarrollo: ${isDevMode}`);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      nodeIntegration: false, // Recomendado por seguridad
      contextIsolation: true, // Recomendado
      // preload: path.join(__dirname, 'preload.js'), // Comentado, ya que no lo hemos configurado
    },
    // icon: path.join(__dirname, '../assets/icon.png') // Ajusta si tienes un icono en /assets
                                                    // Para producción: path.join(process.resourcesPath, 'assets', 'icon.png')
                                                    // y configura 'extraResources' para la carpeta 'assets'
  });

  if (isDevMode) {
    console.log("[createWindow] Desarrollo: Cargando http://localhost:3000");
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // --- Lógica para Producción ---
    const appPath = app.getAppPath(); // En producción, app.asar o la carpeta si está desempaquetado
    const baseAppPath = appPath.endsWith('.asar') 
        ? path.dirname(appPath) // Si es asar, .next/standalone estará al mismo nivel que app.asar dentro de resources/app.asar.unpacked
        : appPath; // Si no es asar (desarrollo desempaquetado o asar:false)

    // La carpeta standalone se desempaqueta por electron-builder si está en asarUnpack
    const standaloneDir = path.join(baseAppPath, ".next/standalone"); 
    // Si 'asarUnpack' incluye ".next/standalone/**", entonces la ruta sería algo como:
    // path.join(path.dirname(app.getAppPath()), 'app.asar.unpacked', '.next', 'standalone')
    // Es importante verificar esta ruta en la app empaquetada.
    // Para mayor simplicidad si 'asarUnpack' es ".next/standalone/**":
    // const standaloneDir = path.join(path.dirname(app.getAppPath()), 'app.asar.unpacked', '.next', 'standalone');
    // Vamos a probar con una ruta más directa asumiendo que .next/standalone está empaquetado y es accesible.
    // Si `files` en electron-builder incluye ".next/standalone/**/*" y `asar: true`
    // Y `asarUnpack` NO incluye ".next/standalone/**", entonces estaría dentro de app.asar.
    // PERO, para `spawn`, necesitamos archivos reales. Así que `asarUnpack: [".next/standalone/**"]` es necesario.
    // Si está desempaquetado, `app.getAppPath()` podría apuntar a `resources/app.asar`
    // y los archivos desempaquetados estarían en `resources/app.asar.unpacked/`.

    const serverPath = path.join(standaloneDir, "server.js");
    const port = process.env.PORT || '3001'; // Puerto para el servidor Next.js de producción

    console.log(`[createWindow] Producción: Intentando leer appPath: ${app.getAppPath()}`);
    console.log(`[createWindow] Producción: standaloneDir calculado: ${standaloneDir}`);
    console.log(`[createWindow] Producción: serverPath calculado: ${serverPath}`);
    console.log(`[createWindow] Producción: DATABASE_URL para Next.js: ${process.env.DATABASE_URL}`);

    if (!fs.existsSync(serverPath)) {
      const errMsg = `Error Crítico: El archivo server.js NO SE ENCUENTRA en la ruta esperada: ${serverPath}. 
      Verifica tu configuración de 'files' y 'asarUnpack' en electron-builder. 
      'output: "standalone"' en next.config.js debe estar activo.
      La carpeta '.next/standalone' debe ser empaquetada y accesible.`;
      console.error(errMsg);
      dialog.showErrorBox("Error de Configuración de la Aplicación", errMsg);
      app.quit();
      return;
    }

    nextServerProcess = spawn(
      process.execPath, // Ruta al ejecutable de Node.js que viene con Electron
      [serverPath],
      {
        cwd: standaloneDir,
        env: {
          ...process.env, // Hereda (incluyendo DATABASE_URL seteado por ensureDatabaseIsReady)
          PORT: port.toString(),
          NODE_ENV: 'production',
        },
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );

    let serverReady = false;
    const serverReadyTimeout = setTimeout(() => {
        if (!serverReady && mainWindow && !mainWindow.isDestroyed()) {
            console.error("[createWindow] Timeout: Servidor Next.js no respondió 'ready' en 20 segundos.");
            // dialog.showErrorBox("Error de Servidor", "El servidor interno tardó demasiado en iniciar.");
            // Podrías intentar cargar la URL de todas formas o cerrar.
            // Por ahora, intentamos cargarla por si el mensaje de 'ready' no es detectado.
            if (mainWindow && !mainWindow.isDestroyed()) mainWindow.loadURL(`http://localhost:${port}`);
        }
    }, 20000); // Timeout de 20 segundos

    nextServerProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`Next.js Server (stdout): ${output}`);
      if (!serverReady && (output.includes('ready - started server on') || output.includes(`listening on port ${port}`) || output.includes(`started server on 0.0.0.0:${port}`))) {
        clearTimeout(serverReadyTimeout);
        serverReady = true;
        console.log('[createWindow] Servidor Next.js de producción listo. Cargando URL en Electron...');
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadURL(`http://localhost:${port}`);
        }
      }
    });

    nextServerProcess.stderr.on('data', (data) => {
      const output = data.toString();
      console.error(`Next.js Server (stderr): ${output}`);
      if (mainWindow && !mainWindow.isDestroyed() && !serverReady) {
        clearTimeout(serverReadyTimeout);
        dialog.showErrorBox("Error del Servidor Interno", `El servidor interno de la aplicación falló al iniciar: ${output.substring(0, 500)}... Revisa los logs.`);
        // Considera cerrar la app si el servidor no puede iniciar.
        // app.quit();
      }
    });

    nextServerProcess.on('error', (err) => {
      clearTimeout(serverReadyTimeout);
      console.error('[createWindow] Fallo al iniciar el proceso del servidor Next.js:', err);
      dialog.showErrorBox("Error Crítico de Servidor", `No se pudo iniciar el servidor interno de la aplicación: ${err.message}`);
      app.quit();
    });

    nextServerProcess.on('close', (code) => {
      clearTimeout(serverReadyTimeout);
      console.log(`[createWindow] Proceso del servidor Next.js cerrado con código ${code}`);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Eventos del ciclo de vida de la aplicación Electron
app.on('ready', () => {
  console.log("Evento 'ready' de Electron. Configurando base de datos...");
  if (!ensureDatabaseIsReady()) {
    console.error("Configuración de base de datos falló críticamente. La aplicación no iniciará correctamente.");
    // app.quit() ya se llama dentro de ensureDatabaseIsReady en caso de error fatal de BD
    return; 
  }
  console.log("Configuración de base de datos parece OK. Creando ventana principal...");
  createWindow();
});

app.on('window-all-closed', () => {
  console.log("Todas las ventanas cerradas.");
  if (nextServerProcess) {
    console.log("Terminando proceso del servidor Next.js...");
    nextServerProcess.kill();
  }
  if (process.platform !== 'darwin') { // 'darwin' es macOS
    app.quit();
  }
});

app.on('activate', () => {
  // En macOS es común recrear una ventana en la app cuando el
  // icono del dock es presionado y no hay otras ventanas abiertas.
  if (mainWindow === null && app.isReady()) {
    console.log("Evento 'activate' de Electron. Recreando ventana...");
    if (!ensureDatabaseIsReady()) return;
    createWindow();
  }
});

console.log("main.js completamente evaluado por Electron.");