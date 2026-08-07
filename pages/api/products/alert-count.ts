import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Se excluyen los productos elaborados (isRecipe = 0): su disponibilidad se
    // deriva de los ingredientes y no tienen stock físico propio.
    const result: any = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM Product WHERE stockMinAlert IS NOT NULL AND quantityStock < stockMinAlert AND isRecipe = 0`
    );
    const count = Number(result[0]?.count || 0);

    // Contar elaborados sin disponibilidad (no se pueden preparar).
    let recipeAlerts = 0;
    try {
      const { computeDerivedStock } = await import('../../../lib/recipeStock');
      const recipes = await prisma.product.findMany({
        where: { isRecipe: true },
        select: { id: true, stockMinAlert: true },
      });
      for (const r of recipes) {
        const derived = await computeDerivedStock(prisma, r.id);
        if (derived <= 0 || (r.stockMinAlert !== null && derived < r.stockMinAlert)) {
          recipeAlerts++;
        }
      }
    } catch {
      // si falla el recetario, no romper el contador
    }

    res.status(200).json({ count: count + recipeAlerts });
  } catch (error) {
    console.error('Error counting stock alerts:', error);
    res.status(500).json({ message: 'Error al contar alertas de stock' });
  }
}
