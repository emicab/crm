import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { Prisma } from '@prisma/client';
const Decimal = Prisma.Decimal;
import { handleApiError } from '../../../lib/apiErrorHandler';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const idQuery = req.query.id as string;
  if (!idQuery || isNaN(parseInt(idQuery))) {
    return res.status(400).json({ message: 'ID de combo inválido.' });
  }
  const id = parseInt(idQuery);

  if (req.method === 'GET') {
    try {
      const combo = await prisma.combo.findUnique({
        where: { id },
        include: { items: { include: { product: true } } },
      });
      if (!combo) return res.status(404).json({ message: 'Combo no encontrado.' });
      res.status(200).json({ ...combo, price: combo.price.toString() });
    } catch (error: unknown) {
      handleApiError(res, error, `fetching combo ${id}`);
    }
  } else if (req.method === 'PUT') {
    const { name, description, price, active, items } = req.body;

    if (!name || !price) {
      return res.status(400).json({ message: 'Nombre y precio son obligatorios.' });
    }

    try {
      const combo = await prisma.$transaction(async (tx) => {
        await tx.comboItem.deleteMany({ where: { comboId: id } });

        return tx.combo.update({
          where: { id },
          data: {
            name,
            description: description || null,
            price: new Decimal(price),
            active: active !== undefined ? active : true,
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
      });
      res.status(200).json({ ...combo, price: combo.price.toString() });
    } catch (error: unknown) {
      handleApiError(res, error, `updating combo ${id}`);
    }
  } else if (req.method === 'DELETE') {
    try {
      await prisma.combo.delete({ where: { id } });
      res.status(204).end();
    } catch (error: unknown) {
      handleApiError(res, error, `deleting combo ${id}`);
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
