import prisma from "./prisma";
import { PaymentType } from "@prisma/client";

export async function registerWebOrderInCashRegister(webOrderNumber: string) {
  try {
    const order = await prisma.webOrder.findFirst({
      where: { webOrderNumber },
    });

    if (!order) return;

    const openRegister = await prisma.cashRegister.findFirst({
      where: { status: "OPEN" },
    });

    if (!openRegister) return;

    let mappedPaymentType: PaymentType = PaymentType.MERCADO_PAGO;
    const pm = (order.paymentMethod || "").toUpperCase();
    if (pm.includes("CASH") || pm.includes("EFECTIVO")) {
      mappedPaymentType = PaymentType.CASH;
    } else if (pm.includes("TRANSFER")) {
      mappedPaymentType = PaymentType.TRANSFER;
    } else if (pm.includes("CARD") || pm.includes("TARJETA")) {
      mappedPaymentType = PaymentType.CARD;
    } else if (pm.includes("MERCADO") || pm.includes("MP")) {
      mappedPaymentType = PaymentType.MERCADO_PAGO;
    }

    const existingMovement = await prisma.cashMovement.findFirst({
      where: {
        cashRegisterId: openRegister.id,
        description: { contains: order.webOrderNumber },
      },
    });

    if (!existingMovement) {
      await prisma.cashMovement.create({
        data: {
          cashRegisterId: openRegister.id,
          type: "SALE",
          paymentType: mappedPaymentType,
          amount: order.totalAmount,
          description: `Pedido Web #${order.webOrderNumber} (${order.clientName})`,
        },
      });
      console.log(`[Caja] Movimiento de caja creado para Pedido Web #${order.webOrderNumber} con medio ${mappedPaymentType}`);
    } else if (existingMovement.paymentType !== mappedPaymentType) {
      await prisma.cashMovement.update({
        where: { id: existingMovement.id },
        data: { paymentType: mappedPaymentType },
      });
      console.log(`[Caja] Movimiento de caja actualizado para Pedido Web #${order.webOrderNumber} a medio ${mappedPaymentType}`);
    }
  } catch (err) {
    console.error("Error registrando movimiento de caja para pedido web:", err);
  }
}
