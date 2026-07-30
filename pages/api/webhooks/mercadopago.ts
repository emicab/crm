// pages/api/webhooks/mercadopago.ts
import type { NextApiRequest, NextApiResponse } from "next";
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

    // 1. Extraer webOrderNumber con Regex (WEB-XXXXX) de todo el contenido recibido
    const orderMatch = fullStr.match(/WEB-[A-Z0-9_-]+/i);
    if (orderMatch) {
      webOrderNumber = orderMatch[0];
    }

    // 2. Verificar aprobación de pago en cualquier campo del payload o query
    if (
      /status["']?\s*:\s*["']?(approved|processed|accredited|closed|paid)/i.test(fullStr) ||
      /status_detail["']?\s*:\s*["']?accredited/i.test(fullStr) ||
      /action["']?\s*:\s*["']?order\.processed/i.test(fullStr)
    ) {
      isApproved = true;
    }

    // 3. Si se identificó el pedido y el estado es aprobado/procesado, actualizar en ClinPOS
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
        console.log(`[Webhook MP Exito] Pedido #${webOrderNumber} marcado como PAID en ClinPOS.`);
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
