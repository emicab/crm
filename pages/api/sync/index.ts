// pages/api/sync/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { runSupabaseSync } from "../../../lib/syncService";
import { isProDevice } from "../../../lib/branchIdentity";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST" || req.method === "GET") {
    // La sincronización en la nube es exclusiva del Plan Pro.
    if (!(await isProDevice())) {
      res.status(403).json({ message: "La sincronización en la nube requiere el Plan Pro.", blockedByPlan: true });
      return;
    }

    const forceFullSync = req.body?.forceFullSync === true || req.query?.force === "true";
    const result = await runSupabaseSync(forceFullSync);
    if (result.success) {
      res.status(200).json(result);
      return;
    } else {
      res.status(400).json({ message: result.message || "Error desconocido de sincronización." });
      return;
    }
  } else {
    res.setHeader("Allow", ["POST", "GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }
}
