const { app, BrowserWindow, dialog, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

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
            },
            icon: path.join(__dirname, 'public', 'crm_icono.png'),
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