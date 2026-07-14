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
    const recentSales = await prisma.sale.findMany({
      take: 20,
      orderBy: { saleDate: 'desc' },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                priceSale: true,
                quantityStock: true,
                unitType: true,
                brand: { select: { name: true } },
                category: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    const seenIds = new Set<number>();
    const products: any[] = [];

    for (const sale of recentSales) {
      for (const item of sale.items) {
        if (item.product && !seenIds.has(item.product.id)) {
          seenIds.add(item.product.id);
          products.push({
            id: item.product.id,
            name: item.product.name,
            sku: item.product.sku,
            priceSale: parseFloat(item.product.priceSale.toString()),
            quantityStock: item.product.quantityStock,
            unitType: item.product.unitType,
            brandName: item.product.brand.name,
            categoryName: item.product.category.name,
          });
          if (products.length >= 15) break;
        }
      }
      if (products.length >= 15) break;
    }

    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching recent products:', error);
    res.status(500).json({ message: 'Error al obtener productos recientes.' });
  }
}
