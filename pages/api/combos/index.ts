import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const combos = await prisma.combo.findMany({
        where: { active: true },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  quantityStock: true,
                  priceSale: true,
                },
              },
            },
          },
        },
        orderBy: { name: "asc" },
      });

      // Calcular el stock máximo disponible por combo según el stock de cada producto ingrediente
      const mappedCombos = combos.map((c) => {
        let maxComboStock = 99999;
        const items = c.items.map((i) => {
          const prodStock = i.product ? Number(i.product.quantityStock) : 0;
          const reqQty = i.quantity > 0 ? i.quantity : 1;
          const possiblePacks = Math.floor(prodStock / reqQty);
          if (possiblePacks < maxComboStock) {
            maxComboStock = possiblePacks;
          }
          return {
            id: i.id,
            productId: i.productId,
            productName: i.product?.name || "Producto",
            quantity: i.quantity,
            priceSale: i.product ? i.product.priceSale.toString() : "0",
          };
        });

        if (maxComboStock === 99999) maxComboStock = 0;

        return {
          id: c.id,
          name: c.name,
          description: c.description,
          priceSale: c.price.toString(),
          isCombo: true,
          webCategory: "Combos & Promos 🔥",
          quantityStock: Math.max(0, maxComboStock),
          isPublicWeb: true,
          items,
        };
      });

      return res.status(200).json(mappedCombos);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Error al obtener combos." });
    }
  }

  res.setHeader("Allow", ["GET"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
