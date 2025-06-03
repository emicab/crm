// pages/api/categories/[id]/products.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma'; // Ajusta la ruta si es necesario

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const categoryId = req.query.id as string; // El [id] de la URL se refiere al categoryId

  if (!categoryId || isNaN(parseInt(categoryId))) {
    return res.status(400).json({ message: 'ID de categoría inválido.' });
  }

  const id = parseInt(categoryId);

  if (req.method === 'GET') {
    try {
      // Primero, verificar si la categoría existe (opcional, pero buena práctica)
      const categoryExists = await prisma.category.findUnique({
        where: { id },
      });

      if (!categoryExists) {
        return res.status(404).json({ message: 'Categoría no encontrada' });
      }

      // Luego, obtener los productos de esa categoría
      const products = await prisma.product.findMany({
        where: {
          categoryId: id,
        },
        include: {
          brand: true, // Incluir datos de la marca del producto
          // No necesitamos incluir la categoría aquí, ya que estamos en su contexto
        },
        orderBy: {
          name: 'asc',
        }
      });
      res.status(200).json(products);
    } catch (error) {
      console.error(`Error fetching products for category ${id}:`, error);
      res.status(500).json({ message: `Error al obtener los productos para la categoría ${id}` });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}