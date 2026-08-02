import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { handleApiError } from '../../../lib/apiErrorHandler';
import { getDeviceBranchId, setDeviceBranchId, isProDevice } from '../../../lib/branchIdentity';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const deviceBranchId = await getDeviceBranchId();
      res.status(200).json({ deviceBranchId });
    } catch (error) {
      handleApiError(res, error, "fetching device branch");
    }
  } else if (req.method === 'PUT') {
    try {
      if (!(await isProDevice())) {
        res.status(403).json({ message: 'Asignar locales de venta requiere el plan Pro.' });
        return;
      }

      const branchId = Number(req.body?.branchId);
      if (!branchId || isNaN(branchId)) {
        res.status(400).json({ message: 'branchId es obligatorio.' });
        return;
      }

      const branch = await prisma.branch.findUnique({ where: { id: branchId } });
      if (!branch) {
        res.status(404).json({ message: 'La sucursal no existe.' });
        return;
      }

      await setDeviceBranchId(branchId);
      res.status(200).json({ success: true, deviceBranchId: branchId });
    } catch (error) {
      handleApiError(res, error, "setting device branch");
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT']);
    res.status(405).json({ message: `Método ${req.method} no permitido.` });
  }
}
