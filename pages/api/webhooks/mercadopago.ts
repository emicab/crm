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
    const dataObj = body.data || {};
    const action = (body.action || req.query.action || "").toString();
    const notificationType = (body.type || req.query.type || action).toString();

    console.log("[Webhook MP Notification Received]", {
      action,
      notificationType,
      dataObj,
      query: req.query,
    });

    let webOrderNumber: string | null = null;
    let isApproved = false;

    // 1. Extraer directamente los datos si vienen presentes en el body de la notificación
    const dataStatus = (dataObj.status || dataObj.status_detail || "").toLowerCase();
    if (
      dataStatus === "approved" ||
      dataStatus === "processed" ||
      dataStatus === "accredited" ||
      dataStatus === "closed" ||
      dataStatus === "paid"
    ) {
      isApproved = true;
    }

    if (dataObj.external_reference) {
      webOrderNumber = String(dataObj.external_reference);
    } else if (Array.isArray(dataObj.items) && dataObj.items.length > 0) {
      const item = dataObj.items[0];
      if (item.id && String(item.id).startsWith("WEB-")) {
        webOrderNumber = String(item.id);
      } else if (item.title && item.title.includes("WEB-")) {
        const match = String(item.title).match(/WEB-[A-Z0-9_-]+/i);
        if (match) webOrderNumber = match[0];
      }
    }

    // 2. Si no se pudo determinar el pedido o estado del body, consultar a la API de Mercado Pago
    const paymentId = dataObj.id || req.query["data.id"] || req.query.id || body.id;

    if (paymentId && (!webOrderNumber || !isApproved)) {
      const storeConfig = await prisma.storeConfig.findFirst();
      const mpTokenConfig = await prisma.setting.findUnique({
        where: { key: "mercadopago_access_token" },
      });

      const accessToken =
        storeConfig?.mpAccessToken ||
        mpTokenConfig?.value ||
        process.env.MERCADOPAGO_ACCESS_TOKEN ||
        process.env.MP_ACCESS_TOKEN ||
        "";

      if (accessToken && (accessToken.startsWith("APP_USR") || accessToken.startsWith("TEST-"))) {
        const client = new MercadoPagoConfig({ accessToken });

        try {
          if (String(paymentId).startsWith("ORD") || notificationType === "order" || action.includes("order")) {
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
            if (payment && payment.status === "approved") {
              isApproved = true;
              webOrderNumber = payment.external_reference || webOrderNumber;
            }
          }
        } catch (fetchErr) {
          console.warn("[Webhook MP] Error consultando API de Mercado Pago para el ID:", paymentId);
        }
      }
    }

    // 3. Si tenemos el número de orden y está APROBADO, actualizar en ClinPOS
    if (webOrderNumber && isApproved) {
      const order = await prisma.webOrder.findFirst({
        where: { webOrderNumber },
      });

      if (order) {
        await prisma.webOrder.update({
          where: { id: order.id },
          data: {
            paymentStatus: "PAID",
          },
        });
        console.log(`[Webhook MP Exito] Pedido #${webOrderNumber} actualizado a PAID en ClinPOS.`);
      }
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error("Error en handler Webhook Mercado Pago:", error);
    return res.status(200).json({ received: true });
  }
}
