// pages/api/brands/[id]/products.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma'; // Ajusta la ruta si es necesario

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const brandIdQuery = req.query.id as string; // El [id] de la URL se refiere al brandId

  if (!brandIdQuery || isNaN(parseInt(brandIdQuery))) {
    return res.status(400).json({ message: 'ID de marca inválido.' });
  }

  const brandId = parseInt(brandIdQuery);

  if (req.method === 'GET') {
    try {
      // Primero, verificar si la marca existe (opcional, pero buena práctica)
      const brandExists = await prisma.brand.findUnique({
        where: { id: brandId },
      });

      if (!brandExists) {
        return res.status(404).json({ message: 'Marca no encontrada' });
      }

      // Luego, obtener los productos de esa marca
      const products = await prisma.product.findMany({
        where: {
          brandId: brandId,
        },
        include: {
          // brand: true, // No es necesario incluir la marca aquí, ya que estamos en su contexto
          category: true, // Incluir datos de la categoría del producto
        },
        orderBy: {
          name: 'asc',
        }
      });
      res.status(200).json(products);
    } catch (error) {
      console.error(`Error fetching products for brand ${brandId}:`, error);
      res.status(500).json({ message: `Error al obtener los productos para la marca ${brandId}` });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}