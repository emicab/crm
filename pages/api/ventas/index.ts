// pages/api/ventas/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { Prisma, PaymentType } from '@prisma/client';
const Decimal = Prisma.Decimal;
import { handleApiError } from '../../../lib/apiErrorHandler';
import { sanitizeString } from '../../../lib/sanitize';

interface SaleItemInput {
  productId: number;
  quantity: number;
  priceAtSale: number;
}

interface PromoAppliedInput {
  promotionId: number;
  name: string;
  type: string;
  discountAmount: number;
}

interface CreateSaleInput {
  clientId?: number;
  sellerId: number;
  paymentType: PaymentType;
  notes?: string;
  items: SaleItemInput[];
  discountCodeApplied?: string;
  promotionsApplied?: PromoAppliedInput[];
  paymentMethodDiscount?: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const { clientId, sellerId } = req.query; // Nuevos query params para filtrar

    let whereClause: Prisma.SaleWhereInput = {}; // Cláusula 'where' para Prisma

    if (clientId && typeof clientId === 'string') {
      const parsedClientId = parseInt(clientId);
      if (!isNaN(parsedClientId)) {
        whereClause.clientId = parsedClientId;
      } else {
        return res.status(400).json({ message: 'clientId inválido.' });
      }
    }

    if (sellerId && typeof sellerId === 'string') {
      const parsedSellerId = parseInt(sellerId);
      if (!isNaN(parsedSellerId)) {
        whereClause.sellerId = parsedSellerId;
      } else {
        return res.status(400).json({ message: 'sellerId inválido.' });
      }
    }

    const page = req.query.page ? parseInt(req.query.page as string) : undefined;
    const limit = req.query.limit ? Math.min(parseInt(req.query.limit as string) || 50, 100) : 50;
    const skip = page ? (page - 1) * limit : undefined;

    try {
      const [sales, total] = await Promise.all([
        prisma.sale.findMany({
          where: whereClause, // Aplicar los filtros si existen
          include: {
            client: true,
            seller: true,
            cashRegister: true,
            items: {
              include: {
                product: true,
              },
            },
          },
          orderBy: { saleDate: 'desc' },
          ...(skip !== undefined && { skip, take: limit }),
        }),
        prisma.sale.count({ where: whereClause }),
      ]);

      // Convertir Decimales a string para la respuesta JSON
      const salesForJson = sales.map(sale => ({
        ...sale,
        totalAmount: sale.totalAmount.toString(),
        items: sale.items.map(item => ({
          ...item,
          priceAtSale: item.priceAtSale.toString(),
          product: item.product ? { // Asegurarse que producto no es null
            ...item.product,
            pricePurchase: item.product.pricePurchase?.toString() || null,
            priceSale: item.product.priceSale.toString(),
          } : null
        }))
      }));

      if (page !== undefined) {
        res.status(200).json({
          data: salesForJson,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          }
        });
      } else {
        res.status(200).json(salesForJson);
      }
    } catch (error) {
      handleApiError(res, error, "fetching sales");
    }
  } else if (req.method === 'POST') {
    let { clientId, sellerId, paymentType, notes, items, discountCodeApplied, promotionsApplied, paymentMethodDiscount } = req.body as CreateSaleInput;

    if (!sellerId || !paymentType || !items || items.length === 0) {
      return res.status(400).json({ message: 'Faltan datos obligatorios: vendedor, tipo de pago o ítems.' });
    }
    if (!Object.values(PaymentType).includes(paymentType)) {
        return res.status(400).json({ message: 'Tipo de pago inválido.' });
    }

    if (notes) notes = sanitizeString(notes);
    if (discountCodeApplied) discountCodeApplied = sanitizeString(discountCodeApplied);

    let calculatedTotalAmount = new Decimal(0);
    for (const item of items) {
      if (item.quantity <= 0 || item.priceAtSale < 0) {
        return res.status(400).json({ message: `Cantidad o precio inválido para el producto ID ${item.productId}.` });
      }
      calculatedTotalAmount = calculatedTotalAmount.plus(new Decimal(item.priceAtSale).times(item.quantity));
    }
    
    let discountPercent = 0;
    let discountCodeRecord: any = null;
    if (discountCodeApplied) {
      const codeUpper = discountCodeApplied.toUpperCase().trim();
      try {
        discountCodeRecord = await prisma.discountCode.findUnique({
          where: { code: codeUpper }
        });
      } catch (err) {
        // Ignorar error si no está sincronizado
      }
      
      if (!discountCodeRecord) {
        return res.status(400).json({ message: `El código de descuento "${discountCodeApplied}" no existe.` });
      }
      if (!discountCodeRecord.isActive) {
        return res.status(400).json({ message: `El código de descuento "${discountCodeApplied}" está inactivo.` });
      }
      
      const now = new Date();
      if (discountCodeRecord.validFrom && now < new Date(discountCodeRecord.validFrom)) {
        return res.status(400).json({ message: `El código de descuento "${discountCodeApplied}" aún no es válido.` });
      }
      if (discountCodeRecord.validUntil && now > new Date(discountCodeRecord.validUntil)) {
        return res.status(400).json({ message: `El código de descuento "${discountCodeApplied}" ha expirado.` });
      }
      if (discountCodeRecord.maxUses !== null && discountCodeRecord.currentUses >= discountCodeRecord.maxUses) {
        return res.status(400).json({ message: `El código de descuento "${discountCodeApplied}" ha alcanzado su límite de usos.` });
      }
      
      discountPercent = parseFloat(discountCodeRecord.discountPercent.toString());
    }

    if (discountPercent > 0) {
      const discountAmount = calculatedTotalAmount.times(discountPercent).div(100);
      calculatedTotalAmount = calculatedTotalAmount.minus(discountAmount);
    }

    // Validar y aplicar promociones
    let promotionsAppliedJson: string | null = null;
    if (promotionsApplied && Array.isArray(promotionsApplied) && promotionsApplied.length > 0) {
      for (const promo of promotionsApplied) {
        // COMBO discounts are auto-calculated from the combo, skip DB validation
        if (promo.type === 'COMBO') continue;

        const promoRecord = await prisma.promotion.findUnique({ where: { id: promo.promotionId } });
        if (!promoRecord || promoRecord.status !== 'ACTIVE') {
          return res.status(400).json({ message: `La promoción "${promo.name}" no está activa o no existe.` });
        }
        const now = new Date();
        if (promoRecord.startDate && now < promoRecord.startDate) {
          return res.status(400).json({ message: `La promoción "${promo.name}" aún no es válida.` });
        }
        if (promoRecord.endDate && now > promoRecord.endDate) {
          return res.status(400).json({ message: `La promoción "${promo.name}" ha expirado.` });
        }
      }

      // Recalcular descuento total de promos (server-side)
      let totalPromoDiscount = new Decimal(0);
      for (const promo of promotionsApplied) {
        totalPromoDiscount = totalPromoDiscount.plus(new Decimal(promo.discountAmount));
      }
      calculatedTotalAmount = calculatedTotalAmount.minus(totalPromoDiscount);
      if (calculatedTotalAmount.lessThan(0)) {
        calculatedTotalAmount = new Decimal(0);
      }

      promotionsAppliedJson = JSON.stringify(promotionsApplied);
    }

    // Aplicar descuento por método de pago (sobre el subtotal bruto)
    const paymentMethodDiscountDecimal = new Decimal(paymentMethodDiscount || 0);
    if (paymentMethodDiscountDecimal.greaterThan(0)) {
      calculatedTotalAmount = calculatedTotalAmount.minus(paymentMethodDiscountDecimal);
      if (calculatedTotalAmount.lessThan(0)) {
        calculatedTotalAmount = new Decimal(0);
      }
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        if (discountCodeRecord) {
          await tx.discountCode.update({
            where: { id: discountCodeRecord.id },
            data: { currentUses: { increment: 1 } }
          });
        }

        // Registrar movimiento en caja si hay una abierta
        const openRegister = await tx.cashRegister.findFirst({ where: { status: 'OPEN' } });

        const newSale = await tx.sale.create({
          data: {
            saleDate: new Date(),
            totalAmount: calculatedTotalAmount,
            paymentType,
            notes: notes || null,
            discountCodeApplied: discountCodeApplied || null,
            promotionsApplied: promotionsAppliedJson,
            ...(clientId && { client: { connect: { id: clientId } } }),
            seller: { connect: { id: sellerId } },
            ...(openRegister && { cashRegister: { connect: { id: openRegister.id } } }),
          },
        });

        if (openRegister) {
          const cashAmount = paymentType === 'CASH' ? calculatedTotalAmount : new Decimal(0);
          const otherAmount = paymentType !== 'CASH' ? calculatedTotalAmount : new Decimal(0);
          if (cashAmount.greaterThan(0)) {
            await tx.cashMovement.create({
              data: {
                cashRegisterId: openRegister.id,
                type: 'SALE',
                paymentType: paymentType,
                sourceId: newSale.id,
                amount: cashAmount,
                description: `Venta #${newSale.id} - Efectivo`,
              },
            });
          }
          if (otherAmount.greaterThan(0)) {
            await tx.cashMovement.create({
              data: {
                cashRegisterId: openRegister.id,
                type: 'SALE',
                paymentType: paymentType,
                sourceId: newSale.id,
                amount: otherAmount,
                description: `Venta #${newSale.id} - ${paymentType}`,
              },
            });
          }
        }

        for (const item of items) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product) {
            throw new Error(`Producto con ID ${item.productId} no encontrado.`);
          }
          if (Number(product.quantityStock) < item.quantity) {
            throw new Error(`Stock insuficiente para el producto "${product.name}". Disponible: ${product.quantityStock}, Solicitado: ${item.quantity}.`);
          }

          let purchasePriceAtSale = product.pricePurchase;
          if (!purchasePriceAtSale || purchasePriceAtSale.equals(0)) {
            const lastPurchase = await tx.purchaseItem.findFirst({
              where: { productId: item.productId },
              orderBy: { id: 'desc' },
              select: { purchasePrice: true },
            });
            if (lastPurchase) {
              purchasePriceAtSale = lastPurchase.purchasePrice;
            }
          }

          await tx.saleItem.create({
            data: {
              saleId: newSale.id,
              productId: item.productId,
              quantity: item.quantity,
              priceAtSale: new Decimal(item.priceAtSale),
              purchasePriceAtSale: purchasePriceAtSale || new Decimal(0),
            },
          });

          const updateResult = await tx.product.updateMany({
            where: {
              id: item.productId,
              quantityStock: { gte: item.quantity }
            },
            data: {
              quantityStock: { decrement: item.quantity }
            }
          });
          if (updateResult.count === 0) {
            throw new Error(`Stock insuficiente o modificado concurrentemente para el producto "${product.name}".`);
          }

          // Alerta de stock mínimo con log local y mock email
          const updatedProduct = await tx.product.findUnique({
            where: { id: item.productId },
            select: { id: true, name: true, quantityStock: true, stockMinAlert: true }
          });
          if (updatedProduct && updatedProduct.stockMinAlert !== null && updatedProduct.quantityStock < updatedProduct.stockMinAlert) {
            console.warn(`[STOCK ALERT] El producto "${updatedProduct.name}" (ID: ${updatedProduct.id}) ha quedado por debajo del mínimo de alerta de stock (${updatedProduct.stockMinAlert}). Stock actual: ${updatedProduct.quantityStock}`);
            console.log(`[MOCK EMAIL] Enviado correo ficticio a: administracion@empresa.com | Asunto: Alerta de Stock Mínimo - ${updatedProduct.name} | Contenido: El producto "${updatedProduct.name}" tiene ${updatedProduct.quantityStock} unidades disponibles (Umbral mínimo: ${updatedProduct.stockMinAlert}).`);
          }
        }
        return tx.sale.findUnique({
            where: { id: newSale.id },
            include: { client: true, seller: true, items: { include: { product: true } } }
        });
      });

      res.status(201).json(result);

    } catch (error: any) {
      if (error instanceof Error && (error.message.startsWith('Stock insuficiente') || error.message.startsWith('Producto con ID'))) {
        return res.status(409).json({ message: error.message });
      }
      handleApiError(res, error, "creating sale");
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}