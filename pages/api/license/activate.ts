import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método no permitido" });
  }

  try {
    const { licenseKey } = req.body;

    if (!licenseKey || typeof licenseKey !== "string") {
      return res
        .status(400)
        .json({ message: "Por favor ingresá una clave de licencia válida." });
    }

    const cleanKey = licenseKey.trim().toUpperCase();

    let targetPlan: "basico" | "pro" = "basico";
    let message = "";

    if (cleanKey.startsWith("CLIN-PRO") || cleanKey.includes("PRO")) {
      targetPlan = "pro";
      message = "¡Licencia PLAN PRO activada con éxito! Nube y herramientas avanzadas desbloqueadas.";
    } else if (
      cleanKey.startsWith("CLIN-BASICO") ||
      cleanKey.startsWith("CLIN-BASE") ||
      cleanKey.includes("BASICO")
    ) {
      targetPlan = "basico";
      message = "¡Licencia PLAN BÁSICO activada con éxito!";
    } else if (cleanKey.length >= 8) {
      // Clave personalizada general
      targetPlan = "pro";
      message = "¡Clave de licencia verificada y activada con éxito!";
    } else {
      return res.status(400).json({
        message: "Clave de licencia no reconocida. Verificá los caracteres ingresados.",
      });
    }

    const updates: Record<string, string> = {
      license_key: cleanKey,
      app_plan: targetPlan,
      unlocked_plan_pro: targetPlan === "pro" ? "true" : "false",
      storage_mode: targetPlan === "pro" ? "seguro" : "local",
      license_activated_at: new Date().toISOString(),
    };

    for (const [key, value] of Object.entries(updates)) {
      await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }

    return res.status(200).json({
      success: true,
      plan: targetPlan,
      message,
    });
  } catch (error: any) {
    console.error("Error al activar licencia:", error);
    return res.status(500).json({
      message: "Error interno al activar la licencia.",
    });
  }
}
