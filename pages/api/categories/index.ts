// pages/api/categories/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma'; // Ajusta la ruta si es necesario

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const { name } = req.query; // Para búsqueda opcional por nombre

    try {
      const categories = await prisma.category.findMany({
        where: {
          name: name ? { contains: name as string, mode: 'insensitive' } : undefined,
        },
        orderBy: {
          name: 'asc', // Ordenar por nombre ascendentemente
        },
      });
      res.status(200).json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: 'Error al obtener las categorías' });
    }
  } else if (req.method === 'POST') {
    const { name, logoUrl } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }

    try {
      const newCategory = await prisma.category.create({
        data: {
          name,
          logoUrl, // Esto será null si no se provee, lo cual es correcto para un campo opcional
        },
      });
      res.status(201).json(newCategory);
    } catch (error) {
      console.error("Error creating category:", error);
      if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
        // P2002 es el código de error de Prisma para violación de constraint único
        return res.status(409).json({ message: 'Ya existe una categoría con este nombre.' });
      }
      res.status(500).json({ message: 'Error al crear la categoría' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}