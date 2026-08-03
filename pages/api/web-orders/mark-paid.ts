// pages/api/web-orders/mark-paid.ts
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { isProDevice } from "../../../lib/branchIdentity";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST" && req.method !== "PUT") {
    res.setHeader("Allow", ["POST", "PUT"]);
    return res.status(405).json({ message: `Método ${req.method} no permitido.` });
  }

  try {
    // La gestión de pedidos web es exclusiva del Plan Pro.
    if (!(await isProDevice())) {
      return res.status(403).json({ message: "La gestión de pedidos web requiere el Plan Pro.", blockedByPlan: true });
    }

    const { webOrderNumber } = req.body;
    if (!webOrderNumber) {
      return res.status(400).json({ message: "Número de orden web requerido." });
    }

    const order = await prisma.webOrder.findFirst({
      where: { webOrderNumber },
    });

    if (!order) {
      return res.status(404).json({ message: "Pedido no encontrado." });
    }

    const updated = await prisma.webOrder.update({
      where: { id: order.id },
      data: {
        paymentStatus: "PAID",
      },
    });

    return res.status(200).json({
      success: true,
      webOrderNumber: updated.webOrderNumber,
      paymentStatus: updated.paymentStatus,
    });
  } catch (error: any) {
    console.error("Error al marcar pedido como pagado:", error);
    return res.status(500).json({ message: error.message || "Error al actualizar estado de pago." });
  }
}
