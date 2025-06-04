// electron/main.js (o el nombre que elijas)
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev'); // Necesitarás instalarlo: npm install electron-is-dev
const { fork } = require('child_process'); // Para ejecutar el servidor Next.js en producción

let mainWindow;
let nextJsServerProcess;

// Función para ejecutar 'npx prisma migrate deploy'
function runMigrations() {
  return new Promise((resolve, reject) => {
    console.log('Aplicando migraciones de Prisma...');
    // Ajusta la ruta a npx y al proyecto si es necesario cuando esté empaquetado
    const prismaPath = isDev ? 'npx' : path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', '.bin', 'prisma'); // Esto es complejo y depende del empaquetado
    const projectPath = isDev ? process.cwd() : path.join(process.resourcesPath, 'app.asar.unpacked'); // También complejo

    // NOTA: Ejecutar migraciones desde una app empaquetada es complejo por las rutas.
    // Una estrategia más simple para la primera vez podría ser incluir la DB ya migrada
    // o tener un script separado. Para desarrollo:
    const migrateProcess = fork(
        isDev ? path.join(process.cwd(), 'node_modules', '.bin', 'prisma') : prismaPath, // Intenta encontrar Prisma CLI
        ['migrate', 'deploy'],
        { cwd: isDev ? process.cwd() : projectPath, stdio: 'pipe' }
    );

    migrateProcess.stdout.on('data', (data) => console.log(`Prisma Migrate: ${data}`));
    migrateProcess.stderr.on('data', (data) => console.error(`Prisma Migrate Error: ${data}`));
    migrateProcess.on('close', (code) => {
      if (code === 0) {
        console.log('Migraciones de Prisma aplicadas exitosamente.');
        resolve();
      } else {
        console.error(`Proceso de migración de Prisma finalizó con código ${code}`);
        reject(new Error('Fallo al aplicar migraciones de Prisma.'));
      }
    });
    migrateProcess.on('error', (err) => {
         console.error('Error al iniciar el proceso de migración de Prisma:', err);
         reject(err);
    });
  });
}


function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false, // Recomendado por seguridad
      contextIsolation: true, // Recomendado
      preload: path.join(__dirname, 'preload.js'), // Opcional, para comunicación segura renderer <-> main
    },
    icon: path.join(__dirname, 'assets', 'icon.png') // Ruta a tu ícono
  });

  if (isDev) {
    // En desarrollo, Next.js corre en localhost:3000 (o tu puerto configurado)
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools(); // Abrir herramientas de desarrollo
  } else {
    // En producción, necesitamos iniciar el servidor Next.js empaquetado
    // y luego cargar la URL. El puerto debe ser uno que no esté en uso.
    const nextAppPath = path.join(process.resourcesPath, 'app.asar', '.next', 'standalone'); // Esto es un ejemplo, la estructura puede variar
    const serverPath = path.join(nextAppPath, 'server.js');

    console.log(`Iniciando servidor Next.js desde: ${serverPath}`);
    nextJsServerProcess = fork(serverPath, [], { cwd: nextAppPath }); // Ejecuta el servidor Next.js

    nextJsServerProcess.on('message', (message) => { // Esperar un mensaje del servidor Next.js indicando que está listo
        if (message === 'ready') { // Necesitarías modificar tu server.js para enviar este mensaje
             console.log('Servidor Next.js listo. Cargando URL en Electron.');
             mainWindow.loadURL(`http://localhost:${process.env.PORT || 3000}`); // Asume que el servidor Next.js usa el puerto 3000 o uno definido
        }
    });
    nextJsServerProcess.on('error', (err) => {
        console.error('Error en el servidor Next.js:', err);
    });
    // Alternativamente, si tu 'npm run start' funciona con los archivos de build:
    // mainWindow.loadFile(path.join(__dirname, '../out/index.html')); // Si fuera una app Next.js estática (no nuestro caso)
    // O podrías tener un pequeño servidor Express dentro de Electron que sirva los archivos de `next build`
    // La forma más robusta es correr el servidor Next.js (`npm run start`)
    // Esto es lo más complejo: cómo Electron sirve o inicia tu app Next.js en producción.
    // Una solución común es que Electron inicie el comando `npm run start` de tu app Next.js
    // y luego cargue `http://localhost:3000` (o el puerto que sea).
    // Esto requiere que Node.js y tus node_modules estén empaquetados o accesibles.
    const PORT = process.env.PORT || 3000; // Asegúrate que coincida con tu `npm run start`
    mainWindow.loadURL(`http://localhost:${PORT}`);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', async () => {
  // En un entorno real, querrías ejecutar esto solo en la primera ejecución
  // o tener una forma de verificar si la base de datos ya está configurada.
  // La ejecución de migraciones en una app empaquetada requiere que Prisma CLI y
  // tus archivos de migración estén accesibles. Esto puede ser desafiante.
  // Una estrategia es incluir un archivo de base de datos SQLite ya migrado en el instalador
  // y copiarlo a la carpeta de datos del usuario en la primera ejecución.
  // O ejecutar las migraciones como parte del proceso de build de Electron.
  try {
    if (isDev) { // En desarrollo, es más fácil ejecutar migraciones
        // await runMigrations(); // Podrías llamar a esto, pero asegúrate que no bloquee el inicio si falla
    }
    // Para producción, a menudo se pre-migra la BD o se incluye en el instalador.
    // O se ejecuta 'prisma db push --skip-generate' que es más simple si no usas migraciones complejas en prod.
    // Por ahora, asumiremos que la BD se crea/migra al iniciar el servidor Next.js
    // si `prisma migrate deploy` se ejecutó al construir el paquete Electron.
  } catch (err) {
    console.error("Fallo al ejecutar migraciones en el inicio:", err);
    // Decide cómo manejar esto: ¿cerrar la app, mostrar un error?
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
  if (nextJsServerProcess) {
    nextJsServerProcess.kill(); // Asegúrate de detener el servidor Next.js al cerrar
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Aquí podrías añadir IPC para comunicación entre main y renderer si es necesario
// ipcMain.on('some-action', (event, arg) => { ... });