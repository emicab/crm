// lib/syncService.ts
import prisma from "./prisma";
import os from "os";
import crypto from "crypto";
import { isMainDevice } from "./branchIdentity";
import { isCloudNewer } from "./syncConflict";

const fmtDec = (val: any, fallback: string | null = "0.00") => (val !== undefined && val !== null ? val.toString() : fallback);

async function loadConfigFromDb(): Promise<Record<string, string>> {
  const settings = await prisma.setting.findMany();
  const config: Record<string, string> = {};
  for (const s of settings) {
    config[s.key] = s.value;
  }
  return config;
}

export async function getSelectiveSyncCredentials(): Promise<{
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

  // Sucursal emparejada: el tenant_id asignado por el código manda sobre cualquier otro cálculo.
  const storedTenantId = config.tenant_id?.trim();
  let tenantId: string;
  if (storedTenantId) {
    tenantId = storedTenantId;
  } else {
    const computerHostname = typeof os.hostname === "function" ? os.hostname() : "pos_local";
    const rawTenant = (
      config.license_key?.trim() ||
      firstStoreConfig?.slug?.trim() ||
      config.businessCuit?.trim() ||
      config.businessName?.trim() ||
      process.env.LICENSE_KEY?.trim() ||
      process.env.HARDWARE_ID?.trim() ||
      `pos_${computerHostname}`
    );
    tenantId = crypto.createHash("sha256").update(rawTenant).digest("hex").slice(0, 16);
  }

  return { supabaseUrl, supabaseKey, tenantId };
}

async function recalcProductTotal(productId: number): Promise<void> {
  const totalStock = await prisma.productBranchStock.aggregate({
    where: { productId },
    _sum: { quantityStock: true }
  });
  await prisma.product.update({
    where: { id: productId },
    data: { quantityStock: totalStock._sum.quantityStock ?? 0 }
  });
}

async function recalcProductTotals(productIds: Iterable<number>): Promise<void> {
  const uniqueIds = Array.from(new Set(productIds));
  for (const id of uniqueIds) {
    await recalcProductTotal(id);
  }
}

async function getMainBranchId(): Promise<number | null> {
  const mainBranch = await prisma.branch.findFirst({ where: { isMain: true } });
  return mainBranch?.id ?? null;
}

async function adjustBranchStock(productId: number, branchId: number, delta: number): Promise<void> {
  await prisma.productBranchStock.upsert({
    where: { productId_branchId: { productId, branchId } },
    update: { quantityStock: { increment: delta } },
    create: { productId, branchId, quantityStock: delta }
  });
}

async function fetchAllRows(url: string, headers: Record<string, string>): Promise<any[] | null> {
  const rows: any[] = [];
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const res = await fetch(url, { headers: { ...headers, Range: `${from}-${from + pageSize - 1}` } });
    if (!res.ok) {
      console.warn(`[Sync] GET ${res.status} al descargar ${url.split("?")[0]}.`);
      return null;
    }
    const page = await res.json();
    rows.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

export async function runSupabaseSync(forceFullSync: boolean = false): Promise<{
  success: boolean;
  message?: string;
  lastSync?: string;
  syncedTables?: Record<string, number>;
  tenantId?: string;
}> {
  try {
    const { loadEnv } = await import("./envLoader");
    loadEnv();

    const config = await loadConfigFromDb();
    const { supabaseUrl, supabaseKey, tenantId } = await getSelectiveSyncCredentials();
    const lastSyncStr = config.supabase_last_sync;

    const isMainDeviceFlag = await isMainDevice();

    // La Casa Central revalida su licencia online en cada sync: si el plan bajó
    // (mensualidad no renovada) se actualiza app_plan local y se propaga a la
    // nube para que las sucursales también bajen.
    if (isMainDeviceFlag) {
      try {
        const { revalidateLicense } = await import("./licenseStatus");
        await revalidateLicense();
      } catch (reErr) {
        console.warn("[Sync] No se pudo revalidar la licencia:", reErr);
      }
    }

    const lastSync = (forceFullSync || !lastSyncStr) ? new Date(0) : new Date(lastSyncStr);
    const syncStartTime = new Date();

    const productIdsToRecalc = new Set<number>();

    const mainBranchId = await getMainBranchId();

    try {
      if (mainBranchId) {
        const unlinkedProducts = await prisma.product.findMany({
          where: { branchStocks: { none: {} } },
          select: { id: true, quantityStock: true }
        });
        for (const p of unlinkedProducts) {
          await prisma.productBranchStock.upsert({
            where: { productId_branchId: { productId: p.id, branchId: mainBranchId } },
            update: {},
            create: { productId: p.id, branchId: mainBranchId, quantityStock: p.quantityStock }
          });
        }
      }
    } catch (initErr) {
      console.warn("[Sync] Error auto-inicializando branchStocks:", initErr);
    }

    const branches = await prisma.branch.findMany({ where: forceFullSync ? {} : { updatedAt: { gt: lastSync } } });
    const branchStocks = await prisma.productBranchStock.findMany({ where: forceFullSync ? {} : { updatedAt: { gt: lastSync } } });
    const stockTransfers = await prisma.stockTransfer.findMany({ where: forceFullSync ? {} : { createdAt: { gt: lastSync } } });
    const stockTransferItems = await prisma.stockTransferItem.findMany();

    const brands = await prisma.brand.findMany();
    const categories = await prisma.category.findMany();
    const suppliers = await prisma.supplier.findMany();
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
      Branch: branches.map(b => ({
        id: b.id, name: b.name, address: b.address || null, phone: b.phone || null, isMain: b.isMain, tenant_id: tenantId,
        createdAt: b.createdAt.toISOString(), updatedAt: b.updatedAt.toISOString()
      })),
      Product: products.map(p => ({
        id: p.id, name: p.name, sku: p.sku, description: p.description, tenant_id: tenantId,
        pricePurchase: fmtDec(p.pricePurchase), priceSale: fmtDec(p.priceSale),
        quantityStock: p.quantityStock, stockMinAlert: p.stockMinAlert, unitType: p.unitType,
        isPublicWeb: p.isPublicWeb !== false, webCategory: p.webCategory || null,
        brandId: p.brandId, categoryId: p.categoryId, supplierId: p.supplierId,
        createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString()
      })),
      ProductBranchStock: branchStocks.map(bs => ({
        productId: bs.productId, branchId: bs.branchId, quantityStock: bs.quantityStock, tenant_id: tenantId,
        updatedAt: bs.updatedAt.toISOString()
      })),
      StockTransfer: stockTransfers.map(st => ({
        id: st.id, sourceBranchId: st.sourceBranchId, targetBranchId: st.targetBranchId,
        status: st.status, notes: st.notes || null, createdByName: st.createdByName || null, tenant_id: tenantId,
        createdAt: st.createdAt.toISOString()
      })),
      StockTransferItem: stockTransferItems.map(sti => ({
        transferId: sti.transferId, productId: sti.productId, productName: sti.productName || null, quantity: sti.quantity, tenant_id: tenantId
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
      StoreConfig: isMainDeviceFlag && storeConfigs.length > 0 ? storeConfigs.map(sc => ({
        id: sc.id, slug: sc.slug, businessName: sc.businessName, description: sc.description, logoUrl: sc.logoUrl, bannerUrl: sc.bannerUrl,
        primaryColor: sc.primaryColor, isWebActive: sc.isWebActive, mpAccessToken: sc.mpAccessToken, mpPublicKey: sc.mpPublicKey,
        mpFeePercent: fmtDec(sc.mpFeePercent), whatsappPhone: sc.whatsappPhone, minStockBuffer: sc.minStockBuffer, allowPickup: sc.allowPickup,
        allowDelivery: sc.allowDelivery, deliveryFee: fmtDec(sc.deliveryFee), minDeliveryAmount: fmtDec(sc.minDeliveryAmount),
        tenant_id: tenantId, createdAt: sc.createdAt.toISOString(), updatedAt: sc.updatedAt.toISOString()
      })) : [],
      Setting: isMainDeviceFlag && config.app_plan ? [{
        key: "app_plan", value: config.app_plan, tenant_id: tenantId,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      }] : []
    };

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

            if (mainBranchId) {
              for (const item of (order.WebOrderItem || [])) {
                try {
                  await adjustBranchStock(item.productId, mainBranchId, -item.quantity);
                  productIdsToRecalc.add(item.productId);
                } catch (err) {
                  console.warn("Stock decrement error for product", item.productId, err);
                }
              }
            } else {
              console.warn("[Sync] No hay sucursal principal configurada; no se pudo descontar stock del pedido web", order.webOrderNumber);
            }
          } else {
            const isBeingCancelled = order.status === "CANCELLED" && exists.status !== "CANCELLED";
            const isBeingRestored = order.status !== "CANCELLED" && exists.status === "CANCELLED";

            if ((isBeingCancelled || isBeingRestored) && mainBranchId) {
              const existingItems = await prisma.webOrderItem.findMany({
                where: { webOrderId: exists.id }
              });
              const sign = isBeingCancelled ? 1 : -1; 
              for (const item of existingItems) {
                try {
                  await adjustBranchStock(item.productId, mainBranchId, sign * item.quantity);
                  productIdsToRecalc.add(item.productId);
                } catch (err) {
                  console.warn("Stock restore/decrement error for product", item.productId, err);
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

    try {
      const urlConfig = `${supabaseUrl}/rest/v1/StoreConfig?tenant_id=eq.${encodeURIComponent(tenantId)}&select=*`;
      const resConfig = await fetch(urlConfig, {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`
        }
      });
      if (resConfig.ok) {
        const remoteConfigs = await resConfig.json();
        const remoteConfig = remoteConfigs?.[0];

        if (remoteConfig) {
          if (!firstStoreConfig) {
            // La tienda web la administra la Casa Central. Si esta PC no tiene
            // StoreConfig local y es la Casa Central, se copia fielmente la de
            // la nube (sin inventar un slug tipo "tienda-<timestamp>" que pisaba
            // la tienda real). Las sucursales no la crean.
            if (isMainDeviceFlag) {
              await prisma.storeConfig.create({
                data: {
                  slug: remoteConfig.slug || `tienda-${tenantId}`,
                  businessName: remoteConfig.businessName || "Mi Tienda Web",
                  description: remoteConfig.description || null,
                  logoUrl: remoteConfig.logoUrl || null,
                  bannerUrl: remoteConfig.bannerUrl || null,
                  primaryColor: remoteConfig.primaryColor || "#2563eb",
                  isWebActive: remoteConfig.isWebActive === true,
                  mpAccessToken: remoteConfig.mpAccessToken || null,
                  mpPublicKey: remoteConfig.mpPublicKey || null,
                  mpFeePercent: remoteConfig.mpFeePercent || 0,
                  whatsappPhone: remoteConfig.whatsappPhone || null,
                  minStockBuffer: parseFloat(remoteConfig.minStockBuffer) || 0,
                  allowPickup: remoteConfig.allowPickup !== false,
                  allowDelivery: remoteConfig.allowDelivery !== false,
                  deliveryFee: remoteConfig.deliveryFee || 0,
                  minDeliveryAmount: remoteConfig.minDeliveryAmount || 0,
                }
              });
              console.log(`[Sync] StoreConfig local creada desde Supabase (Casa Central) para tenant ${tenantId}`);
            } else {
              console.log(`[Sync] Esta PC es una sucursal y no tiene StoreConfig local; la tienda web la administra la Casa Central (tenant ${tenantId}).`);
            }
          } else if (
            remoteConfig.mpAccessToken &&
            remoteConfig.mpAccessToken !== firstStoreConfig.mpAccessToken &&
            isCloudNewer(remoteConfig.updatedAt, firstStoreConfig.updatedAt)
          ) {
            await prisma.storeConfig.update({
              where: { id: firstStoreConfig.id },
              data: {
                mpAccessToken: remoteConfig.mpAccessToken,
                mpPublicKey: remoteConfig.mpPublicKey || "",
              },
            });
            console.log(`[Sync] mpAccessToken actualizado desde Supabase para tenant ${tenantId}`);
          }
        }
      }
    } catch (err) {
      console.warn("Error al descargar StoreConfig desde Supabase:", err);
    }

    // Descargar el plan desde la nube. En la Casa Central el valor local manda
    // (ya se revalidó al inicio); en las sucursales se aplica el plan del main.
    if (!isMainDeviceFlag) {
      try {
        const headers = { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` };
        const tenantParam = `tenant_id=eq.${encodeURIComponent(tenantId)}`;
        const resSetting = await fetch(`${supabaseUrl}/rest/v1/Setting?${tenantParam}&key=eq.app_plan&select=*`, { headers });
        if (resSetting.ok) {
          const rows = await resSetting.json();
          const planRow = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
          if (planRow && planRow.value) {
            const targetPlan = planRow.value === "pro" ? "pro" : "basico";
            const { setPlanSettings } = await import("./branchIdentity");
            await setPlanSettings(targetPlan);
            console.log(`[Sync] Plan actualizado en sucursal desde la Casa Central: ${targetPlan}`);
          }
        }
      } catch (err) {
        console.warn("Error al descargar el plan desde Supabase:", err);
      }
    }

    // [MODIFICADO BUG 2] Mover PULL de Supabase ANTES del PUSH
    // 6b. Descargar Entidades Globales (Branches, Products, Brands, Categories, Stock) desde Supabase hacia la DB Local
    try {
      const headers = { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` };
      const tenantParam = `tenant_id=eq.${encodeURIComponent(tenantId)}`;

      const resB = await fetch(`${supabaseUrl}/rest/v1/Branch?${tenantParam}&select=*`, { headers });
      if (resB.ok) {
        const cloudBranches = await resB.json();
        for (const b of cloudBranches) {
          await prisma.branch.upsert({
            where: { id: b.id },
            update: { name: b.name, address: b.address, phone: b.phone, isMain: b.isMain, updatedAt: new Date(b.updatedAt) },
            create: { id: b.id, name: b.name, address: b.address, phone: b.phone, isMain: b.isMain, updatedAt: new Date(b.updatedAt) }
          });
        }
      }

      const resBr = await fetch(`${supabaseUrl}/rest/v1/Brand?${tenantParam}&select=*`, { headers });
      if (resBr.ok) {
        const cloudBrands = await resBr.json();
        for (const b of cloudBrands) {
          await prisma.brand.upsert({
            where: { id: b.id },
            update: { name: b.name, logoUrl: b.logoUrl, updatedAt: new Date(b.updatedAt) },
            create: { id: b.id, name: b.name, logoUrl: b.logoUrl, updatedAt: new Date(b.updatedAt) }
          });
        }
      }

      const resCat = await fetch(`${supabaseUrl}/rest/v1/Category?${tenantParam}&select=*`, { headers });
      if (resCat.ok) {
        const cloudCats = await resCat.json();
        for (const c of cloudCats) {
          await prisma.category.upsert({
            where: { id: c.id },
            update: { name: c.name, logoUrl: c.logoUrl, updatedAt: new Date(c.updatedAt) },
            create: { id: c.id, name: c.name, logoUrl: c.logoUrl, updatedAt: new Date(c.updatedAt) }
          });
        }
      }

      const resSup = await fetch(`${supabaseUrl}/rest/v1/Supplier?${tenantParam}&select=*`, { headers });
      if (resSup.ok) {
        const cloudSuppliers = await resSup.json();
        for (const s of cloudSuppliers) {
          await prisma.supplier.upsert({
            where: { id: s.id },
            update: { name: s.name, contactPerson: s.contactPerson, email: s.email, phone: s.phone, address: s.address, notes: s.notes, updatedAt: new Date(s.updatedAt) },
            create: { id: s.id, name: s.name, contactPerson: s.contactPerson, email: s.email, phone: s.phone, address: s.address, notes: s.notes, updatedAt: new Date(s.updatedAt) }
          });
        }
      }

      const cloudProducts = await fetchAllRows(`${supabaseUrl}/rest/v1/Product?${tenantParam}&select=*`, headers);
      if (cloudProducts) {
        for (const p of cloudProducts) {
          const brandExists = await prisma.brand.findUnique({ where: { id: p.brandId } });
          const categoryExists = await prisma.category.findUnique({ where: { id: p.categoryId } });
          const supplierExists = p.supplierId ? await prisma.supplier.findUnique({ where: { id: p.supplierId } }) : null;

          if (!brandExists || !categoryExists) continue;

          const skuValue = p.sku ? String(p.sku) : null;

          // Multi-sucursal: si el ID de la nube no existe localmente pero ese SKU ya está
          // en otro producto local, actualizamos ESE producto en vez de crear un duplicado
          // y romper la constraint única de SKU.
          let productId = p.id;
          const existingById = await prisma.product.findUnique({ where: { id: p.id }, select: { id: true } });
          if (!existingById && skuValue) {
            const existingBySku = await prisma.product.findUnique({ where: { sku: skuValue }, select: { id: true } });
            if (existingBySku) productId = existingBySku.id;
          }

          try {
            await prisma.product.upsert({
              where: { id: productId },
              update: {
                name: p.name, sku: skuValue, description: p.description || null,
                pricePurchase: p.pricePurchase, priceSale: p.priceSale,
                stockMinAlert: p.stockMinAlert,
                unitType: p.unitType || null, isPublicWeb: p.isPublicWeb !== false,
                brandId: p.brandId, categoryId: p.categoryId, supplierId: supplierExists ? p.supplierId : null,
                updatedAt: new Date(p.updatedAt)
              },
              create: {
                id: productId, name: p.name, sku: skuValue, description: p.description || null,
                pricePurchase: p.pricePurchase, priceSale: p.priceSale,
                quantityStock: p.quantityStock, stockMinAlert: p.stockMinAlert,
                unitType: p.unitType || null, isPublicWeb: p.isPublicWeb !== false,
                brandId: p.brandId, categoryId: p.categoryId, supplierId: supplierExists ? p.supplierId : null,
                updatedAt: new Date(p.updatedAt)
              }
            });
          } catch (upsertErr: any) {
            if (upsertErr?.code === "P2002") {
              console.warn(`[Sync] Conflicto de SKU al pull producto ${p.id} (${p.name}). Se omite para no romper la sincronización.`);
              continue;
            }
            throw upsertErr;
          }
          productIdsToRecalc.add(productId);
        }
      }

      const cloudPBS = await fetchAllRows(`${supabaseUrl}/rest/v1/ProductBranchStock?${tenantParam}&select=*`, headers);
      if (cloudPBS) {
        console.log(`[Sync] Pulled ${cloudPBS.length} ProductBranchStock records from Supabase.`);
        let skippedPbs = 0;
        for (const bs of cloudPBS) {
          const productExists = await prisma.product.findUnique({ where: { id: bs.productId }, select: { id: true } });
          const branchExists = await prisma.branch.findUnique({ where: { id: bs.branchId }, select: { id: true } });
          if (!productExists || !branchExists) {
            skippedPbs++;
            continue;
          }
          await prisma.productBranchStock.upsert({
            where: {
              productId_branchId: { productId: bs.productId, branchId: bs.branchId }
            },
            update: { quantityStock: bs.quantityStock, updatedAt: new Date(bs.updatedAt) },
            create: { productId: bs.productId, branchId: bs.branchId, quantityStock: bs.quantityStock, updatedAt: new Date(bs.updatedAt) }
          });
          productIdsToRecalc.add(bs.productId);
        }
        if (skippedPbs > 0) console.warn(`[Sync] PBS: ${skippedPbs} filas omitidas (producto o sucursal inexistente localmente).`);
      } else {
        console.warn("[Sync] No se pudo descargar ProductBranchStock desde Supabase.");
      }

      // Traspasos de stock: se descargan para que el destino vea los pedidos
      // SENT y el emisor vea la respuesta (COMPLETED/REJECTED/CANCELLED).
      try {
        const resST = await fetch(`${supabaseUrl}/rest/v1/StockTransfer?${tenantParam}&select=*`, { headers });
        if (resST.ok) {
          const cloudTransfers = await resST.json();
          for (const st of cloudTransfers) {
            const branchExists = await prisma.branch.findUnique({ where: { id: st.sourceBranchId }, select: { id: true } })
              && await prisma.branch.findUnique({ where: { id: st.targetBranchId }, select: { id: true } });
            if (!branchExists) continue;
            await prisma.stockTransfer.upsert({
              where: { id: st.id },
              update: {
                sourceBranchId: st.sourceBranchId, targetBranchId: st.targetBranchId,
                status: st.status, notes: st.notes || null, createdByName: st.createdByName || null,
              },
              create: {
                id: st.id, sourceBranchId: st.sourceBranchId, targetBranchId: st.targetBranchId,
                status: st.status, notes: st.notes || null, createdByName: st.createdByName || null,
                createdAt: new Date(st.createdAt),
              },
            });
          }
        }

        const resSTI = await fetch(`${supabaseUrl}/rest/v1/StockTransferItem?${tenantParam}&select=*`, { headers });
        if (resSTI.ok) {
          const cloudItems = await resSTI.json();
          for (const sti of cloudItems) {
            const transferExists = await prisma.stockTransfer.findUnique({ where: { id: sti.transferId }, select: { id: true } });
            if (!transferExists) continue;
            await prisma.stockTransferItem.upsert({
              where: {
                transferId_productId: { transferId: sti.transferId, productId: sti.productId },
              },
              update: { productName: sti.productName || null, quantity: sti.quantity, receivedQuantity: sti.receivedQuantity ?? null },
              create: {
                transferId: sti.transferId, productId: sti.productId,
                productName: sti.productName || null, quantity: sti.quantity, receivedQuantity: sti.receivedQuantity ?? null,
              },
            });
          }
        }
      } catch (stErr) {
        console.warn("[Sync] Error al descargar StockTransfer desde Supabase:", stErr);
      }
    } catch (pullErr) {
      console.warn("[Sync] Error al descargar entidades desde Supabase:", pullErr);
    }

    // 6c. Recalcular el total (PULL PUSH fix)
    await recalcProductTotals(productIdsToRecalc);

    // [HOTFIX BUG 2] Refrescar los arrays del payload antes del PUSH para garantizar que se suban los datos unificados y evitar pisar los datos de Supabase.
    if (productIdsToRecalc.size > 0) {
      const freshProducts = await prisma.product.findMany({ where: forceFullSync ? {} : { updatedAt: { gt: lastSync } } });
      const freshBranchStocks = await prisma.productBranchStock.findMany({ where: forceFullSync ? {} : { updatedAt: { gt: lastSync } } });
      
      payload.Product = freshProducts.map(p => ({
        id: p.id, name: p.name, sku: p.sku, description: p.description, tenant_id: tenantId,
        pricePurchase: fmtDec(p.pricePurchase), priceSale: fmtDec(p.priceSale),
        quantityStock: p.quantityStock, stockMinAlert: p.stockMinAlert, unitType: p.unitType,
        isPublicWeb: p.isPublicWeb !== false, webCategory: p.webCategory || null,
        brandId: p.brandId, categoryId: p.categoryId, supplierId: p.supplierId,
        createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString()
      }));
      
      payload.ProductBranchStock = freshBranchStocks.map(bs => ({
        productId: bs.productId, branchId: bs.branchId, quantityStock: bs.quantityStock, tenant_id: tenantId,
        updatedAt: bs.updatedAt.toISOString()
      }));
    }

    // 6. Enviar datos a Supabase tabla por tabla (StoreConfig primero)
    const summary = await pushEntitiesToSupabase(supabaseUrl, supabaseKey, payload);

    // 7. Actualizar marca de tiempo de última sincronización
    const syncTimeString = syncStartTime.toISOString();
    console.log(`[Sync] Saving lastSync: ${syncTimeString}`);
    await prisma.setting.upsert({
      where: { key: "supabase_last_sync" },
      update: { value: syncTimeString },
      create: { key: "supabase_last_sync", value: syncTimeString }
    });

    console.log(`[Sync] Finished successfully.`);

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
      include: { brand: true, category: true, supplier: true, branchStocks: true }
    });
    if (!product) return false;

    const payload: Record<string, any[]> = {};

    if (product.brand) {
      payload.Brand = [{
        id: product.brand.id, name: product.brand.name, tenant_id: tenantId,
        createdAt: product.brand.createdAt.toISOString(), updatedAt: product.brand.updatedAt.toISOString()
      }];
    }
    if (product.category) {
      payload.Category = [{
        id: product.category.id, name: product.category.name, tenant_id: tenantId,
        createdAt: product.category.createdAt.toISOString(), updatedAt: product.category.updatedAt.toISOString()
      }];
    }
    if (product.supplier) {
      payload.Supplier = [{
        id: product.supplier.id, name: product.supplier.name, phone: product.supplier.phone || null,
        email: product.supplier.email || null, address: product.supplier.address || null, tenant_id: tenantId,
        createdAt: product.supplier.createdAt.toISOString(), updatedAt: product.supplier.updatedAt.toISOString()
      }];
    }

    payload.Product = [{
      id: product.id, name: product.name, sku: product.sku, description: product.description, tenant_id: tenantId,
      pricePurchase: fmtDec(product.pricePurchase), priceSale: fmtDec(product.priceSale),
      quantityStock: product.quantityStock, stockMinAlert: product.stockMinAlert, unitType: product.unitType,
      isPublicWeb: product.isPublicWeb !== false, webCategory: product.webCategory || null,
      brandId: product.brandId, categoryId: product.categoryId, supplierId: product.supplierId,
      createdAt: product.createdAt.toISOString(), updatedAt: product.updatedAt.toISOString()
    }];

    payload.ProductBranchStock = (product.branchStocks || []).map(bs => ({
      productId: bs.productId, branchId: bs.branchId, quantityStock: bs.quantityStock, tenant_id: tenantId,
      updatedAt: bs.updatedAt.toISOString()
    }));

    await pushEntitiesToSupabase(supabaseUrl, supabaseKey, payload);
    
    // [MODIFICADO BUG 3] Bajar los cambios desde el otro POS (ej. stock descontado por ventas) y recalcular local
    await pullSingleProductStock(productId);
    
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
      include: { brand: true, category: true, supplier: true, branchStocks: true }
    });
    if (products.length === 0) return false;

    const brands = Array.from(new Map(products.filter(p => p.brand).map(p => [p.brand!.id, p.brand!])).values());
    const categories = Array.from(new Map(products.filter(p => p.category).map(p => [p.category!.id, p.category!])).values());
    const suppliers = Array.from(new Map(products.filter(p => p.supplier).map(p => [p.supplier!.id, p.supplier!])).values());
    const branchStocks = products.flatMap(p => p.branchStocks || []);

    const payload: Record<string, any[]> = {};

    if (brands.length > 0) {
      payload.Brand = brands.map(b => ({
        id: b.id, name: b.name, tenant_id: tenantId,
        createdAt: b.createdAt.toISOString(), updatedAt: b.updatedAt.toISOString()
      }));
    }
    if (categories.length > 0) {
      payload.Category = categories.map(c => ({
        id: c.id, name: c.name, tenant_id: tenantId,
        createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString()
      }));
    }
    if (suppliers.length > 0) {
      payload.Supplier = suppliers.map(s => ({
        id: s.id, name: s.name, phone: s.phone || null, email: s.email || null, address: s.address || null, tenant_id: tenantId,
        createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString()
      }));
    }

    payload.Product = products.map(p => ({
      id: p.id, name: p.name, sku: p.sku, description: p.description, tenant_id: tenantId,
      pricePurchase: fmtDec(p.pricePurchase), priceSale: fmtDec(p.priceSale),
      quantityStock: p.quantityStock, stockMinAlert: p.stockMinAlert, unitType: p.unitType,
      isPublicWeb: p.isPublicWeb !== false, webCategory: p.webCategory || null,
      brandId: p.brandId, categoryId: p.categoryId, supplierId: p.supplierId,
      createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString()
    }));

    payload.ProductBranchStock = branchStocks.map(bs => ({
      productId: bs.productId, branchId: bs.branchId, quantityStock: bs.quantityStock, tenant_id: tenantId,
      updatedAt: bs.updatedAt.toISOString()
    }));

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

export async function pullSingleProductStock(productId: number): Promise<boolean> {
  try {
    const { supabaseUrl, supabaseKey, tenantId } = await getSelectiveSyncCredentials();
    const headers = { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` };
    const tenantParam = `tenant_id=eq.${encodeURIComponent(tenantId)}`;

    const resPBS = await fetch(
      `${supabaseUrl}/rest/v1/ProductBranchStock?${tenantParam}&productId=eq.${productId}&select=*`,
      { headers }
    );
    if (!resPBS.ok) return false;

    const cloudPBS = await resPBS.json();
    for (const bs of cloudPBS) {
      await prisma.productBranchStock.upsert({
        where: { productId_branchId: { productId: bs.productId, branchId: bs.branchId } },
        update: { quantityStock: bs.quantityStock },
        create: { productId: bs.productId, branchId: bs.branchId, quantityStock: bs.quantityStock }
      });
    }

    await recalcProductTotal(productId);
    return true;
  } catch (error) {
    console.error("Error en pullSingleProductStock:", error);
    return false;
  }
}

// Sync de stock liviano post-venta. Sube a la nube el stock de los productos
// vendidos (solo de la sucursal local) y baja el de las otras sucursales para
// esos mismos productos, sin recorrer el resto del catálogo. Fire-and-forget.
export async function syncStockForProducts(productIds: number[]): Promise<boolean> {
  try {
    const uniqueIds = Array.from(new Set(productIds));
    if (uniqueIds.length === 0) return false;

    const { supabaseUrl, supabaseKey, tenantId } = await getSelectiveSyncCredentials();

    // 1. Recalcular totales locales antes del push (Product.quantityStock = suma de PBS)
    await recalcProductTotals(uniqueIds);

    // 2. Leer productos con su stock por sucursal
    const products = await prisma.product.findMany({
      where: { id: { in: uniqueIds } },
      include: { branchStocks: true }
    });
    if (products.length === 0) return false;

    // 3. Push: solo Product + ProductBranchStock (sin brand/category/supplier)
    const payload: Record<string, any[]> = {};
    payload.Product = products.map(p => ({
      id: p.id, name: p.name, sku: p.sku, description: p.description, tenant_id: tenantId,
      pricePurchase: fmtDec(p.pricePurchase), priceSale: fmtDec(p.priceSale),
      quantityStock: p.quantityStock, stockMinAlert: p.stockMinAlert, unitType: p.unitType,
      isPublicWeb: p.isPublicWeb !== false, webCategory: p.webCategory || null,
      brandId: p.brandId, categoryId: p.categoryId, supplierId: p.supplierId,
      createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString()
    }));
    payload.ProductBranchStock = products.flatMap(p => p.branchStocks || []).map(bs => ({
      productId: bs.productId, branchId: bs.branchId, quantityStock: bs.quantityStock, tenant_id: tenantId,
      updatedAt: bs.updatedAt.toISOString()
    }));

    await pushEntitiesToSupabase(supabaseUrl, supabaseKey, payload);

    // 4. Pull: bajar el stock de esos productos de todas las sucursales (una sola query)
    const headers = { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` };
    const tenantParam = `tenant_id=eq.${encodeURIComponent(tenantId)}`;
    const idsParam = uniqueIds.join(",");
    const resPBS = await fetch(
      `${supabaseUrl}/rest/v1/ProductBranchStock?${tenantParam}&productId=in.(${idsParam})&select=*`,
      { headers }
    );
    if (resPBS.ok) {
      const cloudPBS = await resPBS.json();
      for (const bs of cloudPBS) {
        const productExists = await prisma.product.findUnique({ where: { id: bs.productId }, select: { id: true } });
        const branchExists = await prisma.branch.findUnique({ where: { id: bs.branchId }, select: { id: true } });
        if (!productExists || !branchExists) continue;
        await prisma.productBranchStock.upsert({
          where: { productId_branchId: { productId: bs.productId, branchId: bs.branchId } },
          update: { quantityStock: bs.quantityStock, updatedAt: new Date(bs.updatedAt) },
          create: { productId: bs.productId, branchId: bs.branchId, quantityStock: bs.quantityStock, updatedAt: new Date(bs.updatedAt) }
        });
      }
    } else {
      console.warn(`[SyncStock] No se pudo descargar ProductBranchStock (${resPBS.status}).`);
    }

    // 5. Recalcular totales locales tras el pull (stock de la red actualizado)
    await recalcProductTotals(uniqueIds);

    return true;
  } catch (error) {
    console.error("Error en syncStockForProducts:", error);
    return false;
  }
}

// Push puntual de un traspaso de stock y sus ítems a la nube. Se usa al crear,
// responder o cancelar un traspaso, para que la otra sucursal lo vea sin
// esperar el sync global.
export async function syncStockTransferToSupabase(transferId: number): Promise<boolean> {
  try {
    const { supabaseUrl, supabaseKey, tenantId } = await getSelectiveSyncCredentials();

    const transfer = await prisma.stockTransfer.findUnique({
      where: { id: transferId },
      include: { items: true },
    });
    if (!transfer) return false;

    const payload: Record<string, any[]> = {
      StockTransfer: [{
        id: transfer.id, sourceBranchId: transfer.sourceBranchId, targetBranchId: transfer.targetBranchId,
        status: transfer.status, notes: transfer.notes || null, createdByName: transfer.createdByName || null,
        tenant_id: tenantId, createdAt: transfer.createdAt.toISOString(),
      }],
      StockTransferItem: transfer.items.map(sti => ({
        transferId: sti.transferId, productId: sti.productId,
        productName: sti.productName || null, quantity: sti.quantity,
        receivedQuantity: sti.receivedQuantity ?? null, tenant_id: tenantId,
      })),
    };

    await pushEntitiesToSupabase(supabaseUrl, supabaseKey, payload);
    return true;
  } catch (error) {
    console.error("Error en syncStockTransferToSupabase:", error);
    return false;
  }
}