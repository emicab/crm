// pages/api/vendedores/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { Prisma } from '@prisma/client';
import { handleApiError } from '../../../lib/apiErrorHandler';
import { sanitizeString } from '../../../lib/sanitize';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const page = req.query.page ? parseInt(req.query.page as string) : undefined;
    const limit = req.query.limit ? Math.min(parseInt(req.query.limit as string) || 50, 100) : 50;
    const skip = page ? (page - 1) * limit : undefined;

    try {
      const [sellers, total] = await Promise.all([
        prisma.seller.findMany({
          orderBy: { name: 'asc' },
          ...(skip !== undefined && { skip, take: limit }),
        }),
        prisma.seller.count(),
      ]);

      if (page !== undefined) {
        res.status(200).json({
          data: sellers,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          }
        });
      } else {
        res.status(200).json(sellers);
      }
    } catch (error) {
      handleApiError(res, error, "fetching sellers");
    }
  } else if (req.method === 'POST') {
    let { name, email, phone, isActive } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'El nombre del vendedor es obligatorio.' });
    }

    name = sanitizeString(name);
    if (email) email = sanitizeString(email);
    if (phone) phone = sanitizeString(phone);

    try {
      const newSeller = await prisma.seller.create({
        data: {
          name,
          email: email || null,
          phone: phone || null,
          isActive: isActive !== undefined ? isActive : true,
        },
      });
      res.status(201).json(newSeller);
    } catch (error: any) {
      handleApiError(res, error, "creating seller");
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}