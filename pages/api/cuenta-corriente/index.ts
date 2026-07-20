// pages/api/cuenta-corriente/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { handleApiError } from "../../../lib/apiErrorHandler";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const { clientId: queryClientId } = req.query;

    try {
      // 1. Obtener detalles e historial de un cliente específico
      if (queryClientId) {
        const clientId = parseInt(queryClientId as string);
        if (isNaN(clientId)) {
          return res.status(400).json({ message: "ID de cliente inválido." });
        }

        // Buscar balance y movimientos
        const account = await prisma.accountBalance.findUnique({
          where: { clientId },
          include: {
            client: true,
            movements: {
              orderBy: { createdAt: "desc" },
            },
          },
        });

        if (!account) {
          // Si no existe, simulamos un balance en cero para simplificar el frontend
          const client = await prisma.client.findUnique({ where: { id: clientId } });
          if (!client) {
            return res.status(404).json({ message: "Cliente no encontrado." });
          }
          return res.status(200).json({
            id: 0,
            clientId,
            balance: "0",
            client,
            movements: [],
          });
        }

        // Convertir Decimales a string
        const accountForJson = {
          ...account,
          balance: account.balance.toString(),
          movements: account.movements.map((m) => ({
            ...m,
            amount: m.amount.toString(),
          })),
        };

        return res.status(200).json(accountForJson);
      }

      // 2. Listar todas las cuentas corrientes con deuda o saldo a favor
      const accounts = await prisma.accountBalance.findMany({
        where: {
          balance: { not: 0 },
        },
        include: {
          client: true,
        },
        orderBy: { balance: "desc" }, // Deudas más grandes primero
      });

      const accountsForJson = accounts.map((a) => ({
        ...a,
        balance: a.balance.toString(),
      }));

      return res.status(200).json(accountsForJson);
    } catch (error) {
      return handleApiError(res, error, "fetching account balance");
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
