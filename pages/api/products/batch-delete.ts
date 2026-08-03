// pages/api/products/batch-delete.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { handleApiError } from '../../../lib/apiErrorHandler';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    res.setHeader('Allow', ['DELETE', 'POST']);
    return res.status(405).json({ message: `Método ${req.method} no permitido.` });
  }

  try {
    const { ids, allPages, filters } = req.body;

    // Construir el criterio de selección (IDs explícitos o todos los filtrados)
    const whereClause: any = {};

    if (allPages) {
      if (filters?.search) {
        whereClause.OR = [
          { name: { contains: filters.search } },
          { sku: { contains: filters.search } },
        ];
      }
      if (filters?.brandId) whereClause.brandId = Number(filters.brandId);
      if (filters?.categoryId) whereClause.categoryId = Number(filters.categoryId);
      if (filters?.supplierId) whereClause.supplierId = Number(filters.supplierId);
    } else if (Array.isArray(ids) && ids.length > 0) {
      whereClause.id = { in: ids.map((i: any) => Number(i)) };
    } else {
      return res.status(400).json({ message: 'Debe proporcionar una lista de IDs o seleccionar todas las páginas.' });
    }

    const candidates = await prisma.product.findMany({
      where: whereClause,
      select: { id: true },
    });
    const candidateIds = candidates.map((p) => p.id);

    if (candidateIds.length === 0) {
      return res.status(404).json({ message: 'No se encontraron productos para eliminar.' });
    }

    // Validar dependencias de negocio (misma lógica que el borrado individual).
    const [saleItemsCount, purchaseItemsCount, comboItemsCount, promotionConditionsCount, consignmentItemsCount, stockTransferItemsCount] = await Promise.all([
      prisma.saleItem.count({ where: { productId: { in: candidateIds } } }),
      prisma.purchaseItem.count({ where: { productId: { in: candidateIds } } }),
      prisma.comboItem.count({ where: { productId: { in: candidateIds } } }),
      prisma.promotionCondition.count({ where: { productId: { in: candidateIds } } }),
      prisma.consignmentItem.count({ where: { productId: { in: candidateIds } } }),
      prisma.stockTransferItem.count({ where: { productId: { in: candidateIds } } }),
    ]);

    const relations = [];
    if (saleItemsCount > 0) relations.push(`${saleItemsCount} ítem(s) de venta`);
    if (purchaseItemsCount > 0) relations.push(`${purchaseItemsCount} ítem(s) de compra`);
    if (comboItemsCount > 0) relations.push(`${comboItemsCount} ítem(s) de combo`);
    if (promotionConditionsCount > 0) relations.push(`${promotionConditionsCount} condición(es) de promoción`);
    if (consignmentItemsCount > 0) relations.push(`${consignmentItemsCount} ítem(s) de consignación`);
    if (stockTransferItemsCount > 0) relations.push(`${stockTransferItemsCount} ítem(s) de traspaso de stock`);

    if (relations.length > 0) {
      return res.status(409).json({
        message: `No se pueden eliminar los productos seleccionados porque están asociados a ${relations.join(', ')}. Considere marcarlos como no disponibles o discontinuados.`
      });
    }

    // Pedidos web pendientes que referencian alguno de los productos. Solo se
    // limpian automáticamente los NO pagados / NO entregados (checkout fallido).
    const webOrderItems = await prisma.webOrderItem.findMany({
      where: { productId: { in: candidateIds } },
      select: { webOrderId: true },
    });
    const webOrderIds = [...new Set(webOrderItems.map((i) => i.webOrderId))];

    let webOrderNumbersToDelete: string[] = [];
    if (webOrderIds.length > 0) {
      const webOrders = await prisma.webOrder.findMany({
        where: { id: { in: webOrderIds } },
        select: { id: true, webOrderNumber: true, status: true, paymentStatus: true },
      });

      const blocked = webOrders.filter(
        (o) => o.paymentStatus === "PAID" || o.status === "DELIVERED"
      );
      if (blocked.length > 0) {
        return res.status(409).json({
          message: `No se pueden eliminar los productos porque están asociados a pedidos web confirmados (${blocked.map((o) => o.webOrderNumber).join(', ')}). Considere marcarlos como no disponibles.`
        });
      }

      webOrderNumbersToDelete = webOrders.map((o) => o.webOrderNumber);
    }

    // Borrar dependencias y productos en una transacción atómica.
    await prisma.$transaction(async (tx) => {
      if (webOrderIds.length > 0) {
        await tx.webOrderItem.deleteMany({ where: { webOrderId: { in: webOrderIds } } });
        await tx.webOrder.deleteMany({ where: { id: { in: webOrderIds } } });
      }
      await tx.productBranchStock.deleteMany({ where: { productId: { in: candidateIds } } });
      await tx.product.deleteMany({ where: { id: { in: candidateIds } } });
    });

    // Reflejar la eliminación en la nube.
    try {
      const { deleteProductFromSupabase, deleteWebOrdersFromSupabase } = await import('../../../lib/syncService');
      if (webOrderNumbersToDelete.length > 0) {
        await deleteWebOrdersFromSupabase(webOrderNumbersToDelete);
      }
      // Eliminar uno por uno en la nube (cada borrado respeta su tenant_id).
      for (const pid of candidateIds) {
        await deleteProductFromSupabase(pid);
      }
    } catch (syncErr) {
      console.error('[BatchDelete] Error de sync en nube:', syncErr);
    }

    return res.status(200).json({
      message: `${candidateIds.length} producto(s) eliminado(s) correctamente.`,
      count: candidateIds.length,
    });
  } catch (error: any) {
    handleApiError(res, error, 'deleting products in batch');
  }
}
