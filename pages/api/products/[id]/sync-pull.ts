// pages/api/products/[id]/sync-pull.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { handleApiError } from '../../../../lib/apiErrorHandler';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const productIdQuery = req.query.id as string;
  if (!productIdQuery || isNaN(parseInt(productIdQuery))) {
    return res.status(400).json({ message: 'ID de producto inválido.' });
  }
  const id = parseInt(productIdQuery);

  try {
    const { pullSingleProductStock } = await import('../../../../lib/syncService');
    const ok = await pullSingleProductStock(id);

    const product = await prisma.product.findUnique({
      where: { id },
      include: { brand: true, category: true, supplier: true, branchStocks: true },
    });

    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    res.status(200).json({ synced: ok, product });
  } catch (error: any) {
    handleApiError(res, error, `refrescando stock del producto ${id}`);
  }
}
