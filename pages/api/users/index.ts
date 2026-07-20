// pages/api/users/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import crypto from "crypto";
import { handleApiError } from "../../../lib/apiErrorHandler";

function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin).digest("hex");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          role: true,
          createdAt: true,
        },
        orderBy: { name: "asc" },
      });
      return res.status(200).json(users);
    } catch (error) {
      return handleApiError(res, error, "fetching users");
    }
  } else if (req.method === "POST") {
    const { name, role, pin } = req.body;

    if (!name || !role || !pin) {
      return res.status(400).json({ message: "Nombre, rol y PIN son requeridos." });
    }

    if (!["ADMIN", "SUPERVISOR", "CASHIER"].includes(role)) {
      return res.status(400).json({ message: "Rol inválido." });
    }

    if (pin.length !== 4 || isNaN(Number(pin))) {
      return res.status(400).json({ message: "El PIN debe tener exactamente 4 dígitos." });
    }

    try {
      const existingUser = await prisma.user.findUnique({
        where: { name },
      });

      if (existingUser) {
        return res.status(400).json({ message: "Ya existe un usuario con este nombre." });
      }

      const newUser = await prisma.user.create({
        data: {
          name,
          role,
          pinHash: hashPin(pin),
        },
        select: {
          id: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });

      return res.status(201).json(newUser);
    } catch (error) {
      return handleApiError(res, error, "creating user");
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
