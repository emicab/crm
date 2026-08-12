// pages/api/web-orders/pull.ts
// Descarga selectiva (solo) de pedidos web desde Supabase hacia la DB local.
// Es el "pull ligero" que usa la página de Pedidos Web para que los pedidos
// nuevos de la tienda aparezcan al instante sin esperar el sync completo
// (que corre cada 5 minutos). No empuja nada ni recalcula stock globales:
// eso lo hace el sync completo para no pisar ProductBranchStock sin actualizar.
import type { NextApiRequest, NextApiResponse } from 'next';
import { isProDevice } from '../../../lib/branchIdentity';
import { getSelectiveSyncCredentials } from '../../../lib/syncService';
import { getMainBranchId, pullWebOrdersFromCloud, type SyncPhaseContext } from '../../../lib/syncPhases';

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
    const mainBranchId = await getMainBranchId();
    const productIdsToRecalc = new Set<number>();

    const ctx: SyncPhaseContext = {
      supabaseUrl,
      supabaseKey,
      tenantId,
      forceFullSync: false,
      lastSync: new Date(0),
      isMainDeviceFlag: true,
      mainBranchId,
      productIdsToRecalc,
    };

    await pullWebOrdersFromCloud(ctx);

    res.status(200).json({ success: true, pulled: productIdsToRecalc.size > 0 ? productIdsToRecalc.size : 0 });
  } catch (error) {
    console.error('Error al descargar pedidos web:', error);
    res.status(500).json({ message: 'Error al descargar pedidos web.' });
  }
}
