// pages/api/products/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { Prisma } from '@prisma/client';
const Decimal = Prisma.Decimal;
import { handleApiError } from '../../../lib/apiErrorHandler';
import { sanitizeString } from '../../../lib/sanitize';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const productIdQuery = req.query.id as string;

  if (!productIdQuery || isNaN(parseInt(productIdQuery))) {
    return res.status(400).json({ message: 'ID de producto inválido.' });
  }
  
  const id = parseInt(productIdQuery);

  if (req.method === 'GET') {
    try {
      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          brand: true,
          category: true,
          supplier: true,
        },
      });
      if (!product) {
        return res.status(404).json({ message: 'Producto no encontrado.' });
      }
      res.status(200).json(product);
    } catch (error: any) {
      handleApiError(res, error, `fetching product ${id}`);
    }
  } else if (req.method === 'PUT') {
    const { isPublicWeb, webCategory } = req.body;

    // Si es una actualización rápida de visibilidad web únicamente:
    if (isPublicWeb !== undefined && Object.keys(req.body).every((k) => ['isPublicWeb', 'webCategory'].includes(k))) {
      try {
        const updated = await prisma.product.update({
          where: { id },
          data: {
            isPublicWeb: Boolean(isPublicWeb),
            ...(webCategory !== undefined ? { webCategory: webCategory || null } : {}),
          },
          include: { brand: true, category: true, supplier: true, branchStocks: true },
        });
        
        // [CORREGIDO] Sync ligero. Sin fallback destructivo.
        try {
          const { syncSingleProduct } = await import("../../../lib/syncService");
          await syncSingleProduct(id);
        } catch (syncErr) {
          console.error("[Productos] Error sync visibilidad web (se auto-sanará):", syncErr);
        }
        
        res.status(200).json(updated);
        return;
      } catch (error: any) {
        handleApiError(res, error, `updating product web status ${id}`);
        return;
      }
    }

    const {
      pricePurchase, priceSale, quantityStock, stockMinAlert,
      brandId, categoryId, supplierId, unitType, branchStocks, branchId
    } = req.body;
    let {
      name, sku, description,
    } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ message: 'El nombre del producto es obligatorio.' });
    }
    if (priceSale === undefined || isNaN(parseFloat(priceSale))) {
      return res.status(400).json({ message: 'El precio de venta es obligatorio y debe ser un número.' });
    }
    if (brandId === undefined || isNaN(parseInt(brandId))) {
      return res.status(400).json({ message: 'La marca es obligatoria.' });
    }
    if (categoryId === undefined || isNaN(parseInt(categoryId))) {
      return res.status(400).json({ message: 'La categoría es obligatoria.' });
    }

    name = sanitizeString(name);
    if (sku) sku = sanitizeString(sku);
    if (description) description = sanitizeString(description);

    try {
      const brandExists = await prisma.brand.findUnique({ where: { id: parseInt(brandId) }});
      if (!brandExists) return res.status(400).json({ message: `Marca con ID ${brandId} no existe.` });
      
      const categoryExists = await prisma.category.findUnique({ where: { id: parseInt(categoryId) }});
      if (!categoryExists) return res.status(400).json({ message: `Categoría con ID ${categoryId} no existe.` });

      let totalStockCalculated = quantityStock !== undefined ? parseFloat(quantityStock) : undefined;

      // [CORREGIDO] Lógica de recálculo de stock por sucursales
      if (branchStocks && (Array.isArray(branchStocks) || typeof branchStocks === 'object')) {
        const items = Array.isArray(branchStocks)
          ? branchStocks
          : Object.entries(branchStocks).map(([bId, s]) => ({ branchId: Number(bId), stock: s }));

        for (const item of items) {
          const bId = parseInt(String(item.branchId ?? item.id));
          const stockVal = parseFloat(String(item.stock ?? item.quantityStock ?? 0));
          if (!isNaN(bId) && !isNaN(stockVal)) {
            await prisma.productBranchStock.upsert({
              where: { productId_branchId: { productId: id, branchId: bId } },
              update: { quantityStock: stockVal },
              create: { productId: id, branchId: bId, quantityStock: stockVal }
            });
          }
        }
        
        // Recalcular SIEMPRE desde la BD para no ignorar sucursales excluidas en el payload
        const totalStockAgg = await prisma.productBranchStock.aggregate({
          where: { productId: id },
          _sum: { quantityStock: true }
        });
        totalStockCalculated = totalStockAgg._sum.quantityStock ?? 0;
        
      } else if (branchId && quantityStock !== undefined) {
        const bId = parseInt(branchId);
        if (!isNaN(bId)) {
          await prisma.productBranchStock.upsert({
            where: { productId_branchId: { productId: id, branchId: bId } },
            update: { quantityStock: parseFloat(quantityStock) },
            create: { productId: id, branchId: bId, quantityStock: parseFloat(quantityStock) }
          });
        }
        
        const totalStockAgg = await prisma.productBranchStock.aggregate({
          where: { productId: id },
          _sum: { quantityStock: true }
        });
        totalStockCalculated = totalStockAgg._sum.quantityStock ?? 0;
      }

      const dataToUpdate: Prisma.ProductUpdateInput = {
        name: name.trim(),
        priceSale: new Decimal(parseFloat(priceSale)),
        ...(totalStockCalculated !== undefined ? { quantityStock: totalStockCalculated } : {}),
        brand: { connect: { id: parseInt(brandId) } },
        category: { connect: { id: parseInt(categoryId) } },
      };

      if (sku !== undefined) {
        dataToUpdate.sku = typeof sku === 'string' ? (sku.trim() || null) : sku;
      }
      if (description !== undefined) {
        dataToUpdate.description = typeof description === 'string' ? (description.trim() || null) : description;
      }
      if (req.body.imageUrl !== undefined) {
        dataToUpdate.imageUrl = typeof req.body.imageUrl === 'string' ? (req.body.imageUrl.trim() || null) : req.body.imageUrl;
      }
      if (pricePurchase !== undefined && pricePurchase !== null && pricePurchase !== '') {
        dataToUpdate.pricePurchase = new Decimal(parseFloat(pricePurchase));
      } else if (pricePurchase === '' || pricePurchase === null) {
        dataToUpdate.pricePurchase = null as any;
      }
      if (stockMinAlert !== undefined && stockMinAlert !== null && stockMinAlert !== '') {
        dataToUpdate.stockMinAlert = parseFloat(stockMinAlert);
      } else if (stockMinAlert === '' || stockMinAlert === null) {
        dataToUpdate.stockMinAlert = null;
      }
      if (unitType !== undefined) {
        const validUnitTypes = [null, 'UNIT', 'WEIGHT', 'VOLUME'];
        dataToUpdate.unitType = validUnitTypes.includes(unitType) ? (unitType || null) : null;
      }
      if (req.body.isPublicWeb !== undefined) {
        dataToUpdate.isPublicWeb = Boolean(req.body.isPublicWeb);
      }
      if (req.body.webCategory !== undefined) {
        dataToUpdate.webCategory = typeof req.body.webCategory === 'string' ? (req.body.webCategory.trim() || null) : req.body.webCategory;
      }
      if (supplierId !== undefined && supplierId !== null && supplierId !== '') {
        dataToUpdate.supplier = { connect: { id: parseInt(supplierId) } };
      } else if (supplierId === '' || supplierId === null) {
        dataToUpdate.supplier = { disconnect: true };
      }

      const updatedProduct = await prisma.product.update({
        where: { id },
        data: dataToUpdate,
        include: { brand: true, category: true, supplier: true, branchStocks: true },
      });

      // [CORREGIDO] Push limpio a Supabase de los datos recién guardados.
      try {
        const { syncSingleProduct } = await import("../../../lib/syncService");
        await syncSingleProduct(id);
      } catch (syncErr) {
        console.error("[Productos] Sync manual error:", syncErr);
      }

      res.status(200).json(updatedProduct);
    } catch (error: any) {
      handleApiError(res, error, `updating product ${id}`);
    }
  } else if (req.method === 'DELETE') {
    try {
      const [saleItemsCount, purchaseItemsCount] = await Promise.all([
        prisma.saleItem.count({
          where: { productId: id },
        }),
        prisma.purchaseItem.count({
          where: { productId: id },
        }),
      ]);

      if (saleItemsCount > 0 || purchaseItemsCount > 0) {
        const relations = [];
        if (saleItemsCount > 0) relations.push(`${saleItemsCount} ítem(s) de venta`);
        if (purchaseItemsCount > 0) relations.push(`${purchaseItemsCount} ítem(s) de compra`);

        return res.status(409).json({
          message: `No se puede eliminar el producto porque está asociado a ${relations.join(' y ')}. Considere marcarlo como no disponible o discontinuado.`
        });
      }
      
      await prisma.product.delete({
        where: { id },
      });
      
      try {
        const { deleteProductFromSupabase } = await import("../../../lib/syncService");
        await deleteProductFromSupabase(id);
      } catch (syncErr) {
        console.error("[Productos] Delete sync error:", syncErr);
      }
      
      res.status(204).end();
    } catch (error: any) {
      handleApiError(res, error, `deleting product ${id}`);
    }
  } else if (req.method === 'PATCH') {
    const { quantityStock, unitType } = req.body;
    const dataToUpdate: Prisma.ProductUpdateInput = {};
    if (quantityStock !== undefined) {
      if (isNaN(parseFloat(quantityStock))) {
        return res.status(400).json({ message: 'quantityStock inválido.' });
      }
      dataToUpdate.quantityStock = parseFloat(quantityStock);
    }
    if (unitType !== undefined) {
      const validUnitTypes = [null, 'UNIT', 'WEIGHT', 'VOLUME'];
      dataToUpdate.unitType = validUnitTypes.includes(unitType) ? (unitType || null) : null;
    }
    if (Object.keys(dataToUpdate).length === 0) {
      return res.status(400).json({ message: 'No hay campos para actualizar.' });
    }
    try {
      const updated = await prisma.product.update({
        where: { id },
        data: dataToUpdate,
      });
      
      try {
        const { syncSingleProduct } = await import("../../../lib/syncService");
        await syncSingleProduct(id);
      } catch (syncErr) {
        console.error("[Productos] Sync error en PATCH:", syncErr);
      }
      
      res.status(200).json(updated);
    } catch (error: any) {
      handleApiError(res, error, `patching product ${id} stock`);
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'PATCH', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}