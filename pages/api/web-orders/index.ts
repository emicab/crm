// pages/api/web-orders/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { handleApiError } from '../../../lib/apiErrorHandler';
import { isProDevice } from '../../../lib/branchIdentity';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      // La vista/gestión de pedidos web es exclusiva del Plan Pro.
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
    // Registra un nuevo pedido web (por ejemplo, cuando se simula o sincroniza desde Supabase)
    try {
      const {
        webOrderNumber,
        clientName,
        clientEmail,
        clientPhone,
        shippingAddress,
        deliveryType,
        paymentMethod,
        paymentStatus,
        totalAmount,
        notes,
        items,
        branchId,
      } = req.body;

      if (!clientName || !clientPhone || !items || !items.length) {
        return res.status(400).json({ message: 'Nombre, teléfono e ítems son obligatorios.' });
      }

      const generatedNumber = webOrderNumber || `WEB-${Date.now().toString().slice(-6)}`;

      // Si el pedido ya existe, evitar duplicados y responder 200 OK
      const existing = await prisma.webOrder.findFirst({
        where: { webOrderNumber: generatedNumber },
      });

      if (existing) {
        return res.status(200).json(existing);
      }

      const parsedBranchId = branchId ? parseInt(branchId) : null;

      const newOrder = await prisma.webOrder.create({
        data: {
          webOrderNumber: generatedNumber,
          clientName,
          clientEmail: clientEmail || null,
          clientPhone,
          shippingAddress: shippingAddress || null,
          deliveryType: deliveryType || 'PICKUP',
          branchId: parsedBranchId,
          paymentMethod: paymentMethod || 'CASH_ON_DELIVERY',
          paymentStatus: paymentStatus || 'PENDING',
          status: 'PENDING_PREPARATION',
          totalAmount: parseFloat(totalAmount) || 0,
          notes: notes || null,
          items: {
            create: items.map((i: any) => ({
              productId: parseInt(i.productId),
              quantity: parseFloat(i.quantity),
              unitPrice: parseFloat(i.unitPrice),
              subtotal: parseFloat(i.quantity) * parseFloat(i.unitPrice),
            }))
          }
        },
        include: { items: { include: { product: true } } }
      });

      // Descuenta stock automáticamente (global + sucursal asignada; si no hay
      // branchId se usa la principal como reserva provisoria)
      const mainBranch = await prisma.branch.findFirst({ where: { isMain: true } });
      const stockBranchId = parsedBranchId ?? mainBranch?.id;
      for (const item of items) {
        try {
          await prisma.product.update({
            where: { id: parseInt(item.productId) },
            data: {
              quantityStock: {
                decrement: parseFloat(item.quantity)
              }
            }
          });
          if (stockBranchId) {
            await prisma.productBranchStock.upsert({
              where: {
                productId_branchId: {
                  productId: parseInt(item.productId),
                  branchId: stockBranchId,
                },
              },
              update: { quantityStock: { decrement: parseFloat(item.quantity) } },
              create: {
                productId: parseInt(item.productId),
                branchId: stockBranchId,
                quantityStock: -parseFloat(item.quantity),
              },
            });
          }
        } catch (stkErr) {
          console.warn("Error descontando stock para item:", item, stkErr);
        }
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
