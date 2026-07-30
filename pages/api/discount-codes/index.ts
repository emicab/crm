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

      const codesForJson = codes.map((c: any) => ({
        ...c,
        discountPercent: c.discountPercent ? c.discountPercent.toString() : '0',
        discountType: c.discountType || 'PERCENTAGE',
        discountValue: c.discountValue ? c.discountValue.toString() : (c.discountPercent ? c.discountPercent.toString() : '0'),
        minPurchase: c.minPurchase ? c.minPurchase.toString() : '0',
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
    const { discountPercent, discountType, discountValue, minPurchase, validFrom, validUntil, maxUses, isActive } = req.body;
    let { code } = req.body;

    if (!code || typeof code !== 'string' || code.trim() === '') {
      return res.status(400).json({ message: 'El código de descuento es obligatorio.' });
    }
    const valNum = parseFloat(discountValue !== undefined && discountValue !== '' ? discountValue : discountPercent);
    if (isNaN(valNum) || valNum < 0) {
      return res.status(400).json({ message: 'El valor de descuento debe ser un número válido mayor o igual a 0.' });
    }

    const type = discountType === 'FIXED_AMOUNT' ? 'FIXED_AMOUNT' : 'PERCENTAGE';
    if (type === 'PERCENTAGE' && valNum > 100) {
      return res.status(400).json({ message: 'El porcentaje de descuento debe estar entre 0 y 100.' });
    }

    code = sanitizeString(code).toUpperCase().trim();
    const minP = minPurchase !== undefined && minPurchase !== '' ? parseFloat(minPurchase) : 0;

    try {
      const existing = await prisma.discountCode.findUnique({
        where: { code },
      });
      if (existing) {
        return res.status(400).json({ message: 'Ya existe un código de descuento con este nombre.' });
      }

      let newCode: any;
      try {
        newCode = await prisma.discountCode.create({
          data: {
            code,
            discountPercent: new Decimal(type === 'PERCENTAGE' ? valNum : 0),
            discountType: type,
            discountValue: new Decimal(valNum),
            minPurchase: new Decimal(isNaN(minP) ? 0 : minP),
            validFrom: validFrom ? new Date(validFrom) : null,
            validUntil: validUntil ? new Date(validUntil) : null,
            maxUses: maxUses !== undefined && maxUses !== '' ? parseInt(maxUses) : null,
            isActive: isActive !== undefined ? !!isActive : true,
          },
        });
      } catch (err: any) {
        if (err.message && err.message.includes("Unknown argument")) {
          newCode = await prisma.discountCode.create({
            data: {
              code,
              discountPercent: new Decimal(type === 'PERCENTAGE' ? valNum : 0),
              validFrom: validFrom ? new Date(validFrom) : null,
              validUntil: validUntil ? new Date(validUntil) : null,
              maxUses: maxUses !== undefined && maxUses !== '' ? parseInt(maxUses) : null,
              isActive: isActive !== undefined ? !!isActive : true,
            },
          });
          const safeMinP = isNaN(minP) ? 0 : minP;
          const codeId = newCode.id;
          await prisma.$executeRaw`UPDATE "DiscountCode" SET "discountType" = ${type}, "discountValue" = ${valNum}, "minPurchase" = ${safeMinP} WHERE "id" = ${codeId}`;
        } else {
          throw err;
        }
      }

      res.status(201).json({
        ...newCode,
        discountPercent: type === 'PERCENTAGE' ? valNum.toString() : '0',
        discountType: type,
        discountValue: valNum.toString(),
        minPurchase: (isNaN(minP) ? 0 : minP).toString(),
      });
    } catch (error) {
      handleApiError(res, error, "creating discount code");
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ message: `Método ${req.method} no permitido.` });
  }
}
