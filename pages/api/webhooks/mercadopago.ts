// pages/api/webhooks/mercadopago.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { MercadoPagoConfig, Payment } from "mercadopago";
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
    const { action, type, data } = req.body || {};
    const paymentId =
      data?.id || req.query["data.id"] || req.query.id || req.body?.["data.id"];
    const notificationType = type || req.query.type || action;

    console.log("[Webhook MP Notification Received]", { notificationType, paymentId, query: req.query, body: req.body });

    if (paymentId) {
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
        const paymentClient = new Payment(client);

        try {
          const payment = await paymentClient.get({ id: String(paymentId) });

          if (payment && payment.status === "approved") {
            const webOrderNumber = payment.external_reference;

            if (webOrderNumber) {
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
                console.log(`[Webhook MP Exito] Pedido #${webOrderNumber} marcado como PAID.`);
              }
            }
          }
        } catch (fetchErr) {
          console.warn("[Webhook MP] No se pudo consultar el pago (ID de prueba o mock):", fetchErr);
        }
      }
    }

    // Mercado Pago requiere responder 200 OK inmediatamente
    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error("Error procesando Webhook Mercado Pago:", error);
    return res.status(200).json({ received: true });
  }
}
