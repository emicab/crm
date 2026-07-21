const fs = require('fs');
const path = require('path');
const bytenode = require('bytenode');

const srcDir = path.join(__dirname, '../electron');
const destDir = path.join(__dirname, '../electron-dist');

function setupDistDir() {
  console.log('[Bytecode] Preparando carpeta electron-dist...');
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
  }
  fs.mkdirSync(destDir, { recursive: true });

  // Copiar todos los archivos de electron/ a electron-dist/
  const files = fs.readdirSync(srcDir);
  for (const file of files) {
    const srcPath = path.join(srcDir, file);
    const destPath = path.join(destDir, file);
    fs.copyFileSync(srcPath, destPath);
  }
}

function compileFiles() {
  console.log('[Bytecode] Compilando archivos JS a bytecode V8 (.jsc)...');

  const mainJsPath = path.join(destDir, 'main.js');
  const mainJscPath = path.join(destDir, 'main.jsc');
  const preloadJsPath = path.join(destDir, 'preload.js');
  const preloadJscPath = path.join(destDir, 'preload.jsc');

  // Compilar main.js
  bytenode.compileFile({
    filename: mainJsPath,
    output: mainJscPath
  });

  // Compilar preload.js
  bytenode.compileFile({
    filename: preloadJsPath,
    output: preloadJscPath
  });

  // Reemplazar main.js original en destDir con el cargador (loader)
  fs.writeFileSync(mainJsPath, `// ClinPOS Obfuscated Main Loader
require('bytenode');
require('./main.jsc');
`, 'utf8');

  // Reemplazar preload.js original en destDir con el cargador (loader)
  fs.writeFileSync(preloadJsPath, `// ClinPOS Obfuscated Preload Loader
require('bytenode');
require('./preload.jsc');
`, 'utf8');

  console.log('[Bytecode] Compilación completada con éxito.');
}

try {
  setupDistDir();
  compileFiles();
  process.exit(0);
} catch (error) {
  console.error('[Bytecode] Error en el proceso de compilación:', error);
  process.exit(1);
}
