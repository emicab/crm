const { chromium } = require("playwright");
const fs = require("fs");

const baseUrl = "http://localhost:3000"; // Cambiá el puerto si usás otro (ej: 3001)

// Mapeo de todas las rutas de tu HomePage
const routes = [
  { name: "01-caja", url: "/caja" },
  { name: "02-nueva-venta", url: "/ventas/nueva" },
  { name: "03-productos", url: "/productos" },
  { name: "04-gastos", url: "/gastos" },
  { name: "05-pedidos-web", url: "/pedidos-web" },
  { name: "06-configuracion", url: "/configuracion" },
  { name: "07-nueva-compra", url: "/compras/nueva" },
  { name: "08-analiticas", url: "/analiticas" },
  { name: "09-clientes", url: "/clientes" },
  { name: "10-cuenta-corriente", url: "/cuenta-corriente" },
  { name: "11-proveedores", url: "/proveedores" },
  { name: "12-vendedores", url: "/vendedores" },
  { name: "13-categorias", url: "/categorias" },
  { name: "14-marcas", url: "/marcas" },
  { name: "15-stock", url: "/stock" },
  { name: "16-stock-alertas", url: "/stock/alertas" },
  { name: "17-combos", url: "/combos" },
  { name: "18-promociones", url: "/promociones" },
  { name: "19-historial-ventas", url: "/ventas" },
  { name: "20-historial-compras", url: "/compras" },
  { name: "21-consignaciones", url: "/consignaciones" },
  { name: "22-codigos-descuento", url: "/codigos-descuento" },
  { name: "23-notas-ia", url: "/notas-ia" },
  { name: "24-configuracion-usuarios", url: "/configuracion/usuarios" },
];

(async () => {
  // Crear carpeta de capturas si no existe
  if (!fs.existsSync("./capturas")) {
    fs.mkdirSync("./capturas");
  }

  console.log("🚀 Iniciando navegador...");
  /* const browser = await chromium.launch({
    channel: 'chrome', // <-- Usa tu Google Chrome instalado
    headless: true,    // Puedes poner false si querés ver la ventana abrirse
  }); */

  // Cambiá esta línea:
  // const browser = await chromium.launch();

  // Por esta:
  const browser = await chromium.launch({
    channel: "chrome",
  });

  // Configurar resolución de pantalla Desktop HD
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // Calidad Retina/HD
  });

  const page = await context.newPage();

  // apretar cuatros veces el 1.
  await page.keyboard.press("1");
  await page.keyboard.press("1");
  await page.keyboard.press("1");
  await page.keyboard.press("1");

  await page.waitForTimeout(1000);
  // apretar cuatros veces el 1.
  await page.keyboard.press("1");
  await page.keyboard.press("1");
  await page.keyboard.press("1");
  await page.keyboard.press("1");

  console.log(`📸 Procesando ${routes.length} vistas...\n`);

  for (const route of routes) {
    try {
      console.log(`⏳ Capturando [${route.name}] -> ${route.url}`);

      // Ir a la ruta y esperar que carguen las peticiones HTTP
      await page.goto(`${baseUrl}${route.url}`, {
        waitUntil: "networkidle",
        timeout: 10000,
      });

      // Pausa corta para asegurar renders de animaciones o tablas
      await page.waitForTimeout(800);

      // Guardar la imagen
      await page.screenshot({
        path: `./capturas/${route.name}.png`,
        fullPage: false, // Cambiá a true si querés que capture todo el scroll vertical
      });
    } catch (err) {
      console.error(`❌ Error en ${route.name}:`, err.message);
    }
  }

  await browser.close();
  console.log(
    "\n🎉 ¡Listo! Todas las capturas están guardadas en la carpeta /capturas",
  );
})();
