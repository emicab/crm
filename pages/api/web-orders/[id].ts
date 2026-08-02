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

      const isDelivered = status === "DELIVERED";
      const isCancelling = status === "CANCELLED" && currentOrder.status !== "CANCELLED";
      const isUncancelling = status && status !== "CANCELLED" && currentOrder.status === "CANCELLED";
      const isAlreadyRegistered = (currentOrder.notes || "").includes("[VENTA_REGISTRADA#");

      let createdSaleId: number | null = null;
      let resolvedNotes = notes !== undefined ? notes : currentOrder.notes || "";

      // Preparar datos para delivery (lecturas, fuera de la transacción)
      let mappedPaymentType: PaymentType = PaymentType.OTHER;
      let seller: any = { id: 1 };
      let openRegister: any = null;
      let saleItemsData: any[] = [];

      if (isDelivered && !isAlreadyRegistered) {
        const pm = (currentOrder.paymentMethod || "").toUpperCase();
        if (pm.includes("MERCADO") || pm.includes("MP")) {
          mappedPaymentType = (PaymentType as any).MERCADO_PAGO || PaymentType.OTHER;
        } else if (pm.includes("TRANSFER")) {
          mappedPaymentType = PaymentType.TRANSFER;
        } else if (pm.includes("CASH") || pm.includes("EFECTIVO")) {
          mappedPaymentType = PaymentType.CASH;
        } else if (pm.includes("CARD") || pm.includes("TARJETA")) {
          mappedPaymentType = PaymentType.CARD;
        }

        seller = (await prisma.seller.findFirst({ where: { isActive: true } })) || { id: 1 };
        openRegister = await prisma.cashRegister.findFirst({ where: { status: "OPEN" } });

        const itemProductIds = currentOrder.items.map((i) => i.productId);
        const dbProducts = await prisma.product.findMany({
          where: { id: { in: itemProductIds } },
        });
        const productsMap = new Map<number, any>();
        dbProducts.forEach((p) => productsMap.set(p.id, p));

        saleItemsData = currentOrder.items.map((item) => {
          const prod = productsMap.get(item.productId);
          return {
            productId: item.productId,
            quantity: item.quantity,
            priceAtSale: item.unitPrice,
            purchasePriceAtSale: prod ? prod.pricePurchase : 0,
          };
        });
      }

      // Reembolso MP si se cancela un pedido pagado
      if (isCancelling && currentOrder.paymentMethod === "MERCADO_PAGO" && currentOrder.paymentStatus === "PAID") {
        try {
          const storeConfig = await prisma.storeConfig.findFirst();
          const mpTokenConfig = await prisma.setting.findUnique({ where: { key: "mercadopago_access_token" } });
          const accessToken =
            storeConfig?.mpAccessToken ||
            mpTokenConfig?.value ||
            "";

          if (accessToken) {
            const searchRes = await fetch(
              `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(currentOrder.webOrderNumber)}`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            if (searchRes.ok) {
              const searchData = await searchRes.json();
              const payment = searchData.results?.[0];
              if (payment?.id) {
                const refundRes = await fetch(
                  `https://api.mercadopago.com/v1/payments/${payment.id}/refunds`,
                  {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                      "Content-Type": "application/json"
                    }
                  }
                );
                if (refundRes.ok) {
                  console.log(`[MP Refund] Reembolso exitoso del pago ${payment.id} para orden ${currentOrder.webOrderNumber}`);
                } else {
                  const refundError = await refundRes.text();
                  console.warn(`[MP Refund] Error al reembolsar pago ${payment.id}:`, refundError);
                }
              }
            }
          }
        } catch (err) {
          console.warn("[MP Refund] Error en proceso de reembolso:", err);
        }
      }

      // Transacción atómica: stock + venta + status update
      const mainBranch = await prisma.branch.findFirst({ where: { isMain: true } });
      const mainBranchId = mainBranch?.id;

      await prisma.$transaction(async (tx) => {
        // Stock: reponer al cancelar, descontar al des-cancelar (global + sucursal principal)
        if (isCancelling) {
          for (const item of currentOrder.items) {
            await tx.product.update({
              where: { id: item.productId },
              data: { quantityStock: { increment: Number(item.quantity) } },
            });
            if (mainBranchId) {
              await tx.productBranchStock.upsert({
                where: {
                  productId_branchId: {
                    productId: item.productId,
                    branchId: mainBranchId,
                  },
                },
                update: { quantityStock: { increment: Number(item.quantity) } },
                create: {
                  productId: item.productId,
                  branchId: mainBranchId,
                  quantityStock: Number(item.quantity),
                },
              });
            }
          }
        } else if (isUncancelling) {
          for (const item of currentOrder.items) {
            await tx.product.update({
              where: { id: item.productId },
              data: { quantityStock: { decrement: Number(item.quantity) } },
            });
            if (mainBranchId) {
              await tx.productBranchStock.upsert({
                where: {
                  productId_branchId: {
                    productId: item.productId,
                    branchId: mainBranchId,
                  },
                },
                update: { quantityStock: { decrement: Number(item.quantity) } },
                create: {
                  productId: item.productId,
                  branchId: mainBranchId,
                  quantityStock: -Number(item.quantity),
                },
              });
            }
          }
        }

        // Venta + movimiento de caja si se entrega (atribuida a la sucursal principal)
        if (isDelivered && !isAlreadyRegistered) {
          const sale = await tx.sale.create({
            data: {
              saleDate: new Date(),
              totalAmount: currentOrder.totalAmount,
              paymentType: mappedPaymentType,
              notes: `Pedido Web #${currentOrder.webOrderNumber} (${currentOrder.clientName})`,
              sellerId: seller.id,
              ...(openRegister && { cashRegisterId: openRegister.id }),
              ...(mainBranchId && { branchId: mainBranchId }),
              status: "COMPLETED",
              items: { create: saleItemsData },
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

            if (mappedPaymentType === PaymentType.MERCADO_PAGO && Number(currentOrder.mpFeeAmount) > 0) {
              await tx.cashMovement.create({
                data: {
                  cashRegisterId: openRegister.id,
                  type: "EXPENSE",
                  paymentType: "MERCADO_PAGO",
                  sourceId: sale.id,
                  amount: -Number(currentOrder.mpFeeAmount),
                  description: `Comisión MP Pedido Web #${currentOrder.webOrderNumber}`,
                },
              });
            }
          }

          resolvedNotes = `${resolvedNotes} [VENTA_REGISTRADA#${sale.id}]`.trim();
        }

        // Status update
        const updateData: any = { notes: resolvedNotes };
        if (status) updateData.status = status;
        if (paymentStatus) updateData.paymentStatus = paymentStatus;
        if (isDelivered && !isAlreadyRegistered) updateData.paymentStatus = "PAID";

        await tx.webOrder.update({
          where: { id: orderId },
          data: updateData,
        });
      });

      // Sync selectivo del WebOrder + Productos a Supabase para reflejar cambios en la web
      try {
        const { syncWebOrderToSupabase, syncSingleProduct } = await import("../../../lib/syncService");
        await syncWebOrderToSupabase(orderId);
        for (const item of currentOrder.items) {
          await syncSingleProduct(item.productId).catch(() => {});
        }
      } catch (syncErr) {
        console.warn("Selective sync falló, ejecutando full sync forzado:", syncErr);
        try {
          const { runSupabaseSync } = await import("../../../lib/syncService");
          await runSupabaseSync(true);
        } catch { /* ignore */ }
      }

      const updatedOrder = await prisma.webOrder.findUnique({
        where: { id: orderId },
        include: { items: { include: { product: true } } },
      });

      if (!updatedOrder) {
        return res.status(500).json({ message: "No se pudo obtener el pedido actualizado." });
      }

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
