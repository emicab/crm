import type { DriveStep } from 'driver.js';

export interface TourStep extends DriveStep {
  route: string;
}

export const tourSteps: TourStep[] = [
  // === HOME / DASHBOARD ===
  {
    route: '/',
    element: '#sidebar',
    popover: {
      title: 'Panel de Navegación',
      description: 'Desde el menú lateral podés acceder a todas las secciones del sistema: ventas, productos, stock, gastos y más.',
      side: 'right',
      align: 'start',
    },
  },
  {
    route: '/',
    element: '#quick-access',
    popover: {
      title: 'Acceso Rápido',
      description: 'Aquí tenés los módulos que más usás: Caja, Nueva Venta, Productos y Gastos, con sus atajos de teclado.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    route: '/',
    popover: {
      title: 'Todos los Módulos',
      description: 'Más abajo encontrás el acceso a todas las funcionalidades del CRM. Explorá cada una según tu necesidad.',
      side: 'top',
    },
  },

  // === CAJA ===
  {
    route: '/caja',
    element: '#caja-header',
    popover: {
      title: 'Control de Caja',
      description: 'Desde acá podés abrir y cerrar la caja del día, y ver todos los movimientos registrados.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    route: '/caja',
    element: '#caja-balances',
    popover: {
      title: 'Resumen de Caja',
      description: 'Visualizá el saldo inicial, cantidad de movimientos y el total acumulado de la caja abierta.',
      side: 'top',
    },
  },

  // === NUEVA VENTA ===
  {
    route: '/ventas/nueva',
    popover: {
      title: 'Nueva Venta',
      description: 'Acá registrás una nueva transacción de venta. Seleccioná productos, aplicá descuentos y elegí el método de pago.',
      side: 'bottom',
    },
  },

  // === PRODUCTOS ===
  {
    route: '/productos',
    element: '#productos-header',
    popover: {
      title: 'Gestión de Productos',
      description: 'Administrá tu catálogo completo: agregá, editá y eliminá productos.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    route: '/productos',
    element: '#productos-table',
    popover: {
      title: 'Listado de Productos',
      description: 'Acá se muestran todos tus productos con su precio, stock y categoría. Podés buscar y filtrar.',
      side: 'top',
    },
  },

  // === COMBOS ===
  {
    route: '/combos',
    element: '#combos-header',
    popover: {
      title: 'Combos',
      description: 'Creá combos de productos para ofrecer paquetes con precio especial a tus clientes.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    route: '/combos',
    element: '#combos-table',
    popover: {
      title: 'Listado de Combos',
      description: 'Todos los combos creados, con su precio y productos incluidos.',
      side: 'top',
    },
  },

  // === GASTOS ===
  {
    route: '/gastos',
    element: '#gastos-header',
    popover: {
      title: 'Registro de Gastos',
      description: 'Llevá el control de todos los egresos de tu negocio: insumos, servicios, alquiler, etc.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    route: '/gastos',
    element: '#gastos-table',
    popover: {
      title: 'Listado de Gastos',
      description: 'Visualizá y administrá todos los gastos registrados en el sistema.',
      side: 'top',
    },
  },

  // === PROVEEDORES ===
  {
    route: '/proveedores',
    element: '#proveedores-header',
    popover: {
      title: 'Proveedores',
      description: 'Administrá los proveedores y distribuidores de tu negocio.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    route: '/proveedores',
    element: '#proveedores-table',
    popover: {
      title: 'Listado de Proveedores',
      description: 'Todos tus proveedores con sus datos de contacto y condición fiscal.',
      side: 'top',
    },
  },

  // === VENDEDORES ===
  {
    route: '/vendedores',
    element: '#vendedores-header',
    popover: {
      title: 'Vendedores',
      description: 'Gestioná el personal de ventas de tu negocio: darlos de alta, editarlos o desactivarlos.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    route: '/vendedores',
    element: '#vendedores-table',
    popover: {
      title: 'Listado de Vendedores',
      description: 'Todos los vendedores registrados con su información principal.',
      side: 'top',
    },
  },

  // === ANALÍTICAS ===
  {
    route: '/analiticas',
    element: '#analiticas-cards',
    popover: {
      title: 'Métricas del Negocio',
      description: 'Acá ves las cifras clave: ingresos, ganancia bruta, gastos y ganancia neta del mes actual.',
      side: 'bottom',
    },
  },
  {
    route: '/analiticas',
    element: '#analiticas-charts',
    popover: {
      title: 'Gráficos y Estadísticas',
      description: 'Gráficos de rentabilidad, ventas semanales, ingresos diarios, productos más vendidos y distribución por medio de pago.',
      side: 'top',
    },
  },

  // === CONFIGURACIÓN ===
  {
    route: '/configuracion',
    element: '#config-header',
    popover: {
      title: 'Configuración del Sistema',
      description: 'Ajustá los parámetros de tu negocio: datos fiscales, impuestos, métodos de pago y más.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    route: '/configuracion',
    popover: {
      title: '¡Todo listo!',
      description: 'Ya conocés las secciones principales del CRM. Empezá a gestionar tu negocio de forma más eficiente.',
      side: 'top',
    },
  },
];
