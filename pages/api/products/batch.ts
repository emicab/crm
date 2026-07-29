import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "PUT" || req.method === "POST") {
    try {
      const { ids, allPages, filters, isPublicWeb, brandId, categoryId, supplierId } = req.body;

      let whereClause: any = {};

      if (allPages) {
        if (filters?.search) {
          whereClause.OR = [
            { name: { contains: filters.search } },
            { sku: { contains: filters.search } },
          ];
        }
        if (filters?.brandId) {
          whereClause.brandId = Number(filters.brandId);
        }
        if (filters?.categoryId) {
          whereClause.categoryId = Number(filters.categoryId);
        }
        if (filters?.supplierId) {
          whereClause.supplierId = Number(filters.supplierId);
        }
      } else if (Array.isArray(ids) && ids.length > 0) {
        whereClause.id = { in: ids.map((i: any) => Number(i)) };
      } else {
        return res.status(400).json({ message: "Debe proporcionar una lista de IDs o seleccionar todas las páginas." });
      }

      const updateData: any = {};
      if (isPublicWeb !== undefined) {
        updateData.isPublicWeb = Boolean(isPublicWeb);
      }
      if (brandId !== undefined && !allPages) updateData.brandId = Number(brandId);
      if (categoryId !== undefined && !allPages) updateData.categoryId = Number(categoryId);
      if (supplierId !== undefined && !allPages) updateData.supplierId = supplierId ? Number(supplierId) : null;

      const result = await prisma.product.updateMany({
        where: whereClause,
        data: updateData,
      });

      return res.status(200).json({ message: "Productos actualizados correctamente.", count: result.count });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Error al actualizar productos en lote." });
    }
  }

  res.setHeader("Allow", ["PUT", "POST"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
