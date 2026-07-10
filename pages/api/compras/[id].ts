// pages/api/compras/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { PurchaseStatus } from '@prisma/client';
import { handleApiError } from '../../../lib/apiErrorHandler';
import { sanitizeString } from '../../../lib/sanitize';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const purchaseIdQuery = req.query.id as string;

  if (!purchaseIdQuery || isNaN(parseInt(purchaseIdQuery))) {
    return res.status(400).json({ message: 'ID de compra inválido.' });
  }

  const id = parseInt(purchaseIdQuery);

  if (req.method === 'GET') {
    // Obtener los detalles de una compra específica
    try {
      const purchase = await prisma.purchase.findUnique({
        where: { id: id },
        include: {
          supplier: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!purchase) {
        return res.status(404).json({ message: 'Compra no encontrada.' });
      }
       // Convertir Decimal a string
       const purchaseForJson = {
        ...purchase,
        totalAmount: purchase.totalAmount.toString(),
        items: purchase.items.map(item => ({
          ...item,
          purchasePrice: item.purchasePrice.toString(),
          product: {
            ...item.product,
            pricePurchase: item.product.pricePurchase?.toString() || null,
            priceSale: item.product.priceSale.toString(),
          }
        }))
      };
      res.status(200).json(purchaseForJson);
    } catch (error: any) {
      handleApiError(res, error, `fetching purchase ${id}`);
    }
  } else if (req.method === 'PUT') {
    let { status, invoiceNumber, notes } = req.body;
    
    if (invoiceNumber) invoiceNumber = sanitizeString(invoiceNumber);
    if (notes) notes = sanitizeString(notes);

    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Obtener la compra actual con sus items
        const existingPurchase = await tx.purchase.findUnique({
          where: { id },
          include: { items: true },
        });

        if (!existingPurchase) {
          throw new Error('Compra no encontrada.');
        }

        const oldStatus = existingPurchase.status;
        const newStatus = status as PurchaseStatus || oldStatus;

        // Validar status si se envió
        if (status && !Object.values(PurchaseStatus).includes(newStatus)) {
          throw new Error('Estado de compra inválido.');
        }

        // 2. Si cambia el estado, ajustar stock
        if (oldStatus !== newStatus) {
          for (const item of existingPurchase.items) {
            // Caso 1: PENDING/CANCELLED -> RECEIVED (Incrementar)
            if (oldStatus !== PurchaseStatus.RECEIVED && newStatus === PurchaseStatus.RECEIVED) {
              await tx.product.update({
                where: { id: item.productId },
                data: { quantityStock: { increment: item.quantity } },
              });
            }
            // Caso 2: RECEIVED -> PENDING/CANCELLED (Decrementar)
            else if (oldStatus === PurchaseStatus.RECEIVED && newStatus !== PurchaseStatus.RECEIVED) {
              const product = await tx.product.findUnique({
                where: { id: item.productId },
                select: { quantityStock: true, name: true },
              });
              if (product && product.quantityStock < item.quantity) {
                throw new Error(`Stock insuficiente para revertir la compra de "${product.name}". Disponible: ${product.quantityStock}, Requerido: ${item.quantity}.`);
              }
              await tx.product.update({
                where: { id: item.productId },
                data: { quantityStock: { decrement: item.quantity } },
              });
            }
          }
        }

        // 3. Actualizar la compra
        const updatedPurchase = await tx.purchase.update({
          where: { id },
          data: {
            status: newStatus,
            ...(invoiceNumber !== undefined && { invoiceNumber }),
            ...(notes !== undefined && { notes }),
          },
          include: {
            supplier: true,
            items: { include: { product: true } },
          },
        });

        return updatedPurchase;
      });

      // Convertir Decimales a string
      const purchaseForJson = {
        ...result,
        totalAmount: result.totalAmount.toString(),
        items: result.items.map(item => ({
          ...item,
          purchasePrice: item.purchasePrice.toString(),
          product: {
            ...item.product,
            pricePurchase: item.product.pricePurchase?.toString() || null,
            priceSale: item.product.priceSale.toString(),
          }
        }))
      };

      res.status(200).json(purchaseForJson);
    } catch (error: any) {
      if (error instanceof Error && (error.message.startsWith('Stock insuficiente') || error.message === 'Compra no encontrada.' || error.message === 'Estado de compra inválido.')) {
        return res.status(400).json({ message: error.message });
      }
      handleApiError(res, error, `updating purchase ${id}`);
    }
  } else if (req.method === 'DELETE') {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const purchaseToDelete = await tx.purchase.findUnique({
          where: { id },
          include: { items: true },
        });

        if (!purchaseToDelete) {
          throw new Error('Compra no encontrada.');
        }

        // Si la compra estaba RECEIVED, revertir stock
        if (purchaseToDelete.status === PurchaseStatus.RECEIVED) {
          for (const item of purchaseToDelete.items) {
            const product = await tx.product.findUnique({
              where: { id: item.productId },
              select: { quantityStock: true, name: true },
            });
            if (product && product.quantityStock < item.quantity) {
              throw new Error(`Stock insuficiente para eliminar la compra del producto "${product.name}". Disponible: ${product.quantityStock}, Requerido: ${item.quantity}.`);
            }
            await tx.product.update({
              where: { id: item.productId },
              data: { quantityStock: { decrement: item.quantity } },
            });
          }
        }

        // Eliminar compra. Los items se eliminan en cascada en la BD si está configurado en schema.prisma.
        await tx.purchase.delete({
          where: { id },
        });

        return { message: 'Compra eliminada y stock actualizado.' };
      });

      res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof Error && (error.message.startsWith('Stock insuficiente') || error.message === 'Compra no encontrada.')) {
        return res.status(400).json({ message: error.message });
      }
      handleApiError(res, error, `deleting purchase ${id}`);
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}