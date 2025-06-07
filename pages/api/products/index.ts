// pages/api/products/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { Prisma } from '@prisma/client'; // Importar Prisma para los tipos

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const { search, brandId, categoryId } = req.query;

    let whereClause: Prisma.ProductWhereInput = {};

    // Filtro de búsqueda por texto (en nombre o SKU)
    if (search && typeof search === 'string' && search.trim() !== '') {
        whereClause.OR = [
            { name: { contains: search } }, // Nota: La búsqueda será sensible a mayúsculas/minúsculas
            { sku: { contains: search } },
        ];
        // Anteriormente, `mode: 'insensitive'` nos dio problemas con la base de datos.
        // Lo omitimos para asegurar compatibilidad. La búsqueda será case-sensitive.
    }

    // Filtro por ID de Marca
    if (brandId && typeof brandId === 'string' && brandId !== '') {
        const parsedBrandId = parseInt(brandId);
        if (!isNaN(parsedBrandId)) {
            whereClause.brandId = parsedBrandId;
        }
    }

    // Filtro por ID de Categoría
    if (categoryId && typeof categoryId === 'string' && categoryId !== '') {
        const parsedCategoryId = parseInt(categoryId);
        if (!isNaN(parsedCategoryId)) {
            whereClause.categoryId = parsedCategoryId;
        }
    }

    try {
      const products = await prisma.product.findMany({
        where: whereClause, // Aplicar los filtros construidos
        include: {
          brand: true,
          category: true,
        },
        orderBy: {
          name: 'asc',
        },
      });
      res.status(200).json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: 'Error al obtener los productos' });
    }
  } else if (req.method === 'POST') {
    // ... (tu código para POST sin cambios) ...
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}