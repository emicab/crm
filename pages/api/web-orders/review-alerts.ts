// pages/api/web-orders/review-alerts.ts
// Devuelve los pedidos web en estado PENDING_REVIEW (Regla de Oro: falta stock
// local para cumplirlos). El Sidebar los muestra como notificación urgente.
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { isProDevice } from '../../../lib/branchIdentity';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  if (!(await isProDevice())) {
    res.status(403).json({ message: 'La gestión de pedidos web requiere el Plan Pro.', blockedByPlan: true });
    return;
  }

  try {
    const orders = await prisma.webOrder.findMany({
      where: { status: 'PENDING_REVIEW' },
      orderBy: { stockReviewAt: 'desc' },
      select: {
        id: true,
        webOrderNumber: true,
        clientName: true,
        clientPhone: true,
        totalAmount: true,
        deliveryType: true,
        stockReviewNote: true,
        stockReviewAt: true,
        paymentMethod: true,
        paymentStatus: true,
      },
    });

    const alerts = orders.map((o) => ({
      id: o.id,
      webOrderNumber: o.webOrderNumber,
      clientName: o.clientName,
      clientPhone: o.clientPhone,
      totalAmount: o.totalAmount.toString(),
      deliveryType: o.deliveryType,
      stockReviewNote: o.stockReviewNote || null,
      stockReviewAt: o.stockReviewAt,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
    }));

    res.status(200).json({ alerts });
  } catch (error) {
    console.error('Error obteniendo pedidos en revisión:', error);
    res.status(200).json({ alerts: [] });
  }
}
