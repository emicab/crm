// pages/api/web-orders/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { handleApiError } from '../../../lib/apiErrorHandler';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
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
      } = req.body;

      if (!clientName || !clientPhone || !items || !items.length) {
        return res.status(400).json({ message: 'Nombre, teléfono e ítems son obligatorios.' });
      }

      const generatedNumber = webOrderNumber || `WEB-${Date.now().toString().slice(-6)}`;

      const newOrder = await prisma.$transaction(async (tx) => {
        const order = await tx.webOrder.create({
          data: {
            webOrderNumber: generatedNumber,
            clientName,
            clientEmail: clientEmail || null,
            clientPhone,
            shippingAddress: shippingAddress || null,
            deliveryType: deliveryType || 'PICKUP',
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

        // Descuenta stock automáticamente de los productos
        for (const item of items) {
          await tx.product.update({
            where: { id: parseInt(item.productId) },
            data: {
              quantityStock: {
                decrement: parseFloat(item.quantity)
              }
            }
          });
        }

        return order;
      });

      res.status(201).json(newOrder);
    } catch (error) {
      handleApiError(res, error, "creating web order");
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
