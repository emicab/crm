// pages/api/users/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import crypto from "crypto";
import { handleApiError } from "../../../lib/apiErrorHandler";

function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin).digest("hex");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = parseInt(req.query.id as string);
  if (isNaN(userId)) {
    return res.status(400).json({ message: "ID de usuario inválido." });
  }

  if (req.method === "PATCH") {
    const { name, role, pin, currentPin } = req.body;

    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado." });
      }

      // Evitar degradar el rol del Administrador principal a algo que no sea ADMIN
      if (user.name === "Administrador" && role && role !== "ADMIN") {
        return res.status(400).json({ message: "No se puede cambiar el rol del Administrador principal." });
      }

      const updateData: any = {};
      if (name) updateData.name = name;
      if (role) {
        if (!["ADMIN", "SUPERVISOR", "CASHIER"].includes(role)) {
          return res.status(400).json({ message: "Rol inválido." });
        }
        updateData.role = role;
      }
      if (pin) {
        if (currentPin && hashPin(currentPin) !== user.pinHash) {
          return res.status(401).json({ message: "El PIN actual ingresado es incorrecto." });
        }
        if (pin.length !== 4 || isNaN(Number(pin))) {
          return res.status(400).json({ message: "El nuevo PIN debe tener exactamente 4 dígitos." });
        }
        updateData.pinHash = hashPin(pin);
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });

      return res.status(200).json(updatedUser);
    } catch (error) {
      return handleApiError(res, error, "updating user");
    }
  } else if (req.method === "DELETE") {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado." });
      }

      if (user.name === "Administrador") {
        return res.status(400).json({ message: "El Administrador principal no se puede eliminar." });
      }

      await prisma.user.delete({ where: { id: userId } });
      return res.status(200).json({ message: "Usuario eliminado correctamente." });
    } catch (error) {
      return handleApiError(res, error, "deleting user");
    }
  } else {
    res.setHeader("Allow", ["PATCH", "DELETE"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
