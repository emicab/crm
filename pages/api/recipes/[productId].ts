// pages/api/recipes/[productId].ts
// Consulta y actualización de la receta de un producto elaborado.
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { handleApiError } from "../../../lib/apiErrorHandler";
import { Prisma } from "@prisma/client";
import {
  replaceRecipeItems,
  getRecipeAvailability,
  computeRecipeCost,
} from "../../../lib/recipeStock";

const Decimal = Prisma.Decimal;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = parseInt(req.query.productId as string);
  if (!id || isNaN(id)) {
    return res.status(400).json({ message: "ID de producto inválido." });
  }

  if (req.method === "GET") {
    try {
      const product = await prisma.product.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          isRecipe: true,
          recipeItems: {
            include: {
              ingredient: {
                select: { id: true, name: true, unitType: true, isRecipe: true, sku: true, priceSale: true },
              },
            },
            orderBy: { id: "asc" },
          },
        },
      });
      if (!product) {
        return res.status(404).json({ message: "Producto no encontrado." });
      }

      const branchIdParam = req.query.branchId as string | undefined;
      const branchId = branchIdParam && !isNaN(parseInt(branchIdParam))
        ? parseInt(branchIdParam)
        : null;
      const availability = product.isRecipe
        ? await getRecipeAvailability(prisma, product.id, branchId)
        : { available: Number((await prisma.product.findUnique({ where: { id }, select: { quantityStock: true } }))?.quantityStock || 0), limiting: [] };

      const costInfo = product.isRecipe
        ? await computeRecipeCost(prisma, product.id)
        : { cost: new Decimal(0), hasFullCost: false };
      let margin: number | null = null;
      if (costInfo.hasFullCost && costInfo.cost.gt(0)) {
        const sale = await prisma.product.findUnique({
          where: { id },
          select: { priceSale: true },
        });
        if (sale && sale.priceSale.gt(0)) {
          margin = Number(sale.priceSale.minus(costInfo.cost).div(sale.priceSale).times(100).toFixed(1));
        }
      }

      res.status(200).json({
        id: product.id,
        name: product.name,
        isRecipe: product.isRecipe,
        derivedStock: availability.available,
        limiting: availability.limiting,
        cost: costInfo.cost.toString(),
        hasFullCost: costInfo.hasFullCost,
        margin,
        items: product.recipeItems.map((i) => ({
          id: i.id,
          ingredientId: i.ingredientId,
          name: i.ingredient.name,
          sku: i.ingredient.sku,
          priceSale: i.ingredient.priceSale.toString(),
          unitType: i.unitType,
          isRecipe: i.ingredient.isRecipe,
          quantity: i.quantity,
        })),
      });
    } catch (error: any) {
      handleApiError(res, error, `fetching recipe ${id}`);
    }
  } else if (req.method === "PUT") {
    const { items, isRecipe } = req.body;
    try {
      const product = await prisma.product.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!product) {
        return res.status(404).json({ message: "Producto no encontrado." });
      }

      const finalIsRecipe = isRecipe !== undefined ? Boolean(isRecipe) : (items || []).length > 0;

      if (finalIsRecipe) {
        await replaceRecipeItems(prisma, product.id, items || []);
        const { recordCostSnapshot } = await import("../../../lib/recipeStock");
        await recordCostSnapshot(prisma, product.id, "recipe_save");
      } else {
        await prisma.recipeItem.deleteMany({ where: { productId: product.id } });
      }

      await prisma.product.update({
        where: { id: product.id },
        data: { isRecipe: finalIsRecipe },
      });

      // Sincronizar el producto (isRecipe) y sus recipeItems con la nube para que
      // la tienda web refleje el Recetario sin esperar el sync periódico.
      try {
        const { syncSingleProduct } = await import("../../../lib/syncService");
        await syncSingleProduct(product.id);
      } catch (syncErr) {
        console.warn("Error al sincronizar producto receta:", syncErr);
      }

      const availability = finalIsRecipe
        ? await getRecipeAvailability(prisma, product.id)
        : { available: 0, limiting: [] };

      res.status(200).json({ message: "Receta actualizada.", productId: product.id, ...availability });
    } catch (error: any) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      handleApiError(res, error, `updating recipe ${id}`);
    }
  } else if (req.method === "DELETE") {
    try {
      await prisma.recipeItem.deleteMany({ where: { productId: id } });
      await prisma.product.update({
        where: { id },
        data: { isRecipe: false },
      });
      // Sincronizar el producto (deja de ser receta) para limpiar la nube.
      try {
        const { syncSingleProduct } = await import("../../../lib/syncService");
        await syncSingleProduct(id);
      } catch (syncErr) {
        console.warn("Error al sincronizar producto receta eliminada:", syncErr);
      }
      res.status(200).json({ message: "Receta eliminada." });
    } catch (error: any) {
      handleApiError(res, error, `deleting recipe ${id}`);
    }
  } else {
    res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
