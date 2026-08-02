// pages/api/webhooks/mercadopago.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { MercadoPagoConfig, Payment, MerchantOrder } from "mercadopago";
import prisma from "../../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.setHeader("Allow", ["POST", "GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const body = req.body || {};
    const fullStr = JSON.stringify({ body, query: req.query });

    console.log("[Webhook MP Notification Received]", {
      action: body.action || req.query.action,
      type: body.type || req.query.type,
      dataObj: body.data,
      query: req.query,
    });

    let webOrderNumber: string | null = null;
    let isApproved = false;
    let actualMpFee = 0;

    // 1. Intentar extraer directo del contenido recibido
    const orderMatch = fullStr.match(/WEB-[A-Z0-9_-]+/i);
    if (orderMatch) {
      webOrderNumber = orderMatch[0];
    }

    if (
      /status["']?\s*:\s*["']?(approved|processed|accredited|closed|paid)/i.test(fullStr) ||
      /status_detail["']?\s*:\s*["']?accredited/i.test(fullStr) ||
      /action["']?\s*:\s*["']?order\.processed/i.test(fullStr)
    ) {
      isApproved = true;
    }

    // 2. Si no venía la referencia o el estado aprobado en el body, consultar la API con Payment.get()
    const paymentId = body?.data?.id || req.query["data.id"] || req.query.id || body.id;

    if (paymentId && (!webOrderNumber || !isApproved)) {
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
              webOrderNumber = orderData.external_reference || webOrderNumber;
            }
          } else {
            const paymentClient = new Payment(client);
            const payment = await paymentClient.get({ id: String(paymentId) });
            if (payment) {
              if (payment.status === "approved" || payment.status === "processed") {
                isApproved = true;
              }
              webOrderNumber = payment.external_reference || webOrderNumber;
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
          console.warn("[Webhook MP Fetch Warning]:", fetchErr?.message || fetchErr);
        }
      }
    }

    // 3. Si tenemos el número de orden y está APROBADO, actualizar en ClinPOS
    if (webOrderNumber && isApproved) {
      const order = await prisma.webOrder.findFirst({
        where: { webOrderNumber },
      });

      if (order) {
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
        console.log(`[Webhook MP Exito] Pedido #${webOrderNumber} marcado como PAID. Fee MP: $${feeToStore.toFixed(2)}`);
      } else {
        console.warn(`[Webhook MP Warn] No se encontró el pedido #${webOrderNumber} en la base de datos.`);
      }
    } else {
      console.warn(`[Webhook MP Skip] No se pudo emparejar orden o estado. webOrderNumber: ${webOrderNumber}, isApproved: ${isApproved}`);
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error("Error en handler Webhook Mercado Pago:", error);
    return res.status(200).json({ received: true });
  }
}
