const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { autoUpdater } = require('electron-updater');
const { machineIdSync } = require('node-machine-id');
const Store = require('electron-store');


if (process.env.RUNNING_AS_SERVER === 'true') {
    const serverPath = process.argv[2];
    require(serverPath);
} else {
    mainApp();
}

function mainApp() {
    let mainWindow = null;
    let splashWindow = null;
    let isServerReady = false;
    let isStartingUp = false;
    const PORT = 3001;

    const store = new Store();

    function createSplashWindow() {
        splashWindow = new BrowserWindow({
            width: 600,
            height: 500,
            transparent: true,
            frame: false,
            alwaysOnTop: true,
            center: true
        });

        splashWindow.loadFile(path.join(__dirname, 'splash.html'));

        splashWindow.on('closed', () => {
            splashWindow = null;
        });
    }

    function createWindow() {
        mainWindow = new BrowserWindow({
            width: 1366,
            height: 768,
            show: false,
            autoHideMenuBar: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(app.getAppPath(), 'electron/preload.js')
            },
            icon: path.join(app.getAppPath(), '../assets/crm_icono.png'),
        });

        const url = `http://127.0.0.1:${PORT}`;
        mainWindow.loadURL(url).catch(err => {
            dialog.showErrorBox("Error de Conexión", `No se pudo conectar a ${url}.`);
        });

        mainWindow.on('closed', () => {
            mainWindow = null;
        });
    }

    function ensureDatabaseIsReady() {
        const isDevMode = !app.isPackaged;
        if (isDevMode) {
            const devDbPath = process.env.DATABASE_URL || `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`;
            process.env.DATABASE_URL = devDbPath;
            return true;
        }

        const userDataPath = app.getPath('userData');
        const dbName = 'crm_prod.db';
        const dbPathInUserData = path.join(userDataPath, dbName);
        process.env.DATABASE_URL = `file:${dbPathInUserData.replace(/\\/g, '/')}`;

        try {
            if (!fs.existsSync(userDataPath)) {
                fs.mkdirSync(userDataPath, { recursive: true });
            }
            if (!fs.existsSync(dbPathInUserData)) {
                const templateDbSrcPath = path.join(process.resourcesPath, 'crm_template.db');
                if (!fs.existsSync(templateDbSrcPath)) {
                    throw new Error(`Plantilla de BD 'crm_template.db' NO ENCONTRADA en ${templateDbSrcPath}`);
                }
                fs.copyFileSync(templateDbSrcPath, dbPathInUserData);
            }
            return true;
        } catch (error) {
            dialog.showErrorBox("Error Crítico de Base de Datos", error.message);
            app.quit();
            return false;
        }
    }

    function startNextServer() {
        return new Promise((resolve, reject) => {
            if (!app.isPackaged) {
                return resolve();
            }

            const serverPath = path.join(app.getAppPath(), '.next/standalone/server.js');
            if (!fs.existsSync(serverPath)) {
                return reject(new Error(`El servidor no se encuentra en ${serverPath}`));
            }

            serverProcess = spawn(
                process.execPath,
                [__filename, serverPath],
                {
                    cwd: app.getAppPath(),
                    env: {
                        ...process.env,
                        RUNNING_AS_SERVER: 'true',
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

    function checkServerReady(timeout = 20000) {
        return new Promise((resolve, reject) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
                reject(new Error(`El servidor no respondió en ${timeout / 1000} segundos (usando fetch).`));
            }, timeout);

            const tryConnect = async () => {
                try {
                    await fetch(`http://127.0.0.1:${PORT}`, { signal: controller.signal });
                    clearTimeout(timeoutId);
                    resolve();
                } catch (error) {
                    if (error.name !== 'AbortError') {
                        setTimeout(tryConnect, 1000);
                    }
                }
            };
            tryConnect();
        });
    }

    async function startApp() {
        if (isStartingUp || isServerReady) {
            return;
        }
        isStartingUp = true;

        try {
            ensureDatabaseIsReady();
            await startNextServer();
            await checkServerReady();
            isServerReady = true;
            createWindow();
        } catch (error) {
            console.error("[Startup] ERROR FATAL DURANTE EL ARRANQUE:", error);
            dialog.showErrorBox("Error Crítico de Arranque", error.message);
            app.quit();
            throw error;
        } finally {
            isStartingUp = false;
        }
    }

    // --- MANEJADOR DE IPC PARA GENERAR PDF ---
    ipcMain.handle('save-sale-as-pdf', async (event) => {
        // La ventana que envió el evento es la ventana principal
        const webContents = event.sender;
        const browserWindow = BrowserWindow.fromWebContents(webContents);

        if (browserWindow) {
            try {
                // Opciones de impresión para el PDF
                const pdfOptions = {
                    marginsType: 0, // Sin márgenes
                    pageSize: 'A4',
                    printBackground: true, // Incluir colores de fondo y CSS
                };

                const { canceled, filePath } = await dialog.showSaveDialog(browserWindow, {
                    title: 'Guardar Venta como PDF',
                    defaultPath: `venta-${Date.now()}.pdf`,
                    filters: [{ name: 'Documentos PDF', extensions: ['pdf'] }]
                });

                if (canceled || !filePath) {
                    console.log('Guardado de PDF cancelado por el usuario.');
                    return { success: false, path: null, error: 'Cancelled' };
                }

                // Genera el PDF a partir del contenido actual de la ventana
                const pdfData = await browserWindow.webContents.printToPDF(pdfOptions);

                // Guarda el PDF en la ruta elegida por el usuario
                fs.writeFileSync(filePath, pdfData);
                console.log(`PDF de la venta guardado en: ${filePath}`);

                return { success: true, path: filePath };

            } catch (error) {
                console.error('Error al generar o guardar el PDF:', error);
                return { success: false, path: null, error: error.message };
            }
        }
        return { success: false, path: null, error: 'No se encontró la ventana' };
    });

    ipcMain.handle('license:activate', async (event, licenseKey) => {
    try {
        const { machineIdSync } = require('node-machine-id');
        const hardwareId = machineIdSync(true); 
        console.log(`[License] Intentando activar clave: ${licenseKey} para Hardware ID: ${hardwareId}`);

        const response = await fetch('http://127.0.0.1:4000/api/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ licenseKey, hardwareId }),
        });

        const data = await response.json();

        if (response.ok) {
            store.set('licenseKey', licenseKey);
            store.set('isActivated', true);
            console.log('[License] Activación exitosa.');
            return { success: true, message: data.message };
        } else {
            console.error('[License] Falló la activación (respuesta del servidor):', data.message);
            return { success: false, message: data.message };
        }
    } catch (error) {
        // --- ¡BLOQUE CATCH MEJORADO! ---
        console.error('------------------------------------------------');
        console.error('[License] Error DETALLADO de red al activar:');
        console.error('Error Name:', error.name);
        console.error('Error Message:', error.message);
        // La "causa" del error suele tener la información más útil sobre problemas de red.
        console.error('Error Cause:', error.cause); 
        console.error('Full Error Object:', JSON.stringify(error, null, 2));
        console.error('------------------------------------------------');
        return { success: false, message: 'No se pudo conectar al servidor de licencias. Revisa los logs de la terminal.' };
    }
});

    // Este manejador revisa si la app ya está activada
    ipcMain.handle('license:check', async () => {
        const isActivated = store.get('isActivated', false);
        const licenseKey = store.get('licenseKey', '');
        console.log(`[License] Verificando estado: ${isActivated ? 'Activada' : 'No activada'}`);
        return { isActivated, licenseKey };
    });

    function setupAutoUpdates() {
        // Solo buscamos actualizaciones en producción
        if (!app.isPackaged) {
            return;
        }

        // Activamos la descarga automática una vez que se detecta una actualización
        autoUpdater.autoDownload = true;
        
        console.log('[Updater] Buscando actualizaciones...');
        autoUpdater.checkForUpdates();

        // --- MANEJO DE EVENTOS DEL ACTUALIZADOR ---

        autoUpdater.on('update-available', (info) => {
            console.log('[Updater] Actualización disponible.', info);
        });

        autoUpdater.on('update-not-available', (info) => {
            console.log('[Updater] No hay actualizaciones disponibles.', info);
        });

        autoUpdater.on('download-progress', (progressObj) => {
            let log_message = "Velocidad de descarga: " + progressObj.bytesPerSecond;
            log_message = log_message + ' - Descargado ' + progressObj.percent + '%';
            log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
            console.log(`[Updater] ${log_message}`);
        });

        autoUpdater.on('update-downloaded', (info) => {
            console.log('[Updater] Actualización descargada. Mostrando diálogo...');
            dialog.showMessageBox({
                type: 'info',
                title: 'Actualización Lista',
                message: 'Una nueva versión de CRMAPP ha sido descargada. ¿Deseas reiniciar la aplicación para instalarla ahora?',
                buttons: ['Reiniciar ahora', 'Más tarde'],
                defaultId: 0,
                cancelId: 1
            }).then(result => {
                if (result.response === 0) {
                    autoUpdater.quitAndInstall();
                }
            });
        });

        autoUpdater.on('error', (err) => {
            console.error('[Updater] Error en el actualizador automático: ' + err);
        });
    }

    app.on('ready', () => {
        createSplashWindow();
        const minimumWait = new Promise(resolve => setTimeout(resolve, 3000));
        const appReady = startApp();

        Promise.all([appReady, minimumWait]).then(() => {
            if (mainWindow) {
                mainWindow.show();
                mainWindow.center();
                if (splashWindow) {
                    splashWindow.destroy();
                }
                setupAutoUpdates();
            }
        }).catch(error => {
            if (splashWindow) {
                splashWindow.destroy();
            }
            if (!app.isQuitting()) {
                app.quit();
            }
        });
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    app.on('before-quit', () => {
        app.isQuitting = true;
        isServerReady = false;
        if (serverProcess) {
            serverProcess.kill();
        }
    });

    app.on('activate', () => {
        if (mainWindow === null && isServerReady) {
            createWindow();
            mainWindow.show();
            mainWindow.center();
        } else if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    });
}