// pages/api/gastos/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { Prisma, PaymentType } from '@prisma/client'; // Importar PaymentType y Prisma
import { Decimal } from '@prisma/client/runtime/library';

interface CreateExpenseInput {
  expenseDate?: string; // Fecha opcional, si no se provee se usa la actual
  description: string;
  amount: number; // Recibimos como número, convertimos a Decimal
  category: string;
  paymentType: PaymentType;
  notes?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    // Listar todos los gastos, podríamos añadir filtros por fecha, categoría, etc.
    const { category: queryCategory, startDate, endDate } = req.query;

    let whereClause: Prisma.ExpenseWhereInput = {};

    if (queryCategory && typeof queryCategory === 'string') {
      whereClause.category = { contains: queryCategory };
    }

    if (startDate && typeof startDate === 'string') {
      const parsedStartDate = new Date(startDate);
      if (!isNaN(parsedStartDate.valueOf())) {
        whereClause.expenseDate = { ...whereClause.expenseDate, gte: parsedStartDate };
      }
    }
    if (endDate && typeof endDate === 'string') {
      const parsedEndDate = new Date(endDate);
      if (!isNaN(parsedEndDate.valueOf())) {
         // Para que incluya todo el día de endDate
        parsedEndDate.setHours(23, 59, 59, 999);
        whereClause.expenseDate = { ...whereClause.expenseDate, lte: parsedEndDate };
      }
    }


    try {
      const expenses = await prisma.expense.findMany({
        where: whereClause,
        orderBy: { expenseDate: 'desc' },
      });

      // Convertir Decimal a string para la respuesta JSON
      const expensesForJson = expenses.map(expense => ({
        ...expense,
        amount: expense.amount.toString(),
      }));

      res.status(200).json(expensesForJson);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: 'Error al obtener los gastos' });
    }
  } else if (req.method === 'POST') {
    const { description, amount, category, paymentType, expenseDate: expenseDateString, notes } = req.body as CreateExpenseInput;

    let finalExpenseDate: Date;
if (expenseDateString) {
    const [year, month, day] = expenseDateString.split('-').map(Number);
    // Creamos la fecha como mediodía UTC para evitar problemas de "un día antes"
    finalExpenseDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)); 
} else {
    finalExpenseDate = new Date(); // O maneja como error si la fecha es obligatoria
}

    if (!description || amount === undefined || !category || !paymentType) {
      return res.status(400).json({ message: 'Faltan datos obligatorios: descripción, monto, categoría o tipo de pago.' });
    }
    if (amount <= 0) {
        return res.status(400).json({ message: 'El monto debe ser mayor a cero.' });
    }
    if (!Object.values(PaymentType).includes(paymentType)) {
        return res.status(400).json({ message: 'Tipo de pago inválido.' });
    }

    let parsedExpenseDate: Date | undefined = undefined;
    if (finalExpenseDate) {
        parsedExpenseDate = new Date(finalExpenseDate);
        if (isNaN(parsedExpenseDate.valueOf())) {
            return res.status(400).json({ message: 'Fecha del gasto inválida.' });
        }
    }

    try {
      const newExpense = await prisma.expense.create({
        data: {
          description,
          amount: new Decimal(amount),
          category,
          paymentType,
          expenseDate: parsedExpenseDate || new Date(), // Usar fecha proveída o la actual
          notes: notes || null,
        },
      });
      // Convertir Decimal a string para la respuesta JSON
      const expenseForJson = {
        ...newExpense,
        amount: newExpense.amount.toString(),
      }
      res.status(201).json(expenseForJson);
    } catch (error: any) {
      console.error("Error creating expense:", error);
      res.status(500).json({ message: `Error al crear el gasto: ${error.message || 'Error desconocido'}` });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}