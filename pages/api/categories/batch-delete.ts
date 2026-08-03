// pages/api/categories/batch-delete.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { handleApiError } from '../../../lib/apiErrorHandler';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', ['POST', 'DELETE']);
    return res.status(405).json({ message: `Método ${req.method} no permitido.` });
  }

  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Debe proporcionar una lista de IDs.' });
    }

    const idList = ids.map((i: any) => Number(i)).filter((n: number) => !isNaN(n));
    if (idList.length === 0) {
      return res.status(400).json({ message: 'Lista de IDs inválida.' });
    }

    // Validar que existan y que no tengan productos asociados.
    const categories = await prisma.category.findMany({
      where: { id: { in: idList } },
      select: { id: true },
    });
    if (categories.length === 0) {
      return res.status(404).json({ message: 'No se encontraron categorías para eliminar.' });
    }

    const categoriesWithProducts = await prisma.product.count({
      where: { categoryId: { in: idList } },
    });

    if (categoriesWithProducts > 0) {
      return res.status(409).json({
        message: `No se pueden eliminar las categorías seleccionadas porque ${categoriesWithProducts} producto(s) están asociados. Primero reasigna o elimina esos productos.`
      });
    }

    const result = await prisma.category.deleteMany({
      where: { id: { in: idList } },
    });

    return res.status(200).json({
      message: `${result.count} categoría(s) eliminada(s) correctamente.`,
      count: result.count,
    });
  } catch (error: any) {
    handleApiError(res, error, 'deleting categories in batch');
  }
}
