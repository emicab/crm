// pages/api/web-order-alerts.ts
// Devuelve las alertas de rechazo de pedidos web por stock insuficiente y las
// marca como vistas (para que el POS las muestre como notificación urgente).
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';
import { getSelectiveSyncCredentials } from '../../lib/syncService';
import { isProDevice } from '../../lib/branchIdentity';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  if (!(await isProDevice())) {
    res.status(403).json({ message: 'La sincronización en la nube requiere el Plan Pro.', blockedByPlan: true });
    return;
  }

  try {
    const { supabaseUrl, supabaseKey, tenantId } = await getSelectiveSyncCredentials();
    const headers = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };

    const alertUrl =
      `${supabaseUrl}/rest/v1/WebOrderStockAlert` +
      `?tenant_id=eq.${encodeURIComponent(tenantId)}&seenAt=is.null&select=*&order=createdAt.asc`;

    const response = await fetch(alertUrl, { headers });
    if (!response.ok) {
      // Si la tabla aún no existe (p.ej. PGRST205), responder vacío sin romper el POS.
      res.status(200).json({ alerts: [] });
      return;
    }
    const alerts = (await response.json()) as any[];
    if (!Array.isArray(alerts) || alerts.length === 0) {
      res.status(200).json({ alerts: [] });
      return;
    }

    // Nombre local del producto si está en el catálogo del POS (mejor que el del carrito web).
    const productIds = alerts
      .map((a: any) => Number(a.productId))
      .filter((id: number) => Number.isFinite(id) && id > 0);
    let localNames: Record<number, string> = {};
    if (productIds.length > 0) {
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true },
      });
      localNames = Object.fromEntries(products.map((p) => [p.id, p.name]));
    }

    // Marcar como vistas para no repetir la notificación en el próximo poll.
    const alertIds = alerts.map((a: any) => a.id);
    await fetch(
      `${supabaseUrl}/rest/v1/WebOrderStockAlert?tenant_id=eq.${encodeURIComponent(tenantId)}&id=in.(${alertIds.join(',')})`,
      {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ seenAt: new Date().toISOString() }),
      }
    );

    const normalized = alerts.map((a: any) => ({
      id: a.id,
      productId: a.productId != null ? Number(a.productId) : null,
      productName: localNames[Number(a.productId)] || a.productName || 'Producto',
      requestedQty: a.requestedQty != null ? Number(a.requestedQty) : null,
      message: a.message || null,
      createdAt: a.createdAt,
    }));

    res.status(200).json({ alerts: normalized });
  } catch (error) {
    console.error('Error obteniendo alertas de pedidos web:', error);
    res.status(200).json({ alerts: [] });
  }
}
