// lib/syncService.ts
import prisma from "./prisma";
import os from "os";

const fmtDec = (val: any, fallback: string | null = "0.00") => (val !== undefined && val !== null ? val.toString() : fallback);

export async function runSupabaseSync(forceFullSync: boolean = false): Promise<{ 
  success: boolean; 
  message?: string; 
  lastSync?: string; 
  syncedTables?: Record<string, number>;
  tenantId?: string;
}> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { loadEnv } = require("./envLoader");
    loadEnv();
    
    // 1. Cargar las credenciales de Supabase de los settings locales
    const settings = await prisma.setting.findMany();
    const config: Record<string, string> = {};
    for (const s of settings) {
      config[s.key] = s.value;
    }

    const supabaseUrl = config.supabase_url || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase_anon_key || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const lastSyncStr = config.supabase_last_sync;

    if (!supabaseUrl || !supabaseKey) {
      return { 
        success: false, 
        message: "Supabase no está configurado. Defina NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en el entorno." 
      };
    }

    const lastSync = (forceFullSync || !lastSyncStr) ? new Date(0) : new Date(lastSyncStr);
    const syncStartTime = new Date();

    // 2. Extraer cambios incrementales en orden jerárquico
    const brands = await prisma.brand.findMany({ where: forceFullSync ? {} : { updatedAt: { gt: lastSync } } });
    const categories = await prisma.category.findMany({ where: forceFullSync ? {} : { updatedAt: { gt: lastSync } } });
    const suppliers = await prisma.supplier.findMany({ where: forceFullSync ? {} : { updatedAt: { gt: lastSync } } });
    const discountCodes = await prisma.discountCode.findMany({ where: forceFullSync ? {} : { updatedAt: { gt: lastSync } } });
    const promotions = await prisma.promotion.findMany({ where: forceFullSync ? {} : { updatedAt: { gt: lastSync } } });
    const clients = await prisma.client.findMany({ where: forceFullSync ? {} : { updatedAt: { gt: lastSync } } });
    const sellers = await prisma.seller.findMany({ where: forceFullSync ? {} : { updatedAt: { gt: lastSync } } });
    const users = await prisma.user.findMany({ where: forceFullSync ? {} : { updatedAt: { gt: lastSync } } });

    const products = await prisma.product.findMany({ where: forceFullSync ? {} : { updatedAt: { gt: lastSync } } });
    const cashRegisters = await prisma.cashRegister.findMany({ where: forceFullSync ? {} : { updatedAt: { gt: lastSync } } });
    const accountBalances = await prisma.accountBalance.findMany({ where: forceFullSync ? {} : { updatedAt: { gt: lastSync } } });
    const combos = await prisma.combo.findMany({ where: forceFullSync ? {} : { updatedAt: { gt: lastSync } } });

    const sales = await prisma.sale.findMany({ where: forceFullSync ? {} : { updatedAt: { gt: lastSync } } });
    const saleItems = await prisma.saleItem.findMany({
      where: forceFullSync ? {} : {
        sale: { updatedAt: { gt: lastSync } }
      }
    });

    const purchases = await prisma.purchase.findMany({ where: forceFullSync ? {} : { updatedAt: { gt: lastSync } } });
    const purchaseItems = await prisma.purchaseItem.findMany({
      where: forceFullSync ? {} : {
        purchase: { updatedAt: { gt: lastSync } }
      }
    });

    const expenses = await prisma.expense.findMany({ where: forceFullSync ? {} : { updatedAt: { gt: lastSync } } });
    const cashMovements = await prisma.cashMovement.findMany({ where: forceFullSync ? {} : { createdAt: { gt: lastSync } } });
    const accountMovements = await prisma.accountMovement.findMany({ where: forceFullSync ? {} : { createdAt: { gt: lastSync } } });
    const comboItems = await prisma.comboItem.findMany({
      where: forceFullSync ? {} : {
        combo: { updatedAt: { gt: lastSync } }
      }
    });

    const computerHostname = typeof os.hostname === "function" ? os.hostname() : "pos_local";
    const rawTenant = (
      config.license_key?.trim() ||
      config.businessCuit?.trim() ||
      config.businessName?.trim() ||
      process.env.LICENSE_KEY?.trim() ||
      process.env.HARDWARE_ID?.trim() ||
      `pos_${computerHostname}`
    );
    const tenantId = rawTenant.toLowerCase().replace(/[^a-z0-9_\-]/gi, "_");

    // 3. Serializar decodificando Decimales a strings compatibles con JSON
    const payload = {
      Brand: brands.map(b => ({
        id: b.id, name: b.name, logoUrl: b.logoUrl, tenant_id: tenantId,
        createdAt: b.createdAt.toISOString(), updatedAt: b.updatedAt.toISOString()
      })),
      Category: categories.map(c => ({
        id: c.id, name: c.name, logoUrl: c.logoUrl, tenant_id: tenantId,
        createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString()
      })),
      Supplier: suppliers.map(s => ({
        id: s.id, name: s.name, contactPerson: s.contactPerson, email: s.email, phone: s.phone, address: s.address, notes: s.notes, tenant_id: tenantId,
        createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString()
      })),
      DiscountCode: discountCodes.map(d => ({
        id: d.id, code: d.code, discountPercent: fmtDec(d.discountPercent), tenant_id: tenantId,
        validFrom: d.validFrom?.toISOString() || null, validUntil: d.validUntil?.toISOString() || null,
        maxUses: d.maxUses, currentUses: d.currentUses, isActive: d.isActive,
        createdAt: d.createdAt.toISOString(), updatedAt: d.updatedAt.toISOString()
      })),
      Promotion: promotions.map(p => ({
        id: p.id, name: p.name, description: p.description, type: p.type, status: p.status, tenant_id: tenantId,
        discountType: p.discountType, discountValue: fmtDec(p.discountValue), minQuantity: p.minQuantity,
        maxDiscountQty: p.maxDiscountQty, priority: p.priority,
        startDate: p.startDate?.toISOString() || null, endDate: p.endDate?.toISOString() || null,
        createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString()
      })),
      Client: clients.map(c => ({
        id: c.id, firstName: c.firstName, lastName: c.lastName, email: c.email, phone: c.phone, address: c.address, notes: c.notes, tenant_id: tenantId,
        createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString()
      })),
      Seller: sellers.map(s => ({
        id: s.id, name: s.name, email: s.email, phone: s.phone, isActive: s.isActive, tenant_id: tenantId,
        createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString()
      })),
      User: users.map(u => ({
        id: u.id, name: u.name, role: u.role, pinHash: u.pinHash, tenant_id: tenantId,
        createdAt: u.createdAt.toISOString(), updatedAt: u.updatedAt.toISOString()
      })),
      Product: products.map(p => ({
        id: p.id, name: p.name, sku: p.sku, description: p.description, tenant_id: tenantId,
        pricePurchase: fmtDec(p.pricePurchase), priceSale: fmtDec(p.priceSale),
        quantityStock: p.quantityStock, stockMinAlert: p.stockMinAlert, unitType: p.unitType,
        brandId: p.brandId, categoryId: p.categoryId, supplierId: p.supplierId,
        createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString()
      })),
      Combo: combos.map(co => ({
        id: co.id, name: co.name, description: co.description, price: fmtDec(co.price), tenant_id: tenantId,
        active: co.active, createdAt: co.createdAt.toISOString(), updatedAt: co.updatedAt.toISOString()
      })),
      CashRegister: cashRegisters.map(c => ({
        id: c.id, openDate: c.openDate.toISOString(), closeDate: c.closeDate?.toISOString() || null, tenant_id: tenantId,
        initialBalance: fmtDec(c.initialBalance),
        expectedBalance: fmtDec(c.expectedBalance),
        actualBalance: fmtDec(c.actualBalance),
        difference: fmtDec(c.difference),
        status: c.status, notes: c.notes, sellerId: c.sellerId || 1,
        createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString()
      })),
      AccountBalance: accountBalances.map(a => ({
        id: a.id, clientId: a.clientId, balance: fmtDec(a.balance), tenant_id: tenantId,
        updatedAt: a.updatedAt.toISOString()
      })),
      Sale: sales.map(s => ({
        id: s.id, saleDate: s.saleDate.toISOString(), totalAmount: fmtDec(s.totalAmount), tenant_id: tenantId,
        paymentType: s.paymentType, notes: s.notes, clientId: s.clientId, sellerId: s.sellerId || 1,
        cashRegisterId: s.cashRegisterId, discountCodeApplied: s.discountCodeApplied,
        promotionsApplied: s.promotionsApplied, onAccount: s.onAccount,
        createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString()
      })),
      SaleItem: saleItems.map(si => ({
        id: si.id, quantity: si.quantity, priceAtSale: fmtDec(si.priceAtSale), tenant_id: tenantId,
        purchasePriceAtSale: fmtDec(si.purchasePriceAtSale), saleId: si.saleId, productId: si.productId
      })),
      ComboItem: comboItems.map(ci => ({
        id: ci.id, comboId: ci.comboId, productId: ci.productId, quantity: ci.quantity, tenant_id: tenantId,
        customPrice: fmtDec(ci.customPrice)
      })),
      Purchase: purchases.map(pu => ({
        id: pu.id, purchaseDate: pu.purchaseDate.toISOString(), totalAmount: fmtDec(pu.totalAmount), tenant_id: tenantId,
        status: pu.status, paymentType: pu.paymentType, invoiceNumber: pu.invoiceNumber, notes: pu.notes,
        supplierId: pu.supplierId, createdAt: pu.createdAt.toISOString(), updatedAt: pu.updatedAt.toISOString()
      })),
      PurchaseItem: purchaseItems.map(pi => ({
        id: pi.id, quantity: pi.quantity, quantityReceived: pi.quantityReceived, tenant_id: tenantId,
        purchasePrice: fmtDec(pi.purchasePrice), purchaseId: pi.purchaseId, productId: pi.productId
      })),
      Expense: expenses.map(e => ({
        id: e.id, expenseDate: e.expenseDate.toISOString(), description: e.description, tenant_id: tenantId,
        amount: fmtDec(e.amount), category: e.category, paymentType: e.paymentType, notes: e.notes,
        createdAt: e.createdAt.toISOString(), updatedAt: e.updatedAt.toISOString()
      })),
      CashMovement: cashMovements.map(cm => ({
        id: cm.id, cashRegisterId: cm.cashRegisterId, type: cm.type, paymentType: cm.paymentType, tenant_id: tenantId,
        sourceId: cm.sourceId, amount: fmtDec(cm.amount), description: cm.description,
        createdAt: cm.createdAt.toISOString()
      })),
      AccountMovement: accountMovements.map(am => ({
        id: am.id, accountBalanceId: am.accountBalanceId, type: am.type, amount: fmtDec(am.amount), tenant_id: tenantId,
        description: am.description, saleId: am.saleId, createdAt: am.createdAt.toISOString()
      }))
    };

    // 4. Enviar datos a Supabase tabla por tabla
    const summary: Record<string, number> = {};
    for (const [tableName, records] of Object.entries(payload)) {
      if (records.length === 0) continue;

      const url = `${supabaseUrl}/rest/v1/${tableName}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Prefer": "resolution=merge-duplicates"
        },
        body: JSON.stringify(records)
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Error en Supabase upsert [Tabla: ${tableName}]: [HTTP ${res.status}] ${errorText}`);
      }

      summary[tableName] = records.length;
    }

    // 5. Actualizar marca de tiempo de última sincronización
    const syncTimeString = syncStartTime.toISOString();
    await prisma.setting.upsert({
      where: { key: "supabase_last_sync" },
      update: { value: syncTimeString },
      create: { key: "supabase_last_sync", value: syncTimeString }
    });

    return {
      success: true,
      message: `Sincronización realizada con éxito. Identificador de Local: ${tenantId}`,
      lastSync: syncTimeString,
      syncedTables: summary,
      tenantId
    };
  } catch (error: any) {
    console.error("Error en runSupabaseSync:", error);
    return {
      success: false,
      message: error.message || "Error al sincronizar con Supabase."
    };
  }
}
