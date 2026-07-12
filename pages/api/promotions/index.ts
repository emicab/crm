import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { Prisma } from '@prisma/client';
const Decimal = Prisma.Decimal;
import { handleApiError } from '../../../lib/apiErrorHandler';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const promotions = await prisma.promotion.findMany({
        include: { conditions: { include: { product: true, category: true } } },
        orderBy: { priority: 'desc' },
      });
      const promosForJson = promotions.map(p => ({
        ...p,
        discountValue: p.discountValue.toString(),
      }));
      res.status(200).json(promosForJson);
    } catch (error: unknown) {
      handleApiError(res, error, 'fetching promotions');
    }
  } else if (req.method === 'POST') {
    const { name, description, type, discountType, discountValue, minQuantity, maxDiscountQty, priority, startDate, endDate, conditions } = req.body;

    if (!name || !type || !discountType || discountValue === undefined) {
      return res.status(400).json({ message: 'Nombre, tipo, tipo de descuento y valor son obligatorios.' });
    }

    const validTypes = ['BUY_X_GET_Y', 'SET_DISCOUNT', 'THRESHOLD'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Tipo de promoción inválido.' });
    }

    const validDiscountTypes = ['PERCENTAGE', 'FIXED_AMOUNT'];
    if (!validDiscountTypes.includes(discountType)) {
      return res.status(400).json({ message: 'Tipo de descuento inválido.' });
    }

    const discValueNum = parseFloat(discountValue);
    if (isNaN(discValueNum) || discValueNum < 0) {
      return res.status(400).json({ message: 'El valor del descuento debe ser un número positivo.' });
    }
    if (discountType === 'PERCENTAGE' && (discValueNum <= 0 || discValueNum > 100)) {
      return res.status(400).json({ message: 'El porcentaje debe estar entre 1 y 100.' });
    }

    try {
      const promotion = await prisma.promotion.create({
        data: {
          name,
          description: description || null,
          type,
          status: 'ACTIVE',
          discountType,
          discountValue: new Decimal(discValueNum),
          minQuantity: minQuantity ? parseInt(minQuantity) : null,
          maxDiscountQty: maxDiscountQty ? parseInt(maxDiscountQty) : null,
          priority: priority ? parseInt(priority) : 0,
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
      res.status(201).json({ ...promotion, discountValue: promotion.discountValue.toString() });
    } catch (error: unknown) {
      handleApiError(res, error, 'creating promotion');
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
