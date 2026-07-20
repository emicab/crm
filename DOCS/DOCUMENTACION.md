# POS — Punto de Venta para Emprendimientos

Un sistema de punto de venta pensado para negocios chicos que recién arrancan. Simple, sin vueltas, y funciona en tu compu con base de datos local.

---

## ¿Qué hace?

### 1. Productos y Stock

Llevá el control de todo lo que vendés. Cada producto tiene nombre, precio de venta, precio de compra, stock actual, y un stock mínimo para que el sistema te avise cuando te estás quedando sin mercadería.

Podés agrupar productos por marca, categoría y proveedor. Y si tenés muchos productos, los podés importar desde un Excel o CSV de una sola vez, o exportarlos para revisarlos afuera.

**Para qué sirve:** Saber siempre qué tenés, cuánto te costó, y cuándo tenés que reponer.

---

### 2. Ventas

El corazón del sistema. Está diseñado para ser rápido:

- **Buscá productos** por nombre, SKU o directamente escaneando el código de barras
- Si es un producto pesable (ej: verduras, fiambre), te deja cargar el peso exacto en gramos o mililitros
- **Combos**: si vendes paquetes (ej: "Hamburguesa + Papas + Bebida"), el sistema calcula automáticamente el descuento del combo
- **Promociones**: creá ofertas como "2x1", "6 unidades a precio especial", o "10% de descuento en compras mayores a $X"
- **Códigos de descuento**: ejemplo, "VERANO20" para un 20% off
- Se puede pagar en efectivo, transferencia, tarjeta o QR. Según el método de pago, podés tener distintos descuentos (ej: 10% off en efectivo)

La pantalla de venta te muestra un resumen en vivo con todos los descuentos aplicados. También se guarda automáticamente lo que estás haciendo, así si cerrás sin querer, no perdés el pedido.

**Para qué sirve:** Cobrar rápido, sin errores, y ofrecer descuentos para vender más.

---

### 3. Caja Diaria

Al arrancar el día, abrís la caja (con un monto inicial si querés). A lo largo del día, cada venta se registra automáticamente. Al cerrar la caja, el sistema te muestra:

- Cuánto se vendió en total
- Cuánto fue en efectivo, transferencia, tarjeta, QR
- Gastos que hayas registrado (ej: compraste café para el local)

Al cerrar, te dice exactamente cuánto debería haber en la caja, y podés dejar una nota si algo no cierra.

**Para qué sirve:** Saber al final del día si los números dan, sin estar haciendo cuentas de memoria.

---

### 4. Compras y Proveedores

Registrá los pedidos que le hacés a tus proveedores:

- **Orden de compra**: creá un pedido desde la vista de alertas de stock marcando los productos que necesitás, y el sistema lo guarda como "Pedido"
- **Estados**: cada compra puede estar Pendiente → Pedida → Recibida. Cuando recibís, el stock se actualiza solo
- **Recepción parcial**: si te llegó una parte, podés marcar cuánto recibiste de cada producto
- **WhatsApp**: desde la compra podés enviarle el pedido al proveedor por WhatsApp con un solo click

**Para qué sirve:** No olvidarte de reponer stock, y tener todo registrado para saber cuánto le comprás a cada proveedor.

---

### 5. Clientes

Registrá quiénes te compran. Después podés ver el historial de cada cliente: qué compró, cuándo, y por cuánto.

La búsqueda es rápida — mientras escribís el nombre, el sistema te muestra los resultados.

**Para qué sirve:** Conocer a los que te compran seguido y ofrecerles algo especial. O simplemente acordarte de ese cliente que preguntó por un producto la semana pasada.

---

### 6. Vendedores

Si tenés empleados, cada vendedor puede tener su propio perfil. Las ventas se registran con el vendedor que las hizo, así después podés ver quién vendió más.

**Para qué sirve:** Saber el rendimiento de cada vendedor, calcular comisiones, o simplemente ver cómo viene el equipo.

---

### 7. Dashboard y Analíticas

Apenas abrís el sistema, ves un resumen del día: ventas del día, productos que están por debajo del stock mínimo, y acceso rápido a las funciones principales.

En la sección de analíticas hay gráficos que muestran:

- Ingresos a lo largo del tiempo (por día, semana, mes)
- Qué métodos de pago usa más tu clientela
- Ganancias netas (restando costos)
- Tendencia de ventas

**Para qué sirve:** Entender cómo viene el negocio sin tener que hacer planillas de Excel.

---

### 8. Atajos de Teclado

Para los que usan el sistema en la compu todo el día:

| Tecla                      | Acción                                        |
| -------------------------- | --------------------------------------------- |
| **F8**                     | Buscar producto (enfoca la barra de búsqueda) |
| **F2**                     | Seleccionar método de pago                    |
| **Escape**                 | Cancelar producto seleccionado                |
| **Ctrl + Enter** o **F10** | Finalizar venta                               |
| **Enter** (en cantidad)    | Agregar producto al carrito                   |

**Para qué sirve:** Vender más rápido sin tocar el mouse.

---

### 9. Diseño y Compatibilidad

- Es una aplicación de escritorio. Se instala como cualquier programa (.exe)
- Funciona sin internet — todo corre en la propia máquina
- Se ve bien en cualquier resolución de pantalla
- No necesita navegador, no necesita configuración de servidor

---

## ¿Qué NO hace (todavía)?

- No emite factura electrónica (AFIP/ARCA)
- No tiene integración con Mercado Pago u otros cobradores
- No tiene versión web ni app mobile
- No maneja múltiples sucursales desde una misma instalación

---

## Datos Técnicos (para el que los quiera)

Desarrollado con Next.js, TypeScript, Tailwind CSS, y PostgreSQL (SQLite como alternativa). Empaquetado con Electron para funcionar como aplicación de escritorio (.exe).

---
