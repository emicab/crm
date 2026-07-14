// pages/api/gastos/[id].ts
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
  const expenseIdQuery = req.query.id as string;

  if (!expenseIdQuery || isNaN(parseInt(expenseIdQuery))) {
    return res.status(400).json({ message: 'ID de gasto inválido.' });
  }
  
  const id = parseInt(expenseIdQuery);

  if (req.method === 'GET') {
    try {
      const expense = await prisma.expense.findUnique({ where: { id } });
      if (!expense) {
        return res.status(404).json({ message: 'Gasto no encontrado.' });
      }
      // Convertir Decimal a string para la respuesta
      const expenseForJson = { ...expense, amount: expense.amount.toString() };
      res.status(200).json(expenseForJson);
    } catch (error: unknown) {
      handleApiError(res, error, `fetching expense ${id}`);
    }
  } else if (req.method === 'PUT') {
    const { amount, paymentType, expenseDate } = req.body;
    let { description, category, notes } = req.body;

    if (!description || amount === undefined || !category || !paymentType) {
      return res.status(400).json({ message: 'Descripción, monto, categoría y tipo de pago son obligatorios.' });
    }
    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      return res.status(400).json({ message: 'El monto debe ser un número positivo.' });
    }

    description = sanitizeString(description);
    category = sanitizeString(category);
    if (notes) notes = sanitizeString(notes);

    let finalExpenseDate: Date | undefined = undefined;
    if (expenseDate) {
      const [year, month, day] = (expenseDate as string).split('-').map(Number);
      finalExpenseDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    }
    
    try {
      const result = await prisma.$transaction(async (tx) => {
        const updatedExpense = await tx.expense.update({
          where: { id },
          data: {
            description,
            amount: new Decimal(amountNumber),
            category,
            paymentType,
            expenseDate: finalExpenseDate,
            notes,
          },
        });

        // Buscar movimiento existente: primero por sourceId=expenseId,
        // y si el gasto viene de una compra, también por sourceId=purchaseId
        const existingMovement = await tx.cashMovement.findFirst({
          where: {
            OR: [
              { sourceId: id, type: 'EXPENSE' },
              ...(updatedExpense.description.match(/^Compra #(\d+) - /)
                ? [{ sourceId: parseInt(updatedExpense.description.match(/^Compra #(\d+) - /)![1]), type: 'EXPENSE' as const }]
                : []),
            ],
          },
        });

        if (existingMovement) {
          await tx.cashMovement.update({
            where: { id: existingMovement.id },
            data: {
              amount: -Math.abs(amountNumber),
              paymentType,
              description: updatedExpense.description.match(/^Compra #(\d+) - /)
                ? updatedExpense.description
                : `Gasto: ${category} - ${description}`,
            },
          });
        } else {
          // Si no existía pero ahora hay caja abierta, crearlo
          const openRegister = await tx.cashRegister.findFirst({ where: { status: 'OPEN' } });
          if (openRegister) {
            await tx.cashMovement.create({
              data: {
                cashRegisterId: openRegister.id,
                type: 'EXPENSE',
                paymentType,
                sourceId: id,
                amount: -Math.abs(amountNumber),
                description: `Gasto: ${category} - ${description}`,
              },
            });
          }
        }

        return updatedExpense;
      });

      const expenseForJson = { ...result, amount: result.amount.toString() };
      res.status(200).json(expenseForJson);
    } catch (error: unknown) {
      handleApiError(res, error, `updating expense ${id}`);
    }
  } else if (req.method === 'DELETE') {
    try {
      await prisma.$transaction(async (tx) => {
        const expense = await tx.expense.findUnique({ where: { id } });
        if (!expense) {
          throw new Error('Gasto no encontrado.');
        }

        // Eliminar TODOS los movimientos de caja relacionados:
        // - Si el gasto es manual: sourceId = expense.id
        // - Si el gasto viene de una compra: sourceId = purchaseId
        // - También por si quedó un duplicado con sourceId = expense.id (PUT previo)
        const match = expense.description.match(/^Compra #(\d+) - /);
        if (match) {
          const purchaseId = parseInt(match[1]);
          await tx.cashMovement.deleteMany({
            where: {
              type: 'EXPENSE',
              OR: [
                { sourceId: purchaseId },
                { sourceId: id },
              ],
            },
          });
          await tx.purchase.updateMany({
            where: { id: purchaseId, paymentType: { not: null } },
            data: { paymentType: null },
          });
        } else {
          await tx.cashMovement.deleteMany({
            where: { sourceId: id, type: 'EXPENSE' },
          });
        }

        await tx.expense.delete({ where: { id } });
      });

      res.status(204).end();
    } catch (error: unknown) {
      handleApiError(res, error, `deleting expense ${id}`);
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}