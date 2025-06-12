// pages/api/compras/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { Prisma, PurchaseStatus } from '@prisma/client'; // Importar PurchaseStatus
import { Decimal } from '@prisma/client/runtime/library';

// --- Interfaces para los datos de entrada ---
interface PurchaseItemInput {
  productId: number;
  quantity: number;
  purchasePrice: number; // Costo por unidad en esta compra
}

interface CreatePurchaseInput {
  supplierId: number;
  status?: PurchaseStatus; // Opcional, por defecto será RECEIVED para actualizar stock
  invoiceNumber?: string;
  notes?: string;
  items: PurchaseItemInput[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    // --- Obtener Historial de Compras ---
    try {
      const purchases = await prisma.purchase.findMany({
        include: {
          supplier: true,
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { purchaseDate: 'desc' },
      });
      // Convertir Decimales a string para la respuesta JSON
      const purchasesForJson = purchases.map(p => ({
        ...p,
        totalAmount: p.totalAmount.toString(),
        items: p.items.map(item => ({
          ...item,
          purchasePrice: item.purchasePrice.toString(),
          product: {
            ...item.product,
            pricePurchase: item.product.pricePurchase?.toString() || null,
            priceSale: item.product.priceSale.toString(),
          }
        }))
      }));
      res.status(200).json(purchasesForJson);
    } catch (error) {
      console.error("Error al obtener el historial de compras:", error);
      res.status(500).json({ message: 'Error al obtener el historial de compras' });
    }
  } else if (req.method === 'POST') {
    // --- Registrar una Nueva Compra ---
    const { supplierId, status, invoiceNumber, notes, items } = req.body as CreatePurchaseInput;

    if (!supplierId || !items || items.length === 0) {
      return res.status(400).json({ message: 'Faltan datos obligatorios: proveedor o ítems.' });
    }

    // Calcular totalAmount a partir de los ítems recibidos
    let calculatedTotalAmount = new Decimal(0);
    for (const item of items) {
      if (item.quantity <= 0 || item.purchasePrice < 0) {
        return res.status(400).json({ message: `Cantidad o precio de compra inválido para el producto ID ${item.productId}.` });
      }
      calculatedTotalAmount = calculatedTotalAmount.plus(new Decimal(item.purchasePrice).times(item.quantity));
    }

    try {
      // Usamos una transacción para asegurar que todo se ejecute correctamente o nada lo haga.
      const result = await prisma.$transaction(async (tx) => {
        // 1. Crear el registro principal de la Compra
        const newPurchase = await tx.purchase.create({
          data: {
            purchaseDate: new Date(),
            totalAmount: calculatedTotalAmount,
            status: status || PurchaseStatus.RECEIVED, // Si no se especifica, asumimos que se recibió la mercadería
            invoiceNumber: invoiceNumber || null,
            notes: notes || null,
            supplier: { connect: { id: supplierId } },
          },
        });

        // 2. Crear los PurchaseItems y, crucialmente, INCREMENTAR el stock de los productos
        for (const item of items) {
          await tx.purchaseItem.create({
            data: {
              purchaseId: newPurchase.id,
              productId: item.productId,
              quantity: item.quantity,
              purchasePrice: new Decimal(item.purchasePrice),
            },
          });

          // Actualizar (incrementar) el stock del producto
          await tx.product.update({
            where: { id: item.productId },
            data: {
              quantityStock: {
                increment: item.quantity,
              },
              // Opcional: Actualizar el precio de compra del producto con el de esta última compra
              pricePurchase: new Decimal(item.purchasePrice)
            },
          });
        }

        // Devolvemos la compra completa para la respuesta
        return tx.purchase.findUnique({
            where: { id: newPurchase.id },
            include: { supplier: true, items: { include: { product: true } } }
        });
      });

      res.status(201).json(result);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido en la transacción.';
      console.error("Error al registrar la compra:", error);
      res.status(500).json({ message: `Error al registrar la compra: ${errorMessage}` });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}