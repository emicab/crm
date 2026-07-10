// pages/api/categories/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma'; // Ajusta la ruta si es necesario
import { handleApiError } from '../../../lib/apiErrorHandler';
import { sanitizeString } from '../../../lib/sanitize';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const { name } = req.query; // Para búsqueda opcional por nombre

    const whereClause = {
      name: name ? { contains: name as string } : undefined,
    };

    const page = req.query.page ? parseInt(req.query.page as string) : undefined;
    const limit = req.query.limit ? Math.min(parseInt(req.query.limit as string) || 50, 100) : 50;
    const skip = page ? (page - 1) * limit : undefined;

    try {
      const [categories, total] = await Promise.all([
        prisma.category.findMany({
          where: whereClause,
          orderBy: {
            name: 'asc', // Ordenar por nombre ascendentemente
          },
          ...(skip !== undefined && { skip, take: limit }),
        }),
        prisma.category.count({ where: whereClause }),
      ]);

      if (page !== undefined) {
        res.status(200).json({
          data: categories,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          }
        });
      } else {
        res.status(200).json(categories);
      }
    } catch (error) {
      handleApiError(res, error, "fetching categories");
    }
  } else if (req.method === 'POST') {
    let { name, logoUrl } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }

    name = sanitizeString(name);
    if (logoUrl) logoUrl = sanitizeString(logoUrl);

    try {
      const newCategory = await prisma.category.create({
        data: {
          name,
          logoUrl, // Esto será null si no se provee, lo cual es correcto para un campo opcional
        },
      });
      res.status(201).json(newCategory);
    } catch (error) {
      handleApiError(res, error, "creating category");
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}