// pages/api/categories/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma'; // Ajusta la ruta si es necesario
import { handleApiError } from '../../../lib/apiErrorHandler';
import { sanitizeString } from '../../../lib/sanitize';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const categoryIdQuery = req.query.id as string;

  if (!categoryIdQuery || isNaN(parseInt(categoryIdQuery))) {
    return res.status(400).json({ message: 'ID de categoría inválido.' });
  }
  
  const id = parseInt(categoryIdQuery);

  if (req.method === 'GET') {
    try {
      const category = await prisma.category.findUnique({
        where: { id },
      });
      if (!category) {
        return res.status(404).json({ message: 'Categoría no encontrada.' });
      }
      res.status(200).json(category);
    } catch (error: any) {
      handleApiError(res, error, `fetching category ${id}`);
    }
  } else if (req.method === 'PUT') {
    let { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ message: 'El nombre es obligatorio y debe ser una cadena de texto no vacía.' });
    }

    name = sanitizeString(name);

    try {
      const updatedCategory = await prisma.category.update({
        where: { id },
        data: {
          name: name.trim(),
        },
      });
      res.status(200).json(updatedCategory);
    } catch (error: any) {
      handleApiError(res, error, `updating category ${id}`);
    }
  } else if (req.method === 'DELETE') {
    try {
      // Verificar si hay productos asociados (mantenemos esta lógica importante)
      const productsInCategory = await prisma.product.count({
        where: { categoryId: id },
      });

      if (productsInCategory > 0) {
        return res.status(409).json({ // 409 Conflict
          message: `No se puede eliminar la categoría porque tiene ${productsInCategory} producto(s) asociado(s). Primero reasigna o elimina esos productos.`
        });
      }
      
      await prisma.category.delete({
        where: { id },
      });
      res.status(204).end(); // 204 No Content: Éxito, sin cuerpo de respuesta
    } catch (error: any) {
      handleApiError(res, error, `deleting category ${id}`);
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}