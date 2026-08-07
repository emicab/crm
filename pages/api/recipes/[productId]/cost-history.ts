// pages/api/recipes/[productId]/cost-history.ts
// Historial de costo de un producto elaborado (evolución en el tiempo).
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../lib/prisma";
import { handleApiError } from "../../../../lib/apiErrorHandler";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = parseInt(req.query.productId as string);
  if (!id || isNaN(id)) {
    return res.status(400).json({ message: "ID de producto inválido." });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const history = await prisma.recipeCostHistory.findMany({
      where: { productId: id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    res.status(200).json(
      history.map((h) => ({
        id: h.id,
        cost: h.cost.toString(),
        hasFullCost: h.hasFullCost,
        source: h.source,
        createdAt: h.createdAt,
      })),
    );
  } catch (error: any) {
    handleApiError(res, error, `fetching cost history ${id}`);
  }
}
