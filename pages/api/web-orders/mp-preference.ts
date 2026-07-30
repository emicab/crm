import type { NextApiRequest, NextApiResponse } from "next";
import { MercadoPagoConfig, Preference } from "mercadopago";
import prisma from "../../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { webOrderNumber, total, clientName, clientPhone, orderPayload } = req.body;
    const cleanOrderNum = webOrderNumber || orderPayload?.webOrderNumber || `WEB-${Date.now()}`;

    if (!total || total <= 0) {
      return res.status(400).json({ message: "Monto total inválido para el checkout." });
    }

    // Registrar o asegurar el pedido en la base de datos de ClinPOS atómicamente
    if (orderPayload) {
      try {
        const existing = await prisma.webOrder.findFirst({
          where: { webOrderNumber: cleanOrderNum },
        });

        if (!existing) {
          await prisma.webOrder.create({
            data: {
              webOrderNumber: cleanOrderNum,
              clientName: orderPayload.clientName || clientName,
              clientEmail: orderPayload.clientEmail || null,
              clientPhone: orderPayload.clientPhone || clientPhone,
              shippingAddress: orderPayload.shippingAddress || null,
              deliveryType: orderPayload.deliveryType || "PICKUP",
              paymentMethod: "MERCADO_PAGO",
              paymentStatus: "PENDING",
              status: "PENDING_PREPARATION",
              totalAmount: parseFloat(orderPayload.totalAmount || total) || 0,
              notes: orderPayload.notes || null,
              items: {
                create: (orderPayload.items || []).map((i: any) => ({
                  productId: parseInt(i.productId),
                  quantity: parseFloat(i.quantity),
                  unitPrice: parseFloat(i.unitPrice),
                  subtotal: parseFloat(i.quantity) * parseFloat(i.unitPrice),
                })),
              },
            },
          });
        }
      } catch (e) {
        console.warn("[mp-preference] Aviso al registrar orden previa en BD:", e);
      }
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

      const rawReturnUrl = req.body.returnUrl || req.headers.referer || req.headers.origin || "http://localhost:3003";
      const returnUrl = rawReturnUrl.split("?")[0].replace(/\/$/, "");

      const successUrl = `${returnUrl}?status=approved&external_reference=${cleanOrderNum}`;
      const failureUrl = `${returnUrl}?status=failure&external_reference=${cleanOrderNum}`;
      const pendingUrl = `${returnUrl}?status=pending&external_reference=${cleanOrderNum}`;

      const prefBody: any = {
        items: [
          {
            id: cleanOrderNum,
            title: `Pedido Web #${cleanOrderNum}`,
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
        back_urls: {
          success: successUrl,
          failure: failureUrl,
          pending: pendingUrl,
        },
        external_reference: cleanOrderNum,
      };

      // Mercado Pago exige HTTPS para activar auto_return
      if (returnUrl.startsWith("https://")) {
        prefBody.auto_return = "approved";
      }

      if (process.env.MP_WEBHOOK_URL) {
        prefBody.notification_url = process.env.MP_WEBHOOK_URL;
      }

      console.log("[MP Preference Payload]", JSON.stringify(prefBody, null, 2));

      const response = await preference.create({
        body: prefBody,
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
