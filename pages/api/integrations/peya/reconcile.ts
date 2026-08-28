import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

// Reconciliación con el historial de PedidosYa: proxy a clinstore.
// GET /api/integrations/peya/reconcile?hours=24
const CLINSTORE_BASE_URL =
  (process.env.NEXT_PUBLIC_CLINSTORE_BASE_URL || "").replace(/\/$/, "") ||
  "https://clinstore.vercel.app";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Método no permitido" });
  }

  try {
    const storeConfig = await prisma.storeConfig.findFirst();
    if (!storeConfig) {
      return res.status(404).json({ message: "Configuración de tienda no encontrada" });
    }

    if (!storeConfig.peyaEnabled || !storeConfig.peyaChainId || !storeConfig.peyaVendorId) {
      return res.status(400).json({ message: "Integración de PedidosYa no está configurada" });
    }

    const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
    const { getSelectiveSyncCredentials } = await import("../../../../lib/syncService");
    const { tenantId } = await getSelectiveSyncCredentials();

    const hours = Number(req.query.hours) || 24;
    const proxyRes = await fetch(
      `${CLINSTORE_BASE_URL}/api/integrations/peya/reconcile?tenantId=${encodeURIComponent(tenantId)}&hours=${hours}`,
      { headers: { Authorization: `Bearer ${serviceRole}` } }
    );
    const proxyBody = await proxyRes.json().catch(() => ({}));

    if (!proxyRes.ok) {
      return res.status(proxyRes.status).json({ message: proxyBody.message || "Error en la reconciliación" });
    }

    return res.status(200).json({
      success: true,
      fetched: proxyBody.fetched ?? 0,
      created: proxyBody.created ?? 0,
      skipped: proxyBody.skipped ?? 0,
      errors: proxyBody.errors || [],
    });
  } catch (error: any) {
    console.error("Error en reconciliación de PedidosYa:", error);
    return res.status(500).json({ message: error.message || "Error en reconciliación" });
  }
}
