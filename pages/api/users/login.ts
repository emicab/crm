// pages/api/users/login.ts
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import crypto from "crypto";
import { handleApiError } from "../../../lib/apiErrorHandler";

function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin).digest("hex");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { userId, pin } = req.body;

    if (!userId || !pin) {
      return res.status(400).json({ message: "userId y pin son requeridos." });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: parseInt(userId) },
      });

      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado." });
      }

      const calculatedHash = hashPin(pin);
      if (calculatedHash !== user.pinHash) {
        return res.status(401).json({ message: "Código PIN incorrecto." });
      }

      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error) {
      return handleApiError(res, error, "verifying PIN login");
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
