# ClinPOS — Plan de Desarrollo v2.0.0

Versión actual: **1.3.7**  
Objetivo: **2.0.0 — El sistema modular**

Este documento es el plan de trabajo concreto para implementar todo lo definido en `SistemaModular.md`. Cada fase tiene entregables verificables. Las fases están ordenadas por dependencia técnica, no por importancia de negocio.

---

## Estado Actual (v1.3.7)

### Lo que ya funciona
- ✅ Ventas con carrito, métodos de pago, descuentos
- ✅ Caja diaria (apertura/cierre, movimientos, arqueo)
- ✅ Productos, stock, alertas de stock mínimo
- ✅ Clientes, Vendedores, Compras/Proveedores, Gastos
- ✅ Combos y Promociones, Códigos de descuento
- ✅ Venta fraccionada (unitType en productos)
- ✅ Analíticas con gráficos (Recharts)
- ✅ Backup/Restore manual de SQLite vía Electron
- ✅ Importación/Exportación CSV de productos
- ✅ Sistema de licencias básico (LicenseGate)

### Lo que NO existe todavía
- ❌ Sistema de módulos (toggles en config)
- ❌ Sidebar/UI dinámica por módulos activos
- ❌ Perfil de negocio / onboarding
- ❌ Vendedor por defecto "Caja Principal" en seed
- ❌ Caja obligatoria para Gastos (solo para Ventas hoy)
- ❌ Módulo Cuenta Corriente / Fiado
- ❌ Módulo Roles y Permisos
- ❌ Backup automático a Supabase (Modo Seguro)
- ❌ Sistema de licencias por plan/módulo (JWT)

---

## Fases de Desarrollo

```
Fase 0 ──► Fase 1 ──► Fase 2 ──► Fase 3 ──► Fase 4 ──► Fase 5
Fundación   UI Mod.   Adaptar    Cuenta      Roles      Backup
            Sidebar   Formularios Corriente  y Perms.   Supabase
```

---

## Fase 0 — Fundación del Sistema Modular

> **Objetivo:** Todo lo demás depende de esto. Sin esta fase no se puede construir nada modular.

**Tiempo estimado:** 2-3 días

### 0.1 — Vendedor por defecto en seed/inicialización

**Problema:** `Sale.sellerId` es `NOT NULL` en el schema. Si el módulo Vendedores está desactivado, las ventas deben asociarse a alguien.

**Solución:** Garantizar que siempre exista `Seller { id: 1, name: "Caja Principal" }`.

- [ ] Crear `scripts/seed.ts` (o agregar lógica en `electron/main.js` al arrancar) que haga `upsert` del vendedor por defecto con `id: 1`.
- [ ] El seed corre cada vez que arranca la app, de forma idempotente (si ya existe, no hace nada).
- [ ] Agregar también a `prisma/crm_template.db` para que los instaladores nuevos lo tengan desde el día 0.

**Archivos a modificar:**
- `electron/main.js` — agregar llamada al seed al inicio
- `scripts/seed.ts` — nuevo archivo

---

### 0.2 — Definición de módulos en configuración

**Problema:** No existe ningún mecanismo para activar/desactivar módulos.

**Solución:** Usar la tabla `Setting` que ya existe, agregando claves de módulos.

- [ ] Agregar al `DEFAULT_SETTINGS` en `pages/api/config/index.ts`:
  ```ts
  module_clientes: 'true',
  module_vendedores: 'true',
  module_compras: 'true',
  module_gastos: 'true',
  module_combos_promociones: 'true',
  module_venta_fraccionada: 'true',
  module_analiticas: 'true',
  module_cuenta_corriente: 'false',   // nuevo, empieza desactivado
  module_roles: 'false',              // nuevo, empieza desactivado
  business_profile: 'custom',
  storage_mode: 'local',              // 'local' | 'seguro' | 'empresa'
  ```
- [ ] Actualizar validación del `PUT` en el mismo endpoint para permitir las nuevas claves.

**Archivos a modificar:**
- `pages/api/config/index.ts`

---

### 0.3 — Hook `useModules`

**Problema:** Cada componente que necesite saber si un módulo está activo tiene que hacer su propia consulta a `/api/config`.

**Solución:** Hook centralizado con caché en contexto.

- [ ] Crear `hooks/useModules.ts`:
  ```ts
  // Retorna:
  {
    isModuleEnabled: (moduleId: string) => boolean,
    modules: Record<string, boolean>,
    businessProfile: string,
    storageMode: string,
    isLoading: boolean,
    refresh: () => void,
  }
  ```
- [ ] Consumir `/api/config` una vez al montar, guardar en estado.
- [ ] El hook usa `SWR` o `useEffect` con un fetch simple. Sin contexto global aún — si se necesita optimizar, se puede envolver en Provider después.

**Archivos a crear:**
- `hooks/useModules.ts`

---

### 0.4 — Validación global de caja abierta para Gastos

**Problema:** `pages/api/gastos/index.ts` no valida si hay caja abierta antes de crear un gasto. Ventas sí lo validan (en el frontend), pero gastos no.

**Solución:** Agregar validación en el `POST` de gastos.

- [ ] En `pages/api/gastos/index.ts`, antes de crear el `Expense`, verificar:
  ```ts
  const openRegister = await prisma.cashRegister.findFirst({ where: { status: 'OPEN' } });
  if (!openRegister) {
    return res.status(400).json({ message: 'Debe haber una caja abierta para registrar un gasto.' });
  }
  ```
- [ ] Hacer lo mismo para cualquier otro endpoint que cree `CashMovement` directamente (revisar `pages/api/caja/`).

**Archivos a modificar:**
- `pages/api/gastos/index.ts`
- `pages/api/caja/` (revisar endpoints de movimientos manuales)

---

## Fase 1 — UI Modular (Sidebar + Dashboard + Config)

> **Objetivo:** La interfaz reacciona al estado de los módulos. Un usuario con Vendedores desactivado no ve "Vendedores" en ningún lado.

**Tiempo estimado:** 3-4 días  
**Depende de:** Fase 0 completa

---

### 1.1 — Sidebar dinámica

- [ ] Integrar `useModules` en `components/layout/Sidebar.tsx`.
- [ ] Agregar propiedad `moduleId?: string` a cada `NavItem`.
- [ ] Filtrar items cuyo `moduleId` tenga el módulo desactivado antes de renderizar.
- [ ] Grupos que quedan vacíos (todos sus items filtrados) no se renderizan tampoco.

**Mapeo módulo → ítems a ocultar:**

| `moduleId` | Ítems del sidebar ocultos |
| :--- | :--- |
| `clientes` | Clientes |
| `vendedores` | Vendedores |
| `compras` | Nueva Compra, Historial Compras, Proveedores |
| `gastos` | Gastos |
| `combos_promociones` | Combos, Promociones |
| `analiticas` | Analíticas |
| `cuenta_corriente` | Cuenta Corriente *(futuro)* |

**Archivos a modificar:**
- `components/layout/Sidebar.tsx`

---

### 1.2 — Dashboard (Home) dinámico

- [ ] Integrar `useModules` en `app/page.tsx`.
- [ ] Filtrar `priorityModules` y `secondaryModules` según módulos activos.
- [ ] Filtrar la tabla de atajos de teclado (no mostrar `Ctrl+A` para Analíticas si está desactivado).

**Archivos a modificar:**
- `app/page.tsx`

---

### 1.3 — Pantalla de gestión de módulos en Configuración

- [ ] Agregar nueva sección "Módulos" en `app/(main)/configuracion/page.tsx`.
- [ ] Diseño: grilla de tarjetas, una por módulo. Cada tarjeta tiene:
  - Ícono + nombre + descripción corta
  - Toggle ON/OFF
  - Chip de dependencia (si aplica)
  - Badge "Incluido en plan X" (para cuando exista el sistema de licencias)
- [ ] El toggle llama a `PUT /api/config` al instante (sin botón Guardar separado).
- [ ] Bloqueos de desactivación (con tooltip): módulo `compras` no se puede desactivar si hay compras `PENDING/ORDERED`.
- [ ] Módulos agrupados en dos secciones visuales: **Operativos** / **Administrativos**.

**Archivos a modificar:**
- `app/(main)/configuracion/page.tsx`

---

### 1.4 — Onboarding: Selector de Perfil de Negocio

- [ ] Detectar si `business_profile` en `Setting` está vacío o es `'unset'` al arrancar la app.
- [ ] Si es primera vez: mostrar pantalla de bienvenida con tarjetas de rubro antes de entrar al sistema.
- [ ] Cada tarjeta activa un preset de módulos al hacer click:
  - *Kiosco / Almacén* → activa: `clientes`, `gastos`
  - *Fiambrería / Carnicería* → activa: `venta_fraccionada`, `compras`, `gastos`, `clientes`
  - *Pizzería / Gastronomía* → activa: `combos_promociones`, `gastos`
  - *Ferretería / Corralón* → activa: `cuenta_corriente`, `compras`, `vendedores`
  - *Boutique / Indumentaria* → activa: `clientes`, `vendedores`, `analiticas`
  - *Personalizado* → va directo a pantalla de módulos sin preselección
- [ ] El preset llama a `PUT /api/config` con el conjunto de módulos correspondiente y guarda `business_profile`.
- [ ] El onboarding solo se muestra una vez. Después se accede solo desde Configuración.

**Archivos a crear/modificar:**
- `components/onboarding/BusinessProfileSelector.tsx` — nuevo
- `app/layout.tsx` o `app/(main)/layout.tsx` — agregar lógica de detección primera vez

---

## Fase 2 — Formularios Adaptativos (Venta, Caja, Detalles)

> **Objetivo:** El formulario de venta y el modal de apertura de caja se adaptan a los módulos activos.

**Tiempo estimado:** 2-3 días  
**Depende de:** Fase 0

---

### 2.1 — `AdditionalDetailsSection` condicional

- [ ] Recibir `modules` como prop o consumir `useModules` directamente.
- [ ] Ocultar buscador de **Clientes** si `module_clientes` está desactivado.
- [ ] Ocultar dropdown de **Vendedores** si `module_vendedores` está desactivado.
- [ ] Ocultar campo de **Código de Descuento** si `module_combos_promociones` está desactivado.
- [ ] Si la sección queda completamente vacía de campos visibles, ocultar el `<details>` completo.

**Archivos a modificar:**
- `components/ventas/AdditionalDetailsSection.tsx`

---

### 2.2 — `SaleForm` con módulos activos

- [ ] Integrar `useModules`.
- [ ] Si `module_vendedores` está desactivado: no pedir `sellerId` al usuario. Al enviar la venta, usar `sellerId: 1` ("Caja Principal") automáticamente en lugar de fallar la validación.
- [ ] Si `module_combos_promociones` está desactivado: no llamar a `/api/combos` ni `/api/promotions` en el `fetchData` inicial. El hook `usePromotionsEngine` recibe array vacío y no aplica nada.
- [ ] Si `module_clientes` está desactivado: no ejecutar el `useEffect` de búsqueda de clientes.

**Archivos a modificar:**
- `components/ventas/SaleForm.tsx`

---

### 2.3 — `CajaModal` sin selector de vendedor

- [ ] Si `module_vendedores` está desactivado: ocultar el `<Select>` de vendedor en el modal de apertura de caja. El modal solo pide el saldo inicial.
- [ ] Al abrir la caja sin selección de vendedor: enviar `sellerId: 1` automáticamente.

**Archivos a modificar:**
- `components/ventas/CajaModal.tsx`

---

### 2.4 — Módulo Venta Fraccionada: control de enteros

- [ ] Si `module_venta_fraccionada` está desactivado:
  - No disparar `WeightModal` ni `UnitTypeModal` aunque el producto tenga `unitType` configurado.
  - Forzar cantidad a número entero en el input de cantidad del carrito (`Math.round`).
- [ ] En `app/(main)/productos/` ocultar el campo `unitType` al crear/editar productos si el módulo está desactivado.

**Archivos a modificar:**
- `components/ventas/SaleForm.tsx`
- `components/ventas/ProductSearchPanel.tsx`
- Formulario de productos

---

## Fase 3 — Nuevo Módulo: Cuenta Corriente / Fiado ⭐

> **Objetivo:** El módulo de mayor valor para el mercado argentino.

**Tiempo estimado:** 5-7 días  
**Depende de:** Fase 0 (módulos base), Módulo Clientes activo

---

### 3.1 — Migración de base de datos

- [ ] Crear nueva migración Prisma con las tablas:
  ```prisma
  model AccountBalance {
    id         Int      @id @default(autoincrement())
    clientId   Int      @unique
    balance    Decimal  @default(0)  // positivo = debe, negativo = a favor
    updatedAt  DateTime @updatedAt
    client     Client   @relation(fields: [clientId], references: [id])
    movements  AccountMovement[]
  }

  model AccountMovement {
    id               Int            @id @default(autoincrement())
    accountBalanceId Int
    type             String         // SALE_ON_ACCOUNT | PAYMENT | ADJUSTMENT
    amount           Decimal        // positivo = cargó deuda, negativo = pagó
    description      String?
    saleId           Int?           // si el movimiento viene de una venta en cuenta
    createdAt        DateTime       @default(now())
    accountBalance   AccountBalance @relation(fields: [accountBalanceId], references: [id])
    sale             Sale?          @relation(fields: [saleId], references: [id])
  }
  ```
- [ ] Agregar campo opcional `onAccount Boolean @default(false)` en `Sale`.

---

### 3.2 — API endpoints

- [ ] `GET /api/account-balance?clientId=X` — saldo actual y últimos movimientos
- [ ] `POST /api/account-balance/charge` — cargar deuda (venta en cuenta)
- [ ] `POST /api/account-balance/payment` — registrar pago parcial o total
- [ ] `GET /api/account-balance/debtors` — lista de clientes con deuda > 0

**Archivos a crear:**
- `pages/api/account-balance/index.ts`
- `pages/api/account-balance/charge.ts`
- `pages/api/account-balance/payment.ts`
- `pages/api/account-balance/debtors.ts`

---

### 3.3 — Integración en formulario de venta

- [ ] Agregar opción "Vender en cuenta" en la selección de método de pago de `SaleForm` (solo visible si el módulo está activo y hay un cliente seleccionado).
- [ ] Si el método es "en cuenta": no registrar `CashMovement`, sino `AccountMovement` de tipo `SALE_ON_ACCOUNT`.
- [ ] Marcar la `Sale` con `onAccount: true`.

---

### 3.4 — UI de gestión

- [ ] `app/(main)/cuenta-corriente/page.tsx` — listado de clientes con deuda
- [ ] `app/(main)/cuenta-corriente/[clientId]/page.tsx` — historial de movimientos del cliente, botón "Registrar Pago"
- [ ] Agregar al sidebar bajo grupo "Gestión"
- [ ] Agregar al Dashboard una tarjeta "Deudores activos: X clientes, $Y total"

---

## Fase 4 — Nuevo Módulo: Roles y Permisos

> **Objetivo:** Múltiples usuarios con distintos niveles de acceso.

**Tiempo estimado:** 4-5 días  
**Depende de:** Fase 0

---

### 4.1 — Migración de base de datos

```prisma
model User {
  id           Int      @id @default(autoincrement())
  name         String
  pin          String   // PIN de 4 dígitos, hasheado con bcrypt
  role         UserRole @default(CASHIER)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

enum UserRole {
  ADMIN
  SUPERVISOR
  CASHIER
}
```

---

### 4.2 — Sesión de usuario (sin auth full, solo PIN local)

- [ ] Al abrir la app (o al empezar turno): pantalla de selección de usuario + ingreso de PIN.
- [ ] `currentUserId` guardado en `Setting` con expiración por inactividad (ej: 4 horas).
- [ ] Si el módulo está desactivado: acceso total sin PIN (comportamiento actual).

---

### 4.3 — Control de acceso por rol

| Acción | Admin | Supervisor | Cajero |
| :--- | :---: | :---: | :---: |
| Ver historial completo de ventas | ✅ | ✅ | ❌ |
| Modificar precios de productos | ✅ | ❌ | ❌ |
| Ver Analíticas | ✅ | ✅ | ❌ |
| Gestionar módulos | ✅ | ❌ | ❌ |
| Abrir/cerrar caja | ✅ | ✅ | ✅ |
| Registrar venta | ✅ | ✅ | ✅ |
| Dar descuentos manuales | ✅ | ✅ | ❌ |

---

## Fase 5 — Backup Automático a Supabase (Modo Seguro)

> **Objetivo:** "Si mañana se rompe la PC, restaurás en minutos."

**Tiempo estimado:** 4-6 días  
**Depende de:** Fase 0

---

### 5.1 — Schema espejo en Supabase

- [ ] Crear en Supabase el equivalente de las tablas del Core:
  `Product`, `Sale`, `SaleItem`, `Client`, `CashRegister`, `CashMovement`, `Seller`, `Setting`, `AccountBalance`, `AccountMovement`
- [ ] Agregar columna `syncedAt` en cada tabla de Supabase para control de conflictos.
- [ ] Usar Row Level Security (RLS) en Supabase: cada instalación tiene su propio `businessId` como tenant.

---

### 5.2 — SyncService

- [ ] Crear `lib/syncService.ts`:
  ```ts
  // Para cada tabla:
  // 1. Leer registros con updatedAt > lastSyncAt (guardado en Setting)
  // 2. Upsert en Supabase
  // 3. Si todo ok: actualizar Setting.lastSyncAt
  // 4. Si falla: agregar a cola de reintentos en Setting (JSON)
  // 5. Nunca bloquear la UI
  ```
- [ ] El sync corre en el **proceso de Electron** (main process), no en el renderer, para no depender de que la ventana esté abierta.

---

### 5.3 — Triggers de sync

- [ ] **Al cerrar la caja:** llamar a `syncService.run()` desde `pages/api/caja/close.ts`.
- [ ] **Timer nocturno:** en `electron/main.js`, usar `setInterval` para intentar sync a las 23:00 cada día.
- [ ] **Al restaurar desde Supabase:** flujo de recuperación en caso de PC nueva — descargar todas las tablas y reconstruir el SQLite local.

---

### 5.4 — UI de estado de sync

- [ ] Pequeño indicador en el footer de la Sidebar: `☁ Último backup: hace 2h` o `⚠ Sin conexión — backup pendiente`.
- [ ] En Configuración: sección "Plan Seguro" con historial de últimas sincronizaciones y botón "Sincronizar ahora".

---

## Fuera de v2.0.0 — Backlog v2.x

Estos módulos se desarrollan después de que la infraestructura v2.0.0 esté estable:

| Módulo | Versión estimada | Complejidad |
| :--- | :---: | :---: |
| Facturación Electrónica (ARCA) | v2.1.0 | Muy alta |
| Mercado Pago (integración webhook) | v2.1.0 | Alta |
| WhatsApp Business | v2.2.0 | Media |
| Modo Empresa (multi-caja) | v2.3.0 | Muy alta |
| Analíticas avanzadas mejoradas | v2.1.0 | Media |

---

## Criterios de Completitud para v2.0.0

La versión 2.0.0 se considera completa cuando:

- [ ] El sistema de módulos funciona: activar/desactivar desde Config cambia la UI en tiempo real.
- [ ] El sidebar, el dashboard y los formularios son completamente dinámicos.
- [ ] El onboarding de perfil de negocio funciona en primera apertura.
- [ ] Vendedor por defecto "Caja Principal" existe siempre en la DB.
- [ ] Gastos requiere caja abierta (igual que ventas).
- [ ] Cuenta Corriente permite vender en cuenta y registrar pagos.
- [ ] Roles y Permisos permite definir PIN por usuario con niveles de acceso.
- [ ] Backup automático a Supabase se dispara al cerrar la caja.
- [ ] Restauración desde Supabase en PC nueva funciona end-to-end.
- [ ] Las instalaciones existentes (v1.x) migran sin pérdida de datos.

---

## Notas de Migración desde v1.x

> Los usuarios actuales de v1.3.7 deben actualizar sin perder datos.

- El esquema de Prisma agrega tablas nuevas (`AccountBalance`, `AccountMovement`, `User`). Las tablas existentes no se modifican — `prisma migrate deploy` no rompe datos previos.
- Los `DEFAULT_SETTINGS` nuevos (`module_*`) se agregan solo si no existen. Los usuarios que actualicen tendrán todos los módulos en `'true'` por defecto (experiencia idéntica a la versión anterior).
- El vendedor por defecto (seed) usa `upsert` con `id: 1` — si el usuario ya tiene un vendedor con id=1, el seed no sobrescribe el nombre.
