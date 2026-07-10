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
    let { code, discountPercent, validFrom, validUntil, maxUses, isActive } = req.body;

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
        where: { id },
      });
      if (!existing) {
        return res.status(404).json({ message: 'Código de descuento no encontrado.' });
      }

      // Validar unicidad si cambia el nombre del código
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
          discountPercent: new Decimal(pct),
          validFrom: validFrom ? new Date(validFrom) : null,
          validUntil: validUntil ? new Date(validUntil) : null,
          maxUses: maxUses !== undefined && maxUses !== '' ? parseInt(maxUses) : null,
          isActive: isActive !== undefined ? !!isActive : true,
        },
      });

      res.status(200).json({
        ...updated,
        discountPercent: updated.discountPercent.toString(),
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
