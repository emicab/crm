// pages/api/ventas/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { Prisma, PaymentType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

interface SaleItemInput {
  productId: number;
  quantity: number;
  priceAtSale: number;
}

interface CreateSaleInput {
  clientId?: number;
  sellerId: number;
  paymentType: PaymentType;
  notes?: string;
  items: SaleItemInput[];
  discountCodeApplied?: string; // <--- NUEVO CAMPO EN EL INPUT
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const { clientId, sellerId } = req.query; // Nuevos query params para filtrar

    let whereClause: Prisma.SaleWhereInput = {}; // Cláusula 'where' para Prisma

    if (clientId && typeof clientId === 'string') {
      const parsedClientId = parseInt(clientId);
      if (!isNaN(parsedClientId)) {
        whereClause.clientId = parsedClientId;
      } else {
        return res.status(400).json({ message: 'clientId inválido.' });
      }
    }

    if (sellerId && typeof sellerId === 'string') {
      const parsedSellerId = parseInt(sellerId);
      if (!isNaN(parsedSellerId)) {
        whereClause.sellerId = parsedSellerId;
      } else {
        return res.status(400).json({ message: 'sellerId inválido.' });
      }
    }

    try {
      const sales = await prisma.sale.findMany({
        where: whereClause, // Aplicar los filtros si existen
        include: {
          client: true,
          seller: true,
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { saleDate: 'desc' },
      });

      // Convertir Decimales a string para la respuesta JSON
      const salesForJson = sales.map(sale => ({
        ...sale,
        totalAmount: sale.totalAmount.toString(),
        items: sale.items.map(item => ({
          ...item,
          priceAtSale: item.priceAtSale.toString(),
          product: item.product ? { // Asegurarse que producto no es null
            ...item.product,
            pricePurchase: item.product.pricePurchase?.toString() || null,
            priceSale: item.product.priceSale.toString(),
          } : null
        }))
      }));

      res.status(200).json(salesForJson);
    } catch (error) {
      console.error("Error fetching sales:", error);
      res.status(500).json({ message: 'Error al obtener el historial de ventas' });
    }
  } else if (req.method === 'POST') {
    const { clientId, sellerId, paymentType, notes, items, discountCodeApplied } = req.body as CreateSaleInput; // <--- AÑADIR discountCodeApplied

    if (!sellerId || !paymentType || !items || items.length === 0) {
      return res.status(400).json({ message: 'Faltan datos obligatorios: vendedor, tipo de pago o ítems.' });
    }
    if (!Object.values(PaymentType).includes(paymentType)) {
        return res.status(400).json({ message: 'Tipo de pago inválido.' });
    }

    let calculatedTotalAmount = new Decimal(0);
    for (const item of items) {
      if (item.quantity <= 0 || item.priceAtSale < 0) {
        return res.status(400).json({ message: `Cantidad o precio inválido para el producto ID ${item.productId}.` });
      }
      calculatedTotalAmount = calculatedTotalAmount.plus(new Decimal(item.priceAtSale).times(item.quantity));
    }
    
    // Nota: En este punto, 'calculatedTotalAmount' NO incluye ningún descuento.
    // La lógica para aplicar el descuento al total se añadiría aquí si la tuviéramos.

    try {
      const result = await prisma.$transaction(async (tx) => {
        const newSale = await tx.sale.create({
          data: {
            saleDate: new Date(),
            totalAmount: calculatedTotalAmount, // Total sin descuento por ahora
            paymentType,
            notes: notes || null,
            discountCodeApplied: discountCodeApplied || null, // <--- GUARDAR EL CÓDIGO
            ...(clientId && { client: { connect: { id: clientId } } }),
            seller: { connect: { id: sellerId } },
          },
        });

        for (const item of items) {
          // ... (lógica de creación de SaleItem y actualización de stock sin cambios) ...
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product) {
            throw new Error(`Producto con ID ${item.productId} no encontrado.`);
          }
          if (product.quantityStock < item.quantity) {
            throw new Error(`Stock insuficiente para el producto "${product.name}". Disponible: ${product.quantityStock}, Solicitado: ${item.quantity}.`);
          }

          await tx.saleItem.create({
            data: {
              saleId: newSale.id,
              productId: item.productId,
              quantity: item.quantity,
              priceAtSale: new Decimal(item.priceAtSale),
            },
          });

          await tx.product.update({
            where: { id: item.productId },
            data: { quantityStock: { decrement: item.quantity } },
          });
        }
        return tx.sale.findUnique({
            where: { id: newSale.id },
            include: { client: true, seller: true, items: { include: { product: true } } }
        });
      });

      res.status(201).json(result);

    } catch (error: any) {
      console.error("Error creating sale:", error);
      if (error.message.startsWith('Stock insuficiente') || error.message.startsWith('Producto con ID')) {
        return res.status(409).json({ message: error.message });
      }
      res.status(500).json({ message: error.message || 'Error al crear la venta' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}