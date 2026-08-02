import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { handleApiError } from '../../../lib/apiErrorHandler';
import { sanitizeString } from '../../../lib/sanitize';
import { getEffectiveDeviceBranchId, isProDevice } from '../../../lib/branchIdentity';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const transfers = await (prisma as any).stockTransfer.findMany({
        include: {
          sourceBranch: true,
          targetBranch: true,
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      res.status(200).json(transfers);
    } catch (error) {
      handleApiError(res, error, "fetching stock transfers");
    }
  } else if (req.method === 'POST') {
    try {
      // Los traspasos entre locales requieren plan Pro
      if (!(await isProDevice())) {
        res.status(403).json({ message: 'Los traspasos entre locales requieren el plan Pro.' });
        return;
      }

      const { sourceBranchId, targetBranchId, items, notes, createdByName } = req.body;

      if (!sourceBranchId || !targetBranchId || sourceBranchId === targetBranchId) {
        res.status(400).json({ message: 'Las sucursales de origen y destino deben ser diferentes.' });
        return;
      }

      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ message: 'Debe incluir al menos un producto a transferir.' });
        return;
      }

      // Solo se puede enviar stock del propio local
      const deviceBranchId = await getEffectiveDeviceBranchId();
      if (deviceBranchId === null || Number(sourceBranchId) !== deviceBranchId) {
        res.status(403).json({ message: 'Solo podés enviar stock desde tu propio local.' });
        return;
      }

      const transferResult = await prisma.$transaction(async (tx: any) => {
        const transfer = await tx.stockTransfer.create({
          data: {
            sourceBranchId: Number(sourceBranchId),
            targetBranchId: Number(targetBranchId),
            status: 'SENT',
            notes: notes ? sanitizeString(notes) : null,
            createdByName: createdByName ? sanitizeString(createdByName) : 'Cajero',
            items: {
              create: items.map((i: any) => ({
                productId: Number(i.productId),
                productName: i.productName ? sanitizeString(i.productName) : null,
                quantity: parseFloat(i.quantity) || 0,
              })),
            },
          },
          include: {
            items: true,
            sourceBranch: true,
            targetBranch: true,
          },
        });

        // Separar el stock del origen para el envío (se repone si se rechaza o cancela)
        for (const item of items) {
          const qty = parseFloat(item.quantity) || 0;
          if (qty <= 0) {
            throw new Error('Las cantidades deben ser mayores a cero.');
          }
          const pId = Number(item.productId);

          const sourceStock = await tx.productBranchStock.findUnique({
            where: {
              productId_branchId: {
                productId: pId,
                branchId: Number(sourceBranchId),
              },
            },
          });

          const currentSourceQty = sourceStock ? sourceStock.quantityStock : 0;
          if (currentSourceQty < qty) {
            const product = await tx.product.findUnique({ where: { id: pId }, select: { name: true } });
            throw new Error(`Stock insuficiente en tu local para "${product?.name || 'el producto'}". Disponible: ${currentSourceQty}, Solicitado: ${qty}.`);
          }

          await tx.productBranchStock.update({
            where: {
              productId_branchId: {
                productId: pId,
                branchId: Number(sourceBranchId),
              },
            },
            data: {
              quantityStock: currentSourceQty - qty,
            },
          });
        }

        return transfer;
      });

      // [MODIFICADO] Sync de stock de los productos afectados + push del traspaso
      try {
        const { syncStockForProducts, syncStockTransferToSupabase } = await import('../../../lib/syncService');
        const productIds = items.map((i: any) => Number(i.productId));
        await syncStockForProducts(productIds);
        await syncStockTransferToSupabase(transferResult.id);
      } catch (syncErr) {
        console.error("[Transferencias] Sync error:", syncErr);
      }

      res.status(201).json(transferResult);
    } catch (error: any) {
      if (error instanceof Error && error.message.startsWith('Stock insuficiente')) {
        return res.status(409).json({ message: error.message });
      }
      handleApiError(res, error, "processing stock transfer");
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}