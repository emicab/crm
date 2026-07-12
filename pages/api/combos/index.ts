import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { Prisma } from '@prisma/client';
const Decimal = Prisma.Decimal;
import { handleApiError } from '../../../lib/apiErrorHandler';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const combos = await prisma.combo.findMany({
        include: { items: { include: { product: true } } },
        orderBy: { name: 'asc' },
      });
      const combosForJson = combos.map(c => ({
        ...c,
        price: c.price.toString(),
      }));
      res.status(200).json(combosForJson);
    } catch (error: unknown) {
      handleApiError(res, error, 'fetching combos');
    }
  } else if (req.method === 'POST') {
    const { name, description, price, items } = req.body;

    if (!name || !price || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Nombre, precio y al menos un producto son obligatorios.' });
    }

    try {
      const combo = await prisma.combo.create({
        data: {
          name,
          description: description || null,
          price: new Decimal(price),
          items: {
            create: items.map((item: { productId: number; quantity: number; customPrice?: number | null }) => ({
              productId: item.productId,
              quantity: item.quantity || 1,
              customPrice: item.customPrice != null ? new Decimal(item.customPrice) : null,
            })),
          },
        },
        include: { items: { include: { product: true } } },
      });
      res.status(201).json({ ...combo, price: combo.price.toString() });
    } catch (error: unknown) {
      handleApiError(res, error, 'creating combo');
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
