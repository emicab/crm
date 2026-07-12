import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { Prisma } from '@prisma/client';
const Decimal = Prisma.Decimal;
import { handleApiError } from '../../../lib/apiErrorHandler';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const idQuery = req.query.id as string;
  if (!idQuery || isNaN(parseInt(idQuery))) {
    return res.status(400).json({ message: 'ID de promoción inválido.' });
  }
  const id = parseInt(idQuery);

  if (req.method === 'GET') {
    try {
      const promotion = await prisma.promotion.findUnique({
        where: { id },
        include: { conditions: { include: { product: true, category: true } } },
      });
      if (!promotion) return res.status(404).json({ message: 'Promoción no encontrada.' });
      res.status(200).json({ ...promotion, discountValue: promotion.discountValue.toString() });
    } catch (error: unknown) {
      handleApiError(res, error, `fetching promotion ${id}`);
    }
  } else if (req.method === 'PUT') {
    const { name, description, type, status, discountType, discountValue, minQuantity, maxDiscountQty, priority, startDate, endDate, conditions } = req.body;

    if (!name || !type || !discountType || discountValue === undefined) {
      return res.status(400).json({ message: 'Nombre, tipo, tipo de descuento y valor son obligatorios.' });
    }

    const discValueNum = parseFloat(discountValue);
    if (isNaN(discValueNum) || discValueNum < 0) {
      return res.status(400).json({ message: 'El valor del descuento debe ser un número positivo.' });
    }

    try {
      const promotion = await prisma.$transaction(async (tx) => {
        if (conditions && Array.isArray(conditions)) {
          await tx.promotionCondition.deleteMany({ where: { promotionId: id } });
        }

        return tx.promotion.update({
          where: { id },
          data: {
            name,
            description: description || null,
            type,
            status: status || 'ACTIVE',
            discountType,
            discountValue: new Decimal(discValueNum),
            minQuantity: minQuantity != null ? parseInt(minQuantity) : null,
            maxDiscountQty: maxDiscountQty != null ? parseInt(maxDiscountQty) : null,
            priority: priority != null ? parseInt(priority) : 0,
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            conditions: conditions && Array.isArray(conditions) ? {
              create: conditions.map((c: { productId?: number; categoryId?: number; minQuantity?: number }) => ({
                productId: c.productId || null,
                categoryId: c.categoryId || null,
                minQuantity: c.minQuantity || 1,
              })),
            } : undefined,
          },
          include: { conditions: { include: { product: true, category: true } } },
        });
      });
      res.status(200).json({ ...promotion, discountValue: promotion.discountValue.toString() });
    } catch (error: unknown) {
      handleApiError(res, error, `updating promotion ${id}`);
    }
  } else if (req.method === 'DELETE') {
    try {
      await prisma.promotion.delete({ where: { id } });
      res.status(204).end();
    } catch (error: unknown) {
      handleApiError(res, error, `deleting promotion ${id}`);
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
