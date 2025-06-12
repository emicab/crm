// pages/api/products/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { Prisma } from '@prisma/client'; // Importar Prisma para los tipos
import { Decimal } from '@prisma/client/runtime/library';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const { search, brandId, categoryId } = req.query;

    let whereClause: Prisma.ProductWhereInput = {};

    // Filtro de búsqueda por texto (en nombre o SKU)
    if (search && typeof search === 'string' && search.trim() !== '') {
        whereClause.OR = [
            { name: { contains: search } }, // Nota: La búsqueda será sensible a mayúsculas/minúsculas
            { sku: { contains: search } },
        ];
        // Anteriormente, `mode: 'insensitive'` nos dio problemas con la base de datos.
        // Lo omitimos para asegurar compatibilidad. La búsqueda será case-sensitive.
    }

    // Filtro por ID de Marca
    if (brandId && typeof brandId === 'string' && brandId !== '') {
        const parsedBrandId = parseInt(brandId);
        if (!isNaN(parsedBrandId)) {
            whereClause.brandId = parsedBrandId;
        }
    }

    // Filtro por ID de Categoría
    if (categoryId && typeof categoryId === 'string' && categoryId !== '') {
        const parsedCategoryId = parseInt(categoryId);
        if (!isNaN(parsedCategoryId)) {
            whereClause.categoryId = parsedCategoryId;
        }
    }

    try {
      const products = await prisma.product.findMany({
        where: whereClause, // Aplicar los filtros construidos
        include: {
          brand: true,
          category: true,
        },
        orderBy: {
          name: 'asc',
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

    // --- Validación más robusta de los datos de entrada ---
    if (!name || priceSale === undefined || quantityStock === undefined || !brandId || !categoryId) {
        return res.status(400).json({ message: 'Faltan campos obligatorios: Nombre, Precio Venta, Stock, Marca y Categoría.' });
    }
    
    // Validar y convertir los campos numéricos antes de usarlos
    const priceSaleNum = parseFloat(priceSale);
    const quantityStockInt = parseInt(quantityStock);
    const brandIdInt = parseInt(brandId);
    const categoryIdInt = parseInt(categoryId);

    if (isNaN(priceSaleNum) || isNaN(quantityStockInt) || isNaN(brandIdInt) || isNaN(categoryIdInt)) {
        return res.status(400).json({ message: 'Precio de Venta, Stock, Marca o Categoría tienen un formato numérico inválido.' });
    }
    
    // Validar el precio de compra opcional
    let pricePurchaseDecimal: Decimal | null = null;
    if (pricePurchase !== undefined && pricePurchase !== null && pricePurchase !== '') {
        const pricePurchaseNum = parseFloat(pricePurchase);
        if (isNaN(pricePurchaseNum)) {
             return res.status(400).json({ message: 'El Precio de Compra tiene un formato numérico inválido.' });
        }
        pricePurchaseDecimal = new Decimal(pricePurchaseNum);
    }

    try {
      const newProduct = await prisma.product.create({
        data: {
          name: name.trim(),
          sku: sku ? sku.trim() : null,
          description: description ? description.trim() : null,
          pricePurchase: pricePurchaseDecimal || new Decimal(0), // Usar el Decimal convertido o 0 por defecto
          priceSale: new Decimal(priceSaleNum),
          quantityStock: quantityStockInt,
          stockMinAlert: stockMinAlert ? parseInt(stockMinAlert) : null,
          brand: { connect: { id: brandIdInt } },
          category: { connect: { id: categoryIdInt } },
        },
        include: {
            brand: true,
            category: true,
        }
      });
      res.status(201).json(newProduct);
    } catch (error: unknown) {
      console.error("Error creando producto:", error);
      let errorMessage = 'Ocurrió un error inesperado al crear el producto.';
      let statusCode = 500;

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Manejar errores conocidos de Prisma, como constraints únicos
        if (error.code === 'P2002' && error.meta?.target?.includes('sku')) {
          errorMessage = 'Ya existe un producto con este SKU.';
          statusCode = 409; // Conflict
        }
      } else if (error instanceof Error) {
        // Capturar otros errores genéricos
        errorMessage = error.message;
      }

      res.status(statusCode).json({ message: errorMessage });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}