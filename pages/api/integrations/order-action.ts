import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { RappiApiClient } from "@/lib/integrations/rappiApiClient";

// Acciones sobre pedidos de plataformas de delivery.
// - PeYA: proxy a clinstore (que tiene las credenciales globales del partner).
// - Rappi: llamada directa (el POS conserva la API key de Rappi local).
const CLINSTORE_BASE_URL =
  (process.env.NEXT_PUBLIC_CLINSTORE_BASE_URL || "").replace(/\/$/, "") ||
  "https://clinstore.vercel.app";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método no permitido" });
  }

  try {
    const { orderId, action, prepTimeMinutes, cancelReason } = req.body;

    if (!orderId || !action) {
      return res.status(400).json({ message: "orderId y action son requeridos" });
    }

    const order = await prisma.webOrder.findUnique({
      where: { id: Number(orderId) },
      include: { items: { include: { product: true } } },
    });

    if (!order) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    const storeConfig = await prisma.storeConfig.findFirst();

    // Acciones para PedidosYa: proxy a clinstore (credenciales globales allí).
    if (order.origin === "PEDIDOS_YA" && order.externalOrderId) {
      const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
      const { getSelectiveSyncCredentials } = await import("../../../lib/syncService");
      const { tenantId } = await getSelectiveSyncCredentials();

      const proxyRes = await fetch(`${CLINSTORE_BASE_URL}/api/integrations/peya/order-action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRole}`,
        },
        body: JSON.stringify({
          tenantId,
          externalOrderId: order.externalOrderId,
          action,
          prepTimeMinutes: Number(prepTimeMinutes || 20),
          cancelReason,
          transportType: order.transportType || "LOGISTICS_DELIVERY",
        }),
      });
      const proxyBody = await proxyRes.json().catch(() => ({}));

      if (!proxyRes.ok) {
        return res.status(proxyRes.status).json({ message: proxyBody.message || "Error en PedidosYa" });
      }

      const updatedOrder = await prisma.webOrder.findUnique({ where: { id: order.id } });
      return res.status(200).json({ success: true, order: updatedOrder });
    }

    // Acciones para Rappi
    if (order.origin === "RAPPI" && order.externalOrderId) {
      if (!storeConfig || !storeConfig.rappiApiKey) {
        return res.status(400).json({ message: "Credenciales de Rappi no configuradas" });
      }

      const rappiClient = new RappiApiClient({
        apiKey: storeConfig.rappiApiKey,
        storeId: order.vendorId || storeConfig.rappiStoreId || "",
      });

      if (action === "ACCEPT") {
        await rappiClient.acceptOrder(order.externalOrderId, Number(prepTimeMinutes || 20));
        await prisma.webOrder.update({
          where: { id: order.id },
          data: { status: "PENDING_PREPARATION" },
        });
      } else if (action === "CANCEL") {
        await rappiClient.rejectOrder(order.externalOrderId, cancelReason || "STORE_BUSY");
        await prisma.webOrder.update({
          where: { id: order.id },
          data: { status: "CANCELLED" },
        });
      }
    }

    const updatedOrder = await prisma.webOrder.findUnique({ where: { id: order.id } });
    return res.status(200).json({ success: true, order: updatedOrder });
  } catch (error: any) {
    console.error("Error al ejecutar acción de pedido externo:", error);
    return res.status(500).json({ message: error.message || "Error al procesar la acción de comanda" });
  }
}
