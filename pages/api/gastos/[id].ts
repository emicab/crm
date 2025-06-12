// pages/api/gastos/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { Prisma, PaymentType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

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
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido.';
      res.status(500).json({ message: `Error al obtener el gasto: ${errorMessage}` });
    }
  } else if (req.method === 'PUT') {
    const { description, amount, category, paymentType, expenseDate, notes } = req.body;

    if (!description || amount === undefined || !category || !paymentType) {
      return res.status(400).json({ message: 'Descripción, monto, categoría y tipo de pago son obligatorios.' });
    }
    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      return res.status(400).json({ message: 'El monto debe ser un número positivo.' });
    }

    let finalExpenseDate: Date | undefined = undefined;
    if (expenseDate) {
      const [year, month, day] = (expenseDate as string).split('-').map(Number);
      finalExpenseDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    }
    
    try {
      const updatedExpense = await prisma.expense.update({
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
      const expenseForJson = { ...updatedExpense, amount: updatedExpense.amount.toString() };
      res.status(200).json(expenseForJson);
    } catch (error: unknown) {
      console.error(`Error al actualizar gasto ${id}:`, error);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return res.status(404).json({ message: 'Gasto no encontrado para actualizar.' });
      }
      const errorMessage = error instanceof Error ? error.message : 'Error inesperado.';
      res.status(500).json({ message: `Error al actualizar el gasto: ${errorMessage}` });
    }
  } else if (req.method === 'DELETE') {
    try {
      await prisma.expense.delete({ where: { id } });
      res.status(204).end(); // No Content, éxito
    } catch (error: unknown) {
      console.error(`Error al eliminar gasto ${id}:`, error);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return res.status(404).json({ message: 'Gasto no encontrado para eliminar.' });
      }
      const errorMessage = error instanceof Error ? error.message : 'Error inesperado.';
      res.status(500).json({ message: `Error al eliminar el gasto: ${errorMessage}` });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}