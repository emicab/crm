// pages/api/ventas/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { Prisma } from '@prisma/client'; // Para tipar errores de Prisma
import { handleApiError } from '../../../lib/apiErrorHandler';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const saleIdQuery = req.query.id as string;

  if (!saleIdQuery || isNaN(parseInt(saleIdQuery))) {
    return res.status(400).json({ message: 'ID de venta inválido.' });
  }

  const id = parseInt(saleIdQuery);

  if (req.method === 'GET') {
    try {
      const sale = await prisma.sale.findUnique({
        where: { id: id },
        include: {
          client: true,
          seller: true,
          cashRegister: true,
          items: {
            include: {
              product: true,
            },
            orderBy: {
                id: 'asc'
            }
          },
        },
      });

      if (!sale) {
        return res.status(404).json({ message: 'Venta no encontrada.' });
      }

      // Convertir Decimal a string para una serialización JSON segura
      const saleForJson = {
        ...sale,
        totalAmount: sale.totalAmount.toString(),
        cashRegister: sale.cashRegister ? {
          ...sale.cashRegister,
          initialBalance: sale.cashRegister.initialBalance.toString(),
          expectedBalance: sale.cashRegister.expectedBalance?.toString() || null,
          actualBalance: sale.cashRegister.actualBalance?.toString() || null,
          difference: sale.cashRegister.difference?.toString() || null,
        } : null,
        items: sale.items.map(item => ({
          ...item,
          priceAtSale: item.priceAtSale.toString(),
          product: item.product ? {
            ...item.product,
            pricePurchase: item.product.pricePurchase?.toString() || null,
            priceSale: item.product.priceSale.toString(),
          } : null
        }))
      };

      res.status(200).json(saleForJson);
    } catch (error: any) {
      handleApiError(res, error, `fetching sale ${id}`);
    }
  } else if (req.method === 'PUT') {
    const { clientId } = req.body;
    try {
      const updatedSale = await prisma.sale.update({
        where: { id: id },
        data: {
          clientId: clientId ? parseInt(clientId) : null,
        },
        include: {
          client: true,
          seller: true,
          cashRegister: true,
          items: {
            include: {
              product: true,
            },
            orderBy: {
              id: 'asc'
            }
          }
        }
      });

      const saleForJson = {
        ...updatedSale,
        totalAmount: updatedSale.totalAmount.toString(),
        cashRegister: updatedSale.cashRegister ? {
          ...updatedSale.cashRegister,
          initialBalance: updatedSale.cashRegister.initialBalance.toString(),
          expectedBalance: updatedSale.cashRegister.expectedBalance?.toString() || null,
          actualBalance: updatedSale.cashRegister.actualBalance?.toString() || null,
          difference: updatedSale.cashRegister.difference?.toString() || null,
        } : null,
        items: updatedSale.items.map(item => ({
          ...item,
          priceAtSale: item.priceAtSale.toString(),
          product: item.product ? {
            ...item.product,
            pricePurchase: item.product.pricePurchase?.toString() || null,
            priceSale: item.product.priceSale.toString(),
          } : null
        }))
      };

      res.status(200).json(saleForJson);
    } catch (error: any) {
      handleApiError(res, error, `updating sale ${id}`);
    }

  } else if (req.method === 'DELETE') {
    try {
      // Usamos una transacción para asegurar que la reposición de stock y la eliminación
      // de la venta ocurran juntas, o ninguna de las dos.
      const result = await prisma.$transaction(async (tx) => {
        // 1. Encontrar la venta y sus ítems para saber qué stock reponer
        const saleToDelete = await tx.sale.findUnique({
          where: { id: id },
          include: {
            items: {
              select: {
                productId: true,
                quantity: true,
              },
            },
          },
        });

        if (!saleToDelete) {
          // Si la venta no se encuentra, la transacción fallará.
          throw new Prisma.PrismaClientKnownRequestError('Venta no encontrada para eliminar.', {
            code: 'P2025', // Código de Prisma para "Registro no encontrado"
            clientVersion: Prisma.prismaVersion.client,
          });
        }

        // 2. Reponer (incrementar) el stock de cada producto vendido
        for (const item of saleToDelete.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              quantityStock: {
                increment: item.quantity,
              },
            },
          });
        }

        // 3. Eliminar la venta. Los SaleItems asociados se eliminarán en cascada
        // si la relación en el schema.prisma tiene `onDelete: Cascade`.
        await tx.sale.delete({
          where: { id: id },
        });

        return { message: 'Venta eliminada y stock repuesto exitosamente.' };
      });

      res.status(200).json(result);

    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return res.status(404).json({ message: 'Venta no encontrada para eliminar.' });
      }
      handleApiError(res, error, `deleting sale ${id}`);
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}