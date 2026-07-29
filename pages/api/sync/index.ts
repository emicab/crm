// pages/api/sync/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { runSupabaseSync } from "../../../lib/syncService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST" || req.method === "GET") {
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
