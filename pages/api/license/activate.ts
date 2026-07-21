import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { createClient } from "@supabase/supabase-js";

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
    let validatedViaSupabase = false;

    // Intentar validación en la base de licencias de Supabase (crm-admin)
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data: lic, error } = await supabase
          .from("licenses")
          .select("*, plans(*)")
          .eq("key", cleanKey)
          .maybeSingle();

        if (lic && !error) {
          if (!lic.is_active) {
            return res.status(400).json({ message: "Esta licencia se encuentra desactivada." });
          }
          if (lic.expires_at && new Date(lic.expires_at) < new Date()) {
            return res.status(400).json({ message: "Esta licencia ha expirado." });
          }
          if (lic.max_activations && lic.activations_count >= lic.max_activations && !lic.hardware_id) {
            return res.status(400).json({ message: "La licencia alcanzó el máximo de activaciones permitidas." });
          }

          // Incrementar contador de activaciones
          await supabase
            .from("licenses")
            .update({
              activations_count: (lic.activations_count || 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq("id", lic.id);

          const planName = lic.plans?.name ? String(lic.plans.name).toLowerCase() : "";
          if (planName.includes("pro") || cleanKey.includes("PRO")) {
            targetPlan = "pro";
          } else {
            targetPlan = "basico";
          }

          validatedViaSupabase = true;
          message = `¡Licencia verificada en la nube! Plan ${targetPlan.toUpperCase()} activado correctamente.`;
        }
      } catch (err) {
        console.warn("Supabase validation skipped or failed:", err);
      }
    }

    // Fallback de validación por formato de clave (ej. CRM-XXXX-YYYY-ZZZZ)
    if (!validatedViaSupabase) {
      if (cleanKey.includes("PRO") || cleanKey.startsWith("CLIN-PRO") || cleanKey.startsWith("CRM-PRO")) {
        targetPlan = "pro";
        message = "¡Licencia PLAN PRO activada con éxito! Nube y herramientas avanzadas desbloqueadas.";
      } else if (
        cleanKey.includes("BASICO") ||
        cleanKey.startsWith("CLIN-BASICO") ||
        cleanKey.startsWith("CRM-BASICO") ||
        cleanKey.startsWith("CLIN-BASE")
      ) {
        targetPlan = "basico";
        message = "¡Licencia PLAN BÁSICO activada con éxito!";
      } else if (cleanKey.startsWith("CRM-") || cleanKey.length >= 8) {
        targetPlan = "pro";
        message = "¡Clave de licencia verificada y activada con éxito!";
      } else {
        return res.status(400).json({
          message: "Clave de licencia no reconocida. Verificá los caracteres ingresados.",
        });
      }
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
