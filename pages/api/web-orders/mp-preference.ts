import type { NextApiRequest, NextApiResponse } from "next";
import { MercadoPagoConfig, Preference } from "mercadopago";
import prisma from "../../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { webOrderNumber, items, total, clientName, clientPhone } = req.body;

    if (!total || total <= 0) {
      return res.status(400).json({ message: "Monto total inválido para el checkout." });
    }

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
      const preference = new Preference(client);

      const origin = (req.headers.referer || req.headers.origin || "http://localhost:3003").replace(/\/$/, "");

      const response = await preference.create({
        body: {
          items: [
            {
              id: webOrderNumber || `WEB-${Date.now()}`,
              title: `Pedido Web #${webOrderNumber || ""}`,
              quantity: 1,
              unit_price: Number(total),
              currency_id: "ARS",
              description: `Pedido de ${clientName || "Cliente"} (${clientPhone || ""})`,
            },
          ],
          payer: {
            name: clientName || "Cliente Web",
            phone: { number: clientPhone || "" },
          },
          backUrls: {
            success: `${origin}?status=approved&external_reference=${webOrderNumber}`,
            failure: `${origin}?status=failure&external_reference=${webOrderNumber}`,
            pending: `${origin}?status=pending&external_reference=${webOrderNumber}`,
          },
          autoReturn: "approved",
          externalReference: webOrderNumber,
          notificationUrl: process.env.MP_WEBHOOK_URL || undefined,
        },
      });

      return res.status(200).json({
        success: true,
        init_point: response.sandbox_init_point || response.init_point,
      });
    }

    // Si no está configurado el Access Token real, devuelve mock exitoso para probar
    return res.status(200).json({
      success: true,
      init_point: null,
      message: "Mercado Pago listo. (Falta configurar MERCADOPAGO_ACCESS_TOKEN en Ajustes)",
    });
  } catch (error: any) {
    console.error("Error al crear preferencia web en Mercado Pago:", error);
    return res.status(500).json({ message: error.message || "Error al procesar Mercado Pago." });
  }
}
