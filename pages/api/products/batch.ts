import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "PUT" || req.method === "POST") {
    try {
      const { ids, isPublicWeb } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Debe proporcionar una lista de IDs." });
      }

      await prisma.product.updateMany({
        where: { id: { in: ids.map((i: any) => Number(i)) } },
        data: { isPublicWeb: Boolean(isPublicWeb) },
      });

      return res.status(200).json({ message: "Productos actualizados correctamente.", count: ids.length });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Error al actualizar productos en lote." });
    }
  }

  res.setHeader("Allow", ["PUT", "POST"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
