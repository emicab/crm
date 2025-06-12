// pages/api/compras/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const purchaseIdQuery = req.query.id as string;

  if (!purchaseIdQuery || isNaN(parseInt(purchaseIdQuery))) {
    return res.status(400).json({ message: 'ID de compra inválido.' });
  }

  const id = parseInt(purchaseIdQuery);

  if (req.method === 'GET') {
    // Obtener los detalles de una compra específica
    try {
      const purchase = await prisma.purchase.findUnique({
        where: { id: id },
        include: {
          supplier: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!purchase) {
        return res.status(404).json({ message: 'Compra no encontrada.' });
      }
       // Convertir Decimal a string
       const purchaseForJson = {
        ...purchase,
        totalAmount: purchase.totalAmount.toString(),
        items: purchase.items.map(item => ({
          ...item,
          purchasePrice: item.purchasePrice.toString(),
          product: {
            ...item.product,
            pricePurchase: item.product.pricePurchase?.toString() || null,
            priceSale: item.product.priceSale.toString(),
          }
        }))
      };
      res.status(200).json(purchaseForJson);
    } catch (error: any) {
      console.error(`Error al obtener la compra ${id}:`, error);
      res.status(500).json({ message: `Error al obtener los detalles de la compra: ${error.message}` });
    }
  } else if (req.method === 'PUT') {
    res.status(501).json({ message: 'Funcionalidad de actualizar compra no implementada.' });
  } else if (req.method === 'DELETE') {
    res.status(501).json({ message: 'Funcionalidad de eliminar compra no implementada.' });
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}