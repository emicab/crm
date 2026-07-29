import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const orderId = Number(id);

  if (!orderId || isNaN(orderId)) {
    return res.status(400).json({ message: "ID de pedido inválido." });
  }

  if (req.method === "PUT" || req.method === "PATCH") {
    try {
      const { status, paymentStatus, notes } = req.body;

      const updateData: any = {};
      if (status) updateData.status = status;
      if (paymentStatus) updateData.paymentStatus = paymentStatus;
      if (notes !== undefined) updateData.notes = notes;

      const updatedOrder = await prisma.webOrder.update({
        where: { id: orderId },
        data: updateData,
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      return res.status(200).json({
        ...updatedOrder,
        totalAmount: updatedOrder.totalAmount.toString(),
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Error al actualizar pedido web." });
    }
  }

  res.setHeader("Allow", ["PUT", "PATCH"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
