// pages/api/compras/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { Prisma, PurchaseStatus, PaymentType } from '@prisma/client';
const Decimal = Prisma.Decimal;
import { handleApiError } from '../../../lib/apiErrorHandler';
import { sanitizeString } from '../../../lib/sanitize';

interface PurchaseItemInput {
  productId: number;
  quantity: number;
  quantityReceived?: number; 
  purchasePrice: number; 
}

interface CreatePurchaseInput {
  supplierId: number;
  status?: PurchaseStatus; 
  paymentType?: PaymentType;
  invoiceNumber?: string;
  notes?: string;
  items: PurchaseItemInput[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const page = req.query.page ? parseInt(req.query.page as string) : undefined;
    const limit = req.query.limit ? Math.min(parseInt(req.query.limit as string) || 50, 100) : 50;
    const skip = page ? (page - 1) * limit : undefined;

    try {
      const [purchases, total] = await Promise.all([
        prisma.purchase.findMany({
          include: {
            supplier: true,
            items: {
              include: {
                product: true,
              },
            },
          },
          orderBy: { purchaseDate: 'desc' },
          ...(skip !== undefined && { skip, take: limit }),
        }),
        prisma.purchase.count(),
      ]);
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
      
      if (page !== undefined) {
        res.status(200).json({
          data: purchasesForJson,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          }
        });
      } else {
        res.status(200).json(purchasesForJson);
      }
    } catch (error) {
      handleApiError(res, error, "fetching purchases");
    }
  } else if (req.method === 'POST') {
    const { supplierId, status, paymentType, items } = req.body as CreatePurchaseInput;
    let { invoiceNumber, notes } = req.body as CreatePurchaseInput;

    if (!supplierId || !items || items.length === 0) {
      return res.status(400).json({ message: 'Faltan datos obligatorios: proveedor o ítems.' });
    }

    if (invoiceNumber) invoiceNumber = sanitizeString(invoiceNumber);
    if (notes) notes = sanitizeString(notes);

    let calculatedTotalAmount = new Decimal(0);
    for (const item of items) {
      if (item.quantity <= 0 || item.purchasePrice < 0) {
        return res.status(400).json({ message: `Cantidad o precio de compra inválido para el producto ID ${item.productId}.` });
      }
      calculatedTotalAmount = calculatedTotalAmount.plus(new Decimal(item.purchasePrice).times(item.quantity));
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const purchaseStatus = status || PurchaseStatus.PENDING;

        const newPurchase = await tx.purchase.create({
          data: {
            purchaseDate: new Date(),
            totalAmount: calculatedTotalAmount,
            status: purchaseStatus,
            paymentType: paymentType || null,
            invoiceNumber: invoiceNumber || null,
            notes: notes || null,
            supplier: { connect: { id: supplierId } },
          },
        });

        for (const item of items) {
          const receivedQty = purchaseStatus === PurchaseStatus.RECEIVED ? (item.quantityReceived ?? item.quantity) : undefined;

          await tx.purchaseItem.create({
            data: {
              purchaseId: newPurchase.id,
              productId: item.productId,
              quantity: item.quantity,
              quantityReceived: receivedQty ?? null,
              purchasePrice: new Decimal(item.purchasePrice),
            },
          });

          if (purchaseStatus === PurchaseStatus.RECEIVED) {
            const product = await tx.product.findUnique({
              where: { id: item.productId },
              select: { pricePurchase: true },
            });

            const stockQty = item.quantityReceived ?? item.quantity;
            await tx.product.update({
              where: { id: item.productId },
              data: {
                quantityStock: {
                  increment: stockQty,
                },
                ...(!product?.pricePurchase ? { pricePurchase: new Decimal(item.purchasePrice) } : {})
              },
            });

            const { branchId } = req.body as any;
            if (branchId) {
              const bId = parseInt(branchId);
              if (!isNaN(bId)) {
                await tx.productBranchStock.upsert({
                  where: {
                    productId_branchId: { productId: item.productId, branchId: bId }
                  },
                  update: {
                    quantityStock: { increment: stockQty }
                  },
                  create: {
                    productId: item.productId,
                    branchId: bId,
                    quantityStock: stockQty
                  }
                });
              }
            }
          }
        }

        if (paymentType) {
          const supplier = await tx.supplier.findUnique({ where: { id: supplierId } });
          const supplierName = supplier?.name || `Proveedor #${supplierId}`;

          await tx.expense.create({
            data: {
              expenseDate: newPurchase.purchaseDate,
              description: `Compra #${newPurchase.id} - ${supplierName}`,
              amount: calculatedTotalAmount,
              category: 'Mercadería',
              paymentType: paymentType,
              notes: notes || null,
            },
          });

          const openRegister = await tx.cashRegister.findFirst({ where: { status: 'OPEN' } });
          if (openRegister) {
            await tx.cashMovement.create({
              data: {
                cashRegisterId: openRegister.id,
                type: 'EXPENSE',
                paymentType: paymentType,
                sourceId: newPurchase.id,
                amount: calculatedTotalAmount.negated(),
                description: `Compra #${newPurchase.id} - ${supplierName}`,
              },
            });
          }
        }

        return tx.purchase.findUnique({
            where: { id: newPurchase.id },
            include: { supplier: true, items: { include: { product: true } } }
        });
      });

      // [MODIFICADO] Fire-and-forget: encolar compra + productos (outbox)
      try {
        const { enqueueOutbox } = await import('../../../lib/syncOutbox');
        if (result?.id) {
          await enqueueOutbox('Purchase', 'UPSERT', String(result.id));
        }
        const productIds = items.map((item: any) => item.productId);
        for (const pid of productIds) {
          await enqueueOutbox('Product', 'UPSERT', String(pid));
          await enqueueOutbox('ProductBranchStock', 'UPSERT', String(pid));
        }
      } catch (enqErr) {
        console.error('[Compras] Error al encolar compra:', enqErr);
      }

      res.status(201).json(result);

    } catch (error: unknown) {
      handleApiError(res, error, "creating purchase");
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}