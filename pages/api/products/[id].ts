// pages/api/products/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

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
        },
      });
      if (!product) {
        return res.status(404).json({ message: 'Producto no encontrado.' });
      }
      res.status(200).json(product);
    } catch (error: any) {
      console.error(`Error fetching product ${id}:`, error);
      res.status(500).json({ message: `Error al obtener el producto: ${error.message}` });
    }
  } else if (req.method === 'PUT') {
    const {
      name, sku, description,
      pricePurchase, priceSale, quantityStock, stockMinAlert,
      brandId, categoryId,
    } = req.body;

    // Validaciones básicas
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ message: 'El nombre del producto es obligatorio.' });
    }
    if (priceSale === undefined || isNaN(parseFloat(priceSale))) {
      return res.status(400).json({ message: 'El precio de venta es obligatorio y debe ser un número.' });
    }
    if (quantityStock === undefined || isNaN(parseInt(quantityStock))) {
      return res.status(400).json({ message: 'La cantidad en stock es obligatoria y debe ser un número entero.' });
    }
    if (brandId === undefined || isNaN(parseInt(brandId))) {
      return res.status(400).json({ message: 'La marca es obligatoria.' });
    }
    if (categoryId === undefined || isNaN(parseInt(categoryId))) {
      return res.status(400).json({ message: 'La categoría es obligatoria.' });
    }

    try {
      // Validar existencia de Brand y Category
      const brandExists = await prisma.brand.findUnique({ where: { id: parseInt(brandId) }});
      if (!brandExists) return res.status(400).json({ message: `Marca con ID ${brandId} no existe.` });
      
      const categoryExists = await prisma.category.findUnique({ where: { id: parseInt(categoryId) }});
      if (!categoryExists) return res.status(400).json({ message: `Categoría con ID ${categoryId} no existe.` });

      const dataToUpdate: Prisma.ProductUpdateInput = {
        name: name.trim(),
        priceSale: new Decimal(parseFloat(priceSale)),
        quantityStock: parseInt(quantityStock),
        brand: { connect: { id: parseInt(brandId) } },
        category: { connect: { id: parseInt(categoryId) } },
      };

      // Manejo de campos opcionales
      if (sku !== undefined) {
        dataToUpdate.sku = typeof sku === 'string' ? (sku.trim() || null) : sku;
      }
      if (description !== undefined) {
        dataToUpdate.description = typeof description === 'string' ? (description.trim() || null) : description;
      }
      if (pricePurchase !== undefined && pricePurchase !== null && pricePurchase !== '') {
        dataToUpdate.pricePurchase = new Decimal(parseFloat(pricePurchase));
      } else if (pricePurchase === '' || pricePurchase === null) {
        dataToUpdate.pricePurchase = null; // Permitir borrar el precio de compra
      }
      if (stockMinAlert !== undefined && stockMinAlert !== null && stockMinAlert !== '') {
        dataToUpdate.stockMinAlert = parseInt(stockMinAlert);
      } else if (stockMinAlert === '' || stockMinAlert === null) {
        dataToUpdate.stockMinAlert = null; // Permitir borrar la alerta de stock
      }
      
      const updatedProduct = await prisma.product.update({
        where: { id },
        data: dataToUpdate,
        include: { brand: true, category: true },
      });
      res.status(200).json(updatedProduct);
    } catch (error: any) {
      console.error(`Error updating product ${id}:`, error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return res.status(404).json({ message: 'Producto no encontrado para actualizar.' });
        }
        if (error.code === 'P2002' && error.meta?.target?.includes('sku')) {
          return res.status(409).json({ message: 'Ya existe otro producto con este SKU.' });
        }
      }
      res.status(500).json({ message: `Error al actualizar el producto: ${error.message}` });
    }
  } else if (req.method === 'DELETE') {
    try {
      const saleItemsCount = await prisma.saleItem.count({
        where: { productId: id },
      });

      if (saleItemsCount > 0) {
        return res.status(409).json({
          message: `No se puede eliminar el producto porque está asociado a ${saleItemsCount} ítem(s) de venta. Considere marcarlo como no disponible o discontinuado.`
        });
      }
      
      await prisma.product.delete({
        where: { id },
      });
      res.status(204).end(); // No Content
    } catch (error: any) {
      console.error(`Error deleting product ${id}:`, error);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return res.status(404).json({ message: 'Producto no encontrado para eliminar.' });
      }
      res.status(500).json({ message: `Error al eliminar el producto: ${error.message}` });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}