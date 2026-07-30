// pages/api/discount-codes/[id].ts
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
  const codeIdQuery = req.query.id as string;

  if (!codeIdQuery || isNaN(parseInt(codeIdQuery))) {
    return res.status(400).json({ message: 'ID de código inválido.' });
  }

  const id = parseInt(codeIdQuery);

  if (req.method === 'GET') {
    try {
      const code = await prisma.discountCode.findUnique({
        where: { id },
      });
      if (!code) {
        return res.status(404).json({ message: 'Código de descuento no encontrado.' });
      }
      res.status(200).json({
        ...code,
        discountPercent: code.discountPercent.toString(),
      });
    } catch (error) {
      handleApiError(res, error, `fetching discount code ${id}`);
    }
  } else if (req.method === 'PUT') {
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
        where: { id },
      });
      if (!existing) {
        return res.status(404).json({ message: 'Código de descuento no encontrado.' });
      }

      if (existing.code !== code) {
        const duplicate = await prisma.discountCode.findUnique({
          where: { code },
        });
        if (duplicate) {
          return res.status(400).json({ message: 'Ya existe otro código de descuento con este nombre.' });
        }
      }

      const updated = await prisma.discountCode.update({
        where: { id },
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

      res.status(200).json({
        ...updated,
        discountPercent: updated.discountPercent.toString(),
        discountValue: updated.discountValue?.toString() || updated.discountPercent.toString(),
        minPurchase: updated.minPurchase?.toString() || '0',
      });
    } catch (error) {
      handleApiError(res, error, `updating discount code ${id}`);
    }
  } else if (req.method === 'DELETE') {
    try {
      const existing = await prisma.discountCode.findUnique({
        where: { id },
      });
      if (!existing) {
        return res.status(404).json({ message: 'Código de descuento no encontrado.' });
      }

      await prisma.discountCode.delete({
        where: { id },
      });

      res.status(200).json({ message: 'Código de descuento eliminado exitosamente.' });
    } catch (error) {
      handleApiError(res, error, `deleting discount code ${id}`);
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).json({ message: `Método ${req.method} no permitido.` });
  }
}
