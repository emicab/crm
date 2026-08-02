// scripts/clean-build.js
// Limpia los directorios de build y caché stale (que quedaron de versiones viejas)
// para que cada build se genere siempre desde el source actual.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

const targets = [
  ".next",
  "app_standalone",
  "dist_tauri",
  "dist_electron",
  "electron-dist",
  "electron",
];

let removed = false;
for (const t of targets) {
  const p = path.join(root, t);
  if (fs.existsSync(p)) {
    fs.rmSync(p, { recursive: true, force: true });
    console.log(`[clean-build] Removido: ${t}`);
    removed = true;
  }
}

if (!removed) {
  console.log("[clean-build] Sin directorios de build obsoletos. OK.");
}

// Conserva app_standalone/.keep por si fuera necesario para git.
const keepDir = path.join(root, "app_standalone");
if (!fs.existsSync(keepDir)) {
  fs.mkdirSync(keepDir, { recursive: true });
  fs.writeFileSync(path.join(keepDir, ".keep"), "", "utf8");
  console.log("[clean-build] Recreado app_standalone/.keep");
}