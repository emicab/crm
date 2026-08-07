// pages/api/webhooks/mercadopago.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { MercadoPagoConfig, Payment, MerchantOrder } from "mercadopago";
import prisma from "../../../lib/prisma";
import { applyRateLimit } from "../../../lib/rateLimit";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.setHeader("Allow", ["POST", "GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Rate Limiting: 120 peticiones por minuto por IP para webhooks
  if (!applyRateLimit(req, res, 120, 60 * 1000)) {
    return;
  }

  try {
    const body = req.body || {};

    console.log("[Webhook MP Notification Received]", {
      action: body.action || req.query.action,
      type: body.type || req.query.type,
      dataObj: body.data,
      query: req.query,
    });

    let webOrderNumber: string | null = null;
    let isApproved = false;
    let actualMpFee = 0;

    // Extraer el ID del pago u orden comercial
    const paymentId = body?.data?.id || req.query["data.id"] || req.query.id || body.id;

    // SEGURIDAD CRÍTICA: La verificación del pago se realiza ÚNICAMENTE mediante
    // consulta directa y autenticada a las APIs de MercadoPago, NUNCA confiando
    // en strings o estados del body enviados en el webhook.
    if (paymentId) {
      const storeConfig = await prisma.storeConfig.findFirst();
      const mpTokenConfig = await prisma.setting.findUnique({
        where: { key: "mercadopago_access_token" },
      });

      const accessToken =
        storeConfig?.mpAccessToken ||
        mpTokenConfig?.value ||
        "";

      if (accessToken && (accessToken.startsWith("APP_USR") || accessToken.startsWith("TEST-"))) {
        const client = new MercadoPagoConfig({ accessToken });

        try {
          if (String(paymentId).startsWith("ORD")) {
            const orderClient = new MerchantOrder(client);
            const orderData = await orderClient.get({ merchantOrderId: String(paymentId) });
            if (orderData) {
              if (orderData.order_status === "paid" || orderData.status === "closed") {
                isApproved = true;
              }
              webOrderNumber = orderData.external_reference || null;
            }
          } else {
            const paymentClient = new Payment(client);
            const payment = await paymentClient.get({ id: String(paymentId) });
            if (payment) {
              if (payment.status === "approved" || payment.status === "processed") {
                isApproved = true;
              }
              webOrderNumber = payment.external_reference || null;
              if (payment.status === "approved") {
                const txn = payment.transaction_details as any;
                if (txn?.net_received_amount && payment.transaction_amount) {
                  actualMpFee = Math.max(0, Number(payment.transaction_amount) - Number(txn.net_received_amount));
                }
                if (actualMpFee === 0 && payment.fee_details && payment.fee_details.length > 0) {
                  actualMpFee = (payment.fee_details as any[]).reduce((sum: number, f: any) => sum + (Number(f.amount) || 0), 0);
                }
              }
            }
          }
        } catch (fetchErr: any) {
          console.warn("[Webhook MP Verification Error]: No se pudo validar pago con MercadoPago API:", fetchErr?.message || fetchErr);
        }
      }
    }

    // Actualizar pedido en ClinPOS solo si la API oficial de MercadoPago confirmó la aprobación
    if (webOrderNumber && isApproved) {
      const order = await prisma.webOrder.findFirst({
        where: { webOrderNumber },
      });

      if (order) {
        // Evitar procesar pedidos que ya fueron pagados (idempotencia)
        if (order.paymentStatus === "PAID") {
          console.log(`[Webhook MP Idempotencia] Pedido #${webOrderNumber} ya estaba marcado como PAID.`);
          return res.status(200).json({ received: true, alreadyPaid: true });
        }

        const feeToStore = actualMpFee > 0 && actualMpFee < Number(order.totalAmount) ? actualMpFee : 0;
        await prisma.webOrder.update({
          where: { id: order.id },
          data: {
            paymentStatus: "PAID",
            mpFeeAmount: feeToStore,
            ...(feeToStore > 0 && order.notes?.includes("[MP_FEE") ? {} : {
              notes: `${order.notes || ""} [MP_FEE: $${feeToStore.toFixed(2)}]`.trim()
            }),
          },
        });
        console.log(`[Webhook MP Exito] Pedido #${webOrderNumber} verificado y marcado como PAID. Fee MP: $${feeToStore.toFixed(2)}`);
      } else {
        console.warn(`[Webhook MP Warn] No se encontró el pedido #${webOrderNumber} en la base de datos.`);
      }
    } else {
      console.warn(`[Webhook MP Skip] Notificación ignorada por falta de verificación API MP. paymentId: ${paymentId}, webOrderNumber: ${webOrderNumber}, isApproved: ${isApproved}`);
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error("Error en handler Webhook Mercado Pago:", error);
    return res.status(200).json({ received: true });
  }
}
