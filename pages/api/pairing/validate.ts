import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { setDeviceBranchId, setDeviceRole } from "../../../lib/branchIdentity";
import { validatePairingCode } from "../../../lib/pairing";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Método no permitido." });
  }

  try {
    const code = String(req.body?.code || "").trim();
    if (!code) {
      return res.status(400).json({ message: "Ingresá el código de emparejamiento." });
    }

    const { tenantId, branchId, branchName } = await validatePairingCode(code);

    // Persistir identidad: rol de sucursal + sucursal + tenant asignado por la nube.
    await setDeviceRole("branch");
    await setDeviceBranchId(branchId);
    await prisma.setting.upsert({
      where: { key: "tenant_id" },
      update: { value: tenantId },
      create: { key: "tenant_id", value: tenantId },
    });

    // Sincronizar en segundo plano para descargar catálogo y stock de la sucursal.
    try {
      const { runSupabaseSync } = await import("../../../lib/syncService");
      runSupabaseSync(true).catch((err) =>
        console.error("Error sincronizando tras emparejar:", err)
      );
    } catch (err) {
      console.warn("No se pudo disparar el sync posterior al emparejamiento:", err);
    }

    return res.status(200).json({
      success: true,
      branchId,
      branchName,
      message: `¡Conectada! Esta PC ahora opera como "${branchName || "sucursal"}".`,
    });
  } catch (error: any) {
    const message = error?.message || "No se pudo conectar la sucursal. Verificá el código.";
    return res.status(400).json({ message });
  }
}
