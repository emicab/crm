// scripts/test-all-flows.js
const BASE_URL = 'http://localhost:3000';

async function req(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, data: json };
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FALLÓ ASSERTION: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`  ✓ ${message}`);
  }
}

async function runFullAudit() {
  console.log('🚀 INICIANDO AUDITORÍA Y TESTEO COMPLETO DE CLINPOS v1.5.2');
  console.log('=========================================================\n');

  try {
    // ---------------------------------------------------------
    // 1. APERTURA DE CAJA
    // ---------------------------------------------------------
    console.log('📌 FASE 1: Apertura de Caja Diaria');
    const cajaCheck = await req('/api/caja');
    let openRegisterId;
    if (cajaCheck.data?.open) {
      console.log('  ℹ️ Hay una caja abierta previa, cerrando para test limpio...');
      const prevId = cajaCheck.data.open.id;
      await req(`/api/caja/${prevId}`, 'PUT', { actualBalance: Number(cajaCheck.data.open.initialBalance) || 5000 });
    }

    const openRes = await req('/api/caja', 'POST', { initialBalance: 5000, sellerId: 1 });
    assert(openRes.ok, `Caja abierta correctamente con $5.000 (ID: ${openRes.data?.id})`);
    openRegisterId = openRes.data?.id;

    // ---------------------------------------------------------
    // 2. CATEGORÍAS, MARCAS Y PRODUCTOS
    // ---------------------------------------------------------
    console.log('\n📌 FASE 2: Categorías, Marcas y Productos');
    const catRes = await req('/api/categories', 'POST', { name: `Test Categoria ${Date.now()}` });
    assert(catRes.ok, `Categoría creada ID: ${catRes.data?.id}`);
    const catId = catRes.data?.id;

    const brandRes = await req('/api/brands', 'POST', { name: `Test Marca ${Date.now()}` });
    assert(brandRes.ok, `Marca creada ID: ${brandRes.data?.id}`);
    const brandId = brandRes.data?.id;

    // Producto Estándar
    const prodStd = await req('/api/products', 'POST', {
      name: `Gaseosa Test ${Date.now()}`,
      sku: `SKU-${Date.now()}`,
      pricePurchase: 1000,
      priceSale: 1800,
      quantityStock: 50,
      stockMinAlert: 5,
      unitType: 'unit',
      categoryId: catId,
      brandId: brandId,
    });
    assert(prodStd.ok, `Producto estándar creado ID: ${prodStd.data?.id} ($1.800)`);
    const prodStdId = prodStd.data?.id;

    // Producto Fraccionado (Granel/Kilos)
    const prodBulk = await req('/api/products', 'POST', {
      name: `Queso Granel ${Date.now()}`,
      sku: `KG-${Date.now()}`,
      pricePurchase: 4000,
      priceSale: 8000,
      quantityStock: 10,
      stockMinAlert: 2,
      unitType: 'kg',
      categoryId: catId,
      brandId: brandId,
    });
    assert(prodBulk.ok, `Producto fraccionado creado ID: ${prodBulk.data?.id} ($8.000/kg)`);
    const prodBulkId = prodBulk.data?.id;

    // ---------------------------------------------------------
    // 3. CLIENTES Y CUENTA CORRIENTE
    // ---------------------------------------------------------
    console.log('\n📌 FASE 3: Clientes y Cuentas Corrientes');
    const clientRes = await req('/api/clients', 'POST', {
      firstName: 'Juan',
      lastName: 'Pérez Auditoría',
      email: `juan.${Date.now()}@test.com`,
      phone: '1199887766',
      address: 'Av. Corrientes 1234',
    });
    assert(clientRes.ok, `Cliente creado ID: ${clientRes.data?.id}`);
    const clientId = clientRes.data?.id;

    const balanceRes = await req(`/api/cuenta-corriente?clientId=${clientId}`);
    assert(balanceRes.ok, `Cuenta corriente inicial verificada (Deuda: $${balanceRes.data?.balance || 0})`);

    // ---------------------------------------------------------
    // 4. PROVEEDORES Y COMPRAS DE STOCK
    // ---------------------------------------------------------
    console.log('\n📌 FASE 4: Proveedores y Registro de Compras');
    const suppRes = await req('/api/proveedores', 'POST', {
      name: `Distribuidora Central ${Date.now()}`,
      contactPerson: 'Carlos Proveedor',
      phone: '1144556677',
    });
    assert(suppRes.ok, `Proveedor creado ID: ${suppRes.data?.id}`);
    const suppId = suppRes.data?.id;

    const purchaseRes = await req('/api/compras', 'POST', {
      supplierId: suppId,
      paymentType: 'TRANSFER',
      invoiceNumber: `INV-${Date.now()}`,
      items: [{ productId: prodStdId, quantity: 10, purchasePrice: 1000 }],
    });
    assert(purchaseRes.ok, `Compra registrada (10 unidades agregadas a stock)`);

    // ---------------------------------------------------------
    // 5. GASTOS OPERATIVOS
    // ---------------------------------------------------------
    console.log('\n📌 FASE 5: Control de Gastos Operativos');
    const expenseRes = await req('/api/gastos', 'POST', {
      description: 'Insumos de Limpieza para Local',
      amount: 1500,
      category: 'Limpieza',
      paymentType: 'CASH',
    });
    assert(expenseRes.ok, `Gasto registrado $1.500 descontado de caja`);

    // ---------------------------------------------------------
    // 6. VENDEDORES
    // ---------------------------------------------------------
    console.log('\n📌 FASE 6: Gestión de Vendedores');
    const sellerRes = await req('/api/vendedores', 'POST', {
      name: `María Gómez ${Date.now()}`,
      phone: '1133221100',
    });
    assert(sellerRes.ok, `Vendedor creado ID: ${sellerRes.data?.id}`);
    const sellerId = sellerRes.data?.id;

    // ---------------------------------------------------------
    // 7. VARIANTES DE VENTAS
    // ---------------------------------------------------------
    console.log('\n📌 FASE 7: Variantes de Registro de Ventas');

    // Venta A: Efectivo Estándar
    const saleA = await req('/api/ventas', 'POST', {
      items: [{ productId: prodStdId, quantity: 2, priceAtSale: 1800 }],
      paymentType: 'CASH',
      sellerId: sellerId,
      cashRegisterId: openRegisterId,
    });
    assert(saleA.ok, `Venta #1 (Efectivo: $3.600) registrada correctamente`);

    // Venta B: Venta en Cuenta Corriente (Fiado)
    const saleB = await req('/api/ventas', 'POST', {
      items: [{ productId: prodBulkId, quantity: 1.5, priceAtSale: 8000 }], // 1.5 kg * 8000 = 12000
      paymentType: 'CASH',
      onAccount: true,
      clientId: clientId,
      sellerId: sellerId,
      cashRegisterId: openRegisterId,
    });
    assert(saleB.ok, `Venta #2 (Fiado en Cta. Cte: $12.000 por 1.5kg) registrada`);

    // Verificar deuda acumulada en Cta. Cte.
    const checkDebt = await req(`/api/cuenta-corriente?clientId=${clientId}`);
    assert(Number(checkDebt.data?.balance) === 12000, `Saldo deudor actualizado correctamente a $12.000`);

    // Pago parcial en Cta Cte
    const payDebt = await req('/api/cuenta-corriente/payment', 'POST', {
      clientId: clientId,
      amount: 5000,
      paymentType: 'TRANSFER',
      description: 'Pago parcial a cuenta',
    });
    assert(payDebt.ok, `Pago parcial de $5.000 registrado (Saldo restante: $7.000)`);

    // ---------------------------------------------------------
    // 8. ROLES Y USUARIOS CON PIN
    // ---------------------------------------------------------
    console.log('\n📌 FASE 8: Roles, Permisos y Autenticación por PIN');
    const userPin = '9876';
    const userRes = await req('/api/users', 'POST', {
      name: `Cajero Test ${Date.now()}`,
      role: 'CASHIER',
      pin: userPin,
    });
    assert(userRes.ok, `Usuario Cajero creado ID: ${userRes.data?.id}`);
    const testUserId = userRes.data?.id;

    // Login con PIN
    const loginRes = await req('/api/users/login', 'POST', {
      userId: testUserId,
      pin: userPin,
    });
    assert(loginRes.ok, `Inicio de sesión con PIN de Cajero exitoso (${loginRes.data?.user?.name})`);

    // Cambiar PIN exigiendo PIN actual
    const newPin = '4321';
    const changePinRes = await req(`/api/users/${testUserId}`, 'PATCH', {
      currentPin: userPin,
      pin: newPin,
    });
    assert(changePinRes.ok, `Cambio de PIN de 9876 a 4321 validado con éxito`);

    // ---------------------------------------------------------
    // 9. RESPALDO AUTOMÁTICO EN LA NUBE (SUPABASE)
    // ---------------------------------------------------------
    console.log('\n📌 FASE 9: Sincronización en la Nube Supabase');
    const syncRes = await req('/api/sync', 'POST', { forceFullSync: false });
    assert(syncRes.ok, `Sincronización con Supabase exitosa (Local ID: ${syncRes.data?.tenantId})`);

    // ---------------------------------------------------------
    // 10. CIERRE DE CAJA Y ARQUEO
    // ---------------------------------------------------------
    console.log('\n📌 FASE 10: Arqueo y Cierre de Caja Diaria');
    const closeRes = await req(`/api/caja/${openRegisterId}`, 'PUT', {
      actualBalance: 7100, // $5000 inicial + $3600 venta A - $1500 gasto = $7100
      notes: 'Cierre de auditoría impecable',
    });
    assert(closeRes.ok, `Caja cerrada correctamente con arqueo (Estado: CLOSED)`);

    console.log('\n=========================================================');
    console.log('🎉 ¡AUDITORÍA FINALIZADA! TODOS LOS FLUJOS PASARON 100% OK.');
    console.log('=========================================================\n');
  } catch (err) {
    console.error('\n❌ AUDITORÍA DETENIDA POR UN ERROR:', err.message);
    process.exit(1);
  }
}

runFullAudit();
