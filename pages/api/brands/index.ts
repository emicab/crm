// pages/api/brands/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma'; // Ajusta la ruta si es necesario

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const { name } = req.query; // Para búsqueda opcional por nombre

    try {
      const brands = await prisma.brand.findMany({
        where: {
          name: name ? { contains: name as string, mode: 'insensitive' } : undefined,
        },
        orderBy: {
          name: 'asc', // Ordenar por nombre ascendentemente
        },
      });
      res.status(200).json(brands);
    } catch (error) {
      console.error("Error fetching brands:", error);
      res.status(500).json({ message: 'Error al obtener las marcas' });
    }
  } else if (req.method === 'POST') {
    const { name, logoUrl } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }

    try {
      const newBrand = await prisma.brand.create({
        data: {
          name,
          logoUrl, // Será null si no se provee, lo cual es correcto para un campo opcional
        },
      });
      res.status(201).json(newBrand);
    } catch (error) {
      console.error("Error creating brand:", error);
      if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
        // P2002 es el código de error de Prisma para violación de constraint único
        return res.status(409).json({ message: 'Ya existe una marca con este nombre.' });
      }
      res.status(500).json({ message: 'Error al crear la marca' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}