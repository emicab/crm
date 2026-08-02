// pages/api/license/check.ts
// Revalida la licencia online contra Supabase y devuelve el estado del plan.
// Lo llama LicenseGate al arrancar la app (respuesta inmediata ante una baja)
// y runSupabaseSync también lo ejecuta en la Casa Central en cada sync.
import type { NextApiRequest, NextApiResponse } from "next";
import { revalidateLicense } from "../../../lib/licenseStatus";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.setHeader("Allow", ["POST", "GET"]);
    return res.status(405).json({ message: "Método no permitido." });
  }

  try {
    const status = await revalidateLicense();
    return res.status(200).json({
      success: true,
      ...status,
    });
  } catch (error: any) {
    console.error("Error revalidando licencia:", error);
    return res.status(500).json({
      success: false,
      message: "No se pudo revalidar la licencia.",
    });
  }
}
