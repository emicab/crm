import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { PaymentType } from "@prisma/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const orderId = Number(id);

  if (!orderId || isNaN(orderId)) {
    return res.status(400).json({ message: "ID de pedido inválido." });
  }

  if (req.method === "PUT" || req.method === "PATCH") {
    try {
      const { status, paymentStatus, notes } = req.body;

      const currentOrder = await prisma.webOrder.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!currentOrder) {
        return res.status(404).json({ message: "Pedido web no encontrado." });
      }

      const updateData: any = {};
      if (status) updateData.status = status;
      if (paymentStatus) updateData.paymentStatus = paymentStatus;
      if (notes !== undefined) updateData.notes = notes;

      const isDelivered = status === "DELIVERED";
      const isCancelling = status === "CANCELLED" && currentOrder.status !== "CANCELLED";
      const isUncancelling = status && status !== "CANCELLED" && currentOrder.status === "CANCELLED";

      const isAlreadyRegistered = (currentOrder.notes || "").includes("[VENTA_REGISTRADA#");

      // Si el pedido se CANCELA, reponer stock de los productos
      if (isCancelling) {
        for (const item of currentOrder.items) {
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              quantityStock: {
                increment: Number(item.quantity),
              },
            },
          });
        }
      } else if (isUncancelling) {
        // Si el pedido se DES-CANCELANTE, volver a descontar el stock
        for (const item of currentOrder.items) {
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              quantityStock: {
                decrement: Number(item.quantity),
              },
            },
          });
        }
      }

      let createdSaleId: number | null = null;

      // Si el pedido se marca como ENTREGADO y aún no fue registrado en las Ventas y Movimientos de Caja
      if (isDelivered && !isAlreadyRegistered) {
        updateData.paymentStatus = "PAID";

        let mappedPaymentType: PaymentType = PaymentType.OTHER;
        const pm = (currentOrder.paymentMethod || "").toUpperCase();
        if (pm.includes("MERCADO") || pm.includes("MP")) {
          mappedPaymentType = (PaymentType as any).MERCADO_PAGO || PaymentType.OTHER;
        } else if (pm.includes("TRANSFER")) {
          mappedPaymentType = PaymentType.TRANSFER;
        } else if (pm.includes("CASH") || pm.includes("EFECTIVO")) {
          mappedPaymentType = PaymentType.CASH;
        } else if (pm.includes("CARD") || pm.includes("TARJETA")) {
          mappedPaymentType = PaymentType.CARD;
        } else {
          mappedPaymentType = PaymentType.OTHER;
        }

        const seller = (await prisma.seller.findFirst({ where: { isActive: true } })) || { id: 1 };
        const openRegister = await prisma.cashRegister.findFirst({ where: { status: "OPEN" } });

        const itemProductIds = currentOrder.items.map((i) => i.productId);
        const dbProducts = await prisma.product.findMany({
          where: { id: { in: itemProductIds } },
        });
        const productsMap = new Map<number, any>();
        dbProducts.forEach((p) => productsMap.set(p.id, p));

        const saleItemsData = currentOrder.items.map((item) => {
          const prod = productsMap.get(item.productId);
          return {
            productId: item.productId,
            quantity: item.quantity,
            priceAtSale: item.unitPrice,
            purchasePriceAtSale: prod ? prod.pricePurchase : 0,
          };
        });

        await prisma.$transaction(async (tx) => {
          const sale = await tx.sale.create({
            data: {
              saleDate: new Date(),
              totalAmount: currentOrder.totalAmount,
              paymentType: mappedPaymentType,
              notes: `Pedido Web #${currentOrder.webOrderNumber} (${currentOrder.clientName})`,
              sellerId: seller.id,
              ...(openRegister && { cashRegisterId: openRegister.id }),
              status: "COMPLETED",
              items: {
                create: saleItemsData,
              },
            },
          });

          createdSaleId = sale.id;

          if (openRegister) {
            await tx.cashMovement.create({
              data: {
                cashRegisterId: openRegister.id,
                type: "SALE",
                paymentType: mappedPaymentType,
                sourceId: sale.id,
                amount: currentOrder.totalAmount,
                description: `Pedido Web #${currentOrder.webOrderNumber} (${currentOrder.clientName})`,
              },
            });
          }

          const existingNotes = notes !== undefined ? notes : currentOrder.notes || "";
          updateData.notes = `${existingNotes} [VENTA_REGISTRADA#${sale.id}]`.trim();
        });
      }

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
        saleId: createdSaleId,
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Error al actualizar pedido web." });
    }
  }

  res.setHeader("Allow", ["PUT", "PATCH"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
