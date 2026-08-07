// pages/api/recipes/index.ts
// CRUD de productos elaborados (Recetario).
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { handleApiError } from "../../../lib/apiErrorHandler";
import { Prisma } from "@prisma/client";
import {
  replaceRecipeItems,
  getRecipeAvailability,
  computeDerivedStock,
  computeRecipeCost,
} from "../../../lib/recipeStock";

const Decimal = Prisma.Decimal;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const branchIdParam = req.query.branchId as string | undefined;
      const branchId = branchIdParam && !isNaN(parseInt(branchIdParam))
        ? parseInt(branchIdParam)
        : null;

      const recipes = await prisma.product.findMany({
        where: { isRecipe: true },
        include: {
          brand: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          recipeItems: {
            include: {
              ingredient: {
                select: { id: true, name: true, unitType: true, isRecipe: true, sku: true },
              },
            },
            orderBy: { id: "asc" },
          },
        },
        orderBy: { name: "asc" },
      });

      const mapped = await Promise.all(
        recipes.map(async (r) => {
          const availability = await getRecipeAvailability(prisma, r.id, branchId);
          const costInfo = await computeRecipeCost(prisma, r.id);
          const priceSale = r.priceSale;
          let margin: number | null = null;
          if (costInfo.hasFullCost && costInfo.cost.gt(0) && priceSale.gt(0)) {
            margin = Number(
              priceSale.minus(costInfo.cost).div(priceSale).times(100).toFixed(1),
            );
          }
          return {
            id: r.id,
            name: r.name,
            sku: r.sku,
            description: r.description,
            imageUrl: r.imageUrl,
            priceSale: r.priceSale.toString(),
            pricePurchase: r.pricePurchase.toString(),
            stockMinAlert: r.stockMinAlert,
            unitType: r.unitType,
            isPublicWeb: r.isPublicWeb,
            webCategory: r.webCategory,
            brand: r.brand,
            category: r.category,
            derivedStock: availability.available,
            limiting: availability.limiting,
            cost: costInfo.cost.toString(),
            hasFullCost: costInfo.hasFullCost,
            margin,
            items: r.recipeItems.map((i) => ({
              id: i.id,
              ingredientId: i.ingredientId,
              name: i.ingredient.name,
              sku: i.ingredient.sku,
              unitType: i.unitType,
              isRecipe: i.ingredient.isRecipe,
              quantity: i.quantity,
            })),
          };
        }),
      );

      res.status(200).json(mapped);
    } catch (error: any) {
      handleApiError(res, error, "fetching recipes");
    }
  } else if (req.method === "POST") {
    const { productId, items } = req.body;
    if (!productId || isNaN(parseInt(productId))) {
      return res.status(400).json({ message: "productId inválido." });
    }
    try {
      const product = await prisma.product.findUnique({
        where: { id: parseInt(productId) },
        select: { id: true },
      });
      if (!product) {
        return res.status(400).json({ message: "El producto no existe." });
      }

      await replaceRecipeItems(prisma, product.id, items || []);

      await prisma.product.update({
        where: { id: product.id },
        data: { isRecipe: (items || []).length > 0 },
      });

      // Sincronizar el producto (isRecipe) y sus recipeItems con la nube para que
      // la tienda web refleje el Recetario sin esperar el sync periódico.
      try {
        const { syncSingleProduct } = await import("../../../lib/syncService");
        await syncSingleProduct(product.id);
      } catch (syncErr) {
        console.warn("Error al sincronizar producto receta:", syncErr);
      }

      const derivedStock = await computeDerivedStock(prisma, product.id);
      res.status(200).json({ message: "Receta guardada.", productId: product.id, derivedStock });
    } catch (error: any) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      handleApiError(res, error, "saving recipe");
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
