// pages/api/stock-transfers/[id]/cancel.ts
// El local EMISOR cancela un traspaso pendiente (SENT) antes de que el destino
// responda. Se repone el stock completo al origen.
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { handleApiError } from '../../../../lib/apiErrorHandler';
import { getEffectiveDeviceBranchId } from '../../../../lib/branchIdentity';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  const transferId = Number(req.query.id);

  try {
    if (isNaN(transferId)) {
      res.status(400).json({ message: 'ID de traspaso inválido.' });
      return;
    }

    const deviceBranchId = await getEffectiveDeviceBranchId();
    if (deviceBranchId === null) {
      res.status(403).json({ message: 'No se pudo determinar tu local.' });
      return;
    }

    const transfer = await (prisma as any).stockTransfer.findUnique({
      where: { id: transferId },
      include: { items: true },
    });
    if (!transfer) {
      res.status(404).json({ message: 'Traspaso no encontrado.' });
      return;
    }
    if (transfer.sourceBranchId !== deviceBranchId) {
      res.status(403).json({ message: 'Solo el local emisor puede cancelar este traspaso.' });
      return;
    }
    if (transfer.status !== 'SENT') {
      res.status(409).json({ message: 'Este traspaso ya fue respondido o cancelado.' });
      return;
    }

    await prisma.$transaction(async (tx: any) => {
      for (const item of transfer.items) {
        await tx.productBranchStock.upsert({
          where: {
            productId_branchId: { productId: item.productId, branchId: transfer.sourceBranchId },
          },
          update: { quantityStock: { increment: item.quantity } },
          create: { productId: item.productId, branchId: transfer.sourceBranchId, quantityStock: item.quantity },
        });
      }
      await tx.stockTransfer.update({
        where: { id: transferId },
        data: { status: 'CANCELLED' },
      });
    });

    try {
      const { syncStockForProducts, syncStockTransferToSupabase } = await import('../../../../lib/syncService');
      const productIds = transfer.items.map((i: any) => i.productId);
      await syncStockForProducts(productIds);
      await syncStockTransferToSupabase(transferId);
    } catch (syncErr) {
      console.error('[Traspasos] Sync post-cancelación error:', syncErr);
    }

    res.status(200).json({ success: true, status: 'CANCELLED' });
  } catch (error) {
    handleApiError(res, error, "cancelling stock transfer");
  }
}
