// lib/syncService.ts
import prisma from "./prisma";
import os from "os";
import crypto from "crypto";

const fmtDec = (val: any, fallback: string | null = "0.00") => (val !== undefined && val !== null ? val.toString() : fallback);

async function loadConfigFromDb(): Promise<Record<string, string>> {
  const settings = await prisma.setting.findMany();
  const config: Record<string, string> = {};
  for (const s of settings) {
    config[s.key] = s.value;
  }
  return config;
}

async function getSelectiveSyncCredentials(): Promise<{
  supabaseUrl: string;
  supabaseKey: string;
  tenantId: string;
}> {
  const config = await loadConfigFromDb();

  const supabaseUrl = config.supabase_url || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = config.supabase_service_role_key || process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase_anon_key || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Credenciales de Supabase no configuradas. Debe configurar SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY " +
      "en .env o en la configuración del sistema antes de sincronizar."
    );
  }

  const storeConfigs = await prisma.storeConfig.findMany();
  const firstStoreConfig = storeConfigs[0];

  const computerHostname = typeof os.hostname === "function" ? os.hostname() : "pos_local";
  const rawTenant = (
    firstStoreConfig?.slug?.trim() ||
    config.license_key?.trim() ||
    config.businessCuit?.trim() ||
    config.businessName?.trim() ||
    process.env.LICENSE_KEY?.trim() ||
    process.env.HARDWARE_ID?.trim() ||
    `pos_${computerHostname}`
  );

  const tenantId = crypto.createHash("sha256").update(rawTenant).digest("hex").slice(0, 16);

  return { supabaseUrl, supabaseKey, tenantId };
}

export async function runSupabaseSync(forceFullSync: boolean = false): Promise<{ 
  success: boolean; 
  message?: string; 
  lastSync?: string; 
  syncedTables?: Record<string, number>;
  tenantId?: string;
}> {
  try {
    const { loadEnv } = require("./envLoader");
    loadEnv();

    const config = await loadConfigFromDb();
    const { supabaseUrl, supabaseKey, tenantId } = await getSelectiveSyncCredentials();
    const lastSyncStr = config.supabase_last_sync;

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
    const webOrders = await prisma.webOrder.findMany({
      where: forceFullSync ? {} : { updatedAt: { gt: lastSync } },
      include: { items: true }
    });
    const storeConfigs = await prisma.storeConfig.findMany();
    const firstStoreConfig = storeConfigs[0];

    // 3a. Obtener IDs reales de WebOrders en Supabase para evitar duplicados por ID mismatch
    const supabaseWebOrderIds: Record<string, number> = {};
    try {
      const idUrl = `${supabaseUrl}/rest/v1/WebOrder?tenant_id=eq.${encodeURIComponent(tenantId)}&select=id,webOrderNumber`;
      const idRes = await fetch(idUrl, {
        headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` }
      });
      if (idRes.ok) {
        const existingOrders: { id: number; webOrderNumber: string }[] = await idRes.json();
        for (const o of existingOrders) {
          supabaseWebOrderIds[o.webOrderNumber] = o.id;
        }
      }
    } catch (err) {
      console.warn("[Sync] No se pudieron obtener IDs de WebOrders desde Supabase:", err);
    }

    // 3b. Serializar decodificando Decimales a strings compatibles con JSON
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
        isPublicWeb: p.isPublicWeb !== false, webCategory: p.webCategory || null,
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
        status: c.status, notes: c.notes, sellerId: c.sellerId ?? 1,
        createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString()
      })),
      AccountBalance: accountBalances.map(a => ({
        id: a.id, clientId: a.clientId, balance: fmtDec(a.balance), tenant_id: tenantId,
        updatedAt: a.updatedAt.toISOString()
      })),
      Sale: sales.map(s => ({
        id: s.id, saleDate: s.saleDate.toISOString(), totalAmount: fmtDec(s.totalAmount), tenant_id: tenantId,
        paymentType: s.paymentType, notes: s.notes, clientId: s.clientId, sellerId: s.sellerId ?? 1,
        cashRegisterId: s.cashRegisterId, discountCodeApplied: s.discountCodeApplied,
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
        status: pu.status, paymentType: pu.paymentType || 'CASH', invoiceNumber: pu.invoiceNumber, notes: pu.notes,
        supplierId: pu.supplierId, createdAt: pu.createdAt.toISOString(), updatedAt: pu.updatedAt.toISOString()
      })),
      PurchaseItem: purchaseItems.map(pi => ({
        id: pi.id, quantity: pi.quantity, quantityReceived: pi.quantityReceived ?? pi.quantity ?? 0, tenant_id: tenantId,
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
      })),
      WebOrder: webOrders
        .filter(o => supabaseWebOrderIds[o.webOrderNumber] !== undefined)
        .map(o => ({
          id: supabaseWebOrderIds[o.webOrderNumber],
          webOrderNumber: o.webOrderNumber,
          clientName: o.clientName,
          clientEmail: o.clientEmail,
          clientPhone: o.clientPhone,
          shippingAddress: o.shippingAddress,
          deliveryType: o.deliveryType,
          paymentMethod: o.paymentMethod,
          paymentStatus: o.paymentStatus,
          status: o.status,
          totalAmount: fmtDec(o.totalAmount),
          mpFeeAmount: fmtDec(o.mpFeeAmount, "0"),
          notes: o.notes,
          tenant_id: tenantId,
          createdAt: o.createdAt.toISOString(),
          updatedAt: o.updatedAt.toISOString()
        })),
      WebOrderItem: webOrders
        .filter(o => supabaseWebOrderIds[o.webOrderNumber] !== undefined)
        .flatMap(o => o.items.map(i => ({
          id: i.id,
          webOrderId: supabaseWebOrderIds[o.webOrderNumber],
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: fmtDec(i.unitPrice),
          subtotal: fmtDec(i.subtotal),
          tenant_id: tenantId
        }))),
      StoreConfig: storeConfigs.length > 0 ? storeConfigs.map(sc => ({
        id: sc.id, slug: sc.slug, businessName: sc.businessName, description: sc.description, logoUrl: sc.logoUrl, bannerUrl: sc.bannerUrl,
        primaryColor: sc.primaryColor, isWebActive: sc.isWebActive, mpAccessToken: sc.mpAccessToken, mpPublicKey: sc.mpPublicKey,
        mpFeePercent: fmtDec(sc.mpFeePercent), whatsappPhone: sc.whatsappPhone, minStockBuffer: sc.minStockBuffer, allowPickup: sc.allowPickup,
        allowDelivery: sc.allowDelivery, deliveryFee: fmtDec(sc.deliveryFee), minDeliveryAmount: fmtDec(sc.minDeliveryAmount),
        tenant_id: tenantId, createdAt: sc.createdAt.toISOString(), updatedAt: sc.updatedAt.toISOString()
      })) : []

    };

    // 4. Descargar Pedidos Web (WebOrders) y StoreConfig desde Supabase ANTES de subir,
    //    para que el paymentStatus de clinstore/MercadoPago (fuente de verdad) no sea pisado
    //    por el estado local del POS.
    try {
      const urlWebOrders = `${supabaseUrl}/rest/v1/WebOrder?tenant_id=eq.${tenantId}&select=*,WebOrderItem(*)`;
      const resWebOrders = await fetch(urlWebOrders, {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`
        }
      });
      if (resWebOrders.ok) {
        const cloudOrders = await resWebOrders.json();
        for (const order of cloudOrders) {
          const exists = await prisma.webOrder.findFirst({
            where: { webOrderNumber: order.webOrderNumber }
          });
          if (!exists) {
            await prisma.webOrder.create({
              data: {
                webOrderNumber: order.webOrderNumber,
                clientName: order.clientName,
                clientEmail: order.clientEmail,
                clientPhone: order.clientPhone,
                shippingAddress: order.shippingAddress,
                deliveryType: order.deliveryType,
                paymentMethod: order.paymentMethod,
                paymentStatus: order.paymentStatus,
                status: order.status,
                totalAmount: order.totalAmount,
                notes: order.notes,
                createdAt: new Date(order.createdAt),
                items: {
                  create: (order.WebOrderItem || []).map((i: any) => ({
                    productId: i.productId,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice,
                    subtotal: i.subtotal
                  }))
                }
              }
            });

            // Descontar stock localmente
            for (const item of (order.WebOrderItem || [])) {
              try {
                await prisma.product.update({
                  where: { id: item.productId },
                  data: { quantityStock: { decrement: item.quantity } }
                });
              } catch (err) {
                console.warn("Stock decrement error for product", item.productId, err);
              }
            }
          } else {
            const isBeingCancelled = order.status === "CANCELLED" && exists.status !== "CANCELLED";
            const isBeingRestored = order.status !== "CANCELLED" && exists.status === "CANCELLED";

            if (isBeingCancelled) {
              const existingItems = await prisma.webOrderItem.findMany({
                where: { webOrderId: exists.id }
              });
              for (const item of existingItems) {
                try {
                  await prisma.product.update({
                    where: { id: item.productId },
                    data: { quantityStock: { increment: item.quantity } }
                  });
                } catch (err) {
                  console.warn("Stock restore error for cancelled order product", item.productId, err);
                }
              }
            } else if (isBeingRestored) {
              const existingItems = await prisma.webOrderItem.findMany({
                where: { webOrderId: exists.id }
              });
              for (const item of existingItems) {
                try {
                  await prisma.product.update({
                    where: { id: item.productId },
                    data: { quantityStock: { decrement: item.quantity } }
                  });
                } catch (err) {
                  console.warn("Stock decrement error for restored order product", item.productId, err);
                }
              }
            }

            await prisma.webOrder.update({
              where: { id: exists.id },
              data: {
                paymentStatus:
                  exists.paymentStatus === "PAID" || order.paymentStatus === "PAID"
                    ? "PAID"
                    : order.paymentStatus,
                status: order.status
              }
            });
          }
        }
      }
    } catch (err) {
      console.warn("Error al descargar WebOrders desde Supabase:", err);
    }

    // 5. Descargar StoreConfig desde Supabase (trae mpAccessToken vinculado desde clinstore)
    try {
      const urlConfig = `${supabaseUrl}/rest/v1/StoreConfig?tenant_id=eq.${encodeURIComponent(tenantId)}&select=mpAccessToken,mpPublicKey`;
      const resConfig = await fetch(urlConfig, {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`
        }
      });
      if (resConfig.ok) {
        const remoteConfigs = await resConfig.json();
        const remoteConfig = remoteConfigs?.[0];
        if (remoteConfig?.mpAccessToken && remoteConfig.mpAccessToken !== firstStoreConfig?.mpAccessToken) {
          await prisma.storeConfig.update({
            where: { id: firstStoreConfig!.id },
            data: {
              mpAccessToken: remoteConfig.mpAccessToken,
              mpPublicKey: remoteConfig.mpPublicKey || "",
            },
          });
          console.log(`[Sync] mpAccessToken actualizado desde Supabase para tenant ${tenantId}`);
        }
      }
    } catch (err) {
      console.warn("Error al descargar StoreConfig desde Supabase:", err);
    }

    // 6. Enviar datos a Supabase tabla por tabla (StoreConfig primero)
    const summary = await pushEntitiesToSupabase(supabaseUrl, supabaseKey, payload);

    // 7. Actualizar marca de tiempo de última sincronización
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

// ===== SELECTIVE SYNC HELPERS =====

async function pushEntitiesToSupabase(
  supabaseUrl: string,
  supabaseKey: string,
  payload: Record<string, any[]>
): Promise<Record<string, number>> {
  const summary: Record<string, number> = {};

  const priorityTable = Object.keys(payload).includes("StoreConfig") ? "StoreConfig" : null;
  const orderedTables = priorityTable
    ? [priorityTable, ...Object.keys(payload).filter(t => t !== priorityTable)]
    : Object.keys(payload);

  for (const tableName of orderedTables) {
    const records = payload[tableName];
    if (!records || records.length === 0) continue;

    const url = `${supabaseUrl}/rest/v1/${tableName}`;
    let res = await fetch(url, {
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
      let errorText = await res.text();

      if (tableName === "Product" && errorText.includes("PGRST204")) {
        const strippedRecords = records.map((r: any) => {
          const { isPublicWeb, webCategory, ...rest } = r;
          return rest;
        });
        res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Prefer": "resolution=merge-duplicates"
          },
          body: JSON.stringify(strippedRecords)
        });
        if (!res.ok) {
          errorText = await res.text();
          throw new Error(`Error en Supabase upsert [Tabla: ${tableName}]: [HTTP ${res.status}] ${errorText}`);
        }
      } else {
        throw new Error(`Error en Supabase upsert [Tabla: ${tableName}]: [HTTP ${res.status}] ${errorText}`);
      }
    }

    summary[tableName] = records.length;
  }

  return summary;
}

export async function syncSingleProduct(productId: number): Promise<boolean> {
  try {
    const { supabaseUrl, supabaseKey, tenantId } = await getSelectiveSyncCredentials();

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { brand: true, category: true, supplier: true }
    });
    if (!product) return false;

    const payload: Record<string, any[]> = {
      Product: [{
        id: product.id, name: product.name, sku: product.sku, description: product.description, tenant_id: tenantId,
        pricePurchase: fmtDec(product.pricePurchase), priceSale: fmtDec(product.priceSale),
        quantityStock: product.quantityStock, stockMinAlert: product.stockMinAlert, unitType: product.unitType,
        isPublicWeb: product.isPublicWeb !== false, webCategory: product.webCategory || null,
        brandId: product.brandId, categoryId: product.categoryId, supplierId: product.supplierId,
        createdAt: product.createdAt.toISOString(), updatedAt: product.updatedAt.toISOString()
      }]
    };

    await pushEntitiesToSupabase(supabaseUrl, supabaseKey, payload);
    return true;
  } catch (error) {
    console.error("Error en syncSingleProduct:", error);
    return false;
  }
}

export async function syncProducts(productIds: number[]): Promise<boolean> {
  try {
    const { supabaseUrl, supabaseKey, tenantId } = await getSelectiveSyncCredentials();

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { brand: true, category: true, supplier: true }
    });
    if (products.length === 0) return false;

    const payload: Record<string, any[]> = {
      Product: products.map(p => ({
        id: p.id, name: p.name, sku: p.sku, description: p.description, tenant_id: tenantId,
        pricePurchase: fmtDec(p.pricePurchase), priceSale: fmtDec(p.priceSale),
        quantityStock: p.quantityStock, stockMinAlert: p.stockMinAlert, unitType: p.unitType,
        isPublicWeb: p.isPublicWeb !== false, webCategory: p.webCategory || null,
        brandId: p.brandId, categoryId: p.categoryId, supplierId: p.supplierId,
        createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString()
      }))
    };

    await pushEntitiesToSupabase(supabaseUrl, supabaseKey, payload);
    return true;
  } catch (error) {
    console.error("Error en syncProducts:", error);
    return false;
  }
}

export async function deleteProductFromSupabase(productId: number): Promise<boolean> {
  try {
    const { supabaseUrl, supabaseKey, tenantId } = await getSelectiveSyncCredentials();

    const url = `${supabaseUrl}/rest/v1/Product?tenant_id=eq.${encodeURIComponent(tenantId)}&id=eq.${productId}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      }
    });

    return res.ok;
  } catch (error) {
    console.error("Error en deleteProductFromSupabase:", error);
    return false;
  }
}

export async function syncWebOrderToSupabase(orderId: number): Promise<boolean> {
  try {
    const { supabaseUrl, supabaseKey, tenantId } = await getSelectiveSyncCredentials();

    const order = await prisma.webOrder.findUnique({
      where: { id: orderId },
      include: { items: true }
    });
    if (!order) return false;

    const payload: Record<string, any[]> = {
      WebOrder: [{
        id: order.id,
        webOrderNumber: order.webOrderNumber,
        clientName: order.clientName,
        clientEmail: order.clientEmail,
        clientPhone: order.clientPhone,
        shippingAddress: order.shippingAddress,
        deliveryType: order.deliveryType,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        status: order.status,
        totalAmount: fmtDec(order.totalAmount),
        mpFeeAmount: fmtDec(order.mpFeeAmount, "0"),
        notes: order.notes,
        tenant_id: tenantId,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString()
      }],
      WebOrderItem: order.items.map(i => ({
        id: i.id,
        webOrderId: order.id,
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: fmtDec(i.unitPrice),
        subtotal: fmtDec(i.subtotal),
        tenant_id: tenantId
      }))
    };

    await pushEntitiesToSupabase(supabaseUrl, supabaseKey, payload);
    return true;
  } catch (error) {
    console.error("Error en syncWebOrderToSupabase:", error);
    return false;
  }
}

export async function deleteWebOrdersFromSupabase(webOrderNumbers: string[]): Promise<boolean> {
  try {
    const { supabaseUrl, supabaseKey, tenantId } = await getSelectiveSyncCredentials();

    const numbers = [...new Set(webOrderNumbers)].filter(Boolean);
    if (numbers.length === 0) return true;

    const headers = { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}`, "Content-Type": "application/json" };
    const apiBase = `${supabaseUrl}/rest/v1`;
    const tenantParam = `tenant_id=eq.${encodeURIComponent(tenantId)}`;

    let allSupabaseIds: number[] = [];
    for (const num of numbers) {
      const p = `webOrderNumber=eq.${encodeURIComponent(num)}`;
      const r = await fetch(`${apiBase}/WebOrder?${tenantParam}&${p}&select=id`, { headers });
      if (r.ok) {
        const rows: { id: number }[] = await r.json();
        allSupabaseIds.push(...rows.map(x => x.id));
      }
    }

    const itemsDeleteIds = [...new Set(allSupabaseIds)];
    if (itemsDeleteIds.length > 0) {
      const idList = itemsDeleteIds.join(",");
      await fetch(`${apiBase}/WebOrderItem?${tenantParam}&webOrderId=in.(${idList})`, { method: "DELETE", headers });
    }

    let totalDeleted = 0;
    for (const num of numbers) {
      const p = `webOrderNumber=eq.${encodeURIComponent(num)}`;
      const r = await fetch(`${apiBase}/WebOrder?${tenantParam}&${p}`, { method: "DELETE", headers });
      if (r.ok) {
        totalDeleted++;
      } else {
        const text = await r.text().catch(() => "");
        console.warn(`[deleteWebOrdersFromSupabase] Delete fail ${num}: ${r.status} ${text}`);
      }
    }

    console.log(`[deleteWebOrdersFromSupabase] Deleted ${totalDeleted}/${numbers.length} orders from Supabase`);
    return totalDeleted > 0;
  } catch (error) {
    console.error("Error en deleteWebOrdersFromSupabase:", error);
    return false;
  }
}
