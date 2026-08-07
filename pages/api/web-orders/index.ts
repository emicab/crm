// pages/api/web-orders/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { handleApiError } from '../../../lib/apiErrorHandler';
import { isProDevice } from '../../../lib/branchIdentity';
import { applyRateLimit } from '../../../lib/rateLimit';
import { sanitizeString } from '../../../lib/sanitize';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      // Verificación de autenticación de dispositivo / sesión interna
      if (!(await isProDevice())) {
        return res.status(403).json({ message: 'La gestión de pedidos web requiere el Plan Pro.', blockedByPlan: true });
      }

      const orders = await prisma.webOrder.findMany({
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const formattedOrders = orders.map(o => ({
        ...o,
        totalAmount: o.totalAmount.toString(),
        items: o.items.map(item => ({
          ...item,
          unitPrice: item.unitPrice.toString(),
          subtotal: item.subtotal.toString(),
          product: {
            ...item.product,
            pricePurchase: item.product.pricePurchase.toString(),
            priceSale: item.product.priceSale.toString(),
          }
        }))
      }));

      res.status(200).json(formattedOrders);
    } catch (error) {
      handleApiError(res, error, "fetching web orders");
    }
  } else if (req.method === 'POST') {
    // Registra un nuevo pedido web (desde ClinStore o sincronizado)
    try {
      // Control de tasa de peticiones (Rate Limit: 20 pedidos por minuto)
      if (!applyRateLimit(req, res, 20, 60 * 1000)) {
        return;
      }

      const {
        webOrderNumber,
        clientName,
        clientEmail,
        clientPhone,
        shippingAddress,
        deliveryType,
        paymentMethod,
        notes,
        items,
        branchId,
      } = req.body;

      if (!clientName || !clientPhone || !Array.isArray(items) || !items.length) {
        return res.status(400).json({ message: 'Nombre, teléfono e ítems válidos son obligatorios.' });
      }

      // Sanitización de strings de entrada
      const sanitizedName = sanitizeString(clientName);
      const sanitizedEmail = clientEmail ? sanitizeString(clientEmail) : null;
      const sanitizedPhone = sanitizeString(clientPhone);
      const sanitizedAddress = shippingAddress ? sanitizeString(shippingAddress) : null;
      const sanitizedNotes = notes ? sanitizeString(notes) : null;

      const generatedNumber = webOrderNumber ? sanitizeString(webOrderNumber) : `WEB-${Date.now().toString().slice(-6)}`;

      // Si el pedido ya existe, evitar duplicados y responder 200 OK
      const existing = await prisma.webOrder.findFirst({
        where: { webOrderNumber: generatedNumber },
      });

      if (existing) {
        return res.status(200).json(existing);
      }

      const parsedBranchId = branchId ? parseInt(branchId) : null;

      // SEGURIDAD: Recalcular precios unitarios y subtotal server-side consultando
      // la base de datos oficial para evitar manipulación de precios desde el cliente.
      const productIds = items.map((i: any) => parseInt(i.productId)).filter(id => !isNaN(id));
      const dbProducts = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, priceSale: true }
      });
      const productMap = new Map(dbProducts.map(p => [p.id, Number(p.priceSale)]));

      let calculatedTotal = 0;
      const verifiedItems = [];

      for (const rawItem of items) {
        const pId = parseInt(rawItem.productId);
        const qty = parseFloat(rawItem.quantity);
        if (isNaN(pId) || isNaN(qty) || qty <= 0) continue;

        const dbPrice = productMap.get(pId) ?? (parseFloat(rawItem.unitPrice) || 0);
        const subtotal = qty * dbPrice;
        calculatedTotal += subtotal;

        verifiedItems.push({
          productId: pId,
          quantity: qty,
          unitPrice: dbPrice,
          subtotal: subtotal,
          modifiers: rawItem.modifiers
            ? (typeof rawItem.modifiers === 'string' ? rawItem.modifiers : JSON.stringify(rawItem.modifiers))
            : null,
        });
      }

      if (verifiedItems.length === 0) {
        return res.status(400).json({ message: 'No se encontraron productos válidos en el pedido.' });
      }

      // Por defecto, todo pedido web público inicia en estado PENDING de pago
      const newOrder = await prisma.webOrder.create({
        data: {
          webOrderNumber: generatedNumber,
          clientName: sanitizedName,
          clientEmail: sanitizedEmail,
          clientPhone: sanitizedPhone,
          shippingAddress: sanitizedAddress,
          deliveryType: deliveryType === 'DELIVERY' ? 'DELIVERY' : 'PICKUP',
          branchId: parsedBranchId,
          paymentMethod: paymentMethod || 'CASH_ON_DELIVERY',
          paymentStatus: 'PENDING', // Se valida mediante webhook de MP o confirmación de caja
          status: 'PENDING_PREPARATION',
          totalAmount: calculatedTotal,
          notes: sanitizedNotes,
          items: {
            create: verifiedItems
          }
        },
        include: { items: { include: { product: true } } }
      });

      // Descuenta stock automáticamente
      const mainBranch = await prisma.branch.findFirst({ where: { isMain: true } });
      const stockBranchId = parsedBranchId ?? mainBranch?.id;
      for (const item of verifiedItems) {
        try {
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
            select: { isRecipe: true },
          });
          if (product?.isRecipe) {
            const { deductRecipeStock } = await import("../../../lib/recipeStock");
            await deductRecipeStock(prisma, item.productId, item.quantity, stockBranchId);
          } else {
            await prisma.product.update({
              where: { id: item.productId },
              data: {
                quantityStock: {
                  decrement: item.quantity
                }
              }
            });
            if (stockBranchId) {
              await prisma.productBranchStock.upsert({
                where: {
                  productId_branchId: {
                    productId: item.productId,
                    branchId: stockBranchId,
                  },
                },
                update: { quantityStock: { decrement: item.quantity } },
                create: {
                  productId: item.productId,
                  branchId: stockBranchId,
                  quantityStock: -item.quantity,
                },
              });
            }
          }
        } catch (stkErr) {
          console.warn("Error descontando stock para item:", item, stkErr);
        }
      }

      // Encolar outbox para sync
      try {
        const { enqueueOutbox } = await import('../../../lib/syncOutbox');
        await enqueueOutbox('WebOrder', 'UPSERT', String(newOrder.id));
      } catch (enqErr) {
        console.warn('[WebOrders] Error al encolar pedido web:', enqErr);
      }

      return res.status(201).json(newOrder);
    } catch (error) {
      handleApiError(res, error, "creating web order");
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
