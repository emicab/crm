// pages/api/web-orders/mark-paid.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { MercadoPagoConfig, Payment } from "mercadopago";
import prisma from "../../../lib/prisma";
import { isProDevice } from "../../../lib/branchIdentity";
import { applyRateLimit } from "../../../lib/rateLimit";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST" && req.method !== "PUT") {
    res.setHeader("Allow", ["POST", "PUT"]);
    return res.status(405).json({ message: `Método ${req.method} no permitido.` });
  }

  // Rate Limiting
  if (!applyRateLimit(req, res, 15, 60 * 1000)) {
    return;
  }

  try {
    const { webOrderNumber, paymentId } = req.body;
    if (!webOrderNumber) {
      return res.status(400).json({ message: "Número de orden web requerido." });
    }

    const order = await prisma.webOrder.findFirst({
      where: { webOrderNumber },
    });

    if (!order) {
      return res.status(404).json({ message: "Pedido no encontrado." });
    }

    // Si ya está pagado, responder de forma idéntica sin repetir procesamiento
    if (order.paymentStatus === "PAID") {
      return res.status(200).json({
        success: true,
        webOrderNumber: order.webOrderNumber,
        paymentStatus: order.paymentStatus,
      });
    }

    let isAuthorized = false;

    // 1. Verificación por sesión/secreto local POS de escritorio
    const isLocalPro = await isProDevice();
    const incomingSecretHeader = req.headers['x-app-secret'];
    const incomingSecretCookie = req.cookies['app_auth_token'];
    const appSecret = process.env.APP_SECRET;

    const hasAppSecret = appSecret && (incomingSecretHeader === appSecret || incomingSecretCookie === appSecret);

    if (isLocalPro || hasAppSecret) {
      isAuthorized = true;
    }

    // 2. Verificación mediante API de MercadoPago si se provee paymentId desde el cliente
    if (!isAuthorized && paymentId) {
      const storeConfig = await prisma.storeConfig.findFirst();
      const mpTokenConfig = await prisma.setting.findUnique({
        where: { key: "mercadopago_access_token" },
      });
      const accessToken = storeConfig?.mpAccessToken || mpTokenConfig?.value || "";

      if (accessToken) {
        try {
          const client = new MercadoPagoConfig({ accessToken });
          const paymentClient = new Payment(client);
          const payment = await paymentClient.get({ id: String(paymentId) });

          if (
            payment &&
            payment.status === "approved" &&
            payment.external_reference === webOrderNumber
          ) {
            isAuthorized = true;
          }
        } catch (mpErr) {
          console.warn("[Mark-Paid MP Verification Error]:", mpErr);
        }
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        message: "No autorizado. Se requiere confirmación de pago válida de MercadoPago o permisos de administración.",
      });
    }

    const updated = await prisma.webOrder.update({
      where: { id: order.id },
      data: {
        paymentStatus: "PAID",
      },
    });

    return res.status(200).json({
      success: true,
      webOrderNumber: updated.webOrderNumber,
      paymentStatus: updated.paymentStatus,
    });
  } catch (error: any) {
    console.error("Error al marcar pedido como pagado:", error);
    return res.status(500).json({ message: error.message || "Error al actualizar estado de pago." });
  }
}
