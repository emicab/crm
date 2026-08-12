// lib/moduleCatalog.ts
// WP5 "UX por rubro": sin borrar código, oculta módulos según el perfil del
// negocio. El perfil se guarda en Setting `business_profile` y se expone vía
// /api/config. Valores: "general" (todo visible) | "kiosco" (minimalista).

// Rutas visibles en el perfil minimalista (kiosco/despensa/almacén).
// El criterio es la regla de oro del usuario: Caja, Stock, Gastos y lo
// esencial; se oculta marketing, recetario, consignaciones, vendedores,
// traspasos y analíticas (sin eliminar nada del código).
const KIOSKO_ROUTES = new Set([
  "/caja",
  "/ventas",
  "/ventas/nueva",
  "/pedidos-web",
  "/productos",
  "/stock",
  "/stock/alertas",
  "/compras",
  "/compras/nueva",
  "/gastos",
  "/clientes",
  "/cuenta-corriente",
  "/proveedores",
  "/configuracion",
  "/configuracion/usuarios",
]);

export function isRouteVisibleForProfile(profile: string | null | undefined, href: string): boolean {
  if (profile !== "kiosco") return true;
  // Cualquier ruta de configuración sigue visible (no bloquear al dueño).
  if (href.startsWith("/configuracion")) return true;
  return KIOSKO_ROUTES.has(href);
}
