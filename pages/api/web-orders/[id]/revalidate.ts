// pages/api/web-orders/[id]/revalidate.ts
// Revalida un pedido en PENDING_REVIEW contra el stock local (Regla de Oro).
// Lo usa el comerciante tras reponer stock: si ya se puede cumplir, vuelve a
// PENDING_PREPARATION; si no, se actualiza la nota con lo que sigue faltando.
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { isProDevice } from '../../../../lib/branchIdentity';
import { revalidateOrder } from '../../../../lib/stockReview';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const orderId = Number(id);
  if (!orderId || isNaN(orderId)) {
    return res.status(400).json({ message: 'ID de pedido inválido.' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    if (!(await isProDevice())) {
      return res.status(403).json({ message: 'La gestión de pedidos web requiere el Plan Pro.', blockedByPlan: true });
    }

    const order = await prisma.webOrder.findUnique({ where: { id: orderId } });
    if (!order) {
      return res.status(404).json({ message: 'Pedido web no encontrado.' });
    }

    const result = await revalidateOrder(orderId);

    // Fire-and-forget: propagar el cambio de estado a la nube.
    try {
      if (result === 'READY') {
        const { enqueueOutbox } = await import('../../../../lib/syncOutbox');
        await enqueueOutbox('WebOrder', 'UPSERT', String(orderId));
      }
    } catch (enqErr) {
      console.warn('Error al encolar revalidación de pedido web:', enqErr);
    }

    const updated = await prisma.webOrder.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });

    return res.status(200).json({
      ...updated,
      totalAmount: updated?.totalAmount.toString(),
      reviewed: result === 'READY',
      message:
        result === 'READY'
          ? 'Stock suficiente: el pedido volvió a preparación.'
          : 'Todavía falta stock. Revisá la nota e intentá de nuevo tras reponer.',
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Error al revalidar el pedido.' });
  }
}
