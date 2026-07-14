// pages/api/discount-codes/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { Prisma } from '@prisma/client';
const Decimal = Prisma.Decimal;
import { handleApiError } from '../../../lib/apiErrorHandler';
import { sanitizeString } from '../../../lib/sanitize';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const { code } = req.query;

    const whereClause = {
      code: code ? { contains: (code as string).toUpperCase() } : undefined,
    };

    const page = req.query.page ? parseInt(req.query.page as string) : undefined;
    const limit = req.query.limit ? Math.min(parseInt(req.query.limit as string) || 50, 100) : 50;
    const skip = page ? (page - 1) * limit : undefined;

    try {
      const [codes, total] = await Promise.all([
        prisma.discountCode.findMany({
          where: whereClause,
          orderBy: { code: 'asc' },
          ...(skip !== undefined && { skip, take: limit }),
        }),
        prisma.discountCode.count({ where: whereClause }),
      ]);

      const codesForJson = codes.map(c => ({
        ...c,
        discountPercent: c.discountPercent.toString(),
      }));

      if (page !== undefined) {
        res.status(200).json({
          data: codesForJson,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          }
        });
      } else {
        res.status(200).json(codesForJson);
      }
    } catch (error) {
      handleApiError(res, error, "fetching discount codes");
    }
  } else if (req.method === 'POST') {
    const { discountPercent, validFrom, validUntil, maxUses, isActive } = req.body;
    let { code } = req.body;

    if (!code || typeof code !== 'string' || code.trim() === '') {
      return res.status(400).json({ message: 'El código de descuento es obligatorio.' });
    }
    if (discountPercent === undefined || isNaN(parseFloat(discountPercent))) {
      return res.status(400).json({ message: 'El porcentaje de descuento es obligatorio y debe ser un número.' });
    }
    const pct = parseFloat(discountPercent);
    if (pct < 0 || pct > 100) {
      return res.status(400).json({ message: 'El porcentaje de descuento debe estar entre 0 y 100.' });
    }

    code = sanitizeString(code).toUpperCase().trim();

    try {
      const existing = await prisma.discountCode.findUnique({
        where: { code },
      });
      if (existing) {
        return res.status(400).json({ message: 'Ya existe un código de descuento con este nombre.' });
      }

      const newCode = await prisma.discountCode.create({
        data: {
          code,
          discountPercent: new Decimal(pct),
          validFrom: validFrom ? new Date(validFrom) : null,
          validUntil: validUntil ? new Date(validUntil) : null,
          maxUses: maxUses !== undefined && maxUses !== '' ? parseInt(maxUses) : null,
          isActive: isActive !== undefined ? !!isActive : true,
        },
      });

      res.status(201).json({
        ...newCode,
        discountPercent: newCode.discountPercent.toString(),
      });
    } catch (error) {
      handleApiError(res, error, "creating discount code");
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ message: `Método ${req.method} no permitido.` });
  }
}
