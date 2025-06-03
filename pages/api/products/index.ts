// pages/api/products/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma'; // Ajusta la ruta si es necesario

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const products = await prisma.product.findMany({
        include: {
          brand: true, // Incluir datos de la marca
          category: true, // Incluir datos de la categoría
        },
      });
      res.status(200).json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: 'Error al obtener los productos' });
    }
  } else if (req.method === 'POST') {
    const { 
        name, sku, description, 
        pricePurchase, priceSale, quantityStock, stockMinAlert,
        brandId, categoryId 
    } = req.body;

    // Validación básica (puedes mejorarla mucho)
    if (!name || !pricePurchase || !priceSale || !quantityStock || !brandId || !categoryId) {
        return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    try {
      const newProduct = await prisma.product.create({
        data: {
          name,
          sku,
          description,
          pricePurchase: parseFloat(pricePurchase), // Asegúrate de que sean números
          priceSale: parseFloat(priceSale),
          quantityStock: parseInt(quantityStock),
          stockMinAlert: stockMinAlert ? parseInt(stockMinAlert) : null,
          brand: { connect: { id: parseInt(brandId) } },
          category: { connect: { id: parseInt(categoryId) } },
        },
        include: {
            brand: true,
            category: true,
        }
      });
      res.status(201).json(newProduct);
    } catch (error) {
      console.error("Error creating product:", error);
      // Revisar si es un error de constraint (ej. SKU duplicado)
      if (error.code === 'P2002' && error.meta?.target?.includes('sku')) {
        return res.status(409).json({ message: 'Ya existe un producto con este SKU.' });
      }
      res.status(500).json({ message: 'Error al crear el producto' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}