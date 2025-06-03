// pages/api/categories/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma'; // Ajusta la ruta si es necesario
import { Prisma } from '@prisma/client'; // Para tipar errores de Prisma

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
      console.error(`Error fetching category ${id}:`, error);
      res.status(500).json({ message: `Error al obtener la categoría: ${error.message}` });
    }
  } else if (req.method === 'PUT') {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ message: 'El nombre es obligatorio y debe ser una cadena de texto no vacía.' });
    }

    try {
      const updatedCategory = await prisma.category.update({
        where: { id },
        data: {
          name: name.trim(),
        },
      });
      res.status(200).json(updatedCategory);
    } catch (error: any) {
      console.error(`Error updating category ${id}:`, error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') { // "Record to update not found"
          return res.status(404).json({ message: 'Categoría no encontrada para actualizar.' });
        }
        if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
          // Violación de constraint único para el nombre
          return res.status(409).json({ message: 'Ya existe otra categoría con este nombre.' });
        }
      }
      res.status(500).json({ message: `Error al actualizar la categoría: ${error.message}` });
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
      console.error(`Error deleting category ${id}:`, error);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        // "Record to delete not found"
        return res.status(404).json({ message: 'Categoría no encontrada para eliminar.' });
      }
      res.status(500).json({ message: `Error al eliminar la categoría: ${error.message}` });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}