// pages/api/products/[id]/modifiers.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { handleApiError } from '../../../../lib/apiErrorHandler';
import { sanitizeString } from '../../../../lib/sanitize';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const productIdQuery = req.query.id as string;
  if (!productIdQuery || isNaN(parseInt(productIdQuery))) {
    return res.status(400).json({ message: 'ID de producto inválido.' });
  }

  const productId = parseInt(productIdQuery);

  if (req.method === 'GET') {
    try {
      const modifierGroups = await prisma.productModifierGroup.findMany({
        where: { productId },
        include: {
          options: {
            include: {
              ingredient: { select: { id: true, name: true, unitType: true } }
            }
          }
        },
        orderBy: { id: 'asc' }
      });
      res.status(200).json(modifierGroups);
    } catch (error) {
      handleApiError(res, error, `fetching modifiers for product ${productId}`);
    }
  } else if (req.method === 'PUT' || req.method === 'POST') {
    // Reemplaza o sincroniza los grupos de modificadores del producto
    const { groups } = req.body;
    if (!Array.isArray(groups)) {
      return res.status(400).json({ message: 'Se requiere un arreglo "groups" de grupos de modificadores.' });
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Limpiar modificadores anteriores
        await tx.productModifierGroup.deleteMany({ where: { productId } });

        for (const grp of groups) {
          if (!grp.name || typeof grp.name !== 'string' || !grp.name.trim()) continue;

          const createdGroup = await tx.productModifierGroup.create({
            data: {
              productId,
              name: sanitizeString(grp.name.trim()),
              type: ['SINGLE_SELECT', 'MULTI_SELECT', 'SIZE_COLOR'].includes(grp.type) ? grp.type : 'MULTI_SELECT',
              isRequired: Boolean(grp.isRequired),
              minSelect: parseInt(grp.minSelect) || 0,
              maxSelect: grp.maxSelect ? (parseInt(grp.maxSelect) || null) : null,
            }
          });

          if (Array.isArray(grp.options) && grp.options.length > 0) {
            for (const opt of grp.options) {
              if (!opt.name || typeof opt.name !== 'string' || !opt.name.trim()) continue;

              await tx.productModifierOption.create({
                data: {
                  modifierGroupId: createdGroup.id,
                  name: sanitizeString(opt.name.trim()),
                  priceExtra: parseFloat(opt.priceExtra) || 0,
                  colorHex: opt.colorHex ? String(opt.colorHex).trim() : null,
                  ingredientId: opt.ingredientId ? parseInt(opt.ingredientId) || null : null,
                  ingredientQty: parseFloat(opt.ingredientQty) || 1,
                }
              });
            }
          }
        }
      });

      // Encolar outbox para sync cloud (fire and forget)
      try {
        const { enqueueOutbox } = await import("../../../../lib/syncOutbox");
        await enqueueOutbox("ProductModifierGroup", "UPSERT", String(productId));
      } catch (enqErr) {
        console.warn("[Modifiers API] Could not enqueue outbox:", enqErr);
      }

      const updatedGroups = await prisma.productModifierGroup.findMany({
        where: { productId },
        include: { options: { include: { ingredient: { select: { id: true, name: true, unitType: true } } } } },
        orderBy: { id: 'asc' }
      });

      res.status(200).json(updatedGroups);
    } catch (error) {
      handleApiError(res, error, `saving modifiers for product ${productId}`);
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
