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

    // Validar dependencias de negocio (los ítems de venta se desvinculan en vez
    // de bloquear; las consignaciones canceladas se limpian; el resto sí bloquea).
    const [purchaseItemsCount, comboItemsCount, promotionConditionsCount, activeConsignmentItemsCount, stockTransferItemsCount, recipeIngredientCount] = await Promise.all([
      prisma.purchaseItem.count({ where: { productId: { in: candidateIds } } }),
      prisma.comboItem.count({ where: { productId: { in: candidateIds } } }),
      prisma.promotionCondition.count({ where: { productId: { in: candidateIds } } }),
      prisma.consignmentItem.count({
        where: { productId: { in: candidateIds }, consignment: { status: { in: ['DELIVERED', 'SETTLED'] } } },
      }),
      prisma.stockTransferItem.count({ where: { productId: { in: candidateIds } } }),
      prisma.recipeItem.count({ where: { ingredientId: { in: candidateIds } } }),
    ]);

    const relations = [];
    if (purchaseItemsCount > 0) relations.push(`${purchaseItemsCount} ítem(s) de compra`);
    if (comboItemsCount > 0) relations.push(`${comboItemsCount} ítem(s) de combo`);
    if (promotionConditionsCount > 0) relations.push(`${promotionConditionsCount} condición(es) de promoción`);
    if (activeConsignmentItemsCount > 0) relations.push(`${activeConsignmentItemsCount} ítem(s) de consignación activa`);
    if (stockTransferItemsCount > 0) relations.push(`${stockTransferItemsCount} ítem(s) de traspaso de stock`);
    if (recipeIngredientCount > 0) relations.push(`${recipeIngredientCount} receta(s) que lo(s) usan como ingrediente`);

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
      // Desvincular los ítems de venta: conservan el nombre (productName) y
      // dejan de referenciar al producto.
      if (candidateIds.length > 0) {
        const productsToDelete = await tx.product.findMany({
          where: { id: { in: candidateIds } },
          select: { id: true, name: true },
        });
        const nameById = new Map(productsToDelete.map((p) => [p.id, p.name]));
        for (const pid of candidateIds) {
          const name = nameById.get(pid);
          if (name) {
            await tx.saleItem.updateMany({
              where: { productId: pid },
              data: { productId: null, productName: name },
            });
          }
        }
      }
      // Limpiar ítems de consignaciones CANCELADAS (no impiden el borrado).
      await tx.consignmentItem.deleteMany({
        where: { productId: { in: candidateIds }, consignment: { status: 'CANCELLED' } },
      });
      await tx.productBranchStock.deleteMany({ where: { productId: { in: candidateIds } } });
      await tx.product.deleteMany({ where: { id: { in: candidateIds } } });
    });

    // Reflejar la eliminación en la nube vía outbox (fire-and-forget, tolerante offline).
    try {
      const { enqueueOutbox } = await import('../../../lib/syncOutbox');
      for (const num of webOrderNumbersToDelete) {
        await enqueueOutbox('WebOrder', 'DELETE', num);
      }
      for (const pid of candidateIds) {
        await enqueueOutbox('Product', 'DELETE', String(pid));
      }
    } catch (enqErr) {
      console.error('[BatchDelete] Error al encolar borrado en outbox:', enqErr);
    }

    return res.status(200).json({
      message: `${candidateIds.length} producto(s) eliminado(s) correctamente.`,
      count: candidateIds.length,
    });
  } catch (error: any) {
    handleApiError(res, error, 'deleting products in batch');
  }
}
