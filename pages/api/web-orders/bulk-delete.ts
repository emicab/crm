import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { deleteWebOrdersFromSupabase } from '../../../lib/syncService';
import { isProDevice } from '../../../lib/branchIdentity';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Método ${req.method} no permitido.` });
  }

  // La gestión de pedidos web es exclusiva del Plan Pro.
  if (!(await isProDevice())) {
    return res.status(403).json({ message: 'La gestión de pedidos web requiere el Plan Pro.', blockedByPlan: true });
  }

  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'Debe proporcionar al menos un ID.' });
  }

  try {
    const ordersToDelete = await prisma.webOrder.findMany({
      where: { id: { in: ids } },
      select: { webOrderNumber: true },
    });

    if (ordersToDelete.length === 0) {
      return res.status(404).json({ message: 'No se encontraron pedidos con esos IDs.' });
    }

    const webOrderNumbers = ordersToDelete.map(o => o.webOrderNumber);

    const supabaseOk = await deleteWebOrdersFromSupabase(webOrderNumbers);

    if (!supabaseOk) {
      return res.status(502).json({
        message: 'No se pudo eliminar el/los pedido(s) en la nube. Reintente de nuevo.',
      });
    }

    const result = await prisma.webOrder.deleteMany({
      where: { id: { in: ids } },
    });

    const deletedCount = result.count;

    console.log(`[BulkDelete] Eliminados ${deletedCount} pedidos de local y ${webOrderNumbers.length} de Supabase.`);

    return res.status(200).json({
      message: `${deletedCount} pedido(s) eliminado(s) correctamente.`,
      deletedCount,
    });
  } catch (error: any) {
    console.error('[BulkDelete] Error:', error);
    return res.status(500).json({ message: error.message || 'Error al eliminar pedidos.' });
  }
}
