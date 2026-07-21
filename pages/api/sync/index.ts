// pages/api/sync/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { runSupabaseSync } from "../../../lib/syncService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const forceFullSync = req.body?.forceFullSync === true;
  const result = await runSupabaseSync(forceFullSync);
  if (result.success) {
    return res.status(200).json(result);
  } else {
    return res.status(400).json({ message: result.message || "Error desconocido de sincronización." });
  }
}
