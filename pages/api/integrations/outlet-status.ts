import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { RappiApiClient } from "@/lib/integrations/rappiApiClient";

// Estado del local (Abierto / Ocupado / Cerrado).
// El estado LOCAL (StoreConfig.peyaOutletStatus / rappiOutletStatus) es la
// fuente de verdad y SIEMPRE se persiste, sin importar si las plataformas
// externas responden o están configuradas. El sync a PeYA (proxy clinstore) y
// Rappi es best-effort: si falla, se reporta en `results` pero el estado local
// queda guardado.
const CLINSTORE_BASE_URL =
  (process.env.NEXT_PUBLIC_CLINSTORE_BASE_URL || "").replace(/\/$/, "") ||
  "https://clinstore.vercel.app";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const storeConfig = await prisma.storeConfig.findFirst();
  if (!storeConfig) {
    return res.status(404).json({ message: "Configuración de tienda no encontrada" });
  }

  // GET: devolver el estado local persistido (fuente de verdad).
  if (req.method === "GET") {
    return res.status(200).json({
      peyaStatus: storeConfig.peyaOutletStatus || "OPEN",
      rappiStatus: storeConfig.rappiOutletStatus || "OPEN",
      peyaEnabled: storeConfig.peyaEnabled,
      rappiEnabled: storeConfig.rappiEnabled,
    });
  }

  // POST / PUT: persistir local SIEMPRE + sync externo best-effort.
  if (req.method === "POST" || req.method === "PUT") {
    const { peyaStatus, rappiStatus } = req.body;
    const results: Record<string, any> = {};

    // 1. Persistir el estado local (fuente de verdad), siempre.
    const updateData: Record<string, unknown> = {};
    if (peyaStatus) updateData.peyaOutletStatus = peyaStatus;
    if (rappiStatus) updateData.rappiOutletStatus = rappiStatus;
    if (Object.keys(updateData).length > 0) {
      await prisma.storeConfig.update({
        where: { id: storeConfig.id },
        data: updateData,
      });
    }

    // 2. Sync a PedidosYa (best-effort: no debe bloquear ni revertir el local).
    if (peyaStatus && storeConfig.peyaEnabled) {
      try {
        const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
        const { getSelectiveSyncCredentials } = await import("../../../lib/syncService");
        const { tenantId } = await getSelectiveSyncCredentials();

        const proxyRes = await fetch(`${CLINSTORE_BASE_URL}/api/integrations/peya/status`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRole}`,
          },
          body: JSON.stringify({ tenantId, peyaStatus }),
        });
        results.peya = await proxyRes.json().catch(() => ({}));
        if (!proxyRes.ok) {
          results.peyaWarning = results.peya?.message || `Error PeYA (HTTP ${proxyRes.status})`;
        }
      } catch (err: any) {
        results.peyaWarning = err?.message || "No se pudo sincronizar estado con PedidosYa";
      }
    }

    // 3. Sync a Rappi (best-effort).
    if (rappiStatus && storeConfig.rappiEnabled) {
      try {
        if (storeConfig.rappiApiKey && storeConfig.rappiStoreId) {
          const rappiClient = new RappiApiClient({
            apiKey: storeConfig.rappiApiKey,
            storeId: storeConfig.rappiStoreId,
          });
          results.rappi = await rappiClient.updateStoreStatus(rappiStatus);
        }
      } catch (err: any) {
        results.rappiWarning = err?.message || "No se pudo sincronizar estado con Rappi";
      }
    }

    return res.status(200).json({
      success: true,
      peyaStatus: peyaStatus || storeConfig.peyaOutletStatus,
      rappiStatus: rappiStatus || storeConfig.rappiOutletStatus,
      results,
    });
  }

  return res.status(405).json({ message: "Método no permitido" });
}
