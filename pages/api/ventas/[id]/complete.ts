import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { Prisma, PaymentType } from '@prisma/client';
const Decimal = Prisma.Decimal;
import { handleApiError } from '../../../../lib/apiErrorHandler';
import { getArcaConfig, createElectronicInvoice } from '../../../../lib/arcaService';
import { getPaymentTypeDisplay } from '../../../../lib/displayTexts';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { id } = req.query;
  const saleId = parseInt(id as string, 10);
  if (isNaN(saleId)) return res.status(400).json({ message: 'ID de venta inválido' });

  const { paymentType } = req.body;

  try {
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { items: { include: { product: true } } }
    });

    if (!sale) return res.status(404).json({ message: 'Venta no encontrada.' });
    if ((sale as any).status !== 'PENDING') {
      return res.status(400).json({ message: 'La venta no está pendiente.' });
    }

    const newPaymentType = paymentType || sale.paymentType;
    const isAccountSale = newPaymentType === PaymentType.ON_ACCOUNT || sale.onAccount === true;
    const effectivePaymentType = isAccountSale ? PaymentType.ON_ACCOUNT : newPaymentType;
    const calculatedTotalAmount = sale.totalAmount;

    const result = await prisma.$transaction(async (tx) => {
      // Registrar movimiento en caja si hay una abierta
      const openRegister = await tx.cashRegister.findFirst({ where: { status: 'OPEN' } });

      if (isAccountSale && sale.clientId) {
        let balanceRecord = await tx.accountBalance.findUnique({
          where: { clientId: sale.clientId },
        });
        if (!balanceRecord) {
          balanceRecord = await tx.accountBalance.create({
            data: { clientId: sale.clientId, balance: new Decimal(0) },
          });
        }
        await tx.accountBalance.update({
          where: { id: balanceRecord.id },
          data: { balance: { increment: calculatedTotalAmount } },
        });
        await tx.accountMovement.create({
          data: {
            accountBalanceId: balanceRecord.id,
            type: "SALE_ON_ACCOUNT",
            amount: calculatedTotalAmount,
            description: `Venta en cuenta #${sale.id}`,
            saleId: sale.id,
          },
        });
      }

      if (openRegister) {
        const cashAmount = effectivePaymentType === 'CASH' ? calculatedTotalAmount : new Decimal(0);
        const otherAmount = effectivePaymentType !== 'CASH' ? calculatedTotalAmount : new Decimal(0);
        if (cashAmount.greaterThan(0)) {
          await tx.cashMovement.create({
            data: {
              cashRegisterId: openRegister.id,
              type: 'SALE',
              paymentType: effectivePaymentType as PaymentType,
              sourceId: sale.id,
              amount: cashAmount,
              description: `Venta #${sale.id} - Efectivo`,
            },
          });
        }
        if (otherAmount.greaterThan(0)) {
          await tx.cashMovement.create({
            data: {
              cashRegisterId: openRegister.id,
              type: 'SALE',
              paymentType: effectivePaymentType as PaymentType,
              sourceId: sale.id,
              amount: otherAmount,
              description: `Venta #${sale.id} - ${getPaymentTypeDisplay(effectivePaymentType as PaymentType)}`,
            },
          });
        }
      }

      for (const item of sale.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) {
          throw new Error(`Producto con ID ${item.productId} no encontrado.`);
        }
        if (Number(product.quantityStock) < Number(item.quantity)) {
          throw new Error(`Stock insuficiente para el producto "${product.name}". Disponible: ${product.quantityStock}, Solicitado: ${item.quantity}.`);
        }

        const updateResult = await tx.product.updateMany({
          where: {
            id: item.productId,
            quantityStock: { gte: Number(item.quantity) }
          },
          data: {
            quantityStock: { decrement: Number(item.quantity) }
          }
        });
        if (updateResult.count === 0) {
          throw new Error(`Stock insuficiente o modificado concurrentemente para el producto "${product.name}".`);
        }
      }

      const updatedSale = await tx.sale.update({
        where: { id: sale.id },
        data: {
          status: 'COMPLETED' as any,
          paymentType: effectivePaymentType,
          onAccount: isAccountSale,
          ...(openRegister && { cashRegister: { connect: { id: openRegister.id } } })
        },
        include: { client: true, seller: true, items: { include: { product: true } } }
      });
      return updatedSale;
    });

    res.status(200).json(result);
  } catch (error: any) {
    if (error instanceof Error && (error.message.startsWith('Stock insuficiente') || error.message.startsWith('Producto con ID'))) {
      return res.status(409).json({ message: error.message });
    }
    handleApiError(res, error, "completing sale");
  }
}
