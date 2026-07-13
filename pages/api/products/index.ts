// pages/api/products/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { Prisma } from '@prisma/client';
type Decimal = Prisma.Decimal;
const Decimal = Prisma.Decimal;
import { handleApiError } from '../../../lib/apiErrorHandler';
import { sanitizeString } from '../../../lib/sanitize';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const { search, brandId, categoryId, supplierId } = req.query;

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

    // Filtro por ID de Proveedor
    if (supplierId && typeof supplierId === 'string' && supplierId !== '') {
        const parsedSupplierId = parseInt(supplierId);
        if (!isNaN(parsedSupplierId)) {
            whereClause.supplierId = parsedSupplierId;
        }
    }

    const page = req.query.page ? parseInt(req.query.page as string) : undefined;
    const limit = req.query.limit ? Math.min(parseInt(req.query.limit as string) || 50, 100) : 50;
    const skip = page ? (page - 1) * limit : undefined;

    try {
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where: whereClause, // Aplicar los filtros construidos
          include: {
            brand: true,
            category: true,
            supplier: true,
          },
          orderBy: {
            name: 'asc',
          },
          ...(skip !== undefined && { skip, take: limit }),
        }),
        prisma.product.count({ where: whereClause }),
      ]);

      if (page !== undefined) {
        res.status(200).json({
          data: products,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          }
        });
      } else {
        res.status(200).json(products);
      }
    } catch (error) {
      handleApiError(res, error, "fetching products");
    }
  } else if (req.method === 'POST') {
    let {
        name, sku, description,
        pricePurchase, priceSale, quantityStock, stockMinAlert,
        brandId, categoryId, supplierId, unitType
    } = req.body;

    // --- Validación más robusta de los datos de entrada ---
    if (!name || priceSale === undefined || quantityStock === undefined || !brandId || !categoryId) {
        return res.status(400).json({ message: 'Faltan campos obligatorios: Nombre, Precio Venta, Stock, Marca y Categoría.' });
    }
    
    // Validar y convertir los campos numéricos antes de usarlos
    const priceSaleNum = parseFloat(priceSale);
    const quantityStockNum = parseFloat(quantityStock);
    const brandIdInt = parseInt(brandId);
    const categoryIdInt = parseInt(categoryId);

    if (isNaN(priceSaleNum) || isNaN(quantityStockNum) || isNaN(brandIdInt) || isNaN(categoryIdInt)) {
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

    name = sanitizeString(name);
    if (sku) sku = sanitizeString(sku);
    if (description) description = sanitizeString(description);

    // Validar unitType
    const validUnitTypes = [null, 'UNIT', 'WEIGHT', 'VOLUME'];
    const resolvedUnitType = validUnitTypes.includes(unitType) ? (unitType || null) : null;

    try {
      const newProduct = await prisma.product.create({
        data: {
          name: name.trim(),
          sku: sku ? sku.trim() : null,
          description: description ? description.trim() : null,
          pricePurchase: pricePurchaseDecimal || new Decimal(0),
          priceSale: new Decimal(priceSaleNum),
          quantityStock: quantityStockNum,
          stockMinAlert: stockMinAlert ? parseFloat(stockMinAlert) : null,
          unitType: resolvedUnitType,
          brand: { connect: { id: brandIdInt } },
          category: { connect: { id: categoryIdInt } },
          ...(supplierId ? { supplier: { connect: { id: parseInt(supplierId) } } } : {}),
        },
        include: {
            brand: true,
            category: true,
            supplier: true,
        }
      });
      res.status(201).json(newProduct);
    } catch (error: unknown) {
      handleApiError(res, error, "creating product");
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}