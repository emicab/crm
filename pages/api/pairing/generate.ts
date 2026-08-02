import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { isMainDevice, isProDevice } from "../../../lib/branchIdentity";
import { generatePairingCode } from "../../../lib/pairing";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Método no permitido." });
  }

  try {
    if (!(await isProDevice())) {
      return res.status(403).json({
        message: "Los códigos de emparejamiento requieren el plan Pro.",
      });
    }
    if (!(await isMainDevice())) {
      return res.status(403).json({
        message: "Solo la Casa Central puede generar códigos de emparejamiento.",
      });
    }

    const branchId = Number(req.body?.branchId);
    if (!branchId || isNaN(branchId)) {
      return res.status(400).json({ message: "Seleccioná una sucursal para conectar." });
    }

    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      return res.status(404).json({ message: "La sucursal seleccionada no existe." });
    }
    if (branch.isMain) {
      return res.status(400).json({ message: "La Casa Central no necesita emparejarse." });
    }

    const { code, expiresAt } = await generatePairingCode(branch.id);

    return res.status(200).json({ success: true, code, expiresAt, branchId: branch.id });
  } catch (error: any) {
    console.error("Error generando código de emparejamiento:", error);
    return res.status(500).json({ message: "No se pudo generar el código. Revisá la conexión con la nube." });
  }
}
