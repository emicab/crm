// pages/api/ventas/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const saleIdQuery = req.query.id as string;

  if (!saleIdQuery || isNaN(parseInt(saleIdQuery))) {
    return res.status(400).json({ message: 'ID de venta inválido.' });
  }

  const id = parseInt(saleIdQuery);

  if (req.method === 'GET') {
    try {
      const sale = await prisma.sale.findUnique({
        where: { id: id },
        include: {
          client: true, // Incluir datos del cliente
          seller: true, // Incluir datos del vendedor
          items: {      // Incluir los ítems de la venta
            include: {
              product: true, // Incluir datos del producto de cada ítem
            },
            orderBy: { // Opcional: ordenar items por nombre de producto o ID
                product: { name: 'asc'}
            }
          },
        },
      });

      if (!sale) {
        return res.status(404).json({ message: 'Venta no encontrada.' });
      }

      // Convertir Decimal a string para una serialización JSON segura y consistente
      // El frontend se encargará de parsearlo a número si es necesario para cálculos o formateo.
      const saleForJson = {
        ...sale,
        totalAmount: sale.totalAmount.toString(),
        items: sale.items.map(item => ({
          ...item,
          priceAtSale: item.priceAtSale.toString(),
          product: {
            ...item.product,
            // Asegurar que los precios del producto también sean strings si son Decimal
            pricePurchase: item.product.pricePurchase?.toString() || null,
            priceSale: item.product.priceSale.toString(),
          }
        }))
      };

      res.status(200).json(saleForJson);
    } catch (error: any) {
      console.error(`Error fetching sale ${id}:`, error);
      res.status(500).json({ message: `Error al obtener los detalles de la venta: ${error.message}` });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}