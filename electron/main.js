const { app, BrowserWindow, dialog, ipcMain, safeStorage, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { autoUpdater } = require('electron-updater');
const { machineIdSync } = require('node-machine-id');
const Store = require('electron-store');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://htroigemnwqiugieodmv.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0cm9pZ2VtbndxaXVnaWVvZG12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3MDM4ODcsImV4cCI6MjA5OTI3OTg4N30.sSp5vEDvI7OHuYL0SeeFiATilC_f_BdZao2BjeN0IVQ';
const supabase = createClient(supabaseUrl, supabaseKey);


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
    let serverProcess = null;
    const PORT = 3001;
    const DEV_PORT = 3000;

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

    function createAppMenu() {
        const template = [
            {
                label: 'Ignite CRM',
                submenu: [
                    { role: 'about' },
                    { type: 'separator' },
                    { role: 'quit' },
                ]
            },
            {
                label: 'Editar',
                submenu: [
                    { role: 'undo', label: 'Deshacer' },
                    { role: 'redo', label: 'Rehacer' },
                    { type: 'separator' },
                    { role: 'cut', label: 'Cortar' },
                    { role: 'copy', label: 'Copiar' },
                    { role: 'paste', label: 'Pegar' },
                    { role: 'selectAll', label: 'Seleccionar todo' },
                ]
            },
            {
                label: 'Ver',
                submenu: [
                    { role: 'reload', label: 'Recargar' },
                    { role: 'forceReload', label: 'Forzar recarga' },
                    { role: 'toggleDevTools', label: 'Herramientas de desarrollo' },
                    { type: 'separator' },
                    { role: 'resetZoom', label: 'Restablecer zoom' },
                    { role: 'zoomIn', label: 'Acercar' },
                    { role: 'zoomOut', label: 'Alejar' },
                    { type: 'separator' },
                    { role: 'togglefullscreen', label: 'Pantalla completa' },
                ]
            },
            {
                label: 'Ventana',
                submenu: [
                    { role: 'minimize', label: 'Minimizar' },
                    { role: 'zoom', label: 'Zoom' },
                    { role: 'close', label: 'Cerrar' },
                ]
            },
        ];

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    }

    function createWindow(urlOverride) {
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

        const url = urlOverride || `http://127.0.0.1:${PORT}`;
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
            
            const templateDbSrcPath = path.join(process.resourcesPath, 'crm_template.db');
            
            if (!fs.existsSync(dbPathInUserData)) {
                if (!fs.existsSync(templateDbSrcPath)) {
                    throw new Error(`Plantilla de BD 'crm_template.db' NO ENCONTRADA en ${templateDbSrcPath}`);
                }
                fs.copyFileSync(templateDbSrcPath, dbPathInUserData);
                console.log('[DB] Base de datos creada desde plantilla.');
            } else {
                // Comprobar si necesita actualización de esquema basándonos en columnas/tablas faltantes
                applySchemaUpdates(dbPathInUserData, templateDbSrcPath);
            }
            return true;
        } catch (error) {
            dialog.showErrorBox("Error Crítico de Base de Datos", error.message);
            app.quit();
            return false;
        }
    }

    function applySchemaUpdates(dbPath, templatePath) {
        try {
            console.log('[DB] Checking DB at:', dbPath);
            const fs = require('fs');
            // Aumentamos a 5MB por si la base de datos es más grande y el esquema está fragmentado
            const fd = fs.openSync(dbPath, 'r');
            const buffer = Buffer.alloc(5000000);
            const bytesRead = fs.readSync(fd, buffer, 0, 5000000, 0);
            fs.closeSync(fd);
            
            const userDbStr = buffer.toString('utf8', 0, bytesRead);
            
            // Usamos 'Product_supplierId_fkey' que es específico de la nueva relación en Product
            // 'supplierId' por sí solo daba falso positivo porque ya existía en la tabla Purchase.
            const checks = ['Product_supplierId_fkey'];
            const missing = checks.filter(c => !userDbStr.includes(c));
            console.log('[DB] Missing keys:', missing);
            
            if (missing.length > 0) {
                console.log('[DB] Base de datos desactualizada. Actualizando esquema (copiando template temporalmente)...');
                
                // NOTA: Para una app en producción real, aquí se usaría better-sqlite3 
                // para migrar los datos. Por ahora, si estamos en este punto, el usuario
                // ya eliminaba el crm_prod.db antes. Hacemos backup por seguridad y reemplazamos.
                const backupPath = dbPath + '.backup-' + Date.now();
                try {
                    fs.copyFileSync(dbPath, backupPath);
                    fs.copyFileSync(templatePath, dbPath);
                    console.log('[DB] Esquema actualizado. Backup guardado en:', backupPath);
                } catch (err) {
                    console.error('[DB] Error actualizando BD:', err);
                }
            } else {
                console.log('[DB] El esquema está actualizado.');
            }
        } catch (error) {
            console.error('[DB] Error verificando el esquema de BD:', error);
        }
    }

    function startNextServer() {
        return new Promise((resolve, reject) => {
            if (!app.isPackaged) {
                return resolve(true);
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
            const isDev = await startNextServer();

            if (isDev) {
                // En desarrollo, Next.js ya corre en puerto 3000
                isServerReady = true;
                createWindow(`http://127.0.0.1:${DEV_PORT}`);
            } else {
                await checkServerReady();
                isServerReady = true;
                createWindow();
            }
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
            const hardwareId = machineIdSync(true);
            const key = licenseKey.toUpperCase().trim();
            console.log(`[License] Intentando activar clave: ${key} para Hardware ID: ${hardwareId}`);

            const { data: license, error } = await supabase
                .from('licenses')
                .select('*')
                .eq('key', key)
                .single();

            if (error || !license) {
                console.error('[License] Clave no encontrada en Supabase.');
                return { success: false, message: 'La clave de licencia no es válida.' };
            }

            if (!license.is_active) {
                return { success: false, message: 'La clave de licencia está desactivada.' };
            }

            if (license.expires_at && new Date(license.expires_at) < new Date()) {
                return { success: false, message: 'La clave de licencia ha expirado.' };
            }

            if (license.hardware_id && license.hardware_id !== hardwareId) {
                return { success: false, message: 'La clave ya está activada en otro equipo.' };
            }

            if (license.activations_count >= license.max_activations) {
                return { success: false, message: 'La clave alcanzó el límite de activaciones.' };
            }

            const { error: updateError } = await supabase
                .from('licenses')
                .update({
                    hardware_id: hardwareId,
                    activations_count: license.activations_count + 1,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', license.id);

            if (updateError) {
                console.error('[License] Error al actualizar en Supabase:', updateError);
                return { success: false, message: 'Error al activar la licencia. Intente nuevamente.' };
            }

            if (safeStorage && safeStorage.isEncryptionAvailable()) {
                const encryptedKey = safeStorage.encryptString(licenseKey);
                store.set('licenseKey', encryptedKey.toString('base64'));
            } else {
                store.set('licenseKey', licenseKey);
            }
            store.set('isActivated', true);
            console.log('[License] Activación exitosa.');
            return { success: true, message: '¡Activación exitosa!' };

        } catch (error) {
            console.error('[License] Error inesperado:', error);
            return { success: false, message: 'Error de conexión con el servidor de licencias. Verifique su conexión a internet.' };
        }
    });

    // Este manejador revisa si la app ya está activada
    ipcMain.handle('license:check', async () => {
        const isActivated = store.get('isActivated', false);
        console.log(`[License] Verificando estado: ${isActivated ? 'Activada' : 'No activada'}`);
        return { isActivated };
    });

    ipcMain.handle('db:backup', async () => {
        try {
            const getDatabasePath = () => {
                const dbUrl = process.env.DATABASE_URL || '';
                if (dbUrl.startsWith('file:')) {
                    let dbPath = dbUrl.replace(/^file:/, '');
                    if (dbPath.startsWith('/') && dbPath[2] === ':') {
                        dbPath = dbPath.slice(1);
                    }
                    return path.resolve(dbPath);
                }
                return path.join(app.getPath('userData'), 'crm_prod.db');
            };

            const dbPath = getDatabasePath();
            if (!fs.existsSync(dbPath)) {
                return { success: false, error: 'Base de datos no encontrada.' };
            }
            const { filePath, canceled } = await dialog.showSaveDialog({
                title: 'Exportar Copia de Seguridad',
                defaultPath: path.join(app.getPath('downloads'), `backup_crm_${new Date().toISOString().split('T')[0]}.db`),
                filters: [{ name: 'SQLite Database', extensions: ['db'] }]
            });
            if (canceled || !filePath) {
                return { success: false, canceled: true };
            }
            fs.copyFileSync(dbPath, filePath);
            return { success: true, path: filePath };
        } catch (error) {
            console.error('[Backup Error]:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:restore', async () => {
        try {
            const getDatabasePath = () => {
                const dbUrl = process.env.DATABASE_URL || '';
                if (dbUrl.startsWith('file:')) {
                    let dbPath = dbUrl.replace(/^file:/, '');
                    if (dbPath.startsWith('/') && dbPath[2] === ':') {
                        dbPath = dbPath.slice(1);
                    }
                    return path.resolve(dbPath);
                }
                return path.join(app.getPath('userData'), 'crm_prod.db');
            };

            const dbPath = getDatabasePath();
            const { filePaths, canceled } = await dialog.showOpenDialog({
                title: 'Importar Copia de Seguridad',
                properties: ['openFile'],
                filters: [{ name: 'SQLite Database', extensions: ['db'] }]
            });
            if (canceled || filePaths.length === 0) {
                return { success: false, canceled: true };
            }
            const sourcePath = filePaths[0];
            const tempBackup = dbPath + '.backup_temp';
            if (fs.existsSync(dbPath)) {
                fs.copyFileSync(dbPath, tempBackup);
            }
            try {
                fs.copyFileSync(sourcePath, dbPath);
                if (fs.existsSync(tempBackup)) {
                    fs.unlinkSync(tempBackup);
                }
                return { success: true, message: 'Base de datos restaurada. Se recomienda reiniciar la aplicación.' };
            } catch (writeError) {
                if (fs.existsSync(tempBackup)) {
                    fs.copyFileSync(tempBackup, dbPath);
                    fs.unlinkSync(tempBackup);
                }
                throw writeError;
            }
        } catch (error) {
            console.error('[Restore Error]:', error);
            return { success: false, error: error.message };
        }
    });

    function setupAutoUpdaterEvents() {
        autoUpdater.on('update-available', (info) => {
            const msg = { status: 'available', version: info.version };
            console.log('[Updater] Actualización disponible.', info);
            if (mainWindow) mainWindow.webContents.send('update:status', msg);
        });

        autoUpdater.on('update-not-available', (info) => {
            const msg = { status: 'up-to-date', version: info?.version };
            console.log('[Updater] No hay actualizaciones disponibles.', info);
            if (mainWindow) mainWindow.webContents.send('update:status', msg);
        });

        autoUpdater.on('download-progress', (progressObj) => {
            const msg = { status: 'downloading', percent: Math.round(progressObj.percent) };
            console.log(`[Updater] Descargando ${progressObj.percent}%`);
            if (mainWindow) mainWindow.webContents.send('update:status', msg);
        });

        autoUpdater.on('update-downloaded', (info) => {
            const msg = { status: 'downloaded', version: info.version };
            console.log('[Updater] Actualización descargada.');
            if (mainWindow) mainWindow.webContents.send('update:status', msg);
            dialog.showMessageBox({
                type: 'info',
                title: 'Actualización Lista',
                message: 'Una nueva versión ha sido descargada. ¿Deseas reiniciar la aplicación para instalarla ahora?',
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
            const msg = { status: 'error', error: err.message };
            console.error('[Updater] Error:', err.message);
            if (mainWindow) mainWindow.webContents.send('update:status', msg);
        });
    }

    ipcMain.handle('update:check', async () => {
        if (!app.isPackaged) {
            return { status: 'dev-mode', message: 'Modo desarrollo: no se buscan actualizaciones.' };
        }
        autoUpdater.autoDownload = true;
        autoUpdater.checkForUpdates();
        return { status: 'checking' };
    });

    function setupAutoUpdates() {
        if (!app.isPackaged) return;
        setupAutoUpdaterEvents();
        autoUpdater.autoDownload = true;
        console.log('[Updater] Buscando actualizaciones...');
        autoUpdater.checkForUpdates();
    }

    app.on('ready', () => {
        createAppMenu();
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
        serverProcess = null;
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