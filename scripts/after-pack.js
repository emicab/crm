/**
 * Electron Builder afterPack Hook
 * Copies next.js standalone node_modules to the packed output directory
 * BEFORE the installer (NSIS) is created.
 */
const fs = require('fs');
const path = require('path');

exports.default = async function (context) {
    const appOutDir = context.appOutDir;
    console.log(`[afterPack] Copiando node_modules standalone a: ${appOutDir}`);

    const src = path.join(__dirname, '..', '.next', 'standalone', 'node_modules');
    const dest = path.join(appOutDir, 'resources', 'standalone', 'node_modules');

    if (!fs.existsSync(src)) {
        console.error('[afterPack] ERROR: No se encontró .next/standalone/node_modules');
        throw new Error('No se encontró standalone/node_modules');
    }

    // Asegurarse de que el directorio padre existe
    const destParent = path.dirname(dest);
    if (!fs.existsSync(destParent)) {
        console.log(`[afterPack] Creando directorio padre: ${destParent}`);
        fs.mkdirSync(destParent, { recursive: true });
    }

    console.log('[afterPack] Copiando archivos de forma recursiva...');
    copyRecursive(src, dest);

    // Eliminar el archivo .env del standalone empaquetado para evitar conflictos de variables de entorno
    const envPath = path.join(appOutDir, 'resources', 'standalone', '.env');
    if (fs.existsSync(envPath)) {
        fs.unlinkSync(envPath);
        console.log('[afterPack] ✅ Archivo .env eliminado de standalone.');
    }

    // Verificar que next module existe
    const nextExists = fs.existsSync(path.join(dest, 'next'));
    if (!nextExists) {
        console.error('[afterPack] ERROR: El módulo "next" no se encontró en la copia.');
        throw new Error('El módulo "next" no se copió correctamente.');
    }

    console.log('[afterPack] ✅ Copia de node_modules finalizada con éxito.');
};

function copyRecursive(srcDir, destDir) {
    fs.mkdirSync(destDir, { recursive: true });
    const entries = fs.readdirSync(srcDir, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(srcDir, entry.name);
        const destPath = path.join(destDir, entry.name);
        if (entry.isDirectory()) {
            copyRecursive(srcPath, destPath);
        } else if (entry.isSymbolicLink()) {
            const target = fs.readlinkSync(srcPath);
            try {
                fs.symlinkSync(target, destPath);
            } catch (e) {
                // En Windows, si falla la creación del enlace simbólico, copiamos el archivo real
                fs.copyFileSync(srcPath, destPath);
            }
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}
