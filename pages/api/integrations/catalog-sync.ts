import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

// Publica el catálogo en PedidosYa vía proxy a clinstore (que tiene las
// credenciales globales del partner y lee los productos del tenant desde
// Supabase). POST /api/integrations/catalog-sync
const CLINSTORE_BASE_URL =
  (process.env.NEXT_PUBLIC_CLINSTORE_BASE_URL || "").replace(/\/$/, "") ||
  "https://clinstore.vercel.app";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
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
    const { getSelectiveSyncCredentials } = await import("../../../lib/syncService");
    const { tenantId } = await getSelectiveSyncCredentials();

    const proxyRes = await fetch(`${CLINSTORE_BASE_URL}/api/integrations/peya/catalog`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRole}`,
      },
      body: JSON.stringify({ tenantId }),
    });
    const proxyBody = await proxyRes.json().catch(() => ({}));

    if (!proxyRes.ok) {
      return res.status(proxyRes.status).json({ message: proxyBody.message || "Error al publicar el catálogo" });
    }

    return res.status(200).json({
      success: true,
      message: `Se enviaron ${proxyBody.sent ?? 0} productos al catálogo de PedidosYa`,
    });
  } catch (error: any) {
    console.error("Error al sincronizar catálogo con PedidosYa:", error);
    return res.status(500).json({ message: error.message || "Error al exportar el catálogo" });
  }
}
