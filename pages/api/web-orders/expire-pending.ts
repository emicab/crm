// pages/api/web-orders/expire-pending.ts
// Cron distribuido: el POS dispara la expiración de pedidos web pendientes en
// clinstore cada vez que completa un sync (ciclo de 5 min). Fire-and-forget:
// no bloquea el sync y tolera fallos de red.
//
// La autenticación la resuelve clinstore comparando el Bearer contra la service
// role key (que este POS ya guarda localmente) o contra WEB_ORDER_CRON_SECRET.
import type { NextApiRequest, NextApiResponse } from "next";
import { getSelectiveSyncCredentials } from "../../../lib/syncService";
import prisma from "../../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  try {
    const { supabaseKey, tenantId } = await getSelectiveSyncCredentials();
    if (!supabaseKey || !tenantId) {
      res.status(400).json({ ok: false, message: "Sin credenciales de nube." });
      return;
    }

    const settings = await prisma.setting.findMany();
    const config: Record<string, string> = {};
    for (const s of settings) config[s.key] = s.value;
    const baseUrl =
      config.clinstore_base_url ||
      process.env.NEXT_PUBLIC_CLINSTORE_BASE_URL ||
      "https://clinstore.vercel.app";

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(
        `${baseUrl.replace(/\/$/, "")}/api/web-orders/expire-pending?tenant_id=${encodeURIComponent(tenantId)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
          },
          signal: controller.signal,
        },
      );
      const body = await response.json().catch(() => null);
      if (response.ok) {
        res.status(200).json({ ok: true, ...(body || {}) });
      } else {
        res.status(response.status).json({ ok: false, ...(body || {}) });
      }
    } catch (err: any) {
      // Fire-and-forget: un fallo de red no debe romper nada.
      const aborted = err?.name === "AbortError";
      res.status(aborted ? 504 : 502).json({
        ok: false,
        message: aborted ? "Timeout de clinstore" : "No se pudo contactar clinstore",
      });
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    console.error("[expire-pending POS] Error:", error);
    res.status(500).json({ ok: false, message: "Error interno" });
  }
}
