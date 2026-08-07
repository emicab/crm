// lib/syncOutbox.ts
// Outbox transaccional: registra operaciones pendientes de subir a la nube.
// Permite trabajar offline y sincronizar después sin perder datos (borrados,
// pedidos web locales, ventas/compras/traspasos, etc.).
import prisma from "./prisma";
import { isProDevice } from "./branchIdentity";

export type OutboxOperation = "UPSERT" | "DELETE";

const fmtDec = (val: any, fallback: string | null = "0.00") => (val !== undefined && val !== null ? val.toString() : fallback);

export async function enqueueOutbox(entity: string, operation: OutboxOperation, entityKey: string): Promise<void> {
  try {
    // En planes sin nube no se acumulan operaciones pendientes: evita el aviso
    // "X pendientes de sincronizar" en configuraciones puramente locales.
    if (!(await isProDevice())) return;
    await prisma.syncOutbox.create({
      data: { entity, operation, entityKey, status: "PENDING", attempts: 0 },
    });
  } catch (err) {
    console.error(`[Outbox] Error al encolar ${entity} ${entityKey}:`, err);
  }
}

export async function getPendingCount(): Promise<number> {
  try {
    return await prisma.syncOutbox.count({ where: { status: "PENDING" } });
  } catch {
    return 0;
  }
}

// True si existe una operación DELETE pendiente para esa entidad+clave.
// Se usa en el PULL para no re-importar datos que se marcaron para borrar.
export async function isOutboxDeletePending(entity: string, entityKey: string): Promise<boolean> {
  try {
    const found = await prisma.syncOutbox.findFirst({
      where: { entity, entityKey, operation: "DELETE", status: "PENDING" },
      select: { id: true },
    });
    return !!found;
  } catch {
    return false;
  }
}

async function markDone(id: number): Promise<void> {
  await prisma.syncOutbox.update({ where: { id }, data: { status: "DONE", updatedAt: new Date() } });
}

async function markFailed(id: number, error: string, maxAttempts = 5): Promise<void> {
  const record = await prisma.syncOutbox.findUnique({ where: { id }, select: { attempts: true } });
  const attempts = (record?.attempts || 0) + 1;
  await prisma.syncOutbox.update({
    where: { id },
    data: { status: attempts >= maxAttempts ? "FAILED" : "PENDING", attempts, lastError: error.slice(0, 500), updatedAt: new Date() },
  });
}

async function pushSale(saleId: number, tenantId: string): Promise<boolean> {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { items: true },
  });
  if (!sale) return false;

  const payload: Record<string, any[]> = {
    Sale: [{
      id: sale.id, saleDate: sale.saleDate.toISOString(), totalAmount: fmtDec(sale.totalAmount), tenant_id: tenantId,
      paymentType: sale.paymentType, notes: sale.notes, clientId: sale.clientId, sellerId: sale.sellerId ?? 1,
      cashRegisterId: sale.cashRegisterId, discountCodeApplied: sale.discountCodeApplied,
      createdAt: sale.createdAt.toISOString(), updatedAt: sale.updatedAt.toISOString()
    }],
    SaleItem: sale.items.map(si => ({
      id: si.id, quantity: si.quantity, priceAtSale: fmtDec(si.priceAtSale), tenant_id: tenantId,
      purchasePriceAtSale: fmtDec(si.purchasePriceAtSale), saleId: si.saleId, productId: si.productId,
      productName: si.productName || null
    })),
  };

  return await pushRecords(payload);
}

async function pushPurchase(purchaseId: number, tenantId: string): Promise<boolean> {
  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: { items: true },
  });
  if (!purchase) return false;

  const payload: Record<string, any[]> = {
    Purchase: [{
      id: purchase.id, purchaseDate: purchase.purchaseDate.toISOString(), totalAmount: fmtDec(purchase.totalAmount), tenant_id: tenantId,
      status: purchase.status, paymentType: purchase.paymentType || 'CASH', invoiceNumber: purchase.invoiceNumber, notes: purchase.notes,
      supplierId: purchase.supplierId, createdAt: purchase.createdAt.toISOString(), updatedAt: purchase.updatedAt.toISOString()
    }],
    PurchaseItem: purchase.items.map(pi => ({
      id: pi.id, quantity: pi.quantity, quantityReceived: pi.quantityReceived ?? pi.quantity ?? 0, tenant_id: tenantId,
      purchasePrice: fmtDec(pi.purchasePrice), purchaseId: pi.purchaseId, productId: pi.productId
    })),
  };

  return await pushRecords(payload);
}

async function pushRecords(payload: Record<string, any[]>): Promise<boolean> {
  const { getSelectiveSyncCredentials, pushEntitiesToSupabase } = await import("./syncService");
  const { supabaseUrl, supabaseKey } = await getSelectiveSyncCredentials();
  try {
    await pushEntitiesToSupabase(supabaseUrl, supabaseKey, payload);
    return true;
  } catch {
    return false;
  }
}

// Procesa los PENDING del outbox. Devuelve { drained, remaining, networkError }.
// Si hay error de red (networkError=true), detiene el procesamiento y el resto
// queda PENDING para el próximo intento.
export async function drainOutbox(limit = 100): Promise<{ drained: number; remaining: number; networkError: boolean }> {
  let drained = 0;
  let networkError = false;

  const pending = await prisma.syncOutbox.findMany({
    where: { status: "PENDING" },
    orderBy: { id: "asc" },
    take: limit,
  });

  for (const record of pending) {
    try {
      let ok = false;

      if (record.operation === "DELETE") {
        const { deleteProductFromSupabase, deleteWebOrdersFromSupabase, deleteComboFromSupabase, deletePromotionFromSupabase } = await import("./syncService");
        if (record.entity === "Product") {
          ok = await deleteProductFromSupabase(Number(record.entityKey));
        } else if (record.entity === "WebOrder") {
          ok = await deleteWebOrdersFromSupabase([record.entityKey]);
        } else if (record.entity === "Combo") {
          ok = await deleteComboFromSupabase(Number(record.entityKey));
        } else if (record.entity === "Promotion") {
          ok = await deletePromotionFromSupabase(Number(record.entityKey));
        }
      } else {
        // UPSERT
        const {
          syncSingleProduct,
          syncWebOrderToSupabase,
          syncStockTransferToSupabase,
          getSelectiveSyncCredentials,
        } = await import("./syncService");

        if (record.entity === "Product" || record.entity === "ProductBranchStock") {
          ok = await syncSingleProduct(Number(record.entityKey));
        } else if (record.entity === "WebOrder") {
          ok = await syncWebOrderToSupabase(Number(record.entityKey));
        } else if (record.entity === "StockTransfer") {
          ok = await syncStockTransferToSupabase(Number(record.entityKey));
        } else if (record.entity === "Sale") {
          const { tenantId } = await getSelectiveSyncCredentials();
          ok = await pushSale(Number(record.entityKey), tenantId);
        } else if (record.entity === "Purchase") {
          const { tenantId } = await getSelectiveSyncCredentials();
          ok = await pushPurchase(Number(record.entityKey), tenantId);
        }
      }

      if (ok) {
        await markDone(record.id);
        drained++;
      } else {
        // Fallo: puede ser red o dato. Si es red, cortamos el loop para no
        // reintentar N veces seguidas el mismo error.
        await markFailed(record.id, "sync rechazado / sin conexión");
        networkError = true;
        break;
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      const isNetwork = /fetch|network|ECONN|abort|timeout|ENOTFOUND/i.test(msg);
      await markFailed(record.id, msg);
      if (isNetwork) {
        networkError = true;
        break;
      }
    }
  }

  const remaining = await getPendingCount();
  return { drained, remaining, networkError };
}
