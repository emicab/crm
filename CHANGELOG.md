# Changelog - ClinPOS

Todos los cambios notables realizados en el proyecto están detallados a continuación.

## [1.2.0] - 2026-07-10

### Añadido
- **M2 (Códigos de Descuento)**: Implementado modelo `DiscountCode` en `schema.prisma` y CRUD completo bajo los endpoints `/api/discount-codes/index` y `[id]`. Validación en tiempo real y registro de uso de códigos de descuento al realizar ventas.
- **M7 (Copia de Seguridad de Base de Datos)**: Añadidos métodos `db:backup` y `db:restore` a nivel de Electron e IPC con copia y sobreescritura seguras (con rollback automático temporal). Botones de importación/exportación añadidos al pie de la Sidebar.
- **M8 & M10 (Importar/Exportar CSV de Productos)**: Añadidos botones de importación y exportación de productos en formato CSV en el encabezado de filtros de la tabla de productos. Soporte inteligente para crear marcas y categorías inexistentes al importar.

### Corregido
- **E1 (Preload Naming Mismatch)**: Corregida discrepancia entre `electronAPI` y `licenseAPI` expuestos a través del puente de contexto en `preload.js`.
- **E2 (Stock Min Alert Query)**: Solucionado error de sintaxis en `data.ts` reemplazando llamadas de campo inválidas con consultas crudas SQL.
- **E3 (Weekly Sales Aggregation)**: Cambiada agrupación por timestamp exacto a agrupación por día de la semana en memoria JS.
- **E4 & E5 (Stock updates in Purchases)**: Implementadas validaciones de estados (`PENDING` vs `RECEIVED` vs `CANCELLED`) en compras para evitar el aumento erróneo de stock. Implementados handlers `PUT` y `DELETE` para actualizar stock al modificar/cancelar compras.
- **E6 & E7 (Sales Discount & Deletion FK Checks)**: Implementado cálculo dinámico del porcentaje de descuento en ventas y validación de referencias cruzadas antes de permitir la eliminación de productos.
- **V2 & V3 (Leaks y XSS)**: Creado middleware centralizado de sanitización XSS y controlador global de excepciones API para prevenir fugas de trazas internas.
- **V4 & V5 (License Security)**: Encriptada la llave de activación del local store con `safeStorage` (Electron) y removida de los canales de comunicación expuestos.
- **V7 & V10 (CSP & CSRF Middleware)**: Creado Next.js middleware global para interceptar peticiones locales y añadir cabeceras estrictas de seguridad (Content Security Policy).
- **F1 & F6 (Zonas Horarias & N+1 Queries)**: Corregidas disparidades de zona horaria usando rangos locales y resueltos más de 15 queries duplicadas en balances mensuales.
- **F2 & F3 (Historial de Precios de Compra)**: Autoguardado de precios de compra iniciales y fallback dinámico en estimaciones COGS usando el último costo histórico si `pricePurchase` es nulo.
- **F4 (Comparación de Porcentajes)**: Evitada la división por cero en retornos de incremento financiero.
- **F5 (Paginación GET)**: Integrados skip/take opcionales a todos los 9 endpoints GET de listados principales.
- **F7 (Búsqueda Server-side)**: Migrado el filtrado de productos y clientes en formularios de venta/compra a consultas dinámicas de servidor con debounce de 300ms.
- **F8 (Strict Build Mode)**: Reactivado el bloqueo por advertencias TypeScript y ESLint durante el proceso de build.
- **F9 (StatCard text color)**: Modificado `StatCard` para heredar clases de color inyectadas de su contenedor.
- **F10 (Redirects de Formulario)**: Reactivados redireccionamientos automáticos tras la modificación/creación de productos.
